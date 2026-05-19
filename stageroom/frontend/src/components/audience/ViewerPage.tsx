import { useStreamStore } from '../../hooks/useStreamStore';
import { StageComposition } from '../stage/StageComposition';
import { AudienceGrid } from './AudienceGrid';
import { UnifiedChat } from '../chat/UnifiedChat';

export const ViewerPage: React.FC = () => {
  const { stageMode, isStreaming } = useStreamStore();

  const modeLabels: Record<string, string> = {
    'ted-talk': 'TED Talk',
    'podcast': 'Podcast',
    'event': 'Event',
    'worship': 'Worship',
    'classroom': 'Classroom',
    'debate': 'Debate',
    'film-premiere': 'Film Premiere',
  };

  return (
    <div className="space-y-6">
      {/* Stage display */}
      <div className={`relative rounded-lg overflow-hidden bg-gray-900 border-t-2
        ${stageMode === 'ted-talk' ? 'border-amber-500' :
          stageMode === 'podcast' ? 'border-purple-500' :
          stageMode === 'event' ? 'border-pink-500' :
          stageMode === 'worship' ? 'border-blue-400' :
          stageMode === 'classroom' ? 'border-green-500' :
          stageMode === 'debate' ? 'border-red-500' :
          stageMode === 'film-premiere' ? 'border-yellow-600' : 'border-gray-700'}
        ${isStreaming ? 'ring-2 ring-red-500' : ''}`}
      >
        <div className="aspect-video relative">
          <StageComposition variant="program" />
        </div>
        {isStreaming && (
          <div className="absolute top-2 right-2 flex items-center space-x-1.5 bg-black/60 px-2 py-1 rounded z-10">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-semibold">LIVE</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded z-10">
          <span className="text-white text-xs">{modeLabels[stageMode]}</span>
        </div>
      </div>

      {/* Audience grid */}
      <AudienceGrid />

      {/* Chat */}
      <UnifiedChat />
    </div>
  );
};
