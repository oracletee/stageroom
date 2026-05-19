import { useState } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';
import { StageModeSelector } from '../audience/StageModeSelector';
import { StudioStats } from '../analytics/StudioStats';
import { LyricEditor } from '../stage/LyricEditor';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { appView, setAppView, stageMode } = useStreamStore();
  const [lyricOpen, setLyricOpen] = useState(false);

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
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold">Stageroom</h1>
          <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setAppView('host')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition
                ${appView === 'host' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Studio
            </button>
            <button
              onClick={() => setAppView('viewer')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition
                ${appView === 'viewer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Viewer
            </button>
            <button
              onClick={() => setAppView('dashboard')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition
                ${appView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Dashboard
            </button>
          </div>
          <div className="flex items-center space-x-3">
            {appView === 'host' && stageMode === 'worship' && (
              <button onClick={() => setLyricOpen(true)}
                className="px-3 py-1 rounded text-xs bg-blue-700 hover:bg-blue-600 text-white">
                Edit Lyrics
              </button>
            )}
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
              {modeLabels[stageMode]} mode
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full p-4 overflow-y-auto">
        {appView === 'host' && (
          <div className="mb-4 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-3/5">
              <StageModeSelector />
            </div>
            <div className="w-full md:w-2/5">
              <StudioStats />
            </div>
          </div>
        )}
        {children}
        <LyricEditor isOpen={lyricOpen} onClose={() => setLyricOpen(false)} />
      </main>
    </div>
  );
};

export default Layout;
