export class WhipClient {
  private pc: RTCPeerConnection | null = null;
  private sessionUrl: string | null = null;
  private whipUrl: string | null = null;
  private _token: string | undefined;
  private stopped = false;
  private iceTimeout: ReturnType<typeof setTimeout> | null = null;
  private iceReject: ((reason: any) => void) | null = null;
  private _trickleHandler: ((e: RTCPeerConnectionIceEvent) => void) | null = null;
  private _connHandler: (() => void) | null = null;

  async start(whipUrl: string, stream: MediaStream, whipToken?: string): Promise<void> {
    if (this.pc) {
      console.warn('[WhipClient] Already started, ignoring duplicate call');
      return;
    }

    console.log('[WhipClient] Starting WHIP:', whipUrl.slice(0, 80) + '...');
    console.log('[WhipClient] Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.enabled}`));

    this.whipUrl = whipUrl;
    this._token = whipToken;

    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10,
    });

    this.pc.addEventListener('iceconnectionstatechange', () => {
      if (this.pc) console.log('[WhipClient] ICE state:', this.pc.iceConnectionState);
    });
    this.pc.addEventListener('icegatheringstatechange', () => {
      if (this.pc) console.log('[WhipClient] ICE gather:', this.pc.iceGatheringState);
    });
    this.pc.addEventListener('signalingstatechange', () => {
      if (this.pc) console.log('[WhipClient] Signal:', this.pc.signalingState);
    });
    this.pc.addEventListener('icecandidate', (e) => {
      if (this.stopped) return;
      if (e.candidate) {
        console.log('[WhipClient] ICE candidate:', e.candidate.type, e.candidate.candidate.slice(0, 80));
      }
    });

    for (const track of stream.getTracks()) {
      this.pc.addTransceiver(track, { direction: 'sendonly', streams: [stream] });
    }

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    if (this.stopped) return;

    const offerSdp = this.pc.localDescription?.sdp;
    if (!offerSdp) throw new Error('No local SDP after setLocalDescription');
    console.log('[WhipClient] Offer SDP length:', offerSdp.length);
    console.log('[WhipClient] Offer media lines:', (offerSdp.match(/^m=.*/gm) || []).join(' | '));
    console.log('[WhipClient] Offer SDP preview:', offerSdp.slice(0, 400));
    console.log('[WhipClient] Offer SDP candidate count:', (offerSdp.match(/a=candidate/g) || []).length);

    if (this.stopped) return;

    // Try proxy WHIP POST through our worker first, fallback to direct
    console.log('[WhipClient] Sending WHIP POST via proxy...', whipUrl.slice(0, 60));
    let answerSdp: string;
    let sessionUrl: string;

    try {
      const ac = new AbortController();
      const proxyTimeout = setTimeout(() => ac.abort(), 15000);
      const proxyRes = await fetch('/api/stream/whip-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whipUrl, sdp: offerSdp, whipToken }),
        signal: ac.signal,
      });
      clearTimeout(proxyTimeout);

      const proxyData = await proxyRes.json();
      console.log('[WhipClient] Proxy response:', proxyData.status, proxyData.statusText);

      if (!proxyRes.ok) {
        throw new Error(proxyData.error || `Proxy returned ${proxyData.status}`);
      }

