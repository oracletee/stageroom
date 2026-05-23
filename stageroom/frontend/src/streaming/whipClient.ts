export class WhipClient {
  private pc: RTCPeerConnection | null = null;
  private sessionUrl: string | null = null;
  private _token: string | undefined;
  private stopped = false;
  private iceTimeout: ReturnType<typeof setTimeout> | null = null;
  private _trickleHandler: ((e: RTCPeerConnectionIceEvent) => void) | null = null;
  private _connHandler: (() => void) | null = null;
  private _keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private _statsInterval: ReturnType<typeof setInterval> | null = null;
  private onDisconnected: (() => void) | null = null;

  async start(whipUrl: string, stream: MediaStream, whipToken?: string, onDisconnected?: () => void): Promise<void> {
    if (this.pc) {
      console.warn('[WhipClient] Already started, ignoring duplicate call');
      return;
    }

    console.log('[WhipClient] Starting WHIP:', whipUrl.slice(0, 80) + '...');
    console.log('[WhipClient] Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.enabled}`));

    this._token = whipToken;
    this.onDisconnected = onDisconnected ?? null;

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
      const init: RTCRtpTransceiverInit = { direction: 'sendonly', streams: [stream] };
      if (track.kind === 'video') {
        init.sendEncodings = [
          {
            maxBitrate: 6_000_000,
            maxFramerate: 30,
            scaleResolutionDownBy: 1,
          },
        ];
      }
      this.pc.addTransceiver(track, init);
    }

    // Prefer VP8 for CanvasCaptureMediaStreamTrack compatibility —
    // the canvas capture encoder natively produces VP8, while Chrome's
    // default SDP order prefers H.264 (hardware). Selecting H.264
    // can cause the encoder pipeline to produce black/empty frames.
    const [videoTransceiver] = this.pc
      .getTransceivers()
      .filter((t) => t.sender?.track?.kind === 'video');
    if (videoTransceiver && typeof RTCRtpSender.getCapabilities === 'function') {
       const caps = RTCRtpSender.getCapabilities('video');
       if (caps) {
         const vp8 = caps.codecs.find((c) => c.mimeType.includes('VP8'));
         const vp9 = caps.codecs.find((c) => c.mimeType.includes('VP9'));
         const h264 = caps.codecs.find((c) => c.mimeType.includes('H264'));
         const preferred = [vp8, vp9, h264].filter(Boolean) as RTCRtpCodec[];
         if (preferred.length && videoTransceiver.setCodecPreferences) {
           videoTransceiver.setCodecPreferences(preferred);
           console.log('[WhipClient] Set codec preferences:', preferred.map((c) => c.mimeType));
         }
       }
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
    const selectedCodec = answerSdp.match(/a=rtpmap:(\d+) ([\w\/.]+)/g);
    console.log('[WhipClient] Answer codecs:', selectedCodec);

    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    this.setupTrickleIce();

    if (this.stopped) return;

    console.log('[WhipClient] Starting ICE connection wait...');
    await this.waitForIceConnected();

    // Monitor for ICE disconnection after initial connect
    const disconnectHandler = () => {
      const state = this.pc?.iceConnectionState;
      if (state === 'disconnected' || state === 'failed') {
        console.log('[WhipClient] ICE lost after connect:', state);
        this.stopKeepalive();
        this.pc?.removeEventListener('iceconnectionstatechange', disconnectHandler);
        // Notify user of disconnection for potential reconnection
        if (this.onDisconnected) {
          this.onDisconnected();
        }
      }
    };
    this.pc.addEventListener('iceconnectionstatechange', disconnectHandler);
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
      const cur = this.pc.iceConnectionState;
      console.log('[WhipClient] Waiting for ICE connected, current state:', cur);
      if (cur === 'connected' || cur === 'completed') {
        console.log('[WhipClient] ICE already connected/completed');
        this.startKeepalive();
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
          this.startKeepalive();
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

  private startKeepalive(): void {
    if (!this.sessionUrl || this._keepaliveInterval) return;
    // Cloudflare WHIP servers timeout inactive sessions.
     // Periodic PATCH requests keep the session alive.
     this._keepaliveInterval = setInterval(() => {
       if (this.stopped || !this.sessionUrl) return;
       fetch('/api/stream/whip-proxy/trickle', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           sessionUrl: this.sessionUrl,
           sdpFragment: 'a=candidate:0 1 UDP 2122252543 0.0.0.0 0 typ host\r\n',
           whipToken: this._token,
         }),
       })
         .then(response => {
           if (!response.ok) {
             console.warn('[WhipClient] Keepalive failed:', response.status, response.statusText);
           }
         })
         .catch(err => {
           console.warn('[WhipClient] Keepalive error:', err);
         });
     }, 15000);

     // Periodic encoder stats for debugging
     this._statsInterval = setInterval(() => {
       if (this.stopped || !this.pc) return;
       this.pc.getStats().then(stats => {
         stats.forEach(report => {
           if (report.type === 'outbound-rtp' && report.kind === 'video') {
             console.log('[WhipClient] Video encoder stats:', {
               bytesSent: report.bytesSent,
               packetsSent: report.packetsSent,
               framesEncoded: report.framesEncoded,
               frameWidth: report.frameWidth,
               frameHeight: report.frameHeight,
               qualityLimitationReason: report.qualityLimitationReason || 'none',
               totalEncodeTime: report.totalEncodeTime
             });
           }
         });
       }).catch(err => {
         console.warn('[WhipClient] Failed to get stats:', err);
       });
     }, 30000); // Every 30 seconds
  }

  private stopKeepalive(): void {
    if (this._keepaliveInterval) {
      clearInterval(this._keepaliveInterval);
      this._keepaliveInterval = null;
    }
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
  }

  stop(): void {
    this.stopped = true;
    this.clearIce();
    this.stopKeepalive();
    this.stopStatsInterval();
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

  private stopStatsInterval(): void {
    if (this._statsInterval) {
      clearInterval(this._statsInterval);
      this._statsInterval = null;
    }
  }
}
