import { useState, useRef } from 'react';
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

interface EventFormProps {
  initialData?: any;
  onSuccess?: (event: any) => void;
  onCancel?: () => void;
}

export function EventForm({ initialData, onSuccess, onCancel }: EventFormProps) {
  const { token } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'event');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>(initialData?.poster_url || '');

  const [startDate, setStartDate] = useState(initialData?.start_time ? initialData.start_time.split('T')[0] : '');
  const [startHour, setStartHour] = useState('07');
  const [startMin, setStartMin] = useState('00');
  const [startAmPm, setStartAmPm] = useState('PM');

  const [endDate, setEndDate] = useState(initialData?.end_time ? initialData.end_time.split('T')[0] : '');
  const [endHour, setEndHour] = useState('09');
  const [endMin, setEndMin] = useState('00');
  const [endAmPm, setEndAmPm] = useState('PM');

  const [tickets, setTickets] = useState<TicketTypeInput[]>([
    { name: 'General Admission', type: 'free', price: 0, currency: 'NGN', maxQuantity: '' },
  ]);

  const [enableDonations, setEnableDonations] = useState(false);
  const [customAmounts, setCustomAmounts] = useState(true);
  const [donationTypes, setDonationTypes] = useState<DonationTypeInput[]>([
    { name: 'Tithe', currency: 'NGN', presets: '' },
  ]);

  const toISOTime = (date: string, hour: string, min: string, ampm: string): string => {
    if (!date) return '';
    let h = parseInt(hour);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${date}T${h.toString().padStart(2, '0')}:${min}:00`;
  };

  const handlePosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    const reader = new FileReader();
    reader.onload = () => setPosterPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addTicket = () => {
    setTickets(prev => [...prev, { name: '', type: 'free', price: 0, currency: 'NGN', maxQuantity: '' }]);
  };

  const removeTicket = (index: number) => {
    setTickets(prev => prev.filter((_, i) => i !== index));
  };

  const updateTicket = (index: number, field: keyof TicketTypeInput, value: string | number) => {
    setTickets(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addDonationType = () => setDonationTypes(prev => [...prev, { name: '', currency: 'NGN', presets: '' }]);
  const removeDonationType = (i: number) => setDonationTypes(prev => prev.filter((_, idx) => idx !== i));
  const updateDonationType = (i: number, field: keyof DonationTypeInput, val: string) =>
    setDonationTypes(prev => prev.map((dt, idx) => idx === i ? { ...dt, [field]: val } : dt));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const startTime = toISOTime(startDate, startHour, startMin, startAmPm);
    const endTime = endDate ? toISOTime(endDate, endHour, endMin, endAmPm) : undefined;

    if (!startTime) {
      setError('Start date and time are required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          start_time: startTime,
          end_time: endTime,
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

      onSuccess?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";
  const selectClass = "px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <div>
        <label className={labelClass}>Event Title *</label>
        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Event title" />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className={inputClass} rows={3} placeholder="Event description..." />
      </div>

      <div>
        <label className={labelClass}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}>Poster</label>
        <div className="flex items-center gap-4">
          {posterPreview ? (
            <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-gray-700">
              <img src={posterPreview} alt="Poster" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setPosterPreview(''); setPosterFile(null); }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80">&times;</button>
            </div>
          ) : (
            <div className="w-24 h-32 rounded-lg bg-gray-700 flex items-center justify-center text-gray-500 text-xs text-center p-2">No poster set</div>
          )}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePosterSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600">{posterPreview ? 'Change' : 'Upload Image'}</button>
            <p className="text-xs text-gray-500 mt-1">Auto-generated if not set</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-base font-semibold text-white mb-4">Date & Time</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Start Date *</label>
            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Start Time *</label>
            <div className="flex gap-2">
              <select value={startHour} onChange={e => setStartHour(e.target.value)} className={`${selectClass} flex-1`}>{hours.map(h => <option key={h} value={h}>{h}</option>)}</select>
              <select value={startMin} onChange={e => setStartMin(e.target.value)} className={`${selectClass} flex-1`}>{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
              <select value={startAmPm} onChange={e => setStartAmPm(e.target.value)} className={`${selectClass} w-16`}><option value="AM">AM</option><option value="PM">PM</option></select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Time</label>
            <div className="flex gap-2">
              <select value={endHour} onChange={e => setEndHour(e.target.value)} className={`${selectClass} flex-1`}>{hours.map(h => <option key={h} value={h}>{h}</option>)}</select>
              <select value={endMin} onChange={e => setEndMin(e.target.value)} className={`${selectClass} flex-1`}>{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
              <select value={endAmPm} onChange={e => setEndAmPm(e.target.value)} className={`${selectClass} w-16`}><option value="AM">AM</option><option value="PM">PM</option></select>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Tickets</h3>
          <button type="button" onClick={addTicket} className="text-sm text-blue-400 hover:text-blue-300">+ Add</button>
        </div>
        <div className="space-y-2">
          {tickets.map((t, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-3 space-y-2">
              <div className="flex gap-2 items-start">
                <input type="text" value={t.name} onChange={e => updateTicket(i, 'name', e.target.value)} className={`${inputClass} flex-1`} placeholder="Name (e.g., VIP)" />
                {tickets.length > 1 && (<button type="button" onClick={() => removeTicket(i)} className="text-red-400 hover:text-red-300 px-2 py-2">&times;</button>)}
              </div>
              <div className="flex gap-2">
                <select value={t.type} onChange={e => updateTicket(i, 'type', e.target.value)} className={inputClass} style={{ width: '70px' }}>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
                {t.type === 'paid' && (
                  <>
                    <input type="number" min="0" step="0.01" value={t.price} onChange={e => updateTicket(i, 'price', parseFloat(e.target.value) || 0)} className={`${inputClass} flex-1`} placeholder="Price" />
                    <select value={t.currency} onChange={e => updateTicket(i, 'currency', e.target.value)} className={inputClass} style={{ width: '60px' }}>{CURRENCIES.map(c => (<option key={c} value={c}>{c}</option>))}</select>
                  </>
                )}
              </div>
              <input type="number" min="1" value={t.maxQuantity} onChange={e => updateTicket(i, 'maxQuantity', e.target.value)} className={`${inputClass} text-sm`} placeholder="Max quantity (optional)" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <label className="flex items-center gap-2 text-gray-300 mb-3">
          <input type="checkbox" checked={enableDonations} onChange={e => setEnableDonations(e.target.checked)} />
          <span className="text-sm font-semibold">Enable donations</span>
        </label>

        {enableDonations && (
          <div className="space-y-2">
            {donationTypes.map((dt, i) => (
              <div key={i} className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <input type="text" value={dt.name} onChange={e => updateDonationType(i, 'name', e.target.value)} className={`${inputClass} flex-1`} placeholder="Name (e.g., Tithe)" />
                  {donationTypes.length > 1 && (<button type="button" onClick={() => removeDonationType(i)} className="text-red-400 hover:text-red-300 px-2 py-2">&times;</button>)}
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
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700">Cancel</button>
        )}
        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Creating...' : 'Create Event'}</button>
      </div>
    </form>
  );
}
