import { useState } from 'react';

interface ScheduledStream {
  id: string;
  title: string;
  description: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom-rtmp';
  scheduledTime: string; // ISO 8601 format
  duration: number; // in minutes
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  thumbnailUrl?: string;
}

interface StreamSchedulerProps {
  // In a real implementation, this would manage scheduled streams
}

export const StreamScheduler: React.FC<StreamSchedulerProps> = () => {
  const [scheduledStreams, setScheduledStreams] = useState<ScheduledStream[]>([
    {
      id: 'stream-1',
      title: 'Weekly Tech Talk',
      description': 'Join us for our weekly discussion on the latest tech trends',
      platform: 'youtube',
      scheduledTime: '2026-05-15T14:00:00Z',
      duration: 60,
      status: 'scheduled',
      thumbnailUrl: 'https://via.placeholder.com/1280x720?text=Weekly+Tech+Talk'
    },
    {
      id: 'stream-2',
      title': 'Live Q&A Session',
      description: 'Ask me anything about streaming and content creation',
      platform: 'twitch',
      scheduledTime: '2026-05-16T19:30:00Z',
      duration: 90,
      status: 'scheduled',
      thumbnailUrl: 'https://via.placeholder.com/1280x720?text=Live+Q%26A+Session'
    }
  ]);
  
  const [newStream, setNewStream] = useState({
    title: '',
    description: '',
    platform: 'youtube' as const,
    scheduledTime: '',
    duration: 60
  });
  
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseInt(value) : value;
    setNewStream(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!newStream.title.trim() || !newStream.scheduledTime) {
      setScheduleStatus({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    setIsScheduling(true);
    setScheduleStatus(null);

    try {
      // Simulate API call to schedule stream
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would make an API call to your backend
      const newScheduledStream: ScheduledStream = {
        id: `stream-${Date.now()}`,
        title: newStream.title,
        description: newStream.description,
        platform: newStream.platform,
        scheduledTime: newStream.scheduledTime,
        duration: newStream.duration,
        status: 'scheduled'
      };
      
      setScheduledStreams(prev => [newScheduledStream, ...prev]);
      setNewStream({
        title: '',
        description: '',
        platform: 'youtube',
        scheduledTime: '',
        duration: 60
      });
      setScheduleStatus({ message: 'Stream scheduled successfully!', type: 'success' });
    } catch (error) {
      setScheduleStatus({ message: 'Failed to schedule stream. Please try again.', type: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelStream = (streamId: string) => {
    setScheduledStreams(prev =>
      prev.map(stream =>
        stream.id === streamId
          ? { ...stream, status: 'cancelled' }
          : stream
      )
    );
  };

  const handleStartStream = (streamId: string) => {
    setScheduledStreams(prev =>
      prev.map(stream =>
        stream.id === streamId
          ? { ...stream, status: 'live' }
          : stream
      )
    );
  };

  const handleCompleteStream = (streamId: string) => {
    setScheduledStreams(prev =>
      prev.map(stream =>
        stream.id === streamId
          ? { ...stream, status: 'completed' }
          : stream
      )
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Stream Scheduling</h2>
        <p className="text-sm text-gray-400">
          Schedule your streams in advance to go live automatically
        </p>
      </div>

      {scheduleStatus && (
        <div className={`mb-4 p-3 rounded ${scheduleStatus.type === 'success' ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'} 
                     border ${scheduleStatus.type === 'success' ? 'border-green-500' : 'border-red-500'} `}>
          <p className={`text-${scheduleStatus.type === 'success' ? 'green-400' : 'red-400'}`}>
            {scheduleStatus.message}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Stream Title
          </label>
          <input
            type="text"
            name="title"
            value={newStream.title}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter stream title"
            disabled={isScheduling}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={newStream.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Enter stream description"
            disabled={isScheduling}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Platform
            </label>
            <select
              name="platform"
              value={newStream.platform}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isScheduling}
            >
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="facebook">Facebook</option>
              <option value="custom-rtmp">Custom RTMP</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              name="duration"
              min={5}
              max={480}
              value={newStream.duration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="60"
              disabled={isScheduling}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Scheduled Time
          </label>
          <input
            type="datetime-local"
            name="scheduledTime"
            value={newStream.scheduledTime}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isScheduling}
          />
        </div>
        
        <button
          type="submit"
          disabled={isScheduling}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
        >
          {isScheduling ? 'Scheduling...' : 'Schedule Stream'}
        </button>
      </form>

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-3">Scheduled Streams ({scheduledStreams.filter(s => s.status === 'scheduled').length})</h3>
        {scheduledStreams.length === 0 ? (
          <p className="text-center text-gray-400 py-4">
            No streams scheduled yet
          </p>
        ) : (
          <div className="space-y-3">
            {scheduledStreams.map((stream) => (
              <div
                key={stream.id}
                className={`flex items-center p-3 bg-gray-900 rounded 
                           ${stream.status === 'live' ? 'border-l-4 border-green-500' :
                            stream.status === 'completed' ? 'border-l-4 border-blue-500' :
                            stream.status === 'cancelled' ? 'border-l-4 border-red-500' : ''}`}
              >
                <div className="flex-shrink-0">
                  {stream.thumbnailUrl ? (
                    <img 
                      src={stream.thumbnailUrl} 
                      alt={stream.title} 
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {stream.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 ml-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-white">{stream.title}</p>
                      <p className="text-xs text-gray-400">{stream.description}</p>
                    </div>
                    <div className="flex space-x-2 text-xs">
                      <span className={`px-2 py-0.5 text-xs rounded-full 
                                    ${stream.status === 'scheduled' ? 'bg-blue-500 text-white' :
                                     stream.status === 'live' ? 'bg-green-500 text-white' :
                                     stream.status === 'completed' ? 'bg-blue-500 text-white' :
                                     stream.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'}`}>
                        {stream.status.charAt(0).toUpperCase() + stream.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {stream.platform.charAt(0).toUpperCase() + stream.platform.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-3">
                    <span className="text-xs text-gray-400">Time:</span>
                    <span className="text-xs font-mono">
                      {new Date(stream.scheduledTime).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400 mx-2">|</span>
                    <span className="text-xs font-mono">
                      {stream.duration} min
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 space-x-2">
                  {stream.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => handleStartStream(stream.id)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        title="Go Live Now"
                      >
                        ▶️
                      </button>
                      <button
                        onClick={() => handleCancelStream(stream.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        title="Cancel Stream"
                      >
                        ❌
                      </button>
                    </>
                  )}
                  {stream.status === 'live' && (
                    <>
                      <button
                        onClick={() => handleCompleteStream(stream.id)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        title="Mark as Complete"
                      >
                        ✓
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};