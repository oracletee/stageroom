import { useState, useEffect } from 'react';

const stats = [
  { label: 'Viewers', key: 'viewers', color: 'text-blue-400' },
  { label: 'Watch Time', key: 'watchTime', color: 'text-green-400' },
  { label: 'Followers', key: 'followers', color: 'text-purple-400' },
  { label: 'Chat', key: 'chat', color: 'text-orange-400' },
];

export const StudioStats: React.FC = () => {
  const [data, setData] = useState({ viewers: '—', watchTime: '—', followers: '—', chat: '—' });

  useEffect(() => {
    const interval = setInterval(() => {
      setData({
        viewers: String(Math.floor(Math.random() * 150) + 50),
        watchTime: `${Math.floor(Math.random() * 120) + 10}m`,
        followers: String(Math.floor(Math.random() * 30) + 3),
        chat: String(Math.floor(Math.random() * 200) + 50),
      });
    }, 5000);
    setData({ viewers: '87', watchTime: '42m', followers: '12', chat: '156' });
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(s => (
        <div key={s.key} className="bg-gray-800 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</p>
          <p className={`text-lg font-bold ${s.color}`}>{data[s.key as keyof typeof data]}</p>
        </div>
      ))}
    </div>
  );
};
