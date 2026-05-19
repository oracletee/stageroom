import { useState, useEffect } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';

interface LyricEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LyricEditor: React.FC<LyricEditorProps> = ({ isOpen, onClose }) => {
  const { lyricText, setLyricText } = useStreamStore();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (isOpen) setDraft(lyricText);
  }, [isOpen, lyricText]);

  if (!isOpen) return null;

  const handleSave = () => {
    setLyricText(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-5 w-96">
        <h3 className="text-sm font-semibold text-white mb-3">Edit Lyrics</h3>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Enter lyrics or message..."
          rows={6}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-4 flex justify-end space-x-3">
          <button onClick={onClose}
            className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
