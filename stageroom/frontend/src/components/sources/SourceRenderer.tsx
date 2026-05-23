import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { setSourceStream, setSourceVideoElement, updateSource, sourceStreams } = useStreamStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenRequested, setScreenRequested] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [rtmpWaiting, setRtmpWaiting] = useState(false);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const sources = useStreamStore(s => s.sources);

  const sourceData = sources.find(s => s.id === sourceId);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    if (type === 'rtmp' && playbackUrl && isActive) {
      console.log('RTMP HLS: loading', playbackUrl);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(playbackUrl);
        if (videoRef.current) hls.attachMedia(videoRef.current);
        setRtmpWaiting(true);
        const videoEl = videoRef.current;
        const onPlaying = () => {
          console.log('RTMP video playing');
          setRtmpWaiting(false);
          setError(null);
        };
        if (videoEl) {
          videoEl.addEventListener('playing', onPlaying);
          videoEl.addEventListener('waiting', () => {
            if (!rtmpWaiting) setRtmpWaiting(true);
          });
        }
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed');
          videoRef.current?.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.log('HLS error:', data.type, data.details, data.fatal, data.response?.code);
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.response?.code === 404) {
              setTimeout(() => hls.startLoad(), 3000);
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else {
              setError('HLS playback error');
            }
          }
        });
        cancelled = false;
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = playbackUrl;
      }
    }

    if (type === 'media' && previewUrl && videoRef.current && isActive) {
      videoRef.current.src = previewUrl;
      videoRef.current.load();
    }

    if (readOnly) return;

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
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
          if (!cancelled) {
            setSourceStream(sourceId, stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
              setSourceVideoElement(sourceId, videoRef.current);
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
              setSourceVideoElement(sourceId, videoRef.current);
            }
            stream.getVideoTracks()[0].addEventListener('ended', () => {
              setSourceStream(sourceId, null);
              setSourceVideoElement(sourceId, null);
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
      setSourceVideoElement(sourceId, null);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [sourceId, type, previewUrl, playbackUrl, setSourceStream, updateSource, screenActive, readOnly, isActive]);

  const existingStream = sourceStreams.get(sourceId);

  useEffect(() => {
    if (existingStream && videoRef.current && type !== 'rtmp' && type !== 'media' && type !== 'image-overlay' && type !== 'animated-overlay') {
      videoRef.current.srcObject = existingStream;
      videoRef.current.play().catch(() => {});
      setSourceVideoElement(sourceId, videoRef.current);
    } else if (!existingStream) {
      setSourceVideoElement(sourceId, null);
    }
  }, [existingStream, type, setSourceVideoElement, sourceId]);

  const handleStartScreen = () => {
    setError(null);
    setScreenActive(true);
  };

  const handleStopScreen = () => {
    if (existingStream) {
      existingStream.getTracks().forEach(t => t.stop());
    }
    setSourceStream(sourceId, null);
    setSourceVideoElement(sourceId, null);
    setScreenActive(false);
    updateSource(sourceId, { isActive: false });
  };

  return (
    <div className="absolute bg-gray-900 overflow-hidden" style={{ ...style, zIndex }}>
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
          <p className="text-gray-500 text-xs">Waiting for incoming stream...</p>
          <p className="text-gray-600 text-[10px] mt-1">Send RTMP to the URL and key shown during creation</p>
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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-red-400 text-xs text-center px-2">{error}</div>
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
      {type === 'image-overlay' && sourceData?.imageUrl ? (
        <img src={sourceData.imageUrl} alt={label}
          className="w-full h-full object-contain"
          style={{ opacity: sourceData.imageOpacity ?? 1 }} />
      ) : type === 'animated-overlay' && sourceData?.animationUrl ? (
        <video src={sourceData.animationUrl} autoPlay loop muted playsInline
          className="w-full h-full object-contain"
          style={{ opacity: sourceData.animationOpacity ?? 1 }} />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
        <span className="text-xs text-white truncate block">{label}</span>
      </div>
    </div>
  );
};
