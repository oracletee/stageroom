import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isHost: boolean;
}

export const UnifiedChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const sentMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      username: 'You',
      message: newMessage,
      timestamp: new Date().toISOString(),
      isHost: true,
    };

    setMessages(prev => [...prev.slice(-99), sentMessage]);
    setNewMessage('');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Chat</h2>
        <p className="text-sm text-gray-400">
          Messages from viewers will appear here
        </p>
      </div>

      <div className="flex flex-col h-64 bg-gray-900 rounded overflow-hidden mb-4">
        <div className="overflow-y-auto p-3 space-y-2 flex-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-gray-600 text-xs mt-1">Start the stream to receive chat</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="flex items-start space-x-2 p-2 rounded">
                <div className="flex-shrink-0 h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium">
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-medium ${msg.isHost ? 'text-blue-400' : 'text-white'}`}>
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="space-y-2">
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Type a message..."
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
};
