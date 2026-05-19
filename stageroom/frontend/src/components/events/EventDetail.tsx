import { useState, useEffect } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface EventDetailProps {
  eventId: string;
  onBack?: () => void;
  onShare?: (event: any) => void;
}

export function EventDetail({ eventId, onBack, onShare }: EventDetailProps) {
  const { token } = useAuthStore();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'guests' | 'donations' | 'revenue'>('info');

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const [eventRes, ticketRes] = await Promise.all([
        fetch(`${API_BASE}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/events/${eventId}/ticket-types`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      const eventData = await eventRes.json();
      let ticketData = { ticket_types: [] };
      try {
        ticketData = await ticketRes.json();
      } catch {
        // Ticket types fetch failed, use empty array
      }
      if (eventRes.ok) {
        setEvent({ ...eventData, ticket_types: ticketData.ticket_types || [] });
      } else {
        setError(eventData.error || 'Failed to fetch event');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">{error || 'Event not found'}</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 text-blue-400 hover:underline">
            ← Back to events
          </button>
        )}
      </div>
    );
  }

  const tabs = [
    { id: 'info' as const, label: 'Event Info' },
    { id: 'guests' as const, label: `Guests (${event.guest_count || 0})` },
    { id: 'donations' as const, label: 'Donations' },
    { id: 'revenue' as const, label: 'Revenue' },
  ];

  const CATEGORIES: Record<string, string> = {
    'ted-talk': 'TED Talk',
    'podcast': 'Podcast',
    'event': 'Event',
    'worship': 'Worship',
    'classroom': 'Classroom',
    'debate': 'Debate',
    'film-premiere': 'Film Premiere',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {onBack && (
        <button onClick={onBack} className="text-blue-400 hover:underline mb-4 text-sm">
          ← Back to events
        </button>
      )}

      <div className="flex items-start gap-8 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{event.event.title}</h1>
            {onShare && event.event.qr_code_url && (
              <button
                onClick={() => onShare(event.event)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                title="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 103.316 6.632c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 11-3.316-6.632c0-.482-.114-.938-.316-1.342" />
                </svg>
              </button>
            )}
          </div>
          {event.event.description && (
            <p className="text-gray-400 mt-2">{event.event.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <span>{formatDate(event.event.start_time)}</span>
            {event.event.end_time && <span>→ {formatDate(event.event.end_time)}</span>}
            {event.event.category && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {CATEGORIES[event.event.category] || event.event.category}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.event.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
              {event.event.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          {event.event.poster_url ? (
            <img src={event.event.poster_url} alt={event.event.title} className="w-32 h-44 object-cover rounded-lg border border-gray-700" />
          ) : event.event.qr_code_url ? (
            <div className="text-center p-4 border border-gray-700 rounded-lg bg-gray-800">
              <QRCodeSVG value={event.event.qr_code_url} size={128} />
              <p className="text-xs text-gray-400 mt-2">Scan to join</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-b border-gray-700 mb-6">
        <nav className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <h3 className="font-semibold text-white mb-2">Tickets</h3>
            {event.ticket_types && event.ticket_types.length > 0 ? (
              <div className="space-y-2">
                {event.ticket_types.map((tt: any) => (
                  <div key={tt.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-white">{tt.name}</span>
                      <span className="text-gray-400 ml-2">
                        {tt.type === 'free' ? 'Free' : `${tt.currency} ${(tt.price / 100).toFixed(2)}`}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {tt.sold_count} sold{tt.max_quantity ? ` / ${tt.max_quantity}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-400">
                  Type: <span className="font-medium text-white">{event.event.ticket_type}</span>
                </p>
                {event.event.ticket_type === 'paid' && (
                  <p className="text-sm text-gray-400">
                    Price: <span className="font-medium text-white">{event.event.currency} {(event.event.ticket_price / 100).toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-gray-400 mt-2">
              Total sold: <span className="font-medium text-white">{event.ticket_count || 0}</span>
            </p>
          </div>

          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <h3 className="font-semibold text-white mb-2">Donations</h3>
            {event.donation_types && event.donation_types.length > 0 ? (
              <div className="space-y-2">
                {event.donation_types.map((dt: any) => (
                  <div key={dt.id} className="text-sm">
                    <span className="font-medium text-white">{dt.name}</span>
                    {dt.preset_amounts && (
                      <span className="text-gray-400 ml-2">
                        {JSON.parse(dt.preset_amounts).map((a: number) => `${a / 100}`).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : event.donation_config?.enabled ? (
              <>
                <p className="text-sm text-green-400 font-medium">Enabled</p>
                {event.donation_config.tithe_enabled && <p className="text-sm text-gray-400">Tithe: Yes</p>}
                {event.donation_config.offering_enabled && <p className="text-sm text-gray-400">Offering: Yes</p>}
              </>
            ) : (
              <p className="text-sm text-gray-500">Not enabled</p>
            )}
          </div>

          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <h3 className="font-semibold text-white mb-2">Streaming</h3>
            <p className="text-sm text-gray-400">
              Room: <span className="font-medium text-white">{event.event.livekit_room || 'Not set'}</span>
            </p>
            <p className="text-sm text-gray-400">
              Stream URL: <span className="font-medium text-white">{event.event.stream_url || 'Not set'}</span>
            </p>
          </div>

          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <h3 className="font-semibold text-white mb-2">Share Link</h3>
            <div className="bg-gray-700 p-2 rounded text-sm font-mono text-gray-300 break-all">
              {event.event.qr_code_url || 'Not generated'}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guests' && <GuestList eventId={eventId} />}
      {activeTab === 'donations' && <DonationList eventId={eventId} />}
      {activeTab === 'revenue' && <RevenueSummary eventId={eventId} />}
    </div>
  );
}

function GuestList({ eventId }: { eventId: string }) {
  const { token } = useAuthStore();
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuests();
  }, [eventId]);

  const fetchGuests = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/guests/event/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setGuests(data.guests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />;

  return (
    <div>
      {guests.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No guests registered yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Access Code</th>
                <th className="pb-2 font-medium">Joined</th>
                <th className="pb-2 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody>
              {guests.map(guest => (
                <tr key={guest.id} className="border-b border-gray-700">
                  <td className="py-3 text-white">{guest.name}</td>
                  <td className="py-3 text-sm text-gray-400">{guest.email}</td>
                  <td className="py-3 font-mono text-sm text-gray-300">{guest.access_code}</td>
                  <td className="py-3 text-sm text-gray-400">{guest.joined_at ? new Date(guest.joined_at).toLocaleString() : 'No'}</td>
                  <td className="py-3 text-sm text-gray-400">{new Date(guest.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DonationList({ eventId }: { eventId: string }) {
  const { token } = useAuthStore();
  const [donations, setDonations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, [eventId]);

  const fetchDonations = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/donations/event/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDonations(data.donations || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />;

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <p className="text-sm text-gray-400">Total Donations</p>
            <p className="text-2xl font-bold text-white">{(stats.total / 100).toFixed(2)}</p>
          </div>
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <p className="text-sm text-gray-400">Count</p>
            <p className="text-2xl font-bold text-white">{stats.count}</p>
          </div>
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <p className="text-sm text-gray-400">By Type</p>
            <div className="text-sm text-gray-300">
              {stats.by_type?.map((t: any) => (
                <span key={t.type} className="mr-3">{t.type}: {(t.total / 100).toFixed(2)}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {donations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No donations yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {donations.map(d => (
                <tr key={d.id} className="border-b border-gray-700">
                  <td className="py-3 text-white">{d.guest_name || 'Anonymous'}</td>
                  <td className="py-3 text-sm text-gray-400">{d.guest_email || '-'}</td>
                  <td className="py-3 capitalize text-gray-300">{d.type}</td>
                  <td className="py-3 font-medium text-white">{d.currency} {(d.amount / 100).toFixed(2)}</td>
                  <td className="py-3 text-sm text-gray-400">{new Date(d.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RevenueSummary({ eventId }: { eventId: string }) {
  const { token } = useAuthStore();
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, [eventId]);

  const fetchRevenue = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/payments/event/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setRevenue(data.revenue);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="border border-gray-700 rounded-lg p-6 bg-gray-800/50">
        <p className="text-sm text-gray-400">Ticket Revenue</p>
        <p className="text-3xl font-bold text-green-400">
          {revenue ? `$${(revenue.ticket_revenue / 100).toFixed(2)}` : '-'}
        </p>
      </div>
      <div className="border border-gray-700 rounded-lg p-6 bg-gray-800/50">
        <p className="text-sm text-gray-400">Donation Revenue</p>
        <p className="text-3xl font-bold text-blue-400">
          {revenue ? `$${(revenue.donation_revenue / 100).toFixed(2)}` : '-'}
        </p>
      </div>
      <div className="border border-gray-700 rounded-lg p-6 bg-gray-800/50">
        <p className="text-sm text-gray-400">Total Revenue</p>
        <p className="text-3xl font-bold text-purple-400">
          {revenue ? `$${(revenue.total / 100).toFixed(2)}` : '-'}
        </p>
      </div>
    </div>
  );
}
