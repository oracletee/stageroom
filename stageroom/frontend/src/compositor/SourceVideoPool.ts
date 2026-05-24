class SourceVideoPool {
  private elements = new Map<string, HTMLVideoElement>();
  private hlsMap = new Map<string, { hls: any; url: string }>();
  private container: HTMLElement | null = null;

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
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

  acquire(sourceId: string): HTMLVideoElement {
    let el = this.elements.get(sourceId);
    if (!el) {
      el = document.createElement('video');
      el.autoplay = true;
      el.muted = true;
      el.playsInline = true;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      el.className = 'w-full h-full object-cover';
      el.setAttribute('aria-hidden', 'true');
      this.elements.set(sourceId, el);
      this.getContainer().appendChild(el);
    }
    return el;
  }

  release(_sourceId: string): void {
    // No-op. Element stays in the hidden pool for compositor reuse.
  }

  get(sourceId: string): HTMLVideoElement | undefined {
    return this.elements.get(sourceId);
  }

  findEntry(sourceId: string, _videoEl?: HTMLVideoElement): { video: HTMLVideoElement } | undefined {
    const el = this.elements.get(sourceId);
    if (!el) return undefined;
    if (_videoEl && el !== _videoEl) return undefined;
    return { video: el };
  }

  setHls(videoEl: HTMLVideoElement, hls: any | null, url?: string): void {
    for (const [id, el] of this.elements) {
      if (el === videoEl) {
        if (hls) {
          this.hlsMap.set(id, { hls, url: url || '' });
        } else {
          this.hlsMap.delete(id);
        }
        return;
      }
    }
  }

  getHls(videoEl: HTMLVideoElement): any | null {
    for (const [id, el] of this.elements) {
      if (el === videoEl) {
        return this.hlsMap.get(id)?.hls || null;
      }
    }
    return null;
  }

  getHlsUrl(videoEl: HTMLVideoElement): string {
    for (const [id, el] of this.elements) {
      if (el === videoEl) {
        return this.hlsMap.get(id)?.url || '';
      }
    }
    return '';
  }

  remove(sourceId: string): void {
    const el = this.elements.get(sourceId);
    if (el) {
      const hls = this.hlsMap.get(sourceId);
      if (hls) {
        hls.hls.destroy();
      }
      el.pause();
      el.srcObject = null;
      el.src = '';
      el.load();
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    this.elements.delete(sourceId);
    this.hlsMap.delete(sourceId);
  }

  destroy(): void {
    for (const id of [...this.elements.keys()]) {
      this.remove(id);
    }
    this.elements.clear();
    this.hlsMap.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }

  get size(): number {
    return this.elements.size;
  }
}

export const sourceVideoPool = new SourceVideoPool();
