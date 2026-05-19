import { useState } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';
import { useLiveKit } from '../stage/LiveKitProvider';

export const Backstage: React.FC = () => {
  const { backstageParticipants, removeFromBackstage, toggleSpotlight } = useStreamStore();
  const { participantStreams } = useLiveKit();
  const [guestMeta, setGuestMeta] = useState<Record<string, { name: string; title: string }>>({});

  const backstageData = backstageParticipants.map(id => ({
    identity: id,
    stream: participantStreams.get(id),
    meta: guestMeta[id] || { name: id, title: '' },
  }));

  const handleBringToStage = (identity: string) => {
    toggleSpotlight(identity);
    removeFromBackstage(identity);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Backstage ({backstageData.length})</h3>
        <span className="text-[10px] text-gray-500">Max 6</span>
      </div>

      {backstageData.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">
          No participants backstage. Select "Send to Backstage" from Audience Grid.
        </p>
      )}

      <div className="space-y-3">
        {backstageData.map(guest => (
          <div key={guest.identity}
            className="bg-gray-900 rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{guest.stream ? '🎤' : '🎧'}</span>
              <span className="text-sm font-medium text-white truncate min-w-0">{guest.identity}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Name</label>
                <input value={guestMeta[guest.identity]?.name || ''}
                  onChange={e => setGuestMeta(prev => ({ ...prev, [guest.identity]: { ...prev[guest.identity], name: e.target.value, title: prev[guest.identity]?.title || '' } }))}
                  placeholder="Display name"
                  className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Title</label>
                <input value={guestMeta[guest.identity]?.title || ''}
                  onChange={e => setGuestMeta(prev => ({ ...prev, [guest.identity]: { ...prev[guest.identity], name: prev[guest.identity]?.name || '', title: e.target.value } }))}
                  placeholder="Role or topic"
                  className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
              </div>
            </div>
            <button onClick={() => handleBringToStage(guest.identity)}
              className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium">
              Bring to Stage
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
