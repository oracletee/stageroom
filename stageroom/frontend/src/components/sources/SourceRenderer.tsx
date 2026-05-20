import { useRef, useEffect, useState } from 'react';
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
}

export const SourceRenderer: React.FC<SourceRendererProps> = ({
  sourceId, type, label, previewUrl, playbackUrl, style, zIndex = 1, readOnly = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setSourceStream, updateSource, sourceStreams } = useStreamStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenRequested, setScreenRequested] = useState(false);
  const [screenActive, setScreenActive] = useState(false);

  useEffect(() => {
    if (readOnly) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    const startSource = async () => {
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

      if (type === 'rtmp' && playbackUrl) {
        if (videoRef.current) {
          videoRef.current.src = playbackUrl;
          videoRef.current.load();
          videoRef.current.play().catch(() => {});
        }
      }

      if (type === 'media' && previewUrl) {
        if (videoRef.current) {
          videoRef.current.src = previewUrl;
          videoRef.current.load();
          videoRef.current.play().catch(() => {});
        }
      }
    };

    startSource();

    return () => {
      cancelled = true;
      if (stream && (type === 'camera' || type === 'screen')) {
        stream.getTracks().forEach(track => track.stop());
        setSourceStream(sourceId, null);
      }
    };
  }, [sourceId, type, previewUrl, setSourceStream, updateSource, screenActive, readOnly]);

  const existingStream = sourceStreams.get(sourceId);

  useEffect(() => {
    if (existingStream && videoRef.current && type !== 'rtmp' && type !== 'media') {
      videoRef.current.srcObject = existingStream;
      videoRef.current.play().catch(() => {});
    }
  }, [existingStream, type]);

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
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
        <span className="text-xs text-white truncate block">{label}</span>
      </div>
    </div>
  );
};
