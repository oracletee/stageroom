const CATEGORIES: Record<string, { label: string; gradient: string }> = {
  'ted-talk': { label: 'TED Talk', gradient: 'from-red-500 to-orange-500' },
  'podcast': { label: 'Podcast', gradient: 'from-purple-500 to-pink-500' },
  'event': { label: 'Event', gradient: 'from-blue-500 to-cyan-500' },
  'worship': { label: 'Worship', gradient: 'from-indigo-500 to-purple-500' },
  'classroom': { label: 'Classroom', gradient: 'from-green-500 to-teal-500' },
  'debate': { label: 'Debate', gradient: 'from-yellow-500 to-orange-500' },
  'film-premiere': { label: 'Film Premiere', gradient: 'from-gray-700 to-gray-900' },
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-green-100 text-green-700',
  ended: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

interface TicketType {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  max_quantity: number | null;
  sold_count: number;
}

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
  category: string | null;
  poster_url: string | null;
  qr_code_url: string | null;
  ticket_types?: TicketType[];
}

interface EventCardProps {
  event: Event;
  onSelect: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export function EventCard({ event, onSelect, onDelete, onShare }: EventCardProps) {
  const cat = CATEGORIES[event.category || 'event'] || CATEGORIES.event;
  const ticketTypes = event.ticket_types || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className="flex border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors bg-gray-800/50 cursor-pointer group"
      onClick={onSelect}
    >
      <div className={`w-28 h-36 shrink-0 bg-gradient-to-br ${cat.gradient} flex flex-col items-center justify-center p-2 relative`}>
        <span className="text-white/90 text-xs font-medium text-center">{cat.label}</span>
        {event.poster_url && (
          <img src={event.poster_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="text-base font-semibold text-white truncate">{event.title}</h3>
          {event.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
            <span>{formatDate(event.start_time)}</span>
            <span>{formatTime(event.start_time)}</span>
            {event.end_time && <span>→ {formatTime(event.end_time)}</span>}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[event.status] || STATUS_COLORS.draft}`}>
                {event.status}
              </span>
              {ticketTypes.length > 0 ? (
                ticketTypes.slice(0, 3).map(tt => (
                  <span key={tt.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${tt.type === 'free' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {tt.name}: {tt.type === 'free' ? 'Free' : `${tt.currency} ${(tt.price / 100).toFixed(2)}`}
                  </span>
                ))
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.ticket_type === 'free' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {event.ticket_type === 'free' ? 'Free' : `${event.currency} ${(event.ticket_price / 100).toFixed(2)}`}
                </span>
              )}
              {ticketTypes.length > 3 && (
                <span className="text-xs text-gray-500">+{ticketTypes.length - 3} more</span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); onShare(); }} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Share">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 103.316 6.632c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 11-3.316-6.632c0-.482-.114-.938-.316-1.342" />
                </svg>
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded" title="Delete">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
