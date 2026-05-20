import { useState } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';



interface EventFormData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  ticket_type: 'free' | 'paid';
  ticket_price: number;
  currency: string;
  max_tickets: string;
  enable_donations: boolean;
  enable_tithe: boolean;
  enable_offering: boolean;
  preset_amounts: string;
}

interface EventCreatorProps {
  onSuccess?: (event: any) => void;
  onCancel?: () => void;
}

export function EventCreator({ onSuccess, onCancel }: EventCreatorProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    ticket_type: 'free',
    ticket_price: 0,
    currency: 'USD',
    max_tickets: '',
    enable_donations: false,
    enable_tithe: false,
    enable_offering: false,
    preset_amounts: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          start_time: formData.start_time,
          end_time: formData.end_time || undefined,
          ticket_type: formData.ticket_type,
          ticket_price: formData.ticket_type === 'paid' ? formData.ticket_price * 100 : 0,
          currency: formData.currency,
          max_tickets: formData.max_tickets ? parseInt(formData.max_tickets) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      if (formData.enable_donations) {
        await fetch(`/api/events/${data.event.id}/donation-config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            enabled: 1,
            tithe_enabled: formData.enable_tithe ? 1 : 0,
            offering_enabled: formData.enable_offering ? 1 : 0,
            preset_amounts: formData.preset_amounts
              ? formData.preset_amounts.split(',').map(s => parseInt(s.trim()) * 100)
              : undefined,
            custom_amount_enabled: 1,
          }),
        });
      }

      onSuccess?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Create New Event</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={labelClass}>Event Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => updateField('title', e.target.value)}
            className={inputClass}
            placeholder="e.g., Sunday Service, Concert, Conference"
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={formData.description}
            onChange={e => updateField('description', e.target.value)}
            className={inputClass}
            rows={3}
            placeholder="Event description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Time *</label>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={e => updateField('start_time', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>End Time</label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={e => updateField('end_time', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Ticketing</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ticket Type</label>
              <select
                value={formData.ticket_type}
                onChange={e => updateField('ticket_type', e.target.value)}
                className={inputClass}
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {formData.ticket_type === 'paid' && (
              <>
                <div>
                  <label className={labelClass}>Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ticket_price}
                    onChange={e => updateField('ticket_price', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select
                    value={formData.currency}
                    onChange={e => updateField('currency', e.target.value)}
                    className={inputClass}
                  >
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                    <option value="GHS">GHS</option>
                    <option value="KES">KES</option>
                    <option value="ZAR">ZAR</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            <label className={labelClass}>Max Tickets (optional)</label>
            <input
              type="number"
              min="1"
              value={formData.max_tickets}
              onChange={e => updateField('max_tickets', e.target.value)}
              className={inputClass}
              placeholder="Leave empty for unlimited"
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Donations (Church)</h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={formData.enable_donations}
                onChange={e => updateField('enable_donations', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable donations for this event</span>
            </label>

            {formData.enable_donations && (
              <>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.enable_tithe}
                    onChange={e => updateField('enable_tithe', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Tithe</span>
                </label>

                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.enable_offering}
                    onChange={e => updateField('enable_offering', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Offering</span>
                </label>

                <div>
                  <label className={labelClass}>Preset Amounts (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.preset_amounts}
                    onChange={e => updateField('preset_amounts', e.target.value)}
                    className={inputClass}
                    placeholder="e.g., 1000, 5000, 10000"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
