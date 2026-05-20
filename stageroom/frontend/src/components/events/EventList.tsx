import { useState, useEffect } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';
import { EventCard } from './EventCard';



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
  category: string | null;
  poster_url: string | null;
  created_at: string;
  updated_at: string;
}

interface EventListProps {
  onSelectEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onShareEvent: (event: Event) => void;
}

export function EventList({ onSelectEvent, onDeleteEvent, onShareEvent }: EventListProps) {
  const { token } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      const url = filter ? `/api/events?status=${filter}` : `/api/events`;
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

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4 gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events..."
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">{search ? 'No events match your search' : 'No events yet'}</p>
          <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Create your first event to get started'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={() => onSelectEvent(event)}
              onDelete={() => onDeleteEvent(event.id)}
              onShare={() => onShareEvent(event)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
