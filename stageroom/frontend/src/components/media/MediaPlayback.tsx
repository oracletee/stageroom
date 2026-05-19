import { useState, useRef } from 'react';

interface MediaPlaybackProps {
  // In a real implementation, this would manage media playback
}

export const MediaPlayback: React.FC<MediaPlaybackProps> = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isLoaded, setIsLoaded] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  // Simulate media loading
  useEffect(() => {
    // In a real implementation, this would load actual media
    setIsLoaded(true);
    setDuration(180); // 3 minutes for demo
  }, []);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = 0;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseInt(e.target.value));
    if (mediaRef.current) {
      mediaRef.current.volume = parseInt(e.target.value) / 100;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (parseInt(e.target.value) / 100) * duration;
    setCurrentTime(seekTime);
    if (mediaRef.current) {
      mediaRef.current.currentTime = seekTime;
    }
  };

  // Update current time during playback
  useEffect(() => {
    if (isPlaying && mediaRef.current) {
      const interval = setInterval(() => {
        setCurrentTime(mediaRef.current.currentTime);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Media Playback</h2>
        <p className="text-sm text-gray-400">
          Play videos, audio, or other media files in your stream
        </p>
      </div>
      
      {!isLoaded ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading media...</p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <div className="bg-gray-900 h-36 rounded overflow-hidden relative">
              <video 
                ref={mediaRef}
                className="w-full h-full object-cover"
                poster="https://via.placeholder.com/640x360?media=placeholder"
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <button 
                    onClick={handlePlayPause}
                    className="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg transition"
                  >
                    ▶️ Play
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 text-xs text-gray-400 mb-2">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={currentTime > 0 && duration > 0 ? Math.round((currentTime / duration) * 100) : 0}
              onChange={handleSeek}
              className="flex-1"
            />
            <span>{formatTime(duration)}</span>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePlayPause}
                className={`p-2 rounded ${isPlaying ? 'bg-gray-600' : 'bg-green-600'} 
                         hover:bg-${isPlaying ? 'gray-700' : 'green-700'} 
                         text-white`}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={handleStop}
                className="p-2 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                ⏹️
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs">Volume:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={handleVolumeChange}
                className="w-24"
              />
              <span className="font-mono text-xs">{volume}%</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-900 rounded">
            <div className="flex justify-between text-sm">
              <span>Supported formats:</span>
              <span className="text-gray-400">MP4, WebM, OGG, MP3, WAV</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Source:</span>
              <span className="text-gray-400">Upload or URL</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper function to format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}