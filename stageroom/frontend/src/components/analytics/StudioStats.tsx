export const StudioStats: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Viewers</p>
        <p className="text-lg font-bold text-gray-400">—</p>
      </div>
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Watch Time</p>
        <p className="text-lg font-bold text-gray-400">—</p>
      </div>
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Followers</p>
        <p className="text-lg font-bold text-gray-400">—</p>
      </div>
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Chat</p>
        <p className="text-lg font-bold text-gray-400">—</p>
      </div>
    </div>
  );
};
