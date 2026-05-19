import { useState, useRef } from 'react';

interface ScreenShareProps {
  // In a real implementation, this would manage screen sharing
}

export const ScreenShare: React.FC<ScreenShareProps> = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'stopped'>('idle');
  const [sharedStream, setSharedStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startSharing = async () => {
    try {
      setShareStatus('sharing');
      // Try to get screen capture stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      });
      
      setSharedStream(stream);
      setIsSharing(true);
      setShareStatus('sharing');
      
      // Handle when user stops sharing
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopSharing();
      });
    } catch (err) {
      console.error('Error sharing screen:', err);
      setShareStatus('idle');
      alert('Failed to share screen. Please make sure you grant permission.');
    }
  };

  const stopSharing = () => {
    if (sharedStream) {
      sharedStream.getTracks().forEach(track => track.stop());
    }
    setSharedStream(null);
    setIsSharing(false);
    setShareStatus('stopped');
    
    // Reset to idle after a brief moment
    setTimeout(() => {
      setShareStatus('idle');
    }, 1500);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Screen Sharing</h2>
        <p className="text-sm text-gray-400">
          Share your screen or application window
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
            🖥️
          </div>
          <div>
            <p className="font-medium text-white">Screen Share</p>
            <p className="text-xs text-gray-400">
              Share your entire screen, window, or browser tab
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-900 rounded">
          {shareStatus === 'sharing' && (
            <div className="text-sm text-green-400">
              ● Currently sharing screen
            </div>
          )}
          {shareStatus === 'stopped' && (
            <div className="text-sm text-red-400">
              ● Screen sharing stopped
            </div>
          )}
          {shareStatus === 'idle' && !isSharing && (
            <div className="text-sm text-gray-400">
              ○ Not sharing screen
            </div>
          )}
        </div>
        
        {sharedStream && (
          <div className="mt-4">
            <div className="mb-2">
              <span className="text-xs text-gray-400">Preview:</span>
            </div>
            <div className="bg-gray-900 h-32 rounded overflow-hidden">
              <video 
                autoPlay 
                muted 
                playsInline 
                ref={videoRef}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={startSharing}
            disabled={isSharing || shareStatus === 'sharing'}
            className={`w-full px-4 py-2 bg-${isSharing || shareStatus === 'sharing' ? 'gray-600' : 'blue-600'} 
                       hover:bg-${isSharing || shareStatus === 'sharing' ? 'gray-700' : 'blue-700'} 
                       text-white rounded transition disabled:opacity-50`}
          >
            {shareStatus === 'sharing' ? 'Sharing...' : isSharing ? 'Sharing' : 'Share Screen'}
          </button>
          <button
            onClick={stopSharing}
            disabled={!isSharing && shareStatus !== 'sharing'}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
          >
            Stop Sharing
          </button>
        </div>
      </div>
    </div>
  );
};