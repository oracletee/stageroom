import { useState, useEffect } from 'react';

interface ChatMessage {
  id: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom';
  username: string;
  message: string;
  timestamp: string; // ISO format
  isHighlighted: boolean;
  isSubscriber: boolean;
  isModerator: boolean;
  avatarUrl?: string;
  badgeInfo?: {
    text: string;
    color: string;
  }[];
}

interface UnifiedChatProps {
  // In a real implementation, this would connect to chat services
}

export const UnifiedChat: React.FC<UnifiedChatProps> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Simulate connecting to chat services
  useEffect(() => {
    // Simulate connecting to various platform chats
    const connectToChats = async () => {
      setIsConnected(false);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add some sample messages
      const sampleMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          platform: 'youtube',
          username: 'TechGuru99',
          message: 'Just started watching! Love the setup!',
          timestamp: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
          isHighlighted: false,
          isSubscriber: true,
          isModerator: false,
          avatarUrl: 'https://ui-avatars.com/api/?name=TechGuru99&background=random',
          badgeInfo: [
            { text: 'SUB', color: '#F04E23' }
          ]
        },
        {
          id: 'msg-2',
          platform: 'twitch',
          username: 'StreamMaster',
          message: 'How did you get that lower third animation?',
          timestamp: new Date(Date.now() - 45 * 1000).toISOString(), // 45 seconds ago
          isHighlighted: false,
          isSubscriber: false,
          isModerator: true,
          avatarUrl: 'https://ui-avatars.com/api/?name=StreamMaster&background=random',
          badgeInfo: [
            { text: 'MOD', color: '#9146FF' }
          ]
        },
        {
          id: 'msg-3',
          platform: 'facebook',
          username: 'SocialStreamer',
          message: 'Can you share your overlay settings?',
          timestamp: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
          isHighlighted: false,
          isSubscriber: false,
          isModerator: false,
          avatarUrl: 'https://ui-avatars.com/api/?name=SocialStreamer&background=random',
          badgeInfo: []
        }
      ];
      
      setMessages(sampleMessages);
      setIsConnected(true);
    };

    connectToChats();
    
    // Simulate receiving new messages
    const interval = setInterval(() => {
      // Occasionally add a new sample message
      if (Math.random() > 0.7) { // 30% chance
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          platform: ['youtube', 'twitch', 'facebook'][Math.floor(Math.random() * 3)] as any,
          username: ['Viewer1', 'Viewer2', 'Viewer3', 'Viewer4'][Math.floor(Math.random() * 4)],
          message: ['Great stream!', 'Thanks for the info!', 'When is the next stream?', 'Love the content!', 'Question about audio settings'][Math.floor(Math.random() * 5)],
          timestamp: new Date().toISOString(),
          isHighlighted: Math.random() > 0.8, // 20% chance of highlighted
          isSubscriber: Math.random() > 0.8, // 20% chance of subscriber
          isModerator: false,
          avatarUrl: `https://ui-avatars.com/api/?name=${['Viewer1', 'Viewer2', 'Viewer3', 'Viewer4'][Math.floor(Math.random() * 4)]}&background=random`,
          badgeInfo: []
        };
        
        setMessages(prev => [...prev.slice(-49), newMessage]); // Keep last 50 messages
      }
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    
    try {
      // Simulate sending message to all platforms
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sentMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        platform: 'youtube', // In reality, this would go to the primary platform
        username: 'You (Host)',
        message: newMessage,
        timestamp: new Date().toISOString(),
        isHighlighted: false,
        isSubscriber: false,
        isModerator: true, // Host is always moderator
        avatarUrl: 'https://ui-avatars.com/api/?name=You+(Host)&background=random',
        badgeInfo: [
          { text: 'HOST', color: '#FF0000' }
        ]
      };
      
      setMessages(prev => [...prev.slice(-49), sentMessage]); // Keep last 50 messages
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Unified Chat</h2>
        <p className="text-sm text-gray-400">
          View and respond to chat from all platforms in one place
        </p>
      </div>
      
      <div className="mb-3">
        <div className="flex items-center space-x-3">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div className="flex flex-col h-64 bg-gray-900 rounded overflow-hidden mb-4">
        {messages.length === 0 && isConnected && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500">No messages yet</p>
          </div>
        )}
        
        {!isConnected && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-400">Connecting to chat services...</p>
          </div>
        )}
        
        <div className="overflow-y-auto p-3 space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 p-2 rounded 
                         ${msg.isHighlighted ? 'border-l-2 border-yellow-500 bg-yellow-900 bg-opacity-10' : ''}
                         ${msg.isSubscriber ? 'border-l-2 border-purple-500' : ''}
                         ${msg.isModerator && !msg.isSubscriber ? 'border-l-2 border-blue-500' : ''}`}
            >
              <div className="flex-shrink-0">
                {msg.avatarUrl ? (
                  <img 
                    src={msg.avatarUrl} 
                    alt={msg.username} 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {msg.badgeInfo && msg.badgeInfo.length > 0 && (
                  <div className="mt-1 flex space-x-1">
                    {msg.badgeInfo.map((badge, index) => (
                      <span
                        key={index}
                        className={`text-xs px-1.5 py-0.5 rounded 
                                ${badge.color} text-white`}
                      >
                        {badge.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{msg.username}</span>
                  <span className="text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{msg.message}</p>
                <div className="flex items-center space-x-2 text-xs">
                  <span className={`text-${msg.platform === 'youtube' ? 'red-400' :
                                msg.platform === 'twitch' ? 'purple-400' :
                                msg.platform === 'facebook' ? 'blue-400' : 'gray-400'} `}>
                    {msg.platform.charAt(0).toUpperCase() + msg.platform.slice(1)}
                  </span>
                  {msg.isSubscriber && (
                    <span className="text-xs bg-purple-500 text-white px-1 py-0 rounded">
                      SUB
                    </span>
                  )}
                  {msg.isModerator && !msg.isSubscriber && (
                    <span className="text-xs bg-blue-500 text-white px-1 py-0 rounded">
                      MOD
                    </span>
                  )}
                  {msg.isHighlighted && (
                    <span className="text-xs bg-yellow-500 text-white px-1 py-0 rounded">
                      HIGHLIGHT
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSendMessage} className="space-y-2">
        <div className="relative">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            placeholder="Type a message..."
            disabled={isSending}
          />
          {isSending && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <div className="animate-spin h-4 w-4 text-blue-500"></div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
        >
          {isSending ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};