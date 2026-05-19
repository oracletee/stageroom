import { useState } from 'react';

interface AnimatedOverlayProps {
  // In a real implementation, this would manage animated overlay properties
}

export const AnimatedOverlay: React.FC<AnimatedOverlayProps> = () => {
  const [animationType, setAnimationType] = useState<'lower-third' | 'social-feed' | 'tickertape'>('lower-third');
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState(5);
  const [position, setPosition] = useState({ x: 0, y: 800 }); // Default to lower third
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sample data for different animation types
  const sampleData = {
    'lower-third': 'Breaking News: Example announcement',
    'social-feed': '@exampleuser: Just went live! Check out my stream!',
    'tickertape': 'LIVE NOW: Amazing content happening right now! Don\'t miss out!'
  };

  const handleApply = () => {
    // In a real implementation, this would apply the animated overlay to the stream
    console.log('Applying animated overlay:', {
      animationType,
      content,
      duration,
      position,
      isVisible,
      isAnimating
    });
  };

  const handleStartAnimation = () => {
    setIsAnimating(true);
    setIsVisible(true);
    // In a real implementation, this would start the animation
    
    // Auto-stop after duration
    setTimeout(() => {
      setIsAnimating(false);
      setIsVisible(false);
    }, duration * 1000);
  };

  const handleStopAnimation = () => {
    setIsAnimating(false);
    setIsVisible(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Animated Overlay</h2>
        <p className="text-sm text-gray-400">
          Add dynamic animations like lower thirds, social feeds, or tickertapes
        </p>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Animation Type
          </label>
          <select
            value={animationType}
            onChange={(e) => setAnimationType(e.target.value as any)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="lower-third">Lower Third</option>
            <option value="social-feed">Social Media Feed</option>
            <option value="tickertape">Ticker Tape</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Content
          </label>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter animation content"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Duration (seconds)
            </label>
            <input
              type="range"
              min={2}
              max={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{duration}s</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Position Y
            </label>
            <input
              type="range"
              min={0}
              max={1080}
              value={position.y}
              onChange={(e) => setPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{position.y}px</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-300 flex items-center">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={() => setIsVisible(!isVisible)}
              className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            Preview
          </label>
        </div>
        
        <div className="mt-3">
          <div className="flex space-x-3">
            <button
              onClick={handleStartAnimation}
              disabled={isAnimating || !content.trim()}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
            >
              {isAnimating ? 'Animating...' : 'Start Animation'}
            </button>
            <button
              onClick={handleStopAnimation}
              disabled={!isAnimating && !isVisible}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              Stop Animation
            </button>
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-gray-900 rounded">
          {isVisible && (
            <div className={`text-center text-sm font-medium 
                          ${animationType === 'lower-third' ? 'bg-blue-900 bg-opacity-50' :
                            animationType === 'social-feed' ? 'bg-green-900 bg-opacity-50' :
                            'bg-purple-900 bg-opacity-50'} 
                          p-2 rounded`}
            >
              {content || sampleData[animationType as keyof typeof sampleData] || ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};