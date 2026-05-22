import { useEffect, useRef } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';
import { WhipClient } from '../../streaming/whipClient';

interface StreamCompositorProps {
  whipUrl: string;
  whipToken?: string;
  onError?: (err: string) => void;
  onConnected?: () => void;
}

export const StreamCompositor: React.FC<StreamCompositorProps> = ({ whipUrl, whipToken, onError, onConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const whipRef = useRef<WhipClient | null>(null);
  const mountedRef = useRef(false);
  const whipStartedRef = useRef(false);
  const debug = true; // Set to false to disable logs

    useEffect(() => {
    mountedRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    const fps = 30;
    const frameMs = 1000 / fps;
    let lastFrame = 0;

    const render = (time: number) => {
    if (!mountedRef.current) return;
    rafRef.current = requestAnimationFrame(render);
    if (time - lastFrame < frameMs) return;
    lastFrame = time;

    if (debug) console.log('[Compositor] Render frame at', time);

    const program = document.querySelector<HTMLElement>('[data-variant="program"]');
    if (!program) {
    if (debug) console.log('[Compositor] No program element found');
    return;
    }

       const container = program.getBoundingClientRect();
       if (debug) console.log('[Compositor] Program container:', container);
       if (!container.width || !container.height) {
         if (debug) console.log('[Compositor] Invalid container dimensions');
         return;
       }

       const sx = 1920 / container.width;
       const sy = 1080 / container.height;

      const cs = getComputedStyle(program);
      let fillBg = cs.backgroundColor;
      if (!fillBg || fillBg === 'rgba(0, 0, 0, 0)') {
        const parent = program.parentElement;
        if (parent) fillBg = getComputedStyle(parent).backgroundColor;
      }
      if (fillBg && fillBg !== 'rgba(0, 0, 0, 0)') {
        ctx.fillStyle = fillBg;
      } else {
        ctx.fillStyle = '#111827';
      }
      ctx.fillRect(0, 0, 1920, 1080);

      const scaleRect = (r: DOMRect) => ({
        x: (r.left - container.left) * sx,
        y: (r.top - container.top) * sy,
        w: r.width * sx,
        h: r.height * sy,
      });

       const videoEls = program.querySelectorAll<HTMLElement>('[data-source-type="video"]');
       if (debug) console.log('[Compositor] Found', videoEls.length, 'video elements');
       for (const el of videoEls) {
         const video = el.querySelector('video');
         if (!video || !video.videoWidth) {
           if (debug) console.log('[Compositor] Skipping video element - no video or no videoWidth');
           continue;
         }
         const r = scaleRect(el.getBoundingClientRect());
         if (debug) console.log('[Compositor] Drawing video at', r);
         ctx.drawImage(video, r.x, r.y, r.w, r.h);
       }

       const imageEls = program.querySelectorAll<HTMLElement>('[data-source-type="image"]');
       if (debug) console.log('[Compositor] Found', imageEls.length, 'image elements');
       for (const el of imageEls) {
         const img = el.querySelector('img');
         if (!img || !img.complete) {
           if (debug) console.log('[Compositor] Skipping image element - not complete');
           continue;
         }
         const r = scaleRect(el.getBoundingClientRect());
         if (debug) console.log('[Compositor] Drawing image at', r);
         ctx.save();
         const opacity = parseFloat(el.style.opacity) || 1;
         ctx.globalAlpha = opacity;
         ctx.drawImage(img, r.x, r.y, r.w, r.h);
         ctx.restore();
       }

      for (const el of program.querySelectorAll<HTMLElement>('[data-source-type="animation"]')) {
        const video = el.querySelector('video');
        if (!video || !video.videoWidth) continue;
        const r = scaleRect(el.getBoundingClientRect());
        ctx.save();
        const opacity = parseFloat(el.style.opacity) || 1;
        ctx.globalAlpha = opacity;
        ctx.drawImage(video, r.x, r.y, r.w, r.h);
        ctx.restore();
      }

       const textEls = program.querySelectorAll<HTMLElement>('[data-source-type="text"]');
       if (debug) console.log('[Compositor] Found', textEls.length, 'text elements');
       for (const el of textEls) {
         const inner = el.lastElementChild as HTMLElement | null;
         if (!inner || !inner.textContent) {
           if (debug) console.log('[Compositor] Skipping text element - no inner or no textContent');
           continue;
         }
          const r = scaleRect(el.getBoundingClientRect());
         if (debug) console.log('[Compositor] Drawing text at', r, 'content:', inner.textContent.trim());
         const cs = getComputedStyle(inner);
         const bgCol = cs.backgroundColor;
         if (bgCol && bgCol !== 'rgba(0, 0, 0, 0)') {
           ctx.fillStyle = bgCol;
           ctx.fillRect(r.x, r.y, r.w, r.h);
         }
         ctx.fillStyle = cs.color;
         const fs = parseFloat(cs.fontSize) * sx;
         const fw = parseInt(cs.fontWeight) || 600;
         const family = cs.fontFamily.split(',')[0].replace(/['"]/g, '') || 'sans-serif';
         ctx.font = `${fw} ${fs}px ${family}`;
         ctx.textBaseline = 'top';
         ctx.textAlign = 'left';
         const pl = parseFloat(cs.paddingLeft) * sx;
         const pt = parseFloat(cs.paddingTop) * sy;
         ctx.fillText(inner.textContent.trim(), r.x + pl, r.y + pt);
       }

      const ltEl = program.querySelector<HTMLElement>('[data-source-type="lower-third"]');
      if (ltEl) {
        const st = useStreamStore.getState();
        const lt = st.lowerThird;
        const ltSource = st.sources.find(s => s.type === 'lower-third');
        const ltc = ltSource
          ? { visible: ltSource.ltVisible !== false, name: ltSource.ltName || '', title: ltSource.ltTitle || '' }
          : lt;

        if (ltc.visible && ltc.name) {
          const r = scaleRect(ltEl.getBoundingClientRect());
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.fillStyle = '#3b82f6';
          const bl = 6 * sx;
          ctx.fillRect(r.x, r.y, bl, r.h);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${28 * sx}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(ltc.name, r.x + Math.max(bl, 24 * sx), r.y + r.h * 0.35);
          if (ltc.title) {
            ctx.fillStyle = '#d1d5db';
            ctx.font = `${18 * sx}px sans-serif`;
            ctx.fillText(ltc.title, r.x + Math.max(bl, 24 * sx), r.y + r.h * 0.72);
          }
        }
      }
    };

     const buildOutputStream = (): MediaStream => {
       if (debug) console.log('[Compositor] Building output stream');
       const stream = canvas.captureStream(fps);
       if (debug) console.log('[Compositor] Canvas captureStream got', stream.getTracks().length, 'tracks');
       const st = useStreamStore.getState();
       let audioAdded = false;
       for (const [, ms] of st.sourceStreams) {
         const audioTracks = ms.getAudioTracks();
         if (audioTracks.length > 0) {
           if (debug) console.log('[Compositor] Adding', audioTracks.length, 'audio tracks from sourceStreams');
           for (const t of audioTracks) {
             stream.addTrack(t.clone());
           }
           audioAdded = true;
           break;
         }
       }
       if (!audioAdded) {
         if (debug) console.log('[Compositor] No audio tracks found in sourceStreams');
       }
       return stream;
     };

    const startWhip = async () => {
      try {
        // Ensure at least one frame is rendered before capturing
        await new Promise(r => requestAnimationFrame(r));
        const stream = buildOutputStream();
        stream.getVideoTracks().forEach(t => t.enabled = true);
        const whip = new WhipClient();
        whipRef.current = whip;
        await whip.start(whipUrl, stream, whipToken);
        if (!mountedRef.current) return;
        onConnected?.();
      } catch (err: any) {
        if (!mountedRef.current) return;
        onError?.(err.message || 'WHIP connection failed');
      }
    };

    rafRef.current = requestAnimationFrame(render);
    if (!whipStartedRef.current) {
      whipStartedRef.current = true;
      startWhip();
    }

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      whipRef.current?.stop();
      whipRef.current = null;
      whipStartedRef.current = false;
    };
  }, []);

  return (
    <div className="relative bg-gray-900 rounded overflow-hidden border border-gray-700" style={{ width: 320, height: 180 }}>
      <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full" />
      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600/80 text-white text-[10px] rounded">LIVE</div>
    </div>
  );
};
