import { useEffect, useState } from 'react';
import { Room, LocalParticipant, RemoteParticipant } from 'livekit-client';
import './LiveKitConnection.css';

interface LiveKitConnectionProps {
  roomName: string;
  userName: string;
  onParticipantJoined?: (participant: RemoteParticipant) => void;
  onParticipantLeft?: (participant: RemoteParticipant) => void;
}

export const LiveKitConnection: React.FC<LiveKitConnectionProps> = ({
  roomName,
  userName,
  onParticipantJoined,
  onParticipantLeft,
}) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [connectionQuality, setConnectionQuality] = useState<string | null>(null);

  useEffect(() => {
    const initLiveKit = async () => {
      // In a real implementation, you would get a token from your backend
      // For now, we'll use a placeholder - in production this should come from your auth service
      const token = import.meta.env.VITE_LIVEKIT_TOKEN || 'placeholder-token';
      const url = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';

      if (!token || token === 'placeholder-token') {
        console.warn('LiveKit token not configured. Please set VITE_LIVEKIT_TOKEN environment variable.');
        return;
      }

      const roomInstance = new Room();

      roomInstance.on('connectionStateChanged', (state) => {
        setConnectionState(state);
      });

      roomInstance.on('connectionQualityChanged', (quality: any) => {
        setConnectionQuality(String(quality));
      });

      roomInstance.on('participantConnected', (participant) => {
        setRemoteParticipants(prev => [...prev, participant]);
        onParticipantJoined?.(participant);
      });

      roomInstance.on('participantDisconnected', (participant) => {
        setRemoteParticipants(prev => prev.filter(p => p.identity !== participant.identity));
        onParticipantLeft?.(participant);
      });

      try {
        await roomInstance.connect(url, token);

        setLocalParticipant(roomInstance.localParticipant);
        setRoom(roomInstance);
      } catch (error) {
        console.error('Failed to connect to LiveKit room:', error);
      }
    };

    initLiveKit();

    // Cleanup
    return () => {
      room?.disconnect();
    };
  }, [roomName, userName, onParticipantJoined, onParticipantLeft]);

  if (!room) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Connecting to LiveKit room...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Connection Status</h3>
        <div className="flex items-center space-x-3">
          <div className={`h-3 w-3 rounded-full ${connectionState === 'connected' ? 'bg-green-500' : connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">{connectionState}</span>
        </div>
        {connectionQuality && (
          <div className="mt-2 text-xs text-gray-400 flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${connectionQuality === 'excellent' ? 'bg-green-500' : connectionQuality === 'good' ? 'bg-yellow-400' : connectionQuality === 'poor' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
            <span>{connectionQuality}</span>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Participants ({remoteParticipants.length + (localParticipant ? 1 : 0)})</h3>
        {localParticipant && (
          <div className="flex items-center space-x-3 mb-3 p-3 bg-gray-900 rounded">
            <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
              {localParticipant.identity.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{localParticipant.identity}</p>
              <p className="text-xs text-gray-400">You (Host)</p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {remoteParticipants.map((participant) => (
            <div key={participant.identity} className="flex items-center space-x-3 p-3 bg-gray-900 rounded">
              <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                {participant.identity.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{participant.identity}</p>
                <p className="text-xs text-gray-400">Guest</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};