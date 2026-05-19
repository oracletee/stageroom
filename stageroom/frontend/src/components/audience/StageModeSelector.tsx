import { useStreamStore, type StageMode } from '../../hooks/useStreamStore';

const modes: { value: StageMode; label: string; icon: string }[] = [
  { value: 'ted-talk', label: 'TED Talk', icon: '🎤' },
  { value: 'podcast', label: 'Podcast', icon: '🎙️' },
  { value: 'event', label: 'Event', icon: '🎪' },
  { value: 'worship', label: 'Worship', icon: '🙏' },
  { value: 'classroom', label: 'Classroom', icon: '📚' },
  { value: 'debate', label: 'Debate', icon: '⚖️' },
  { value: 'film-premiere', label: 'Film Premiere', icon: '🎬' },
];

export const StageModeSelector: React.FC = () => {
  const { stageMode, setStageMode } = useStreamStore();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Stage Mode</h3>
      <div className="flex flex-wrap gap-2">
        {modes.map(mode => (
          <button
            key={mode.value}
            onClick={() => setStageMode(mode.value)}
            className={`flex flex-col items-center px-3 py-2 rounded text-xs transition min-w-[72px]
              ${stageMode === mode.value
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
          >
            <span className="text-lg mb-1">{mode.icon}</span>
            <span className="text-[10px]">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
