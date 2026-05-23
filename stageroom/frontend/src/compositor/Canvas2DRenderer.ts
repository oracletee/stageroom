import { type Renderer, type NormalizedRect, type SceneLayer } from './types';

export class Canvas2DRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;

  init(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = canvas.width;
    this.height = canvas.height;
  }

  private nr(r: NormalizedRect): { x: number; y: number; w: number; h: number } {
    return {
      x: r.x * this.width,
      y: r.y * this.height,
      w: r.width * this.width,
      h: r.height * this.height,
    };
  }

  clear(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(color: string): void {
    if (!this.ctx) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawVideo(video: HTMLVideoElement, rect: NormalizedRect, opacity: number): void {
    if (!this.ctx || !video.videoWidth) return;
    const r = this.nr(rect);
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.drawImage(video, r.x, r.y, r.w, r.h);
    this.ctx.restore();
  }

  drawImage(img: HTMLImageElement, rect: NormalizedRect, opacity: number): void {
    if (!this.ctx || !img.complete) return;
    const r = this.nr(rect);
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.drawImage(img, r.x, r.y, r.w, r.h);
    this.ctx.restore();
  }

  drawText(layer: SceneLayer): void {
    if (!this.ctx || !layer.text) return;
    const r = this.nr(layer.rect);
    const fs = layer.fontSize ? layer.fontSize * this.height : 0.05 * this.height;

    if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = layer.backgroundColor;
      this.ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    this.ctx.fillStyle = layer.color || '#ffffff';
    this.ctx.font = `600 ${fs}px sans-serif`;
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'left';
    const pad = fs * 0.4;
    this.ctx.fillText(layer.text, r.x + pad, r.y + pad);
  }

  drawLowerThird(layer: SceneLayer): void {
    if (!this.ctx || !layer.ltName) return;
    const r = this.nr(layer.rect);
    const barW = 6 * (this.width / 1920);

    this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
    this.ctx.fillRect(r.x, r.y, r.w, r.h);

    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(r.x, r.y, barW, r.h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${28 * (this.height / 1080)}px sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(layer.ltName, r.x + Math.max(barW, 24 * (this.width / 1920)), r.y + r.h * 0.35);

    if (layer.ltTitle) {
      this.ctx.fillStyle = '#d1d5db';
      this.ctx.font = `${18 * (this.height / 1080)}px sans-serif`;
      this.ctx.fillText(layer.ltTitle, r.x + Math.max(barW, 24 * (this.width / 1920)), r.y + r.h * 0.72);
    }
  }

   drawCanary(hue: number): void {
     if (!this.ctx) return;
     // Primary canary dot - larger and more visible
     const s = 24 * (this.width / 1920);
     this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
     this.ctx.fillRect(this.width - s - 4, this.height - s - 4, s, s);
     
     // Secondary moving element - creates more change to keep encoder active
     const t = Date.now() * 0.002; // Slow oscillation
     const offset = Math.sin(t) * 20 * (this.width / 1920);
     this.ctx.fillStyle = `hsl(${(hue + 120) % 360}, 100%, 50%)`;
     this.ctx.fillRect(this.width - s - 4 + offset, this.height - s - 4, s * 0.6, s * 0.6);
   }

  flush(): void {
    // Canvas2D draws immediately, no-op
  }
}
