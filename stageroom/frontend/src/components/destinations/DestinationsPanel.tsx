import { useState, useEffect } from 'react';

interface Destination {
  id: string;
  name: string;
  platform: string;
  rtmpUrl: string | null;
  streamKey: string | null;
  isEnabled: boolean;
}

interface DestinationsPanelProps {
  onDestinationsChange: (destinations: Destination[]) => void;
}

export const DestinationsPanel: React.FC<DestinationsPanelProps> = ({ onDestinationsChange }) => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'youtube' as string,
    rtmpUrl: '',
    streamKey: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    try {
      const res = await fetch('/api/destinations');
      if (res.ok) {
        const data = await res.json();
        const dests = (data.destinations || []).map((d: any) => ({
          ...d,
          isEnabled: d.is_enabled === 1,
        }));
        setDestinations(dests);
        onDestinationsChange(dests);
      }
    } catch (err) {
      console.error('Failed to load destinations:', err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      setError('Name is required');
      return;
    }
    if (formData.platform === 'custom-rtmp' && (!formData.rtmpUrl || !formData.streamKey)) {
      setError('RTMP URL and Stream Key are required for custom RTMP');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingId) {
        await fetch(`/api/destinations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            platform: formData.platform,
            rtmpUrl: formData.rtmpUrl || null,
            streamKey: formData.streamKey || null,
          }),
        });
      } else {
        await fetch('/api/destinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            platform: formData.platform,
            rtmpUrl: formData.rtmpUrl || null,
            streamKey: formData.streamKey || null,
          }),
        });
      }

      await loadDestinations();
      setShowAddForm(false);
      setEditingId(null);
      setFormData({ name: '', platform: 'youtube', rtmpUrl: '', streamKey: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      await fetch(`/api/destinations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !currentEnabled }),
      });
      await loadDestinations();
    } catch (err) {
      console.error('Failed to toggle destination:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this destination?')) return;
    try {
      await fetch(`/api/destinations/${id}`, { method: 'DELETE' });
      await loadDestinations();
    } catch (err) {
      console.error('Failed to delete destination:', err);
    }
  };

  const handleEdit = (dest: Destination) => {
    setEditingId(dest.id);
    setFormData({
      name: dest.name,
      platform: dest.platform,
      rtmpUrl: dest.rtmpUrl || '',
      streamKey: dest.streamKey || '',
    });
    setShowAddForm(true);
  };

  const platformIcons: Record<string, string> = {
    youtube: '▶️',
    twitch: '🎮',
    facebook: '📘',
    'custom-rtmp': '📡',
  };

  const enabledCount = destinations.filter(d => d.isEnabled).length;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Streaming Destinations</h2>
          <p className="text-xs text-gray-400">
            {enabledCount} of {destinations.length} enabled
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
            setFormData({ name: '', platform: 'youtube', rtmpUrl: '', streamKey: '' });
          }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          + Add
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-900/20 border border-red-500 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 p-3 bg-gray-900 rounded space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-700 text-white rounded text-sm"
              placeholder="My YouTube Channel"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Platform</label>
            <select
              value={formData.platform}
              onChange={e => setFormData(prev => ({ ...prev, platform: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-700 text-white rounded text-sm"
            >
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="facebook">Facebook</option>
              <option value="custom-rtmp">Custom RTMP</option>
            </select>
          </div>
          {formData.platform === 'custom-rtmp' && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">RTMP URL</label>
                <input
                  value={formData.rtmpUrl}
                  onChange={e => setFormData(prev => ({ ...prev, rtmpUrl: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-gray-700 text-white rounded text-sm"
                  placeholder="rtmp://..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Stream Key</label>
                <input
                  value={formData.streamKey}
                  onChange={e => setFormData(prev => ({ ...prev, streamKey: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-gray-700 text-white rounded text-sm"
                  placeholder="Stream key"
                />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-sm"
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {destinations.map(dest => (
          <div
            key={dest.id}
            className={`flex items-center justify-between p-2.5 rounded ${dest.isEnabled ? 'bg-gray-900 border-l-4 border-green-500' : 'bg-gray-900/50 border-l-4 border-gray-600'}`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <span className="text-lg">{platformIcons[dest.platform] || '📡'}</span>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{dest.name}</p>
                <p className="text-xs text-gray-400">{dest.platform}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => handleToggle(dest.id, dest.isEnabled)}
                className={`px-2 py-1 rounded text-xs ${dest.isEnabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                {dest.isEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => handleEdit(dest)}
                className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-400 hover:bg-gray-600"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(dest.id)}
                className="px-2 py-1 rounded text-xs bg-red-700 hover:bg-red-600 text-white"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {destinations.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            No destinations yet. Add YouTube, Twitch, Facebook, or Custom RTMP.
          </p>
        )}
      </div>
    </div>
  );
};
