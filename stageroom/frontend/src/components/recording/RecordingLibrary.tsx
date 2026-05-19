import { useState } from 'react';

export const RecordingLibrary: React.FC = () => {
  const [tab, setTab] = useState<'recordings' | 'highlights'>('recordings');

  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-col">
      <h2 className="text-lg font-semibold mb-3">Recording Library</h2>

      <div className="flex gap-1 mb-2">
        <button onClick={() => setTab('recordings')}
          className={`flex-1 px-2 py-1 rounded text-xs font-medium ${tab === 'recordings' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
          Recordings
        </button>
        <button onClick={() => setTab('highlights')}
          className={`flex-1 px-2 py-1 rounded text-xs font-medium ${tab === 'highlights' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
          Highlights
        </button>
      </div>

      {tab === 'recordings' && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No recordings yet</p>
          <p className="text-gray-500 text-xs mt-1">Start recording to see them here</p>
        </div>
      )}

      {tab === 'highlights' && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No highlights yet</p>
          <p className="text-gray-500 text-xs mt-1">Save clips from recordings</p>
        </div>
      )}
    </div>
  );
};
