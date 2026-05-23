import { useState, useEffect } from 'react';

interface ScheduledStream {
  id: string;
  title: string;
  description: string;
  platform: string;
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  liveInputUid?: string;
}

interface StreamSchedulerProps {
  eventId?: string;
}

export const StreamScheduler: React.FC<StreamSchedulerProps> = ({ eventId }) => {
  const [scheduledStreams, setScheduledStreams] = useState<ScheduledStream[]>([]);
  const [newStream, setNewStream] = useState({
    title: '',
    description: '',
    platform: 'youtube' as string,
    scheduledTime: '',
    duration: 60,
    rtmpUrl: '',
    streamKey: '',
  });
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    loadScheduledStreams();
  }, [eventId]);

  const loadScheduledStreams = async () => {
    try {
      const params = new URLSearchParams({ status: 'scheduled' });
      if (eventId) params.set('eventId', eventId);
      const response = await fetch(`/stream/schedule?${params.toString()}`, {
        headers: getAuthHeader(),
      });
      if (response.ok) {
        const data = await response.json();
        setScheduledStreams(data.scheduledStreams || []);
      }
    } catch (err) {
      console.error('Failed to load scheduled streams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseInt(value) : value;
    setNewStream(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newStream.title.trim() || !newStream.scheduledTime) {
      setScheduleStatus({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    setIsScheduling(true);
    setScheduleStatus(null);

    try {
      const platformConfig = newStream.platform === 'custom-rtmp'
        ? { rtmpUrl: newStream.rtmpUrl, streamKey: newStream.streamKey }
        : {};

      const response = await fetch(`/stream/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          title: newStream.title,
          description: newStream.description,
          platform: newStream.platform,
          scheduledTime: newStream.scheduledTime,
          duration: newStream.duration,
          platformConfig,
          eventId: eventId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule stream');
      }

      await loadScheduledStreams();
      setNewStream({
        title: '',
        description: '',
        platform: 'youtube',
        scheduledTime: '',
        duration: 60,
        rtmpUrl: '',
        streamKey: '',
      });
      setScheduleStatus({ message: 'Stream scheduled successfully!', type: 'success' });
    } catch (error: any) {
      setScheduleStatus({ message: error.message || 'Failed to schedule stream', type: 'error' });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelStream = async (streamId: string) => {
    try {
      await fetch(`/stream/schedule/${streamId}`, { method: 'DELETE', headers: getAuthHeader() });
      setScheduledStreams(prev => prev.filter(s => s.id !== streamId));
    } catch (err) {
      console.error('Failed to cancel stream:', err);
    }
  };

  const handleStartStream = async (streamId: string) => {
    try {
      await fetch(`/stream/schedule/${streamId}/start`, { method: 'POST', headers: getAuthHeader() });
      setScheduledStreams(prev =>
        prev.map(stream =>
          stream.id === streamId ? { ...stream, status: 'live' } : stream
        )
      );
    } catch (err) {
      console.error('Failed to start stream:', err);
    }
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
            rows={3}
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

        {newStream.platform === 'custom-rtmp' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                RTMP URL
              </label>
              <input
                type="text"
                name="rtmpUrl"
                value={newStream.rtmpUrl}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="rtmp://..."
                disabled={isScheduling}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Stream Key
              </label>
              <input
                type="text"
                name="streamKey"
                value={newStream.streamKey}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Stream key"
                disabled={isScheduling}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isScheduling}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
        >
          {isScheduling ? 'Scheduling...' : 'Schedule Stream'}
        </button>
      </form>

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-3">Scheduled Streams ({scheduledStreams.length})</h3>
        {isLoading ? (
          <p className="text-center text-gray-400 py-4">Loading...</p>
        ) : scheduledStreams.length === 0 ? (
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
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-white">{stream.title}</p>
                      {stream.description && (
                        <p className="text-xs text-gray-400">{stream.description}</p>
                      )}
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
                <div className="flex-shrink-0 space-x-2 ml-3">
                  {stream.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => handleStartStream(stream.id)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        title="Go Live Now"
                      >
                        ▶
                      </button>
                      <button
                        onClick={() => handleCancelStream(stream.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        title="Cancel Stream"
                      >
                        ✕
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
