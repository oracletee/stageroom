export class VideoElementCache {
  private cache = new Map<string, HTMLVideoElement>();
  private container: HTMLElement | null = null;

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      // Must use full dimensions, not 1x1.
      // Chrome throttles video decoding for sub-2px or off-screen elements
      // and blocks autoplay for visibility:hidden/opacity:0 elements.
      // Non-zero opacity + in-viewport keeps Chrome from throttling.
      this.container.style.position = 'fixed';
      this.container.style.left = '0';
      this.container.style.top = '0';
      this.container.style.width = '1920px';
      this.container.style.height = '1080px';
      this.container.style.pointerEvents = 'none';
      this.container.style.opacity = '0.01';
      this.container.style.zIndex = '-1';
      this.container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  get(sourceId: string): HTMLVideoElement {
    let el = this.cache.get(sourceId);
    if (!el) {
      el = document.createElement('video');
      el.autoplay = true;
      el.muted = true;
      el.playsInline = true;
      el.preload = 'auto';
      el.width = 1920;
      el.height = 1080;
      el.setAttribute('aria-hidden', 'true');
      this.getContainer().appendChild(el);
      this.cache.set(sourceId, el);
    }
    return el;
  }

  remove(sourceId: string): void {
    const el = this.cache.get(sourceId);
    if (!el) return;
    el.pause();
    el.srcObject = null;
    el.load();
    if (el.parentNode) el.parentNode.removeChild(el);
    this.cache.delete(sourceId);
  }

  destroy(): void {
    for (const [id] of this.cache) {
      this.remove(id);
    }
    this.cache.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }

  get size(): number {
    return this.cache.size;
  }
}
