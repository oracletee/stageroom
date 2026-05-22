import { useState, useCallback, useRef } from 'react';
import { useStreamStore, type StageMode } from '../../hooks/useStreamStore';
import { useLiveKit } from './LiveKitProvider';
import { SourceRenderer } from '../sources/SourceRenderer';

interface StageCompositionProps {
  variant: 'preview' | 'program';
}

export const StageComposition: React.FC<StageCompositionProps> = ({ variant }) => {
  const { stageMode, spotlightParticipants, lyricText, sources, scenes, selectedSceneId, programSceneId, programSnapshot, lowerThird, stageBackground, updateSourceField } = useStreamStore();
  const { localStream, participantStreams } = useLiveKit();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    origOffsetX: number;
    origOffsetY: number;
  } | null>(null);

  let activeSources: typeof sources;
  let videoSources: typeof sources;
  let textOverlays: typeof sources;
  let imageOverlays: typeof sources;
  let animatedOverlays: typeof sources;
  let lowerThirdSource: typeof sources[0] | undefined;
  let bgSource: typeof sources[0] | undefined;

  if (variant === 'program' && programSnapshot) {
    const ordered = programSnapshot.sources
      .map(s => (s.isActive !== false ? s : null))
      .filter((s): s is typeof programSnapshot.sources[0] => s !== null);
    activeSources = ordered;
    videoSources = ordered.filter(s => ['camera', 'screen', 'media', 'rtmp'].includes(s.type));
    textOverlays = ordered.filter(s => s.type === 'text-overlay');
    imageOverlays = ordered.filter(s => s.type === 'image-overlay');
    animatedOverlays = ordered.filter(s => s.type === 'animated-overlay');
    lowerThirdSource = ordered.find(s => s.type === 'lower-third');
    bgSource = ordered.find(s => s.type === 'stage-background');
  } else if (variant === 'preview') {
    const scene = scenes.find(s => s.id === selectedSceneId);
    const orderedSourceIds = scene?.sourceIds || [];
    const liveActive = orderedSourceIds
      .map(id => sources.find(s => s.id === id))
      .filter((s): s is typeof sources[0] => s !== undefined && s.isActive !== false);
    activeSources = liveActive;
    videoSources = liveActive.filter(s => ['camera', 'screen', 'media', 'rtmp'].includes(s.type));
    textOverlays = liveActive.filter(s => s.type === 'text-overlay');
    imageOverlays = liveActive.filter(s => s.type === 'image-overlay');
    animatedOverlays = liveActive.filter(s => s.type === 'animated-overlay');
    lowerThirdSource = liveActive.find(s => s.type === 'lower-third');
    bgSource = liveActive.find(s => s.type === 'stage-background');
  } else {
    activeSources = [];
    videoSources = [];
    textOverlays = [];
    imageOverlays = [];
    animatedOverlays = [];
    lowerThirdSource = undefined;
    bgSource = undefined;
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, sourceId: string, currentOffsetX = 0, currentOffsetY = 0) => {
    if (variant === 'program') return;
    e.preventDefault();
    setDragging({
      id: sourceId,
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: currentOffsetX,
      origOffsetY: currentOffsetY,
    });
  }, [variant]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || variant === 'program') return;
    const dx = (e.clientX - dragging.startX) / (containerRef.current?.offsetWidth || 1) * 100;
    const dy = (e.clientY - dragging.startY) / (containerRef.current?.offsetHeight || 1) * 100;
    const newOffsetX = Math.round((dragging.origOffsetX + dx) * 10) / 10;
    const newOffsetY = Math.round((dragging.origOffsetY + dy) * 10) / 10;
    updateSourceField(dragging.id, 'offsetX', newOffsetX);
    updateSourceField(dragging.id, 'offsetY', newOffsetY);
  }, [dragging, variant, updateSourceField]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  if (variant === 'program' && !programSnapshot) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-gray-900">
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
          Nothing on Program
        </div>
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600/80 text-white text-[10px] rounded z-50">
          PROGRAM
        </div>
      </div>
    );
  }

  const positionClasses: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  const transformOrigins: Record<string, string> = {
    'top-left': 'top left',
    'top-center': 'top center',
    'top-right': 'top right',
    'center': 'center',
    'bottom-left': 'bottom left',
    'bottom-center': 'bottom center',
    'bottom-right': 'bottom right',
  };

  const fontSizeClasses: Record<string, string> = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-3xl',
  };

  const renderOverlayContent = (ov: typeof sources[0]) => {
    if (ov.type === 'image-overlay') {
      return ov.imageUrl ? (
        <img src={ov.imageUrl} alt={ov.label}
          className="max-w-full max-h-full"
          style={{ cursor: variant === 'preview' ? 'grab' : undefined,
            transformOrigin: transformOrigins[ov.overlayPosition || 'center'],
            transform: `scale(${ov.imageScale ?? 1}) translate(${ov.offsetX ?? 0}vw, ${ov.offsetY ?? 0}vw)` }}
          draggable={false} />
      ) : (
        <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-gray-400">
          {ov.label} (no image)
        </div>
      );
    }
    if (ov.type === 'animated-overlay') {
      return ov.animationUrl ? (
        <video src={ov.animationUrl} autoPlay loop muted playsInline
          className="max-w-full max-h-full"
          style={{ cursor: variant === 'preview' ? 'grab' : undefined,
            transformOrigin: transformOrigins[ov.overlayPosition || 'center'],
            transform: `scale(${ov.animationScale ?? 1}) translate(${ov.offsetX ?? 0}vw, ${ov.offsetY ?? 0}vw)` }}
          draggable={false} />
      ) : (
        <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-gray-400">
          {ov.label} (no file)
        </div>
      );
    }
    return null;
  };

  const renderVideoSources = () => {
    if (videoSources.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
          No active sources in scene
        </div>
      );
    }

    const isReadOnly = variant === 'program';

    if (videoSources.length === 1) {
      return (
        <SourceRenderer
          sourceId={videoSources[0].id}
          type={videoSources[0].type}
          label={videoSources[0].label}
          previewUrl={videoSources[0].previewUrl}
          playbackUrl={videoSources[0].playbackUrl}
          style={{ top: '0', left: '0', width: '100%', height: '100%' }}
          zIndex={1}
          readOnly={isReadOnly}
          isActive={videoSources[0].isActive}
        />
      );
    }

    if (videoSources.length === 2) {
      return (
        <>
          <SourceRenderer
            sourceId={videoSources[0].id}
            type={videoSources[0].type}
            label={videoSources[0].label}
            previewUrl={videoSources[0].previewUrl}
            playbackUrl={videoSources[0].playbackUrl}
            style={{ top: '0', left: '0', width: '50%', height: '100%' }}
            zIndex={1}
            readOnly={isReadOnly}
            isActive={videoSources[0].isActive}
          />
          <SourceRenderer
            sourceId={videoSources[1].id}
            type={videoSources[1].type}
            label={videoSources[1].label}
            previewUrl={videoSources[1].previewUrl}
            playbackUrl={videoSources[1].playbackUrl}
            style={{ top: '0', left: '50%', width: '50%', height: '100%' }}
            zIndex={1}
            readOnly={isReadOnly}
            isActive={videoSources[1].isActive}
          />
        </>
      );
    }

    const positions = [
      { top: '0', left: '0', width: '50%', height: '50%' },
      { top: '0', left: '50%', width: '50%', height: '50%' },
      { top: '50%', left: '0', width: '50%', height: '50%' },
      { top: '50%', left: '50%', width: '50%', height: '50%' },
      { top: '0', left: '0', width: '33.33%', height: '50%' },
      { top: '0', left: '33.33%', width: '33.33%', height: '50%' },
    ];

    return (
      <>
        {videoSources.slice(0, 6).map((source, i) => (
          <SourceRenderer
            key={source.id}
            sourceId={source.id}
            type={source.type}
            label={source.label}
            previewUrl={source.previewUrl}
            playbackUrl={source.playbackUrl}
            style={positions[i]}
            zIndex={1}
            readOnly={isReadOnly}
            isActive={source.isActive}
          />
        ))}
      </>
    );
  };

  const renderOverlay = (ov: typeof sources[0], isDragging: boolean) => (
    <div
      key={ov.id}
      data-source-id={ov.id}
      data-source-type={ov.type === 'image-overlay' ? 'image' : 'animation'}
      className={`absolute ${positionClasses[ov.overlayPosition || 'center']} ${isDragging ? 'z-50' : 'z-20'} select-none`}
      style={{ opacity: ov.type === 'image-overlay' ? (ov.imageOpacity ?? 1) : (ov.animationOpacity ?? 1) }}
      onMouseDown={(e) => handleMouseDown(e, ov.id, ov.offsetX, ov.offsetY)}
    >
      {renderOverlayContent(ov)}
    </div>
  );

  const renderTextOverlays = () => (
    <>
      {textOverlays.map(ov => (
        <div
          key={ov.id}
          data-source-id={ov.id}
          data-source-type="text"
          className={`absolute ${positionClasses[ov.overlayPosition || 'bottom-left']} z-30 select-none`}
          onMouseDown={(e) => handleMouseDown(e, ov.id, ov.offsetX, ov.offsetY)}
          style={{ cursor: variant === 'preview' ? 'grab' : undefined,
            transform: `translate(${ov.offsetX ?? 0}vw, ${ov.offsetY ?? 0}vw)` }}
        >
          <div
            className={`px-4 py-2 rounded ${fontSizeClasses[ov.overlayFontSize || 'medium']} font-semibold`}
            style={{
              color: ov.overlayTextColor || '#ffffff',
              backgroundColor: ov.overlayBackgroundColor && ov.overlayBackgroundColor !== 'transparent' ? ov.overlayBackgroundColor : 'transparent',
            }}
          >
            {ov.overlayText || ov.label}
          </div>
        </div>
      ))}
    </>
  );

  const renderImageOverlays = () => (
    <>
      {imageOverlays.map(ov => renderOverlay(ov, dragging?.id === ov.id))}
    </>
  );

  const renderAnimatedOverlays = () => (
    <>
      {animatedOverlays.map(ov => renderOverlay(ov, dragging?.id === ov.id))}
    </>
  );

  const renderLowerThird = () => {
    const lt = lowerThirdSource
      ? {
          visible: lowerThirdSource.ltVisible !== false,
          name: lowerThirdSource.ltName || '',
          title: lowerThirdSource.ltTitle || '',
          template: (lowerThirdSource.ltTemplate || 'standard') as 'minimal' | 'standard' | 'social',
        }
      : lowerThird;

    if (!lt.visible || !lt.name) return null;

    const templateStyles: Record<string, string> = {
      minimal: 'bg-gradient-to-r from-black/80 to-transparent pl-4 pr-8 py-2',
      standard: 'bg-black/80 pl-4 pr-8 py-2 border-l-4 border-blue-500',
      social: 'bg-gradient-to-r from-purple-900/90 to-black/80 pl-4 pr-8 py-2 rounded-r-lg',
    };

    return (
      <div data-source-type="lower-third" className="absolute bottom-8 left-4 z-40">
        <div className={templateStyles[lt.template]}>
          <p className="text-white text-base font-bold">{lt.name}</p>
          {lt.title && (
            <p className="text-gray-300 text-xs mt-0.5">
              {lt.template === 'social' ? `@${lt.title}` : lt.title}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      data-variant={variant}
      className="relative w-full h-full overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundColor: (bgSource?.bgColor || stageBackground) || undefined,
        ...((bgSource?.bgColor || stageBackground)?.startsWith('linear-gradient') ? { backgroundImage: bgSource?.bgColor || stageBackground } : {}),
      }}
    >
      {renderVideoSources()}
      {renderTextOverlays()}
      {renderImageOverlays()}
      {renderAnimatedOverlays()}
      {renderLowerThird()}
      {variant === 'preview' && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600/80 text-white text-[10px] rounded z-50">
          PREVIEW
        </div>
      )}
      {variant === 'program' && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600/80 text-white text-[10px] rounded z-50">
          PROGRAM
        </div>
      )}
    </div>
  );
};
