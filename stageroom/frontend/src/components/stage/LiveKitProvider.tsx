import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Room, RemoteParticipant } from 'livekit-client';
import { useStreamStore } from '../../hooks/useStreamStore';

interface LiveKitContextType {
  room: Room | null;
  connected: boolean;
  connectionState: string;
  localStream: MediaStream | null;
  participantStreams: Map<string, MediaStream>;
}

const LiveKitContext = createContext<LiveKitContextType>({
  room: null,
  connected: false,
  connectionState: 'disconnected',
  localStream: null,
  participantStreams: new Map(),
});

export const useLiveKit = () => useContext(LiveKitContext);

export const LiveKitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setLiveKitParticipants } = useStreamStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participantStreams, setParticipantStreams] = useState<Map<string, MediaStream>>(new Map());
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_LIVEKIT_URL;
    const token = import.meta.env.VITE_LIVEKIT_TOKEN;

    if (!url || !token || token === 'your-token-here' || token === 'placeholder-token') {
      setConnectionState('not-configured');
      return;
    }

    const connectRoom = async () => {
      const roomInstance = new Room();

      roomInstance.on('connectionStateChanged', (state) => {
        setConnectionState(state);
        setConnected(state === 'connected');
      });

      roomInstance.on('participantConnected', (participant: RemoteParticipant) => {
        const trackPublications = Array.from(participant.videoTrackPublications.values());
        trackPublications.forEach(pub => {
          if (pub.track && pub.kind === 'video') {
            const stream = new MediaStream([pub.track.mediaStreamTrack]);
            setParticipantStreams(prev => {
              const next = new Map(prev);
              next.set(participant.identity, stream);
              return next;
            });
          }
        });
      });

      roomInstance.on('participantDisconnected', (participant: RemoteParticipant) => {
        setParticipantStreams(prev => {
          const next = new Map(prev);
          next.delete(participant.identity);
          return next;
        });
      });

      roomInstance.on('trackSubscribed', (track, publication, participant) => {
        if (track.kind === 'video') {
          const stream = new MediaStream([track.mediaStreamTrack]);
          setParticipantStreams(prev => {
            const next = new Map(prev);
            next.set(participant.identity, stream);
            return next;
          });
        }
      });

      roomInstance.on('trackUnsubscribed', (_track, _publication, participant) => {
        setParticipantStreams(prev => {
          const next = new Map(prev);
          next.delete(participant.identity);
          return next;
        });
      });

      try {
        await roomInstance.connect(url, token);
        setRoom(roomInstance);
        roomRef.current = roomInstance;

        const localCam = await roomInstance.localParticipant.setCameraEnabled(true);
        if (localCam) {
          const camPub = roomInstance.localParticipant.getTrackPublication('camera');
          if (camPub?.track) {
            const stream = new MediaStream([camPub.track.mediaStreamTrack]);
            setLocalStream(stream);
          }
        }
      } catch (err) {
        console.error('LiveKit connection failed:', err);
        setConnectionState('failed');
      }
    };

    connectRoom();

    return () => {
      roomRef.current?.disconnect();
    };
  }, [setLiveKitParticipants]);

  useEffect(() => {
    if (room) {
      const participants: { identity: string; hasVideo: boolean }[] = [];
      room.remoteParticipants.forEach(p => {
        participants.push({
          identity: p.identity,
          hasVideo: Array.from(p.videoTrackPublications.values()).some(pub => pub.kind === 'video'),
        });
      });
      setLiveKitParticipants(participants);
    }
  }, [room, participantStreams, setLiveKitParticipants]);

  return (
    <LiveKitContext.Provider value={{ room, connected, connectionState, localStream, participantStreams }}>
      {children}
    </LiveKitContext.Provider>
  );
};
