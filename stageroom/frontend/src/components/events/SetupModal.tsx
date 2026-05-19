import { useState } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const CATEGORIES = [
  { id: 'ted-talk', label: 'TED Talk' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'event', label: 'Event' },
  { id: 'worship', label: 'Worship' },
  { id: 'classroom', label: 'Classroom' },
  { id: 'debate', label: 'Debate' },
  { id: 'film-premiere', label: 'Film Premiere' },
];

const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'ZAR', 'EUR', 'GBP'];

interface TicketTypeInput {
  name: string;
  type: 'free' | 'paid';
  price: number;
  currency: string;
  maxQuantity: string;
}

interface DonationTypeInput {
  name: string;
  currency: string;
  presets: string;
}

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (event: any) => void;
}

export function SetupModal({ isOpen, onClose, onSuccess }: SetupModalProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('event');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [tickets, setTickets] = useState<TicketTypeInput[]>([
    { name: 'General Admission', type: 'free', price: 0, currency: 'NGN', maxQuantity: '' },
  ]);
  const [enableDonations, setEnableDonations] = useState(false);
  const [customAmounts, setCustomAmounts] = useState(true);
  const [donationTypes, setDonationTypes] = useState<DonationTypeInput[]>([
    { name: 'Tithe', currency: 'NGN', presets: '' },
  ]);

  if (!isOpen) return null;

  const addTicket = () => {
    setTickets(prev => [...prev, { name: '', type: 'free', price: 0, currency: 'NGN', maxQuantity: '' }]);
  };

  const removeTicket = (index: number) => {
    setTickets(prev => prev.filter((_, i) => i !== index));
  };

  const updateTicket = (index: number, field: keyof TicketTypeInput, value: string | number) => {
    setTickets(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addDonationType = () => {
    setDonationTypes(prev => [...prev, { name: '', currency: 'NGN', presets: '' }]);
  };

  const removeDonationType = (index: number) => {
    setDonationTypes(prev => prev.filter((_, i) => i !== index));
  };

  const updateDonationType = (index: number, field: keyof DonationTypeInput, value: string) => {
    setDonationTypes(prev => prev.map((dt, i) => i === index ? { ...dt, [field]: value } : dt));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const now = new Date().toISOString();
      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          start_time: now,
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const eventId = data.event.id;

      for (const ticket of tickets) {
        if (ticket.name.trim()) {
          await fetch(`${API_BASE}/api/events/${eventId}/ticket-types`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: ticket.name,
              type: ticket.type,
              price: ticket.type === 'paid' ? ticket.price * 100 : 0,
              currency: ticket.currency,
              max_quantity: ticket.maxQuantity ? parseInt(ticket.maxQuantity) : undefined,
            }),
          });
        }
      }

      if (enableDonations) {
        for (const dt of donationTypes) {
          if (dt.name.trim()) {
            await fetch(`${API_BASE}/api/events/${eventId}/donation-types`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                name: dt.name,
                currency: dt.currency,
                preset_amounts: dt.presets
                  ? dt.presets.split(',').map(s => parseInt(s.trim()) * 100).filter(n => !isNaN(n))
                  : undefined,
                custom_amount_enabled: customAmounts,
              }),
            });
          }
        }
      }

      if (posterFile) {
        const buffer = await posterFile.arrayBuffer();
        await fetch(`${API_BASE}/api/events/${eventId}/poster`, {
          method: 'POST',
          headers: {
            'Content-Type': posterFile.type,
            'Authorization': `Bearer ${token}`,
          },
          body: buffer,
        });
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Setup Instant Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        {error && (
          <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Event title" />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
              {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Poster Image (optional)</label>
            <input type="file" accept="image/*" onChange={e => setPosterFile(e.target.files?.[0] || null)} className="text-sm text-gray-400" />
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Tickets</h3>
              <button type="button" onClick={addTicket} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
            </div>
            <div className="space-y-2">
              {tickets.map((t, i) => (
                <div key={i} className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <input type="text" value={t.name} onChange={e => updateTicket(i, 'name', e.target.value)} className={`${inputClass} flex-1`} placeholder="Name (e.g., VIP)" />
                    {tickets.length > 1 && (
                      <button type="button" onClick={() => removeTicket(i)} className="text-red-400 hover:text-red-300 px-2 py-2">&times;</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select value={t.type} onChange={e => updateTicket(i, 'type', e.target.value)} className={inputClass} style={{ width: '70px' }}>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                    {t.type === 'paid' && (
                      <>
                        <input type="number" min="0" step="0.01" value={t.price} onChange={e => updateTicket(i, 'price', parseFloat(e.target.value) || 0)} className={`${inputClass} flex-1`} placeholder="Price" />
                        <select value={t.currency} onChange={e => updateTicket(i, 'currency', e.target.value)} className={inputClass} style={{ width: '60px' }}>
                          {CURRENCIES.map(c => (<option key={c} value={c}>{c}</option>))}
                        </select>
                      </>
                    )}
                  </div>
                  <input type="number" min="1" value={t.maxQuantity} onChange={e => updateTicket(i, 'maxQuantity', e.target.value)} className={`${inputClass} text-sm`} placeholder="Max quantity (optional)" />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <label className="flex items-center gap-2 text-gray-300 mb-3">
              <input type="checkbox" checked={enableDonations} onChange={e => setEnableDonations(e.target.checked)} />
              <span className="text-sm font-semibold">Enable donations</span>
            </label>

            {enableDonations && (
              <div className="space-y-2">
                {donationTypes.map((dt, i) => (
                  <div key={i} className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-start">
                      <input type="text" value={dt.name} onChange={e => updateDonationType(i, 'name', e.target.value)} className={`${inputClass} flex-1`} placeholder="Name (e.g., Tithe)" />
                      {donationTypes.length > 1 && (
                        <button type="button" onClick={() => removeDonationType(i)} className="text-red-400 hover:text-red-300 px-2 py-2">&times;</button>
                      )}
                    </div>
                <div className="flex gap-2">
                  <select value={dt.currency} onChange={e => updateDonationType(i, 'currency', e.target.value)} className={inputClass} style={{ width: '60px' }}>{CURRENCIES.map(c => (<option key={c} value={c}>{c}</option>))}</select>
                  <input type="text" value={dt.presets} onChange={e => updateDonationType(i, 'presets', e.target.value)} className={`${inputClass} flex-1`} placeholder="Presets: 1000,5000,10000" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addDonationType} className="text-sm text-blue-400 hover:text-blue-300">+ Add donation type</button>
                <label className="flex items-center gap-2 text-gray-300 mt-2">
                  <input type="checkbox" checked={customAmounts} onChange={e => setCustomAmounts(e.target.checked)} />
                  <span className="text-sm">Allow custom amounts</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Setting up...' : 'Setup Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
