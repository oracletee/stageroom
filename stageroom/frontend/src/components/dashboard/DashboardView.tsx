import { useState, useEffect } from 'react';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';
import { TeamCollaboration } from '../team/TeamCollaboration';

interface PaymentSettings {
  paystack_secret_key: string;
  paystack_public_key: string;
  stripe_secret_key: string;
  stripe_publishable_key: string;
}

export function DashboardView() {
  const [tab, setTab] = useState<'analytics' | 'team' | 'payment'>('analytics');
  const [settings, setSettings] = useState<PaymentSettings>({
    paystack_secret_key: '',
    paystack_public_key: '',
    stripe_secret_key: '',
    stripe_publishable_key: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings/payment', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          setSettings({
            paystack_secret_key: data.settings.paystack_secret_key || '',
            paystack_public_key: data.settings.paystack_public_key || '',
            stripe_secret_key: data.settings.stripe_secret_key || '',
            stripe_publishable_key: data.settings.stripe_publishable_key || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(settings),
      });
      if (res.ok) setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'analytics' as const, label: 'Analytics' },
    { key: 'team' as const, label: 'Team' },
    { key: 'payment' as const, label: 'Payment Settings' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-0.5 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition
              ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <AnalyticsDashboard />}
      {tab === 'team' && <TeamCollaboration />}
      {tab === 'payment' && (
        <div className="bg-gray-800 rounded-xl p-6 space-y-6 max-w-2xl">
          <h2 className="text-lg font-semibold">Payment Gateway Settings</h2>
          <p className="text-sm text-gray-400">
            Configure your payment processor keys. NGN/GHS/KES/ZAR transactions route to Paystack. USD/EUR/GBP route to Stripe.
          </p>

          <div className="space-y-4">
            <div className="border border-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-green-400">Paystack (Africa)</h3>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Key</label>
                <input
                  type="password"
                  value={settings.paystack_secret_key}
                  onChange={e => setSettings(s => ({ ...s, paystack_secret_key: e.target.value }))}
                  placeholder="sk_live_..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Public Key</label>
                <input
                  type="password"
                  value={settings.paystack_public_key}
                  onChange={e => setSettings(s => ({ ...s, paystack_public_key: e.target.value }))}
                  placeholder="pk_live_..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-purple-400">Stripe (Global)</h3>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Key</label>
                <input
                  type="password"
                  value={settings.stripe_secret_key}
                  onChange={e => setSettings(s => ({ ...s, stripe_secret_key: e.target.value }))}
                  placeholder="sk_live_..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Publishable Key</label>
                <input
                  type="password"
                  value={settings.stripe_publishable_key}
                  onChange={e => setSettings(s => ({ ...s, stripe_publishable_key: e.target.value }))}
                  placeholder="pk_live_..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && <span className="text-sm text-green-400">Saved!</span>}
          </div>
        </div>
      )}
    </div>
  );
}
