import { useState } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';

type TabType = 'event' | 'stream';

interface ScheduleStreamSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export const ScheduleStreamSidebar: React.FC<ScheduleStreamSidebarProps> = ({ isOpen, onClose, onSuccess }) => {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('event');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    category: 'ted-talk',
    ticketType: 'free',
    ticketPrice: 0,
    currency: 'USD',
    maxTickets: null as number | null,
  });

  const [streamData, setStreamData] = useState({
    platform: 'youtube' as string,
    duration: 60,
    rtmpUrl: '',
    streamKey: '',
  });

  const handleEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: name === 'ticketPrice' || name === 'maxTickets' ? (value ? parseInt(value) : null) : value,
    }));
  };

  const handleStreamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStreamData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!eventData.title || !eventData.startTime) {
      setError('Title and start time are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const eventRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description || null,
          start_time: eventData.startTime,
          end_time: eventData.endTime || null,
          category: eventData.category,
          ticket_type: eventData.ticketType,
          ticket_price: eventData.ticketPrice || 0,
          currency: eventData.currency,
          max_tickets: eventData.maxTickets,
        }),
      });

      if (!eventRes.ok) {
        const err = await eventRes.json();
        throw new Error(err.error || 'Failed to create event');
      }

      const eventData_res = await eventRes.json();
      const eventId = eventData_res.event.id;

      const streamConfig = streamData.platform === 'custom-rtmp'
        ? { rtmpUrl: streamData.rtmpUrl, streamKey: streamData.streamKey }
        : {};

      const scheduleRes = await fetch('/api/stream/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          platform: streamData.platform,
          scheduledTime: eventData.startTime,
          duration: streamData.duration,
          platformConfig: streamConfig,
          eventId,
        }),
      });

      if (!scheduleRes.ok) {
        const err = await scheduleRes.json();
        throw new Error(err.error || 'Failed to schedule stream');
      }

      onSuccess({ event: eventData_res.event, stream: await scheduleRes.json() });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-gray-800 h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 z-10">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold text-white">Schedule Stream</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="flex">
            <button
              onClick={() => setActiveTab('event')}
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'event' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Event Details
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'stream' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Stream Setup
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-500 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="p-4 space-y-4">
          {activeTab === 'event' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  name="title"
                  value={eventData.title}
                  onChange={handleEventChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="Stream title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  name="description"
                  value={eventData.description}
                  onChange={handleEventChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="Stream description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={eventData.startTime}
                    onChange={handleEventChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={eventData.endTime}
                    onChange={handleEventChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  name="category"
                  value={eventData.category}
                  onChange={handleEventChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="ted-talk">TED Talk</option>
                  <option value="podcast">Podcast</option>
                  <option value="event">Event</option>
                  <option value="worship">Worship</option>
                  <option value="classroom">Classroom</option>
                  <option value="debate">Debate</option>
                  <option value="film-premiere">Film Premiere</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Ticket Type</label>
                  <select
                    name="ticketType"
                    value={eventData.ticketType}
                    onChange={handleEventChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                {eventData.ticketType === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                    <input
                      type="number"
                      name="ticketPrice"
                      value={eventData.ticketPrice || ''}
                      onChange={handleEventChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'stream' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
                <select
                  name="platform"
                  value={streamData.platform}
                  onChange={handleStreamChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="youtube">YouTube</option>
                  <option value="twitch">Twitch</option>
                  <option value="facebook">Facebook</option>
                  <option value="custom-rtmp">Custom RTMP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={streamData.duration}
                  onChange={handleStreamChange}
                  min={5}
                  max={480}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              {streamData.platform === 'custom-rtmp' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">RTMP URL</label>
                    <input
                      name="rtmpUrl"
                      value={streamData.rtmpUrl}
                      onChange={handleStreamChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="rtmp://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Stream Key</label>
                    <input
                      name="streamKey"
                      value={streamData.streamKey}
                      onChange={handleStreamChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Stream key"
                    />
                  </div>
                </>
              )}

              {streamData.platform !== 'custom-rtmp' && (
                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-sm text-blue-300">
                  Connect your {streamData.platform} account in Settings to stream directly.
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Stream'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
