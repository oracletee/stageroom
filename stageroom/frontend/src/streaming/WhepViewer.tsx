import { useEffect, useRef } from 'react';

interface WhepViewerProps {
  whepUrl: string;
}

export const WhepViewer: React.FC<WhepViewerProps> = ({ whepUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startWhep = async (): Promise<void> => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: import.meta.env.VITE_STUN_SERVER_1 || 'stun:stun.cloudflare.com:3478' }],
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      });
      pcRef.current = pc;

      const stream = new MediaStream();
      pc.ontrack = (e) => {
        stream.addTrack(e.track);
        if (videoRef.current && !videoRef.current.srcObject) {
          videoRef.current.srcObject = stream;
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn('[WhepViewer] POST failed:', res.status, errText.substring(0, 200));

        // 409 = broadcast not started yet, retry with backoff
        if (res.status === 409) {
          pc.close();
          pcRef.current = null;
          if (!cancelled) {
            const delay = 2000;
            console.log(`[WhepViewer] Retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            if (!cancelled) return startWhep();
          }
        }
        return;
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      const timeout = setTimeout(() => {
        if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
          pc.close();
          pcRef.current = null;
          console.warn('[WhepViewer] ICE timeout, retrying...');
          if (!cancelled) {
            setTimeout(() => startWhep(), 2000);
          }
        }
      }, 15000);

      pc.addEventListener('iceconnectionstatechange', () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('[WhepViewer] Connected');
          clearTimeout(timeout);
        }
      });
    };

    startWhep().catch((err) => console.warn('[WhepViewer] Error:', err));

    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [whepUrl]);

  return (
    <video
      ref={videoRef}
      muted
      autoPlay
      playsInline
      className="w-full h-full object-contain"
    />
  );
};
