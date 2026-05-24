import { useState, useRef, useCallback } from 'react';
import { useStreamStore, type StageMode } from '../../hooks/useStreamStore';
import { StageComposition } from '../stage/StageComposition';
import { useLiveKit } from '../stage/LiveKitProvider';
import { useSceneGraph } from '../../hooks/useSceneGraph';
import { ProgramCompositor } from '../../compositor/ProgramCompositor';
import { WhepViewer } from '../../streaming/WhepViewer';

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
  const { selectedSceneId, programSceneId, programSnapshot, pushToProgram, isStreaming, setStreaming, stageMode, streamSession, setStreamSession, scenes, setupDone } = useStreamStore();
  const { connected, connectionState } = useLiveKit();
  const programLayers = useSceneGraph();
  const [whipError, setWhipError] = useState<string | null>(null);
  const streamSessionRef = useRef(streamSession);
  streamSessionRef.current = streamSession;

  const handleRecordingEnable = useCallback(async () => {
    const liveInputUid = streamSessionRef.current?.liveInputUid;
    if (!liveInputUid) return;
    try {
      const recRes = await fetch(`/api/stream/live-input/${liveInputUid}/recording`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      if (!recRes.ok) {
        const recErr = await recRes.json().catch(() => ({}));
        console.warn('[VideoPreview] Recording PUT returned', recRes.status, recErr);
      } else {
        console.log('[VideoPreview] Recording enabled via onConnected');
      }
    } catch (err) {
      console.error('[VideoPreview] Failed to enable recording:', err);
    }
  }, []);

  const config = modeConfig[stageMode];
  const canGoLive = setupDone;

  const previewSceneName = scenes.find(s => s.id === selectedSceneId)?.name;
  const programSceneName = programSnapshot
    ? scenes.find(s => s.id === programSnapshot.sceneId)?.name
    : undefined;

  const RELAY_WHIP_URL = import.meta.env.VITE_RELAY_WHIP_URL || 'http://localhost:8889/whip/live';

  const handleGoLive = async () => {
    setWhipError(null);
    if (isStreaming) {
      if (streamSession?.liveInputUid) {
        try {
          await fetch(`/api/stream/live-input/${streamSession.liveInputUid}/recording`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
          });
        } catch (err) {
          console.error('Failed to stop stream:', err);
        }
      }
      // Clear relay target
      const relayTargetUrl = import.meta.env.VITE_RELAY_TARGET_URL || 'http://localhost:9990/target';
      try {
        await fetch(relayTargetUrl, { method: 'DELETE' });
      } catch {}
      setStreaming(false);
      setStreamSession(null);
    } else {
      if (!programSceneId) await pushToProgram();

      try {
        const response = await fetch(`/api/stream/live-input`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          let errMsg = 'Failed to create live input';
          try { const err = await response.json(); errMsg = err.error || errMsg; } catch {}
          throw new Error(errMsg);
        }

        let data: any;
        try { data = await response.json(); } catch {
          throw new Error('Invalid response from server');
        }

        // Build Cloudflare RTMP target URL for recording
        const rtmpBase = data.rtmps?.url || '';
        const streamKey = data.rtmps?.streamKey || '';
        const cloudflareRtmpUrl = rtmpBase && streamKey ? `${rtmpBase}${streamKey}` : '';

        if (cloudflareRtmpUrl) {
          const relayTargetUrl = import.meta.env.VITE_RELAY_TARGET_URL || 'http://localhost:9990/target';
          try {
            await fetch(relayTargetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: cloudflareRtmpUrl }),
            });
          } catch (err) {
            console.warn('[VideoPreview] Failed to set relay target:', err);
          }
        }

        // Use local MediaMTX relay instead of direct Cloudflare WHIP
        const whipUrl = RELAY_WHIP_URL;
        const whepUrl = data.webRTCPlayback?.url;
        console.log('[VideoPreview] Live input created:', data.uid, 'relay target RTMP:', cloudflareRtmpUrl ? 'set' : 'empty');

        setStreamSession({ liveInputUid: data.uid, whipUrl, whipToken: '', whepUrl, startedAt: new Date().toISOString() });
        setStreaming(true);
      } catch (err: any) {
        console.error('Failed to start stream:', err);
        setStreamSession({ error: err.message });
      }
    }
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
    <div className="mt-2">
      <button onClick={handleGoLive} disabled={!canGoLive && !isStreaming}
        className={`w-full px-4 py-2 rounded text-sm font-semibold transition ${!canGoLive && !isStreaming ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : isStreaming ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
        {isStreaming ? '■ Stop' : '● Go Live'}
      </button>
    </div>
  );

  const renderStreamStatus = () => {
    if (!streamSession) return null;
    if (streamSession.error) {
      return <div className="mt-2 text-xs text-red-400">Stream error: {streamSession.error}</div>;
    }
    if (!isStreaming) return null;
    return (
      <div className="mt-2 text-xs text-gray-400 flex flex-col space-y-1">
        <span>Live input: {streamSession.liveInputUid?.substring(0, 12)}... | Started: {new Date(streamSession.startedAt || '').toLocaleTimeString()}</span>
        {whipError && <span className="text-red-400">WHIP: {whipError}</span>}
        {!whipError && streamSession.whipUrl && <span className="text-green-400">WebRTC connected</span>}
        {!streamSession.whipUrl && <span className="text-yellow-400">No WHIP URL — using RTMP</span>}
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-l-4 ${config.accent}`}>
      <div className="flex space-x-2 mb-3">
        {streamSession?.whipUrl && (
          <div className="flex-1 min-w-0">
            <ProgramCompositor
              sceneLayers={programLayers}
              whipUrl={streamSession.whipUrl}
              whipToken={streamSession.whipToken}
              onError={setWhipError}
              onConnected={handleRecordingEnable}
            />
          </div>
        )}
        {streamSession?.whepUrl && (
          <div className="flex-1 min-w-0">
            <div className="relative bg-gray-900 rounded overflow-hidden border border-gray-700 aspect-video">
              <WhepViewer whepUrl={streamSession.whepUrl} />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600/80 text-white text-[10px] rounded">
                CLOUDFLARE
              </div>
            </div>
          </div>
        )}
      </div>
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
