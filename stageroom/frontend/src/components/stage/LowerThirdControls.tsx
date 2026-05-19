import { useStreamStore } from '../../hooks/useStreamStore';

export const LowerThirdControls: React.FC = () => {
  const { lowerThird, setLowerThird } = useStreamStore();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Lower Thirds</h3>
        <button
          onClick={() => setLowerThird({ visible: !lowerThird.visible })}
          className={`px-3 py-1 rounded text-xs font-medium transition ${
            lowerThird.visible
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {lowerThird.visible ? 'ON' : 'OFF'}
        </button>
      </div>

      {lowerThird.visible && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              value={lowerThird.name}
              onChange={e => setLowerThird({ name: e.target.value })}
              placeholder="Speaker name"
              className="w-full px-2 py-1.5 bg-gray-700 text-white rounded text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              value={lowerThird.title}
              onChange={e => setLowerThird({ title: e.target.value })}
              placeholder="Role or topic"
              className="w-full px-2 py-1.5 bg-gray-700 text-white rounded text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Template</label>
            <select
              value={lowerThird.template}
              onChange={e => setLowerThird({ template: e.target.value as 'minimal' | 'standard' | 'social' })}
              className="w-full px-2 py-1.5 bg-gray-700 text-white rounded text-xs"
            >
              <option value="minimal">Minimal (name only)</option>
              <option value="standard">Standard (name + title)</option>
              <option value="social">Social (name + handle)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
