import { useEffect, useRef } from 'react';
import { useStreamStore } from '../hooks/useStreamStore';
import { type SceneLayer } from './types';
import { VideoElementCache } from './VideoElementCache';
import { AudioMixer } from './AudioMixer';
import { Canvas2DRenderer } from './Canvas2DRenderer';
import { WhipClient } from '../streaming/whipClient';

interface ProgramCompositorProps {
  sceneLayers: SceneLayer[];
  whipUrl: string;
  whipToken?: string;
  onError?: (err: string) => void;
  onConnected?: () => void;
}

function feedAudioToMixer(
  audioMixer: AudioMixer,
  sourceId: string,
  stream: MediaStream,
) {
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) {
    audioMixer.addTrack(sourceId, audioTrack);
  }
}

export const ProgramCompositor: React.FC<ProgramCompositorProps> = ({
  sceneLayers,
  whipUrl,
  whipToken,
  onError,
  onConnected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const whipRef = useRef<WhipClient | null>(null);
  const whipStartedRef = useRef(false);
  const mountedRef = useRef(false);
  const genRef = useRef(0);

  const layersRef = useRef<SceneLayer[]>([]);
  const sourceElementsRef = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const videoCacheRef = useRef<VideoElementCache | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const rendererRef = useRef<Canvas2DRenderer | null>(null);
  const onErrorRef = useRef(onError);
  const onConnectedRef = useRef(onConnected);
  onErrorRef.current = onError;
  onConnectedRef.current = onConnected;

  useEffect(() => {
    layersRef.current = sceneLayers;
  }, [sceneLayers]);

  useEffect(() => {
    mountedRef.current = true;
    const generation = ++genRef.current;
    const isCurrent = () => genRef.current === generation;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1920;
    canvas.height = 1080;

    const fps = 30;
    const frameMs = 1000 / fps;
    let lastFrame = 0;

    const videoCache = new VideoElementCache();
    const audioMixer = new AudioMixer();
    audioMixer.resume().catch(() => {});
    const renderer = new Canvas2DRenderer();

    videoCacheRef.current = videoCache;
    audioMixerRef.current = audioMixer;
    rendererRef.current = renderer;
    renderer.init(canvas);

    const onStreamsChanged = () => {
      const sourceStreams = useStreamStore.getState().sourceStreams;
      console.log('[Compositor] Streams changed, count:', sourceStreams.size);
      for (const [sourceId, stream] of sourceStreams) {
        const tracks = stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.enabled}`);
        console.log('[Compositor]  Source', sourceId.slice(0, 8), 'tracks:', tracks);
        feedAudioToMixer(audioMixer, sourceId, stream);
      }
    };

    const unsubTracks = useStreamStore.subscribe(onStreamsChanged);
    onStreamsChanged();

    const onElementsChanged = () => {
      sourceElementsRef.current = useStreamStore.getState().sourceVideoElements;
    };
    const unsubElements = useStreamStore.subscribe(onElementsChanged);
    onElementsChanged();

    let defaultBg = '#111827';
    let frameCount = 0;
    let canaryPhase = 0;

    // Use MediaStreamTrackGenerator + VideoFrame to create a video track
    // from the canvas, bypassing Chrome's buggy CanvasCaptureMediaStreamTrack
    // encoder pipeline that produces black/empty frames.
    let videoGenerator: MediaStreamTrackGenerator | null = null;
    let videoWriter: WritableStreamDefaultWriter<VideoFrame> | null = null;
    try {
      if (typeof MediaStreamTrackGenerator !== 'undefined') {
        videoGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
        videoWriter = videoGenerator.writable.getWriter();
      }
    } catch (e) {
      console.warn('[Compositor] Insertable Streams not available, will fallback', e);
    }

    const render = (time: number) => {
      if (!mountedRef.current) return;
      rafRef.current = requestAnimationFrame(render);
      if (time - lastFrame < frameMs) return;
      lastFrame = time;
      frameCount++;

      const layers = layersRef.current;

      let hasBg = false;
      for (const layer of layers) {
        if (layer.type === 'background') {
          renderer.drawBackground(layer.bgColor || defaultBg);
          hasBg = true;
          break;
        }
      }
      if (!hasBg) {
        renderer.drawBackground(defaultBg);
      }

      let videoPainted = 0;
      for (const layer of layers) {
        switch (layer.type) {
          case 'background':
            break;
          case 'video': {
            const sourceEl = sourceElementsRef.current.get(layer.sourceId);
            if (!sourceEl || sourceEl.readyState < 2 || !sourceEl.videoWidth) break;
            renderer.drawVideo(sourceEl, layer.rect, layer.opacity);
            videoPainted++;
            break;
          }
          case 'image': {
            if (layer.animationUrl) {
              const videoEl = videoCache.get(layer.sourceId);
              if (videoEl.getAttribute('data-animation-url') !== layer.animationUrl) {
                videoEl.src = layer.animationUrl;
                videoEl.setAttribute('data-animation-url', layer.animationUrl || '');
    videoEl.play().catch(() => {});
              }
              if (videoEl.readyState >= 2) {
                renderer.drawVideo(videoEl, layer.rect, layer.opacity);
              }
            }
            break;
          }
          case 'text':
            renderer.drawText(layer);
            break;
          case 'lower-third':
            renderer.drawLowerThird(layer);
            break;
        }
      }

      // Canary: animated dot in bottom-right corner to keep encoder warm
      canaryPhase = (canaryPhase + 1) % 60;
      const hue = (canaryPhase * 6) % 360;
      renderer.drawCanary(hue);

      renderer.flush();

      // Write canvas frame to the MediaStreamTrackGenerator, bypassing
      // the CanvasCaptureMediaStreamTrack encoder pipeline.
      if (videoWriter) {
        try {
          const frame = new VideoFrame(canvas, { timestamp: performance.now() });
          videoWriter.write(frame).then(() => frame.close()).catch(() => {});
        } catch (e) {
          // VideoFrame may not be available
        }
      }

     // Diagnostic logging every 30 frames (~1s)
       if (frameCount % 30 === 0) {
         const videoStates = layers.filter(l => l.type === 'video').map(l => {
           const el = sourceElementsRef.current.get(l.sourceId);
           return el ? `${l.sourceId.slice(0, 8)}:rs=${el.readyState},vw=${el.videoWidth},p=${el.paused}` : `${l.sourceId.slice(0, 8)}:no-el`;
         });
           console.log('[Compositor] Frame stats', {
             frame: frameCount,
             layers: layers.length,
             videoPainted,
             cacheSize: videoCache.size,
             videoStates,
             ctxState: audioMixer.getAudioContext().state,
             canvasSize: `${canvas.width}x${canvas.height}`,
           });
       }
    };

    rafRef.current = requestAnimationFrame(render);

    const buildOutputStream = async (): Promise<MediaStream> => {
      if (videoGenerator) {
        const stream = new MediaStream([videoGenerator]);
        const audioStream = audioMixer.getOutputStream();
        for (const track of audioStream.getAudioTracks()) {
          stream.addTrack(track);
        }
        for (const track of stream.getVideoTracks()) {
          if ('contentHint' in track) {
            (track as any).contentHint = 'motion';
          }
        }
        return stream;
      }
      // Fallback: direct canvas.captureStream
      const fallbackStream = canvas.captureStream(fps);
      const fallbackAudio = audioMixer.getOutputStream();
      for (const track of fallbackAudio.getAudioTracks()) {
        fallbackStream.addTrack(track);
      }
      for (const track of fallbackStream.getVideoTracks()) {
        if ('contentHint' in track) {
          (track as any).contentHint = 'motion';
        }
      }
      return fallbackStream;
    };

    const waitForVideoReady = async (): Promise<boolean> => {
      const maxWait = 10000;
      const start = performance.now();
      let pollCount = 0;
      while (performance.now() - start < maxWait) {
        const layers = layersRef.current;
        const sourceElements = sourceElementsRef.current;
        pollCount++;
        for (const layer of layers) {
          if (layer.type === 'video') {
            const el = sourceElements.get(layer.sourceId);
            if (!el) {
              if (pollCount <= 5 || pollCount % 60 === 0) {
                console.log('[Compositor] waitForVideoReady poll', {
                  pollCount,
                  sourceId: layer.sourceId.slice(0, 8),
                  status: 'no-element',
                  layerCount: layers.length,
                });
              }
              continue;
            }
            const rs = el.readyState;
            const vw = el.videoWidth;
            if (pollCount <= 5 || pollCount % 60 === 0) {
              console.log('[Compositor] waitForVideoReady poll', {
                pollCount,
                sourceId: layer.sourceId.slice(0, 8),
                readyState: rs,
                videoWidth: vw,
                layerCount: layers.length,
              });
            }
            if (rs >= 2 && vw > 0) {
              return true;
            }
          }
        }
        if (layers.filter(l => l.type === 'video').length === 0 && pollCount <= 3) {
          console.log('[Compositor] No video layers in program snapshot yet');
        }
        await new Promise((r) => requestAnimationFrame(r));
      }
      console.warn('[Compositor] Video-ready timeout — starting WHIP without decoded video', {
        maxWait,
        pollCount,
        layers: layersRef.current.map(l => ({ type: l.type, sourceId: l.sourceId.slice(0, 8) })),
      });
      return false;
    };

     let reconnectAttempts = 0;
     const maxReconnectDelay = 30000; // 30 seconds max delay

     const startWhip = async (attemptReconnect = false) => {
       try {
         if (attemptReconnect) {
           // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
           const delay = Math.min(1000 * 2 ** reconnectAttempts, maxReconnectDelay);
           console.log(`[Compositor] Reconnecting WHIP in ${delay}ms (attempt ${reconnectAttempts + 1})...`);
await new Promise(resolve => setTimeout(resolve, delay));
            reconnectAttempts++;
if (!isCurrent()) return;
          } else {
            reconnectAttempts = 0; // Reset on fresh start
          }

          for (let i = 0; i < 3; i++) {
            await new Promise((r) => requestAnimationFrame(r));
          }
          if (!isCurrent()) return;
          const videoReady = await waitForVideoReady();
          console.log('[Compositor] Video ready:', videoReady);
          if (!isCurrent()) return;
          const stream = await buildOutputStream();
          if (!isCurrent()) return;
          const whip = new WhipClient();
         whipRef.current = whip;
         
         // Handle WHIP disconnection with auto-reconnect
         const handleWhipDisconnect = () => {
           console.log('[Compositor] WHIP disconnected, scheduling reconnect...');
           whipRef.current?.stop();
           whipRef.current = null;
           // Schedule reconnect (don't await to avoid blocking cleanup)
setTimeout(() => {
              if (isCurrent()) {
                startWhip(true);
              }
            }, 0); // Next tick to allow cleanup
         };

await whip.start(whipUrl, stream, whipToken, handleWhipDisconnect);
          if (!isCurrent()) return;
          onConnectedRef.current?.();
        } catch (err: any) {
          if (!isCurrent()) return;
         onErrorRef.current?.(err.message || 'WHIP connection failed');
       }
     };

    if (!whipStartedRef.current) {
      whipStartedRef.current = true;
      startWhip();
    }


     
      return () => {
        mountedRef.current = false;
        whipStartedRef.current = false;
        cancelAnimationFrame(rafRef.current);
        unsubTracks();
        unsubElements();
        videoCache.destroy();
        audioMixer.destroy();
          whipRef.current?.stop();
          whipRef.current = null;
          videoWriter?.close().catch(() => {});
          videoGenerator?.stop();
        };
  }, [whipUrl, whipToken]);

  return (
    <div
      className="relative bg-gray-900 rounded overflow-hidden border border-gray-700"
      style={{ width: 320, height: 180 }}
    >
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full"
      />
      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600/80 text-white text-[10px] rounded">
        LIVE
      </div>
    </div>
  );
};
