import { useState, useRef, useEffect, useCallback } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';

interface Recording {
  id: string;
  title: string;
  created: string;
  duration: number;
  size: number;
  playable: boolean;
  thumbnailUrl?: string;
}

interface Highlight {
  id: string;
  title: string;
  recordingId: string;
  startTime: number;
  endTime: number;
}

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const formatDuration = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(s)}s`;
};

const sampleRecordings: Recording[] = [
  { id: 'rec-1', title: 'Morning Stream', created: new Date(Date.now() - 2 * 3600000).toISOString(), duration: 125, size: 0, playable: true, thumbnailUrl: '' },
  { id: 'rec-2', title: 'OBS Tutorial', created: new Date(Date.now() - 24 * 3600000).toISOString(), duration: 1800, size: 0, playable: true, thumbnailUrl: '' },
  { id: 'rec-3', title: 'Gaming Session', created: new Date(Date.now() - 72 * 3600000).toISOString(), duration: 7200, size: 0, playable: true, thumbnailUrl: '' },
  { id: 'rec-4', title: 'Quick Tips', created: new Date(Date.now() - 12 * 3600000).toISOString(), duration: 300, size: 0, playable: true, thumbnailUrl: '' },
  { id: 'rec-5', title: 'Evening Q&A', created: new Date(Date.now() - 6 * 3600000).toISOString(), duration: 5400, size: 0, playable: true, thumbnailUrl: '' },
];

export const RecordingLibrary: React.FC = () => {
  const { sources, setSources, scenes, selectedSceneId, addSourceToScene, removeSourceFromScene } = useStreamStore();
  const [tab, setTab] = useState<'recordings' | 'highlights'>('recordings');
  const [selectedRec, setSelectedRec] = useState<Recording | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savingTitle, setSavingTitle] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timelineRef = useRef<HTMLDivElement>(null);

  const filteredRecordings = sampleRecordings.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (selectedRec) {
      setCurrentTime(0);
      setStartTime(0);
      setEndTime(Math.min(60, selectedRec.duration));
      setIsPlaying(false);
    }
  }, [selectedRec]);

  const play = useCallback(() => {
    if (!selectedRec) return;
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.5;
        if (next >= selectedRec.duration) {
          pause();
          return 0;
        }
        return next;
      });
    }, 500);
  }, [selectedRec]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !selectedRec) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setCurrentTime(Math.max(0, Math.min(selectedRec.duration, pct * selectedRec.duration)));
  };

  const handleSaveHighlight = () => {
    const title = savingTitle.trim() || `Clip from ${selectedRec?.title || 'Recording'}`;
    const highlight: Highlight = {
      id: `hl-${Date.now()}`,
      title,
      recordingId: selectedRec?.id || '',
      startTime: Math.min(startTime, endTime),
      endTime: Math.max(startTime, endTime),
    };
    setHighlights(prev => [highlight, ...prev]);
    setSavingTitle('');
    setShowSaveInput(false);
    setTab('highlights');
  };

  const handlePushToPreview = (highlight: Highlight) => {
    const sourceId = `highlight-${highlight.id}`;
    const newSource = {
      id: sourceId,
      type: 'media' as const,
      label: highlight.title,
      previewUrl: '',
      isActive: true,
    };
    const existing = sources.find(s => s.id === sourceId);
    if (!existing) {
      setSources([...sources, newSource]);
    }
    if (selectedSceneId) {
      scenes.forEach(scene => {
        if (scene.id === selectedSceneId) {
          scene.sourceIds.forEach(sid => removeSourceFromScene(selectedSceneId, sid));
        }
      });
      addSourceToScene(selectedSceneId, sourceId);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-col">
      <h2 className="text-lg font-semibold mb-3">Recording Library</h2>

      <div className="flex gap-1 mb-2">
        <button onClick={() => setTab('recordings')}
          className={`flex-1 px-2 py-1 rounded text-xs font-medium ${tab === 'recordings' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
          Recordings ({filteredRecordings.length})
        </button>
        <button onClick={() => setTab('highlights')}
          className={`flex-1 px-2 py-1 rounded text-xs font-medium ${tab === 'highlights' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
          Highlights ({highlights.length})
        </button>
      </div>

      {tab === 'recordings' && (
        <>
          <div className="relative mb-2">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search recordings..."
              className="w-full pl-7 pr-2 py-1.5 bg-gray-700 text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {filteredRecordings.map(rec => (
              <div key={rec.id}
                className={`flex items-center gap-2 px-2 py-1.5 bg-gray-900 rounded cursor-pointer hover:bg-gray-750 ${selectedRec?.id === rec.id ? 'ring-1 ring-blue-500' : ''}`}
                onClick={() => setSelectedRec(rec)}>
                <span className="text-sm shrink-0">🎬</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">{rec.title}</p>
                  <p className="text-[10px] text-gray-500">{formatDuration(rec.duration)}</p>
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">{new Date(rec.created).toLocaleDateString()}</span>
              </div>
            ))}
            {filteredRecordings.length === 0 && (
              <p className="text-gray-500 text-xs text-center py-4">No recordings match "{searchQuery}"</p>
            )}
          </div>

          {selectedRec && (
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="bg-gray-900 rounded aspect-video mb-1.5 flex items-center justify-center relative">
                {selectedRec.thumbnailUrl ? (
                  <img src={selectedRec.thumbnailUrl} alt={selectedRec.title} className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎬</div>
                    <p className="text-[10px] text-gray-500">{formatDuration(selectedRec.duration)}</p>
                  </div>
                )}
                {!isPlaying && (
                  <button onClick={play}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                    <span className="text-2xl">▶️</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-1.5">
                <button onClick={isPlaying ? pause : play}
                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px]">
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span className="text-[10px] text-gray-400 font-mono">{formatTime(currentTime)}</span>
                <span className="text-[10px] text-gray-600">/ {formatTime(selectedRec.duration)}</span>
              </div>

              <div ref={timelineRef}
                className="relative h-4 bg-gray-700 rounded cursor-pointer mb-1.5"
                onClick={handleTimelineClick}>
                {selectedRec.duration > 0 && (
                  <>
                    <div className="absolute inset-y-0 bg-blue-500/30 rounded"
                      style={{ left: `${(startTime / selectedRec.duration) * 100}%`, width: `${((endTime - startTime) / selectedRec.duration) * 100}%` }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                      style={{ left: `${(currentTime / selectedRec.duration) * 100}%` }} />
                    <div className="absolute top-[-2px] h-5 w-1.5 bg-blue-400 rounded-sm ring-1 ring-white cursor-ew-resize z-20"
                      style={{ left: `${(startTime / selectedRec.duration) * 100}%` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const onMove = (ev: MouseEvent) => {
                          if (!timelineRef.current || !selectedRec) return;
                          const r = timelineRef.current.getBoundingClientRect();
                          const p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
                          const t = p * selectedRec.duration;
                          setStartTime(Math.min(t, endTime - 1));
                        };
                        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      }} />
                    <div className="absolute top-[-2px] h-5 w-1.5 bg-green-400 rounded-sm ring-1 ring-white cursor-ew-resize z-20"
                      style={{ left: `${(endTime / selectedRec.duration) * 100}%` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const onMove = (ev: MouseEvent) => {
                          if (!timelineRef.current || !selectedRec) return;
                          const r = timelineRef.current.getBoundingClientRect();
                          const p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
                          const t = p * selectedRec.duration;
                          setEndTime(Math.max(t, startTime + 1));
                        };
                        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      }} />
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-1.5">
                <button onClick={() => setStartTime(currentTime)}
                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px]">
                  S:{formatTime(startTime)}
                </button>
                <button onClick={() => setEndTime(currentTime)}
                  className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px]">
                  E:{formatTime(endTime)}
                </button>
                <span className="text-[10px] text-gray-400 ml-auto">
                  Clip: {formatTime(endTime - startTime)}
                </span>
              </div>

              {showSaveInput ? (
                <div className="flex flex-col gap-1.5">
                  <input value={savingTitle} onChange={e => setSavingTitle(e.target.value)}
                    placeholder="Highlight title"
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded text-[10px]"
                    autoFocus />
                  <div className="flex gap-1.5">
                    <button onClick={() => { setShowSaveInput(false); setSavingTitle(''); }}
                      className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-[10px]">Cancel</button>
                    <button onClick={handleSaveHighlight}
                      className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-[10px] font-medium">
                      Save Highlight
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setShowSaveInput(true); setSavingTitle(''); }}
                  className="w-full px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-[10px] font-medium">
                  + Save as Highlight
                </button>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'highlights' && (
        <div className="max-h-48 overflow-y-auto space-y-1.5">
          {highlights.length === 0 && (
            <p className="text-gray-500 text-xs text-center py-6">
              No highlights yet. Preview a recording and save a clip.
            </p>
          )}
          {highlights.map(hl => (
            <div key={hl.id}
              className="flex items-center gap-2 px-2 py-1.5 bg-gray-900 rounded">
              <span className="text-sm shrink-0">🎯</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white truncate">{hl.title}</p>
                <p className="text-[10px] text-gray-500">{formatTime(hl.endTime - hl.startTime)}</p>
              </div>
              <button onClick={() => handlePushToPreview(hl)}
                className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] shrink-0">
                Push
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
