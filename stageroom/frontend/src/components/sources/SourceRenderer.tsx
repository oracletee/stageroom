import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { sourceVideoPool } from '../../compositor/SourceVideoPool';
import { useStreamStore } from '../../hooks/useStreamStore';

interface SourceRendererProps {
  sourceId: string;
  type: string;
  label: string;
  previewUrl?: string;
  rtmpUrl?: string;
  rtmpStreamKey?: string;
  uid?: string;
  playbackUrl?: string;
  style: React.CSSProperties;
  zIndex?: number;
  readOnly?: boolean;
  isActive?: boolean;
}

export const SourceRenderer: React.FC<SourceRendererProps> = ({
  sourceId, type, label, previewUrl, playbackUrl, style, zIndex = 1, readOnly = false, isActive = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hlsUrlRef = useRef<string>('');
  const hlsRetryCount = useRef(0);
  const hlsRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hls204Backoff = useRef(1);
  const { setSourceStream, updateSource, sourceStreams } = useStreamStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenRequested, setScreenRequested] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [rtmpWaiting, setRtmpWaiting] = useState(false);
  const [rtmpHasData, setRtmpHasData] = useState(false);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [rtmpPlayBlocked, setRtmpPlayBlocked] = useState(false);
  const sources = useStreamStore(s => s.sources);

  const sourceData = sources.find(s => s.id === sourceId);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    hlsRetryCount.current = 0;

    // Acquire hidden video element from pool (for compositor)
    const pooledEl = sourceVideoPool.acquire(sourceId);

    // Destroy any HLS left from a previous lifecycle
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
      hlsUrlRef.current = '';
      sourceVideoPool.setHls(pooledEl, null);
    }

    if (type === 'rtmp' && playbackUrl && isActive) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          liveSyncDuration: 2,
          liveMaxLatencyDuration: 6,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 10,
          maxBufferLength: 8,
        });
        hlsRef.current = hls;
        hlsUrlRef.current = playbackUrl;
        hls.loadSource(playbackUrl);
        hls.attachMedia(videoRef.current!);
        setRtmpWaiting(true);
        setRtmpPlayBlocked(false);
        setRtmpHasData(false);
        setError(null);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setRtmpWaiting(false);
          setRtmpHasData(true);
          hlsRetryCount.current = 0;
          hls204Backoff.current = 1;
          videoRef.current?.play().catch((e) => {
            if (e.name === 'NotAllowedError') {
              setRtmpPlayBlocked(true);
              setError(null);
            }
          });
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          const is204 = data.response?.code === 204;
          if (is204) {
            if (data.fatal || !(data.details === 'bufferStalledError' || data.details === 'bufferSeekOverHole')) {
              console.log('HLS 204 (waiting for encoder):', data.type, data.details);
            }
          } else {
            if (data.fatal || (data.details !== 'bufferStalledError' && data.details !== 'bufferSeekOverHole')) {
              console.log('HLS error:', data.type, data.details, data.fatal, data.response?.code);
            }
          }
          if (!data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR && (is204 || data.response?.code === undefined)) {
            hls204Backoff.current = 1;
            hlsRetryTimer.current = setTimeout(() => hls.startLoad(), 1000);
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (is204 || data.response?.code === 404) {
              const delay = Math.min(hls204Backoff.current, 30) * 1000;
              hls204Backoff.current = Math.min(hls204Backoff.current * 2, 30);
              hlsRetryTimer.current = setTimeout(() => hls.startLoad(), delay);
              return;
            }
            hlsRetryCount.current += 1;
            if (hlsRetryCount.current < 15) {
              hlsRetryTimer.current = setTimeout(() => hls.startLoad(), 1000);
            } else {
              setError('HLS playback error');
              setRtmpWaiting(false);
            }
            return;
          }
        });
        const videoEl = videoRef.current;
        const onPlaying = () => {
          hlsRetryCount.current = 0;
          hls204Backoff.current = 1;
        };
        if (videoEl) {
          videoEl.addEventListener('playing', onPlaying);
        }

        // Second HLS instance for the hidden pool element (compositor)
        const poolHls = new Hls({
          liveSyncDuration: 2,
          liveMaxLatencyDuration: 6,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 10,
          maxBufferLength: 8,
        });
        sourceVideoPool.setHls(pooledEl, poolHls, playbackUrl);
        poolHls.loadSource(playbackUrl);
        poolHls.attachMedia(pooledEl);

        cancelled = false;
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = playbackUrl;
      }
    }

    if (type === 'media' && previewUrl && isActive) {
      if (videoRef.current) {
        videoRef.current.src = previewUrl;
        videoRef.current.load();
      }
      pooledEl.src = previewUrl;
      pooledEl.load();
    }

    if (!isActive) {
      const existing = sourceStreams.get(sourceId);
      if (existing) {
        existing.getTracks().forEach(t => t.stop());
        setSourceStream(sourceId, null);
      }
      return;
    }

    const startSource = async () => {
      const existing = sourceStreams.get(sourceId);
      if (existing && !existing.getTracks().every(t => t.readyState === 'ended')) {
        if (videoRef.current) {
          videoRef.current.srcObject = existing;
          videoRef.current.play().catch(() => {});
        }
        return;
      }

      if (type === 'camera') {
        try {
          setLoading(true);
          stream = await navigator.mediaDevices.getUserMedia({
            video: sourceData?.deviceId
              ? { deviceId: { exact: sourceData.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: sourceData?.audioInputId
              ? { deviceId: { exact: sourceData.audioInputId } }
              : true,
          });
          if (!cancelled) {
            setSourceStream(sourceId, stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          }
        } catch (err: any) {
          if (!cancelled) setError(`Camera: ${err.message}`);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      if (type === 'screen' && screenActive) {
        try {
          setLoading(true);
          setScreenRequested(true);
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: true,
          });
          if (!cancelled) {
            setScreenRequested(false);
            setSourceStream(sourceId, stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
            stream.getVideoTracks()[0].addEventListener('ended', () => {
              setSourceStream(sourceId, null);
              setScreenActive(false);
              updateSource(sourceId, { isActive: false });
            });
          }
        } catch (err: any) {
          if (!cancelled) {
            setScreenRequested(false);
            setScreenActive(false);
            if (err.name === 'NotAllowedError') {
              setError('Screen share cancelled.');
            } else {
              setError(`Screen: ${err.message}`);
            }
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

    };

    startSource();

    return () => {
      cancelled = true;
      if (hlsRetryTimer.current) {
        clearTimeout(hlsRetryTimer.current);
        hlsRetryTimer.current = null;
      }
      const poolHls = sourceVideoPool.getHls(pooledEl);
      if (poolHls) {
        poolHls.destroy();
      }
      sourceVideoPool.setHls(pooledEl, null);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
        hlsUrlRef.current = '';
      }
      sourceVideoPool.release(sourceId);
    };
  }, [sourceId, type, previewUrl, playbackUrl, setSourceStream, updateSource, screenActive, isActive]);

  const existingStream = sourceStreams.get(sourceId);

  useEffect(() => {
    if (existingStream && type !== 'rtmp' && type !== 'media' && type !== 'image-overlay' && type !== 'animated-overlay') {
      if (videoRef.current) {
        videoRef.current.srcObject = existingStream;
        videoRef.current.play().catch(() => {});
      }
      const poolEl = sourceVideoPool.get(sourceId);
      if (poolEl) {
        poolEl.srcObject = existingStream;
        poolEl.play().catch(() => {});
      }
    }
  }, [existingStream, type, sourceId]);

  const handleStartScreen = () => {
    setError(null);
    setScreenActive(true);
  };

  const handleStopScreen = () => {
    if (existingStream) {
      existingStream.getTracks().forEach(t => t.stop());
    }
    setSourceStream(sourceId, null);
    setScreenActive(false);
    updateSource(sourceId, { isActive: false });
  };

  return (
    <div ref={containerRef} className="absolute bg-gray-900 overflow-hidden" style={{ ...style, zIndex }}>
      {['camera', 'screen', 'media', 'rtmp'].includes(type) && (
        <video ref={videoRef} autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover" />
      )}
      {type === 'screen' && !screenActive && !existingStream && !readOnly && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
          <span className="text-3xl mb-2">🖥️</span>
          <p className="text-gray-400 text-xs mb-3">{label}</p>
          <button
            onClick={handleStartScreen}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            Start Screen Share
          </button>
        </div>
      )}
      {loading && type === 'screen' && screenRequested && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20">
          <div className="text-white text-sm mb-2">Select a screen to share</div>
          <div className="text-gray-400 text-xs">Browser picker is open above...</div>
        </div>
      )}
      {loading && type === 'screen' && !screenRequested && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-white text-sm">Starting screen share...</div>
        </div>
      )}
      {type === 'rtmp' && rtmpWaiting && !readOnly && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
          <span className="text-3xl mb-2">📡</span>
          <p className="text-gray-400 text-xs text-center px-4 mb-1">{label}</p>
          <p className="text-gray-500 text-xs">Connecting to stream...</p>
        </div>
      )}
      {type === 'rtmp' && !rtmpWaiting && !rtmpPlayBlocked && !error && !readOnly && (
        <div className="absolute top-2 left-2 z-30">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rtmpHasData ? 'bg-green-600/80 text-white' : 'bg-yellow-600/80 text-white'}`}>
            {rtmpHasData ? '● LIVE' : '◌ No signal'}
          </span>
        </div>
      )}
      {type === 'rtmp' && rtmpPlayBlocked && !readOnly && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-20">
          <span className="text-3xl mb-2">📡</span>
          <p className="text-gray-400 text-xs text-center px-4 mb-1">{label}</p>
          <button onClick={() => {
            videoRef.current?.play().then(() => {
              setRtmpPlayBlocked(false);
              setRtmpWaiting(false);
            }).catch(() => {});
          }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg mt-2">
            ▶ Click to Preview
          </button>
        </div>
      )}
      {loading && type !== 'screen' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-white text-sm">Loading {type}...</div>
        </div>
      )}
      {error && type === 'screen' && !readOnly && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20">
          <div className="text-red-400 text-xs text-center px-2 mb-3">{error}</div>
          <button
            onClick={handleStartScreen}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Try Again
          </button>
        </div>
      )}
      {error && type !== 'screen' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
          <span className="text-2xl mb-1">⚠️</span>
          <div className="text-red-400 text-xs text-center px-4">{error}</div>
          <button onClick={() => window.open(playbackUrl || '', '_blank')}
            className="mt-2 text-[10px] text-blue-400 underline">
            Test URL in browser
          </button>
        </div>
      )}
      {type === 'screen' && screenActive && existingStream && !readOnly && (
        <div className="absolute top-2 right-2 z-30">
          <button
            onClick={handleStopScreen}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
          >
            ■ Stop
          </button>
        </div>
      )}
      {type === 'media' && !mediaPlaying && previewUrl && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <button onClick={() => {
            videoRef.current?.play().then(() => setMediaPlaying(true)).catch(() => {});
          }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg">
            ▶ Play
          </button>
        </div>
      )}
      {type === 'media' && mediaPlaying && (
        <div className="absolute top-2 right-2 z-30">
          <button onClick={() => {
            videoRef.current?.pause();
            setMediaPlaying(false);
          }}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs">
            ■ Stop
          </button>
        </div>
      )}
      {type === 'ndi' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-center px-4">
            <span className="text-2xl">📡</span>
            <p className="text-gray-400 text-xs mt-2">NDI source requires NDI Tools Virtual Input.</p>
            <p className="text-gray-500 text-xs">Add a Camera source and select the virtual webcam.</p>
          </div>
        </div>
      )}
      {type === 'image-overlay' && sourceData?.imageUrl ? (
        <img src={sourceData.imageUrl} alt={label}
          className="w-full h-full object-contain"
          style={{ opacity: sourceData.imageOpacity ?? 1 }} />
      ) : type === 'animated-overlay' && sourceData?.animationUrl ? (
        <video src={sourceData.animationUrl} autoPlay loop muted playsInline
          className="w-full h-full object-contain"
          style={{ opacity: sourceData.animationOpacity ?? 1 }} />
      ) : null}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
        <span className="text-xs text-white truncate block">{label}</span>
      </div>
    </div>
  );
};
