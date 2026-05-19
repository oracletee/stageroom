import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface DonationFlowProps {
  eventId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function DonationFlow({ eventId, onSuccess, onClose }: DonationFlowProps) {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('general');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [eventId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/events/${eventId}`);
      const data = await response.json();
      if (response.ok && data.donation_config?.enabled) {
        setConfig(data.donation_config);
      } else {
        setError('Donations not available for this event');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPresetAmounts = (): number[] => {
    if (!config?.preset_amounts) return [1000, 5000, 10000, 50000];
    return JSON.parse(config.preset_amounts);
  };

  const getAmount = (): number => {
    if (selectedAmount !== null) return selectedAmount;
    return parseInt(customAmount) * 100 || 0;
  };

  const handleDonate = async () => {
    const amount = getAmount();
    if (!amount || amount <= 0) {
      setError('Please select or enter an amount');
      return;
    }
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/donations/paystack/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          amount,
          email,
          type: selectedType,
          callback_url: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      window.location.href = data.authorization_url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="p-6 text-center text-red-600">
        {error}
        {onClose && (
          <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">
            Close
          </button>
        )}
      </div>
    );
  }

  const types = [];
  if (config?.tithe_enabled) types.push({ id: 'tithe', label: 'Tithe' });
  if (config?.offering_enabled) types.push({ id: 'offering', label: 'Offering' });
  types.push({ id: 'general', label: 'General' });

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Give</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-gray-600">Your donation is being processed</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="flex gap-2">
                {types.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedType === type.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {getPresetAmounts().map(amount => (
                  <button
                    key={amount}
                    onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedAmount === amount
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    ₦{(amount / 100).toLocaleString()}
                  </button>
                ))}
              </div>

              {config?.custom_amount_enabled && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Custom amount"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>

            <button
              onClick={handleDonate}
              disabled={processing || !getAmount()}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {processing ? 'Processing...' : `Give ₦${(getAmount() / 100).toLocaleString()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
