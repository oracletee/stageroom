import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface EventDetailProps {
  eventId: string;
  onBack?: () => void;
}

export function EventDetail({ eventId, onBack }: EventDetailProps) {
  const { user } = useUser();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'guests' | 'donations' | 'revenue'>('info');

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const token = await user?.getToken();
      const response = await fetch(`${API_BASE}/api/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setEvent(data);
      } else {
        setError(data.error || 'Failed to fetch event');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQRCode = () => {
    if (!event?.event?.qr_code_url) return null;
    const code = event.event.qr_code_url.split('/').pop();
    return code;
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
        <p className="text-red-600">{error || 'Event not found'}</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {onBack && (
        <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
          ← Back to events
        </button>
      )}

      <div className="flex items-start gap-8 mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{event.event.title}</h1>
          {event.event.description && (
            <p className="text-gray-600 mt-2">{event.event.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>{formatDate(event.event.start_time)}</span>
            {event.event.end_time && <span>→ {formatDate(event.event.end_time)}</span>}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.event.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {event.event.status}
            </span>
          </div>
        </div>

        {getQRCode() && (
          <div className="text-center p-4 border rounded-lg bg-white">
            <QRCodeSVG value={event.event.qr_code_url} size={128} />
            <p className="text-xs text-gray-500 mt-2">Scan to join</p>
          </div>
        )}
      </div>

      <div className="border-b mb-6">
        <nav className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Ticketing</h3>
            <p className="text-sm text-gray-600">
              Type: <span className="font-medium">{event.event.ticket_type}</span>
            </p>
            {event.event.ticket_type === 'paid' && (
              <p className="text-sm text-gray-600">
                Price: <span className="font-medium">{event.event.currency} {(event.event.ticket_price / 100).toFixed(2)}</span>
              </p>
            )}
            <p className="text-sm text-gray-600">
              Tickets sold: <span className="font-medium">{event.ticket_count || 0}</span>
            </p>
            {event.event.max_tickets && (
              <p className="text-sm text-gray-600">
                Max: <span className="font-medium">{event.event.max_tickets}</span>
              </p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Donations</h3>
            {event.donation_config?.enabled ? (
              <>
                <p className="text-sm text-green-600 font-medium">Enabled</p>
                {event.donation_config.tithe_enabled && <p className="text-sm text-gray-600">Tithe: Yes</p>}
                {event.donation_config.offering_enabled && <p className="text-sm text-gray-600">Offering: Yes</p>}
                {event.donation_config.preset_amounts && (
                  <p className="text-sm text-gray-600">
                    Presets: {JSON.parse(event.donation_config.preset_amounts).map((a: number) => `${a / 100}`).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Not enabled</p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Streaming</h3>
            <p className="text-sm text-gray-600">
              Room: <span className="font-medium">{event.event.livekit_room || 'Not set'}</span>
            </p>
            <p className="text-sm text-gray-600">
              Stream URL: <span className="font-medium">{event.event.stream_url || 'Not set'}</span>
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Share Link</h3>
            <div className="bg-gray-50 p-2 rounded text-sm font-mono break-all">
              {event.event.qr_code_url || 'Not generated'}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guests' && (
        <GuestList eventId={eventId} />
      )}

      {activeTab === 'donations' && (
        <DonationList eventId={eventId} />
      )}

      {activeTab === 'revenue' && (
        <RevenueSummary eventId={eventId} />
      )}
    </div>
  );
}

function GuestList({ eventId }: { eventId: string }) {
  const { user } = useUser();
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuests();
  }, [eventId]);

  const fetchGuests = async () => {
    try {
      const token = await user?.getToken();
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
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Access Code</th>
              <th className="pb-2 font-medium">Joined</th>
              <th className="pb-2 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(guest => (
              <tr key={guest.id} className="border-b">
                <td className="py-3">{guest.name}</td>
                <td className="py-3 text-sm text-gray-600">{guest.email}</td>
                <td className="py-3 font-mono text-sm">{guest.access_code}</td>
                <td className="py-3 text-sm">{guest.joined_at ? new Date(guest.joined_at).toLocaleString() : 'No'}</td>
                <td className="py-3 text-sm">{new Date(guest.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DonationList({ eventId }: { eventId: string }) {
  const { user } = useUser();
  const [donations, setDonations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, [eventId]);

  const fetchDonations = async () => {
    try {
      const token = await user?.getToken();
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
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Donations</p>
            <p className="text-2xl font-bold">{(stats.total / 100).toFixed(2)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Count</p>
            <p className="text-2xl font-bold">{stats.count}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">By Type</p>
            <div className="text-sm">
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
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {donations.map(d => (
              <tr key={d.id} className="border-b">
                <td className="py-3">{d.guest_name || 'Anonymous'}</td>
                <td className="py-3 text-sm text-gray-600">{d.guest_email || '-'}</td>
                <td className="py-3 capitalize">{d.type}</td>
                <td className="py-3 font-medium">{d.currency} {(d.amount / 100).toFixed(2)}</td>
                <td className="py-3 text-sm">{new Date(d.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RevenueSummary({ eventId }: { eventId: string }) {
  const { user } = useUser();
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, [eventId]);

  const fetchRevenue = async () => {
    try {
      const token = await user?.getToken();
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
      <div className="border rounded-lg p-6">
        <p className="text-sm text-gray-500">Ticket Revenue</p>
        <p className="text-3xl font-bold text-green-600">
          {revenue ? `$${(revenue.ticket_revenue / 100).toFixed(2)}` : '-'}
        </p>
      </div>
      <div className="border rounded-lg p-6">
        <p className="text-sm text-gray-500">Donation Revenue</p>
        <p className="text-3xl font-bold text-blue-600">
          {revenue ? `$${(revenue.donation_revenue / 100).toFixed(2)}` : '-'}
        </p>
      </div>
      <div className="border rounded-lg p-6">
        <p className="text-sm text-gray-500">Total Revenue</p>
        <p className="text-3xl font-bold text-purple-600">
          {revenue ? `$${(revenue.total / 100).toFixed(2)}` : '-'}
        </p>
      </div>
    </div>
  );
}
