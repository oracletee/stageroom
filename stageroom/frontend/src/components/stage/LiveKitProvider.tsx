import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { Room, RemoteParticipant } from 'livekit-client';
import { useStreamStore } from '../../hooks/useStreamStore';
import { useAuthStore } from '../../hooks/useAuthStore';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isHost: boolean;
  identity: string;
}

interface LiveKitContextType {
  room: Room | null;
  connected: boolean;
  connectionState: string;
  localStream: MediaStream | null;
  participantStreams: Map<string, MediaStream>;
  chatMessages: ChatMessage[];
  sendChatMessage: (message: string) => void;
}

const LiveKitContext = createContext<LiveKitContextType>({
  room: null,
  connected: false,
  connectionState: 'disconnected',
  localStream: null,
  participantStreams: new Map(),
  chatMessages: [],
  sendChatMessage: () => {},
});

export const useLiveKit = () => useContext(LiveKitContext);

export const LiveKitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setLiveKitParticipants } = useStreamStore();
  const { user } = useAuthStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participantStreams, setParticipantStreams] = useState<Map<string, MediaStream>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const roomRef = useRef<Room | null>(null);
  const messageIndexRef = useRef(0);

  const sendChatMessage = useCallback((message: string) => {
    if (!roomRef.current || !connected) return;
    const payload = JSON.stringify({
      username: user?.name || user?.email || 'Host',
      message,
      isHost: true,
      timestamp: new Date().toISOString(),
    });
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(payload),
      { reliable: true } as any,
    );
    const localMsg: ChatMessage = {
      id: `local-${messageIndexRef.current++}`,
      username: user?.name || user?.email || 'Host',
      message,
      timestamp: new Date().toISOString(),
      isHost: true,
      identity: roomRef.current.localParticipant.identity,
    };
    setChatMessages(prev => [...prev.slice(-199), localMsg]);
  }, [connected, user]);

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

      roomInstance.on('trackSubscribed', (track, _publication, participant) => {
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

      roomInstance.on('dataReceived', (payload, participant) => {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text);
          const chatMsg: ChatMessage = {
            id: `remote-${messageIndexRef.current++}`,
            username: data.username || participant?.identity || 'Viewer',
            message: data.message || '',
            timestamp: data.timestamp || new Date().toISOString(),
            isHost: data.isHost === true,
            identity: participant?.identity || '',
          };
          setChatMessages(prev => [...prev.slice(-199), chatMsg]);
        } catch {
          // Ignore malformed messages
        }
      });

      try {
        await roomInstance.connect(url, token);
        setRoom(roomInstance);
        roomRef.current = roomInstance;

        const connectedIdentities = new Set<string>();
        roomInstance.remoteParticipants.forEach(p => connectedIdentities.add(p.identity));

        const store = useStreamStore.getState();
        const filteredBackstage = store.backstageParticipants.filter(id => connectedIdentities.has(id));
        const filteredSpotlight = store.spotlightParticipants.filter(id => connectedIdentities.has(id));

        if (filteredBackstage.length !== store.backstageParticipants.length ||
            filteredSpotlight.length !== store.spotlightParticipants.length) {
          useStreamStore.setState({
            backstageParticipants: filteredBackstage,
            spotlightParticipants: filteredSpotlight,
          });
        }

        const localCam = await roomInstance.localParticipant.setCameraEnabled(true);
        if (localCam) {
          const camPub = roomInstance.localParticipant.getTrackPublication('camera' as any);
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
    <LiveKitContext.Provider value={{ room, connected, connectionState, localStream, participantStreams, chatMessages, sendChatMessage }}>
      {children}
    </LiveKitContext.Provider>
  );
};
