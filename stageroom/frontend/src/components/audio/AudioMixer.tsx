import { useState, useRef, useEffect } from 'react';

interface AudioTrack {
  id: string;
  label: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  type: 'microphone' | 'desktop-audio' | 'media' | 'music';
}

interface AudioMixerProps {
  compact?: boolean;
}

export const AudioMixer: React.FC<AudioMixerProps> = ({ compact }) => {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([
    { id: 'mic1', label: 'Mic', volume: 80, muted: false, solo: false, type: 'microphone' },
    { id: 'desktop1', label: 'Desktop', volume: 60, muted: false, solo: false, type: 'desktop-audio' },
    { id: 'media1', label: 'Media', volume: 70, muted: false, solo: false, type: 'media' },
  ]);

  const [masterVolume, setMasterVolume] = useState(100);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (isMonitoring) {
      initAudioMonitoring();
    } else {
      cleanupAudioMonitoring();
    }
    return () => { cleanupAudioMonitoring(); };
  }, [isMonitoring]);

  const initAudioMonitoring = () => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioContextRef.current.destination);
    } catch (e) {
      console.error('Failed to initialize audio context:', e);
      setIsMonitoring(false);
    }
  };

  const cleanupAudioMonitoring = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    setAudioTracks(prev =>
      prev.map(track => track.id === trackId ? { ...track, volume } : track)
    );
  };

  const handleMuteToggle = (trackId: string) => {
    setAudioTracks(prev =>
      prev.map(track => track.id === trackId ? { ...track, muted: !track.muted } : track)
    );
    if (!audioTracks.find(track => track.id === trackId)?.muted) {
      setAudioTracks(prev =>
        prev.map(track => track.id === trackId ? { ...track, solo: false } : track)
      );
    }
  };

  const handleSoloToggle = (trackId: string) => {
    setAudioTracks(prev =>
      prev.map(track =>
        track.id === trackId
          ? { ...track, solo: !track.solo }
          : { ...track, solo: false }
      )
    );
    const anySolo = audioTracks.some(track => track.solo);
    if (!anySolo) {
      setAudioTracks(prev =>
        prev.map(track => ({ ...track, muted: false }))
      );
    }
  };

  const iconMap: Record<string, string> = {
    microphone: '🎤',
    'desktop-audio': '💻',
    media: '🎬',
    music: '🎵',
  };

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Audio</h2>
          <span className="text-[10px] text-gray-500">{masterVolume}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={masterVolume}
          onChange={(e) => setMasterVolume(parseInt(e.target.value))}
          className="w-full h-1 mb-3" style={{ accentColor: '#3b82f6' }}
        />
        <div className="flex-1 space-y-1.5">
          {audioTracks.map((track) => (
            <div key={track.id}
              className={`grid grid-cols-[16px_1fr_28px_28px] items-center gap-1 px-1.5 py-1 rounded
                ${track.solo ? 'bg-yellow-900/20 ring-1 ring-yellow-600/30' : track.muted ? 'opacity-40' : 'bg-gray-900/50'}`}
            >
              <span className="text-xs leading-none">{iconMap[track.type] || '🔊'}</span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] text-gray-300 truncate">{track.label}</span>
                <input
                  type="range" min={0} max={100} value={track.volume}
                  onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))}
                  className="flex-1 h-0.5 min-w-[40px]" style={{ accentColor: '#3b82f6' }}
                />
              </div>
              <button onClick={() => handleMuteToggle(track.id)}
                className={`text-[9px] font-bold px-1 py-0.5 rounded ${track.muted ? 'bg-red-700 text-white' : 'bg-gray-700 text-gray-400'} leading-none`}>
                M
              </button>
              <button onClick={() => handleSoloToggle(track.id)}
                className={`text-[9px] font-bold px-1 py-0.5 rounded ${track.solo ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'} leading-none`}>
                S
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Audio Mixer</h2>
        <p className="text-sm text-gray-400">Control audio levels and monitoring for your stream</p>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Master Volume</span>
          <span className="text-sm font-mono">{masterVolume}%</span>
        </div>
        <input type="range" min={0} max={100} value={masterVolume}
          onChange={(e) => setMasterVolume(parseInt(e.target.value))} className="w-full" />
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Audio Monitoring</span>
          <button onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-3 py-1 text-white rounded text-sm ${isMonitoring ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}>
            {isMonitoring ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {audioTracks.map((track) => (
          <div key={track.id}
            className={`flex items-center p-3 bg-gray-900 rounded
              ${track.solo ? 'border-l-4 border-yellow-500' : ''}
              ${track.muted ? 'opacity-50' : ''}`}>
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-sm">
                {iconMap[track.type] || '🔊'}
              </div>
            </div>
            <div className="flex-1 ml-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-white">{track.label}</p>
                  <p className="text-xs text-gray-400">{track.type}</p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <button onClick={() => handleMuteToggle(track.id)}
                    className={`p-1 rounded ${track.muted ? 'bg-red-600' : 'bg-gray-600'} text-white`}>
                    {track.muted ? '🔇' : '🔊'}
                  </button>
                  <button onClick={() => handleSoloToggle(track.id)}
                    className={`p-1 rounded ${track.solo ? 'bg-yellow-600' : 'bg-gray-600'} text-white`}>
                    {track.solo ? '🎧' : '◯'}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-3">
                <span className="text-xs text-gray-400">Volume:</span>
                <input type="range" min={0} max={100} value={track.volume}
                  onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))} className="flex-1" />
                <span className="text-xs font-mono">{track.volume}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
