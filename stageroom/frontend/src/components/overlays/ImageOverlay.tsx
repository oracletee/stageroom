import { useState } from 'react';

interface ImageOverlayProps {
  // In a real implementation, this would manage image overlay properties
}

export const ImageOverlay: React.FC<ImageOverlayProps> = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [opacity, setOpacity] = useState(100);
  const [scale, setScale] = useState(100);
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [isVisible, setIsVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleApply = () => {
    // In a real implementation, this would apply the image overlay to the stream
    console.log('Applying image overlay:', {
      imageUrl,
      opacity,
      scale,
      position,
      isVisible
    });
  };

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // In a real implementation, this would upload to your storage service
      // For now, we'll simulate with a URL
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a temporary URL for preview
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Image Overlay</h2>
        <p className="text-sm text-gray-400">
          Add logos, watermarks, or other images to your stream
        </p>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Image Upload
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
            >
              Choose Image
            </label>
            {isUploading && (
              <span className="animate-spin h-4 w-4 text-blue-500"></span>
            )}
          </div>
          {imageUrl && (
            <div className="mt-2">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="max-w-full h-24 object-contain rounded border border-gray-600"
              />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Opacity (%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{opacity}%</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Scale (%)
            </label>
            <input
              type="range"
              min={25}
              max={200}
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{scale}%</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Position X
            </label>
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
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Position Y
            </label>
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