      answerSdp = proxyData.answerSdp;
      sessionUrl = proxyData.sessionUrl || whipUrl;
    } catch (proxyErr: any) {
      console.warn('[WhipClient] Proxy failed, trying direct:', proxyErr.message);
      // Fallback: direct WHIP POST (may fail CORS, but worth trying)
      const directRes = await fetch(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offerSdp,
      });
      if (!directRes.ok) {
        const errText = await directRes.text().catch(() => '');
        throw new Error(`Direct WHIP returned ${directRes.status}: ${errText.substring(0, 200)}`);
      }
      answerSdp = await directRes.text();
      sessionUrl = directRes.headers.get('location') || directRes.headers.get('Location') || whipUrl;
      console.log('[WhipClient] Direct WHIP response:', directRes.status, ', session:', sessionUrl.slice(0, 60));
    }

    if (sessionUrl.startsWith('/')) {
      const origin = new URL(whipUrl).origin;
      this.sessionUrl = `${origin}${sessionUrl}`;
    } else {
      this.sessionUrl = sessionUrl;
    }
    console.log('[WhipClient] Session URL:', this.sessionUrl.slice(0, 80));
    console.log('[WhipClient] Answer SDP length:', answerSdp.length);
    console.log('[WhipClient] Answer media lines:', (answerSdp.match(/^m=.*/gm) || []).join(' | '));
    console.log('[WhipClient] Answer SDP preview:', answerSdp.slice(0, 500));
    console.log('[WhipClient] Answer candidates:', (answerSdp.match(/a=candidate/g) || []).length);
    console.log('[WhipClient] Answer ice-lite:', answerSdp.includes('a=ice-lite'));

    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    this.setupTrickleIce();

    if (this.stopped) return;

    console.log('[WhipClient] Starting ICE connection wait...');
    await this.waitForIceConnected();
  }

  private setupTrickleIce(): void {
    if (!this.pc || !this.sessionUrl) return;

    const handler = (e: RTCPeerConnectionIceEvent) => {
      if (this.stopped || !this.sessionUrl) return;
      if (e.candidate) {
        console.log('[WhipClient] Trickling ICE candidate:', e.candidate.candidate.slice(0, 80));
        const sdpFragment = `a=candidate:${e.candidate.candidate}\r\n`;
        fetch('/api/stream/whip-proxy/trickle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionUrl: this.sessionUrl,
            sdpFragment,
            whipToken: this._token,
          }),
        }).then(r => r.json().then(d => {
          if (d.status !== 200) console.warn('[WhipClient] Trickle proxy failed:', d.status);
        })).catch(err => console.warn('[WhipClient] Trickle proxy error:', err));
      } else {
        console.log('[WhipClient] ICE gathering complete');
        fetch('/api/stream/whip-proxy/trickle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionUrl: this.sessionUrl,
            sdpFragment: 'a=end-of-candidates\r\n',
            whipToken: this._token,
          }),
        }).catch(err => console.warn('[WhipClient] End-of-candidates proxy error:', err));
      }
    };
    this._trickleHandler = handler;
    this.pc.addEventListener('icecandidate', handler);
  }

  private waitForIceConnected(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.pc) return reject(new Error('Closed'));
      this.iceReject = reject;
      const cur = this.pc.iceConnectionState;
      console.log('[WhipClient] Waiting for ICE connected, current state:', cur);
      if (cur === 'connected' || cur === 'completed') {
        console.log('[WhipClient] ICE already connected/completed');
        return resolve();
      }
      if (cur === 'failed' || cur === 'disconnected') {
        console.log('[WhipClient] ICE failed/disconnected immediately:', cur);
        return reject(new Error(`ICE ${cur}`));
      }
      this.iceTimeout = setTimeout(() => {
        const state = this.pc?.iceConnectionState;
        console.log('[WhipClient] ICE timeout, state:', state);
        if (this.pc && state === 'checking') {
          console.log('[WhipClient] ICE stuck in checking - restarting ICE');
          this.pc.restartIce();
        }
        this.clearIce();
        this.cleanupIceConnectionHandler();
        reject(new Error('ICE timeout'));
      }, 30000);

      const handler = () => {
        const state = this.pc?.iceConnectionState;
        console.log('[WhipClient] ICE state changed:', state);
        if (state === 'connected' || state === 'completed') {
          console.log('[WhipClient] ICE connected/completed');
          this.clearIce();
          this.cleanupIceConnectionHandler();
          resolve();
        }
        if (state === 'failed' || state === 'disconnected') {
          console.log('[WhipClient] ICE failed/disconnected:', state);
          this.clearIce();
          this.cleanupIceConnectionHandler();
          reject(new Error(`ICE ${state}`));
        }
      };
      this._connHandler = handler;
      this.pc.addEventListener('iceconnectionstatechange', handler);
    });
  }

  private cleanupIceConnectionHandler(): void {
    if (this.pc && this._connHandler) {
      this.pc.removeEventListener('iceconnectionstatechange', this._connHandler);
      this._connHandler = null;
    }
  }

  private clearIce(): void {
    if (this.iceTimeout) {
      clearTimeout(this.iceTimeout);
      this.iceTimeout = null;
    }
    this.iceReject = null;
  }

  stop(): void {
    this.stopped = true;
    this.clearIce();
    this.cleanupIceConnectionHandler();
    if (this.pc) {
      if (this._trickleHandler) {
        this.pc.removeEventListener('icecandidate', this._trickleHandler);
        this._trickleHandler = null;
      }
      this.pc.close();
      this.pc = null;
    }
  }
}
