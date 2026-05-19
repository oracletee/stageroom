import { useRef, useState } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';

const presets = [
  { label: 'None', value: '' },
  { label: 'Dark Gray', value: '#111827' },
  { label: 'Navy', value: '#0f172a' },
  { label: 'Deep Blue', value: '#1e3a5f' },
  { label: 'Deep Purple', value: '#2e1065' },
  { label: 'Deep Red', value: '#450a0a' },
  { label: 'Deep Green', value: '#052e16' },
  { label: 'Warm Amber', value: '#451a03' },
];

export const BackgroundPicker: React.FC = () => {
  const { stageBackground, setStageBackground } = useStreamStore();
  const [showCustom, setShowCustom] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Stage Background</h3>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map(p => (
          <button
            key={p.value}
            onClick={() => setStageBackground(p.value)}
            className={`w-6 h-6 rounded-full border-2 ${
              stageBackground === p.value
                ? 'border-white ring-2 ring-blue-400'
                : 'border-gray-600 hover:border-gray-400'
            }`}
            style={{ backgroundColor: p.value || '#1f2937' }}
            title={p.label}
          />
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs text-gray-400 hover:text-white transition"
        >
          {showCustom ? '− Custom' : '+ Custom'}
        </button>
        {stageBackground && stageBackground.startsWith('#') && !presets.find(p => p.value === stageBackground) && (
          <span className="text-[10px] text-gray-500">custom</span>
        )}
      </div>

      {showCustom && (
        <div className="mt-2 flex items-center space-x-2">
          <input
            ref={colorInputRef}
            type="color"
            value={stageBackground || '#111827'}
            onChange={e => setStageBackground(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-600"
          />
          <input
            type="text"
            value={stageBackground}
            onChange={e => setStageBackground(e.target.value)}
            placeholder="#hex or gradient CSS"
            className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs font-mono"
          />
        </div>
      )}
    </div>
  );
};
