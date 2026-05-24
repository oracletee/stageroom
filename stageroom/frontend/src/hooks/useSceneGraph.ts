import { useMemo } from 'react';
import { useStreamStore, type SourceItem } from './useStreamStore';
import { type SceneLayer, type NormalizedRect } from '../compositor/types';

function computeVideoPositions(videoSources: SourceItem[]): NormalizedRect[] {
  if (videoSources.length === 0) return [];
  if (videoSources.length === 1) {
    return [{ x: 0, y: 0, width: 1, height: 1 }];
  }
  if (videoSources.length === 2) {
    return [
      { x: 0, y: 0, width: 0.5, height: 1 },
      { x: 0.5, y: 0, width: 0.5, height: 1 },
    ];
  }
  const gridPositions: NormalizedRect[] = [
    { x: 0, y: 0, width: 0.5, height: 0.5 },
    { x: 0.5, y: 0, width: 0.5, height: 0.5 },
    { x: 0, y: 0.5, width: 0.5, height: 0.5 },
    { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    { x: 0, y: 0, width: 0.3333, height: 0.5 },
    { x: 0.3333, y: 0, width: 0.3333, height: 0.5 },
  ];
  return gridPositions.slice(0, videoSources.length);
}

function overlayPositionToRect(
  position: string | undefined,
  offsetX: number | undefined,
  offsetY: number | undefined,
  defaultWidth: number,
  defaultHeight: number,
): NormalizedRect {
  const ox = (offsetX ?? 0) / 100;
  const oy = (offsetY ?? 0) / 100;
  const w = defaultWidth;
  const h = defaultHeight;

  switch (position) {
    case 'top-left':
      return { x: 0.02 + ox, y: 0.02 + oy, width: w, height: h };
    case 'top-center':
      return { x: 0.5 - w / 2 + ox, y: 0.02 + oy, width: w, height: h };
    case 'top-right':
      return { x: 1 - w - 0.02 + ox, y: 0.02 + oy, width: w, height: h };
    case 'center':
      return { x: 0.5 - w / 2 + ox, y: 0.5 - h / 2 + oy, width: w, height: h };
    case 'bottom-left':
      return { x: 0.02 + ox, y: 1 - h - 0.02 + oy, width: w, height: h };
    case 'bottom-center':
      return { x: 0.5 - w / 2 + ox, y: 1 - h - 0.02 + oy, width: w, height: h };
    case 'bottom-right':
      return { x: 1 - w - 0.02 + ox, y: 1 - h - 0.02 + oy, width: w, height: h };
    default:
      return { x: 0.02 + ox, y: 0.02 + oy, width: w, height: h };
  }
}

function fontSizeToNormalized(size: string | undefined): number {
  switch (size) {
    case 'small': return 0.03;
    case 'medium': return 0.05;
    case 'large': return 0.09;
    default: return 0.05;
  }
}

export function useSceneGraph(): SceneLayer[] {
  const programSnapshot = useStreamStore((s) => s.programSnapshot);
  const stageMode = useStreamStore((s) => s.stageMode);

  return useMemo(() => {
    if (!programSnapshot) return [];

    const sources = programSnapshot.sources;
    const layers: SceneLayer[] = [];

    const videoSources = sources.filter((s) =>
      s.isActive !== false && ['camera', 'screen', 'media', 'rtmp'].includes(s.type),
    );
    const textOverlays = sources.filter((s) =>
      s.isActive !== false && s.type === 'text-overlay',
    );
    const imageOverlays = sources.filter((s) =>
      s.isActive !== false && s.type === 'image-overlay',
    );
    const animatedOverlays = sources.filter((s) =>
      s.isActive !== false && s.type === 'animated-overlay',
    );
    const lowerThirdSource = sources.find((s) =>
      s.isActive !== false && s.type === 'lower-third',
    );
    const bgSource = sources.find((s) =>
      s.isActive !== false && s.type === 'stage-background',
    );

    if (bgSource?.bgColor) {
      layers.push({
        sourceId: bgSource.id,
        type: 'background',
        rect: { x: 0, y: 0, width: 1, height: 1 },
        zIndex: 0,
        opacity: 1,
        bgColor: bgSource.bgColor,
      });
    }

    const videoPositions = computeVideoPositions(videoSources);
    videoSources.forEach((source, i) => {
      layers.push({
        sourceId: source.id,
        type: 'video',
        rect: videoPositions[i],
        zIndex: 1,
        opacity: 1,
      });
    });

    imageOverlays.forEach((source) => {
      const rect = overlayPositionToRect(
        source.overlayPosition,
        source.offsetX,
        source.offsetY,
        0.3,
        0.3,
      );
      layers.push({
        sourceId: source.id,
        type: 'static-image',
        rect,
        zIndex: 10,
        opacity: source.imageOpacity ?? 1,
        imageUrl: source.imageUrl,
      });
    });

    animatedOverlays.forEach((source) => {
      const rect = overlayPositionToRect(
        source.overlayPosition,
        source.offsetX,
        source.offsetY,
        0.3,
        0.3,
      );
      layers.push({
        sourceId: source.id,
        type: 'image',
        rect,
        zIndex: 50,
        opacity: source.animationOpacity ?? 1,
        animationUrl: source.animationUrl,
      });
    });

    textOverlays.forEach((source) => {
      const text = source.overlayText || source.label;
      const fontSize = fontSizeToNormalized(source.overlayFontSize);
      const textWidth = text.length * fontSize * 0.6;
      const textHeight = fontSize * 1.5;
      const rect = overlayPositionToRect(
        source.overlayPosition,
        source.offsetX,
        source.offsetY,
        Math.min(textWidth, 0.8),
        textHeight,
      );
      layers.push({
        sourceId: source.id,
        type: 'text',
        rect,
        zIndex: 20,
        opacity: 1,
        text,
        fontSize,
        color: source.overlayTextColor || '#ffffff',
        backgroundColor: source.overlayBackgroundColor,
      });
    });

    if (lowerThirdSource) {
      const lt = {
        visible: lowerThirdSource.ltVisible !== false,
        name: lowerThirdSource.ltName || '',
        title: lowerThirdSource.ltTitle || '',
      };
      if (lt.visible && lt.name) {
        layers.push({
          sourceId: lowerThirdSource.id,
          type: 'lower-third',
          rect: { x: 0.02, y: 0.85, width: 0.45, height: 0.1 },
          zIndex: 30,
          opacity: 1,
          ltName: lt.name,
          ltTitle: lt.title,
        });
      }
    }

    layers.sort((a, b) => a.zIndex - b.zIndex);

    return layers;
  }, [programSnapshot, stageMode]);
}
