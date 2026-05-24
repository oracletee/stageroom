export class ImageCache {
  private cache = new Map<string, HTMLImageElement>();

  get(sourceId: string, url: string): HTMLImageElement | undefined {
    const existing = this.cache.get(sourceId);
    if (existing) {
      if (existing.getAttribute('data-src') !== url) {
        existing.src = url;
        existing.setAttribute('data-src', url);
      }
      return existing;
    }
    const img = new Image();
    img.setAttribute('data-src', url);
    img.src = url;
    this.cache.set(sourceId, img);
    return img;
  }

  remove(sourceId: string): void {
    this.cache.delete(sourceId);
  }

  destroy(): void {
    this.cache.clear();
  }
}
