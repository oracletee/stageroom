import { useRef, useEffect } from 'react';

interface StageSlotProps {
  stream: MediaStream | null;
  label: string;
  style: React.CSSProperties;
  zIndex?: number;
}

export const StageSlot: React.FC<StageSlotProps> = ({ stream, label, style, zIndex = 1 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      if (stream) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  return (
    <div className="absolute bg-gray-900 overflow-hidden" style={{ ...style, zIndex }}>
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          {label}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
        <span className="text-xs text-white truncate block">{label}</span>
      </div>
    </div>
  );
};
