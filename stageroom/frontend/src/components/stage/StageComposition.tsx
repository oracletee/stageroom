import { useStreamStore, type StageMode } from '../../hooks/useStreamStore';
import { useLiveKit } from './LiveKitProvider';
import { StageSlot } from './StageSlot';

interface StageCompositionProps {
  variant: 'preview' | 'program';
}

export const StageComposition: React.FC<StageCompositionProps> = ({ variant }) => {
  const { stageMode, spotlightParticipants, lyricText, sources, selectedSceneId, programSceneId, lowerThird, stageBackground } = useStreamStore();
  const { localStream, participantStreams } = useLiveKit();

  const sceneId = variant === 'preview' ? selectedSceneId : (programSceneId || selectedSceneId);
  const scene = useStreamStore.getState().scenes.find(s => s.id === sceneId);
  const activeSourceIds = scene?.sourceIds || [];

  const textOverlays = sources.filter(s => activeSourceIds.includes(s.id) && s.type === 'text-overlay' && s.isActive !== false);
  const lowerThirdSource = sources.find(s => activeSourceIds.includes(s.id) && s.type === 'lower-third' && s.isActive !== false);
  const bgSource = sources.find(s => activeSourceIds.includes(s.id) && s.type === 'stage-background' && s.isActive !== false);
  const screenSources = sources.filter(s => activeSourceIds.includes(s.id) && s.type === 'screen');
  const screenStream = null;

  const spotlightedStreams = spotlightParticipants
    .map(id => ({ identity: id, stream: participantStreams.get(id) || null }))
    .filter(s => s.stream);

  const positionClasses: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  const fontSizeClasses: Record<string, string> = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-3xl',
  };

  const renderTextOverlays = () => (
    <>
      {textOverlays.map(ov => (
        <div
          key={ov.id}
          className={`absolute ${positionClasses[ov.overlayPosition || 'bottom-left']} z-30`}
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
      <div className="absolute bottom-8 left-4 z-40">
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

  const renderTedTalk = () => (
    <StageSlot stream={localStream} label="Camera" style={{ top: '0', left: '0', width: '100%', height: '100%' }} />
  );

  const renderPodcast = () => {
    const feeds = [
      { identity: 'Host', stream: localStream },
      ...spotlightedStreams,
    ].slice(0, 4);

    if (feeds.length === 0) {
      return <div className="flex items-center justify-center h-full text-gray-500 text-sm">No sources</div>;
    }

    const positions = [
      { top: '0', left: '0', width: '50%', height: feeds.length > 2 ? '50%' : '100%' },
      { top: '0', left: '50%', width: '50%', height: feeds.length > 2 ? '50%' : '100%' },
      { top: '50%', left: '0', width: '50%', height: '50%' },
      { top: '50%', left: '50%', width: '50%', height: '50%' },
    ];

    return (
      <>
        {feeds.map((feed, i) => (
          <StageSlot key={feed.identity} stream={feed.stream} label={feed.identity} style={positions[i]} />
        ))}
      </>
    );
  };

  const renderEvent = () => {
    const reactionSlots = spotlightedStreams.slice(0, 2);
    return (
      <>
        <StageSlot stream={localStream} label="Stage" style={{ top: '0', left: '0', width: '100%', height: '100%' }} />
        <div className="absolute" style={{ top: '65%', left: '68%', width: '32%', height: '35%', zIndex: 2 }}>
          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
            {reactionSlots.length > 0 ? reactionSlots.map(s => (
              <StageSlot key={s.identity} stream={s.stream} label={s.identity}
                style={{ top: '0', left: '0', width: '100%', height: '100%' }} />
            )) : (
              <>
                <div className="bg-gray-800/60 rounded flex items-center justify-center text-[10px] text-gray-500">Reaction</div>
                <div className="bg-gray-800/60 rounded flex items-center justify-center text-[10px] text-gray-500">Reaction</div>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderWorship = () => (
    <>
      <StageSlot stream={localStream} label="Camera" style={{ top: '68%', left: '68%', width: '32%', height: '32%' }} zIndex={2} />
      <div className="absolute" style={{ top: '0', left: '0', width: '68%', height: '100%', zIndex: 1 }}>
        {localStream && (
          <video autoPlay muted playsInline ref={el => { if (el && localStream) el.srcObject = localStream; el?.play().catch(() => {}); }}
            className="w-full h-full object-cover absolute inset-0" />
        )}
        {lyricText && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
            <p className="text-white text-2xl md:text-3xl font-bold text-center px-8 leading-relaxed">{lyricText}</p>
          </div>
        )}
      </div>
      {spotlightedStreams.length > 0 && (
        <div className="absolute" style={{ top: '68%', left: '0', width: '32%', height: '32%', zIndex: 2 }}>
          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
            {spotlightedStreams.map(s => (
              <StageSlot key={s.identity} stream={s.stream} label={s.identity}
                style={{ top: '0', left: '0', width: '100%', height: '100%' }} />
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderClassroom = () => (
    <>
      <StageSlot stream={screenStream} label="Screen Share" style={{ top: '0', left: '0', width: '60%', height: '85%' }} />
      <StageSlot stream={localStream} label="Teacher" style={{ top: '0', left: '60%', width: '40%', height: '85%' }} />
      {spotlightedStreams.length > 0 && (
        <div className="absolute flex" style={{ bottom: '0', left: '0', width: '100%', height: '15%', zIndex: 2 }}>
          <div className="flex w-full h-full gap-0.5">
            {spotlightedStreams.map(s => (
              <StageSlot key={s.identity} stream={s.stream} label={s.identity}
                style={{ top: '0', left: '0', width: '100%', height: '100%' }} />
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderDebate = () => {
    const speakers = [
      { identity: 'Speaker 1', stream: localStream },
      ...spotlightedStreams.slice(0, 1),
    ];
    return (
      <>
        {speakers.length >= 1 && (
          <StageSlot stream={speakers[0].stream} label={speakers[0].identity}
            style={{ top: '0', left: '0', width: speakers.length > 1 ? '50%' : '100%', height: '100%' }} />
        )}
        {speakers.length >= 2 && (
          <StageSlot stream={speakers[1].stream} label={speakers[1].identity}
            style={{ top: '0', left: '50%', width: '50%', height: '100%' }} />
        )}
      </>
    );
  };

  const renderFilmPremiere = () => {
    const reactionSlots = spotlightedStreams.slice(0, 2);
    return (
      <>
        <StageSlot stream={localStream} label="Film" style={{ top: '0', left: '0', width: '100%', height: '100%' }} />
        <StageSlot stream={null} label="Host" style={{ top: '72%', left: '2%', width: '18%', height: '26%' }} zIndex={2} />
        <div className="absolute" style={{ top: '72%', left: '21%', width: '36%', height: '26%', zIndex: 2 }}>
          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
            {reactionSlots.length > 0 ? reactionSlots.map(s => (
              <StageSlot key={s.identity} stream={s.stream} label={s.identity}
                style={{ top: '0', left: '0', width: '100%', height: '100%' }} />
            )) : (
              <>
                <div className="bg-gray-800/60 rounded flex items-center justify-center text-[10px] text-gray-500">Reaction</div>
                <div className="bg-gray-800/60 rounded flex items-center justify-center text-[10px] text-gray-500">Reaction</div>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderers: Record<StageMode, () => React.ReactNode> = {
    'ted-talk': renderTedTalk,
    'podcast': renderPodcast,
    'event': renderEvent,
    'worship': renderWorship,
    'classroom': renderClassroom,
    'debate': renderDebate,
    'film-premiere': renderFilmPremiere,
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: (bgSource?.bgColor || stageBackground) || undefined,
        ...((bgSource?.bgColor || stageBackground)?.startsWith('linear-gradient') ? { backgroundImage: bgSource?.bgColor || stageBackground } : {}),
      }}
    >
      {renderers[stageMode]()}
      {renderTextOverlays()}
      {renderLowerThird()}
      {variant === 'preview' && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600/80 text-white text-[10px] rounded z-50">
          PREVIEW
        </div>
      )}
    </div>
  );
};
