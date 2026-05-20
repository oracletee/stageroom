import { useStreamStore, type StageMode } from '../../hooks/useStreamStore';
import { StageComposition } from '../stage/StageComposition';
import { useLiveKit } from '../stage/LiveKitProvider';

const modeConfig: Record<StageMode, { accent: string; layout: 'side' | 'stacked' | 'program-dominant'; label: string }> = {
  'ted-talk': { accent: 'border-amber-500', layout: 'side', label: 'TED Talk — Speaker Focused' },
  'podcast': { accent: 'border-purple-500', layout: 'side', label: 'Podcast — Conversational' },
  'event': { accent: 'border-pink-500', layout: 'program-dominant', label: 'Event — Live Experience' },
  'worship': { accent: 'border-blue-400', layout: 'side', label: 'Worship — Content Focused' },
  'classroom': { accent: 'border-green-500', layout: 'side', label: 'Classroom — Presentation' },
  'debate': { accent: 'border-red-500', layout: 'side', label: 'Debate — Side by Side' },
  'film-premiere': { accent: 'border-yellow-600', layout: 'program-dominant', label: 'Film Premiere — Cinema Experience' },
};

export const VideoPreview: React.FC = () => {
  const { selectedSceneId, programSceneId, programSnapshot, pushToProgram, isStreaming, setStreaming, isRecording, setRecording, stageMode, streamSession, setStreamSession, destinations, scenes } = useStreamStore();
  const { connected, connectionState } = useLiveKit();

  const config = modeConfig[stageMode];
  const enabledCount = destinations.filter(d => d.isEnabled).length;
  const canGoLive = enabledCount > 0;

  const previewSceneName = scenes.find(s => s.id === selectedSceneId)?.name;
  const programSceneName = programSnapshot
    ? scenes.find(s => s.id === programSnapshot.sceneId)?.name
    : undefined;

  const handleGoLive = async () => {
    if (isStreaming) {
      setStreaming(false);
      setStreamSession(null);
    } else {
      if (!programSceneId) pushToProgram();

      try {
        
        const response = await fetch(`/api/stream/live-input`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to create live input');
        }

        const data = await response.json();
        setStreamSession({ liveInputUid: data.uid, startedAt: new Date().toISOString() });
        setStreaming(true);
      } catch (err: any) {
        console.error('Failed to start stream:', err);
        setStreamSession({ error: err.message });
        setStreaming(true);
      }
    }
  };

  const handleRecord = async () => {
    setRecording(!isRecording);
  };

  const connectionColor = connected ? 'bg-green-500' : connectionState === 'connecting' ? 'bg-yellow-500' : connectionState === 'failed' || connectionState === 'disconnected' ? 'bg-red-500' : 'bg-gray-500';

  const renderMonitor = (label: string, variant: 'preview' | 'program', sceneName?: string, isLive?: boolean) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-300">{label}</h3>
          <span className="text-xs text-gray-500">{sceneName || 'No scene'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`h-1.5 w-1.5 rounded-full ${connectionColor}`} />
          <span className={`text-xs ${isLive ? 'text-red-400' : 'text-gray-500'}`}>
            {isLive && '● LIVE'}
          </span>
        </div>
      </div>
      <div className={`relative bg-gray-900 aspect-video rounded overflow-hidden border-t-2 ${config.accent}`}>
        <StageComposition variant={variant} />
      </div>
    </div>
  );

  const renderControls = () => (
    <div className="mt-2 flex gap-2">
      <button onClick={handleGoLive} disabled={!canGoLive && !isStreaming}
        className={`flex-1 px-4 py-2 rounded text-sm font-semibold transition ${!canGoLive && !isStreaming ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : isStreaming ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
        {isStreaming ? '■ Stop' : '● Go Live'}
      </button>
      {!canGoLive && !isStreaming && (
        <span className="text-xs text-gray-500 self-center">Enable ≥1 destination</span>
      )}
      <button onClick={handleRecord}
        className={`flex-1 px-4 py-2 rounded text-sm font-semibold transition ${isRecording ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
        {isRecording ? '■ Stop Recording' : '● Start Recording'}
      </button>
    </div>
  );

  const renderStreamStatus = () => {
    if (!isStreaming || !streamSession) return null;
    if (streamSession.error) {
      return <div className="mt-2 text-xs text-red-400">Stream error: {streamSession.error}</div>;
    }
    return (
      <div className="mt-2 text-xs text-gray-400">
        Live input: {streamSession.liveInputUid?.substring(0, 12)}... | Started: {new Date(streamSession.startedAt || '').toLocaleTimeString()}
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-l-4 ${config.accent}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{config.label}</span>
      </div>

      {config.layout === 'program-dominant' ? (
        <div className="flex space-x-4">
          <div className="w-1/4 space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Preview</p>
            <div className="relative bg-gray-900 aspect-video rounded overflow-hidden border-t-2 border-gray-700">
              <StageComposition variant="preview" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button onClick={pushToProgram} disabled={!selectedSceneId}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm font-medium">
              Push
            </button>
          </div>
          <div className="flex-[2]">
            {renderMonitor('Program', 'program', programSceneName, isStreaming)}
            {renderControls()}
            {renderStreamStatus()}
          </div>
        </div>
      ) : (
        <div className="flex space-x-4">
          <div className="flex-1">
            {renderMonitor('Preview', 'preview', previewSceneName)}
          </div>
          <div className="flex items-center justify-center">
            <button onClick={pushToProgram} disabled={!selectedSceneId}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm font-medium">
              Push to Program
            </button>
          </div>
          <div className="flex-1">
            {renderMonitor('Program', 'program', programSceneName, isStreaming)}
            {renderControls()}
            {renderStreamStatus()}
          </div>
        </div>
      )}
    </div>
  );
};
