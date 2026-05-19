import { useState } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface GuestRegistrationProps {
  eventId: string;
  onSuccess?: (guest: any) => void;
}

export function GuestRegistration({ eventId, onSuccess }: GuestRegistrationProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [guest, setGuest] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/guests/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, name, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setGuest(data.guest);
      setRegistered(true);
      onSuccess?.(data.guest);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registered && guest) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-800 mb-2">You're Registered!</h2>
          <p className="text-green-700 mb-4">Welcome, {guest.name}</p>
          <div className="bg-white rounded p-4 mb-4">
            <p className="text-sm text-gray-500">Your Access Code</p>
            <p className="text-2xl font-mono font-bold text-gray-800">{guest.access_code}</p>
          </div>
          <p className="text-sm text-green-600">
            Use this code or your email to access the live stream
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h2 className="text-xl font-bold mb-2">Join Event</h2>
        <p className="text-gray-600 mb-6">Enter your details to get access</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Registering...' : 'Get Access'}
          </button>
        </form>
      </div>
    </div>
  );
}
