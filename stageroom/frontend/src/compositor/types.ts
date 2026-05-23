export type Coord1D = number;

export type SceneLayerType = 'video' | 'text' | 'image' | 'lower-third' | 'background';

export interface NormalizedRect {
  x: Coord1D;
  y: Coord1D;
  width: Coord1D;
  height: Coord1D;
}

export interface SceneLayer {
  sourceId: string;
  type: SceneLayerType;
  rect: NormalizedRect;
  zIndex: number;
  opacity: number;
  text?: string;
  fontSize?: Coord1D;
  color?: string;
  backgroundColor?: string;
  ltName?: string;
  ltTitle?: string;
  bgColor?: string;
  imageUrl?: string;
  animationUrl?: string;
}

export interface Renderer {
  init(canvas: HTMLCanvasElement): void;
  clear(): void;
  drawVideo(video: HTMLVideoElement, rect: NormalizedRect, opacity: number): void;
  drawImage(img: HTMLImageElement, rect: NormalizedRect, opacity: number): void;
  drawText(layer: SceneLayer): void;
  drawLowerThird(layer: SceneLayer): void;
  drawBackground(color: string): void;
  drawCanary(hue: number): void;
  flush(): void;
}
