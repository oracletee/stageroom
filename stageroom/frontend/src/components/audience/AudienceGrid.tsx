import { useStreamStore, type StageMode } from '../../hooks/useStreamStore';
import { useLiveKit } from '../stage/LiveKitProvider';
import { AudienceTile } from './AudienceTile';

const modeStyles: Record<StageMode, { container: string; tileShape: string; label: string }> = {
  'ted-talk': { container: 'border-l-4 border-amber-500', tileShape: 'rounded-lg', label: 'TED Talk' },
  'podcast': { container: 'border-l-4 border-purple-500', tileShape: 'rounded-lg', label: 'Podcast' },
  'event': { container: 'border-l-4 border-pink-500', tileShape: 'rounded-lg', label: 'Event' },
  'worship': { container: 'border-l-4 border-blue-400', tileShape: 'rounded-lg', label: 'Worship' },
  'classroom': { container: 'border-l-4 border-green-500', tileShape: 'rounded-lg', label: 'Classroom' },
  'debate': { container: 'border-l-4 border-red-500', tileShape: 'rounded-lg', label: 'Debate' },
  'film-premiere': { container: 'border-l-4 border-yellow-600', tileShape: 'rounded-lg', label: 'Film Premiere' },
};

export const AudienceGrid: React.FC = () => {
  const { liveKitParticipants, spotlightParticipants, backstageParticipants, toggleSpotlight, addToBackstage, removeFromBackstage, appView, stageMode } = useStreamStore();
  const { participantStreams } = useLiveKit();

  const config = modeStyles[stageMode];

  const isSpotlighted = (id: string) => spotlightParticipants.includes(id);
  const isBackstage = (id: string) => backstageParticipants.includes(id);

  const gridCols = (count: number): string => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-3';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${config.container}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">
          {config.label} — Audience ({liveKitParticipants.length})
        </h3>
        {appView === 'host' && (
          <div className="flex gap-3 text-[10px] text-gray-500">
            <span>Stage: {spotlightParticipants.length}/6</span>
            <span>Backstage: {backstageParticipants.length}/6</span>
          </div>
        )}
      </div>

      {liveKitParticipants.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">No audience members yet</p>
      )}

      <div className={`grid ${gridCols(liveKitParticipants.length)} gap-3`}>
        {liveKitParticipants.map(p => {
          const spotlighted = isSpotlighted(p.identity);
          const backstage = isBackstage(p.identity);
          return (
            <div key={p.identity}
              className={`relative overflow-hidden rounded-lg border ${
                spotlighted ? 'border-yellow-500 ring-1 ring-yellow-500/50' :
                backstage ? 'border-purple-500/50' :
                'border-gray-700'
              }`}>
              <AudienceTile
                identity={p.identity}
                isLocal={false}
                isSpotlight={spotlighted}
                stream={participantStreams.get(p.identity)}
              />
              {spotlighted && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-yellow-600 text-white rounded text-[9px] font-medium z-10">
                  ON STAGE
                </div>
              )}
              {backstage && !spotlighted && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-600 text-white rounded text-[9px] font-medium z-10">
                  BACKSTAGE
                </div>
              )}
              {appView === 'host' && (
                <div className="absolute bottom-1 left-1 right-1 flex gap-1 z-10">
                  {spotlighted ? (
                    <button onClick={() => toggleSpotlight(p.identity)}
                      className="flex-1 px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-medium">
                      Remove
                    </button>
                  ) : (
                    <button onClick={() => toggleSpotlight(p.identity)}
                      className="flex-1 px-1 py-0.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-[9px] font-medium">
                      Spotlight
                    </button>
                  )}
                  {backstage ? (
                    <button onClick={() => removeFromBackstage(p.identity)}
                      className="flex-1 px-1 py-0.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-[9px] font-medium">
                      Unstage
                    </button>
                  ) : (
                    <button onClick={() => addToBackstage(p.identity)}
                      disabled={backstageParticipants.length >= 6}
                      className="flex-1 px-1 py-0.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded text-[9px] font-medium disabled:opacity-50">
                      Backstage
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
