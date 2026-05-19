import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  ticket_type: string;
  ticket_price: number;
  currency: string;
  max_tickets: number | null;
  qr_code_url: string | null;
  livekit_room: string | null;
  stream_url: string | null;
  created_at: string;
  updated_at: string;
}

interface EventListProps {
  onSelectEvent?: (event: Event) => void;
}

export function EventList({ onSelectEvent }: EventListProps) {
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      const token = await user?.getToken();
      const url = filter ? `${API_BASE}/api/events?status=${filter}` : `${API_BASE}/api/events`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setEvents(data.events || []);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      const token = await user?.getToken();
      const response = await fetch(`${API_BASE}/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'live': return 'bg-green-100 text-green-700';
      case 'ended': return 'bg-purple-100 text-purple-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Events</h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No events yet</p>
          <p className="text-sm mt-1">Create your first event to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map(event => (
            <div
              key={event.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectEvent?.(event)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{formatDate(event.start_time)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.ticket_type === 'free' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {event.ticket_type === 'free' ? 'Free' : `${event.currency} ${(event.ticket_price / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(event.id); }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
