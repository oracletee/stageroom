# Fix: Video element never reaches readyState >= 2 in ProgramCompositor

## Problem
The `VideoElementCache` creates `<video>` elements without explicit `width`/`height`. Chrome throttles video decoding for off-screen elements that lack explicit dimensions, causing `videoWidth`/`videoHeight` to remain 0 and `readyState` to stay at `HAVE_NOTHING` (0). The `waitForVideoReady` poll in `ProgramCompositor.tsx` times out after 10 seconds, and WHIP starts without decoded video.

## Changes

### 1. `VideoElementCache.ts` — Set explicit video dimensions
Add `el.width = 1920; el.height = 1080;` on created video elements to prevent Chrome throttling.

**Location:** `VideoElementCache.ts:28-35`

```diff
       el = document.createElement('video');
       el.autoplay = true;
       el.muted = true;
       el.playsInline = true;
       el.preload = 'auto';
+      el.width = 1920;
+      el.height = 1080;
       el.setAttribute('aria-hidden', 'true');
```

### 2. `ProgramCompositor.tsx` — Log `play()` failures in `feedStreamToCache`
Replace silent catch with a logged warning so we can debug play() rejections.

**Location:** `ProgramCompositor.tsx:26`

```diff
-    videoEl.play().catch(() => {});
+    videoEl.play().catch((err) => console.warn('[Compositor] play() failed for', sourceId.slice(0, 8), err));
```

### 3. `ProgramCompositor.tsx` — Retry `play()` on paused video elements in render loop
Add a recovery block after the paint step that retries `play()` on video elements that are paused despite having a `srcObject` and `readyState < 2`.

**Location:** After line 177 (after `renderer.flush()` and before the frame stats log), insert:

```typescript
      // Recovery: retry play() on video elements stuck paused
      for (const layer of layers) {
        if (layer.type === 'video') {
          const el = videoCache.get(layer.sourceId);
          if (el.paused && el.srcObject && el.readyState < 2) {
            el.play().catch(() => {});
          }
        }
      }
```
