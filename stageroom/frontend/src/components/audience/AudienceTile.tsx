import { useRef, useEffect } from 'react';

interface AudienceTileProps {
  identity: string;
  isLocal?: boolean;
  isSpotlight?: boolean;
  stream?: MediaStream | null;
  muted?: boolean;
}

export const AudienceTile: React.FC<AudienceTileProps> = ({ identity, isLocal, isSpotlight, stream, muted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
      if (stream) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  return (
    <div className={`relative rounded-lg overflow-hidden bg-gray-900 w-full h-full
      ${isSpotlight ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900' : ''}`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted={muted || isLocal || !stream}
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white truncate">
            {isLocal ? 'You' : identity}
            {isSpotlight && <span className="ml-1 text-yellow-400">★</span>}
          </span>
          {isLocal && <span className="text-[10px] text-gray-300 ml-1">HOST</span>}
        </div>
      </div>
    </div>
  );
};
