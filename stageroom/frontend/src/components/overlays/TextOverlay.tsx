import { useState } from 'react';

interface TextOverlayProps {
  // In a real implementation, this would manage text overlay properties
}

export const TextOverlay: React.FC<TextOverlayProps> = () => {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('rgba(0,0,0,0.5)');
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [isVisible, setIsVisible] = useState(false);

  const handleApply = () => {
    // In a real implementation, this would apply the text overlay to the stream
    console.log('Applying text overlay:', {
      text,
      fontSize,
      fontColor,
      backgroundColor,
      position,
      isVisible
    });
  };

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Text Overlay</h2>
        <p className="text-sm text-gray-400">
          Add custom text to your stream
        </p>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Text Content
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Enter your text here"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Font Size
            </label>
            <input
              type="range"
              min={12}
              max={72}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{fontSize}px</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Font Color
            </label>
            <input
              type="color"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              className="w-full h-10 p-0"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Background Color
            </label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full h-10 p-0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Position
            </label>
            <div className="flex space-x-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">X</label>
                <input
                  type="number"
                  min={0}
                  max={1920}
                  value={position.x}
                  onChange={(e) => setPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Y</label>
                <input
                  type="number"
                  min={0}
                  max={1080}
                  value={position.y}
                  onChange={(e) => setPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-300 flex items-center">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={handleToggleVisibility}
              className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            Visible in Stream
          </label>
        </div>
        
        <button
          onClick={handleApply}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
        >
          Apply Overlay
        </button>
      </div>
    </div>
  );
};