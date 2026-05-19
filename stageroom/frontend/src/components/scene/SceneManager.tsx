import { useState } from 'react';

interface Scene {
  id: string;
  name: string;
  thumbnailUrl?: string;
  sources: Array<{
    id: string;
    type: 'camera' | 'screen' | 'media' | 'text' | 'image';
    config: Record<string, any>;
    position: { x: number; y: number; width: number; height: number };
    zIndex: number;
  }>;
}

interface SceneManagerProps {
  // In a real implementation, this would manage scenes and sources
}

export const SceneManager: React.FC<SceneManagerProps> = () => {
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: 'scene-1',
      name: 'Main Camera',
      thumbnailUrl: '',
      sources: [
        {
          id: 'cam-main',
          type: 'camera',
          config: {
            deviceId: '',
            resolution: { width: 1920, height: 1080 },
            fps: 30
          },
          position: { x: 0, y: 0, width: 1920, height: 1080 },
          zIndex: 1
        }
      ]
    },
    {
      id: 'scene-2',
      name: 'Screen Share',
      thumbnailUrl: '',
      sources: [
        {
          id: 'screen-share',
          type: 'screen',
          config: {
            displayId: '',
            resolution: { width: 1920, height: 1080 },
            fps: 30
          },
          position: { x: 0, y: 0, width: 1920, height: 1080 },
          zIndex: 1
        }
      ]
    },
    {
      id: 'scene-3',
      name: 'Picture in Picture',
      thumbnailUrl: '',
      sources: [
        {
          id: 'cam-pip',
          type: 'camera',
          config: {
            deviceId: '',
            resolution: { width: 640, height: 360 },
            fps: 30
          },
          position: { x: 1280, y: 0, width: 640, height: 360 },
          zIndex: 2
        },
        {
          id: 'screen-main',
          type: 'screen',
          config: {
            displayId: '',
            resolution: { width: 1920, height: 1080 },
            fps: 30
          },
          position: { x: 0, y: 0, width: 1920, height: 1080 },
          zIndex: 1
        }
      ]
    }
  ]);
  
  const [activeSceneId, setActiveSceneId] = useState<string | null>('scene-1');
  const [isEditing, setIsEditing] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  const activeScene = scenes.find(scene => scene.id === activeSceneId);

  const handleSceneSelect = (sceneId: string) => {
    setActiveSceneId(sceneId);
  };

  const handleAddScene = () => {
    if (!newSceneName.trim()) return;
    
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: newSceneName,
      thumbnailUrl: '',
      sources: []
    };
    
    setScenes(prev => [...prev, newScene]);
    setActiveSceneId(newScene.id);
    setNewSceneName('');
  };

  const handleRemoveScene = (sceneId: string) => {
    if (scenes.length <= 1) {
      alert('Cannot delete the last scene');
      return;
    }
    
    setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    if (activeSceneId === sceneId) {
      setActiveSceneId(scenes[0].id);
    }
  };

  const handleUpdateSceneName = (sceneId: string, name: string) => {
    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? { ...scene, name }
          : scene
      )
    );
  };

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Scene Management</h2>
        <p className="text-sm text-gray-400">
          Switch between different layouts and configurations
        </p>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="text"
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Scene name"
          />
          <button
            onClick={handleAddScene}
            disabled={!newSceneName.trim() || isEditing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
          >
            Add Scene
          </button>
        </div>
        
        <div className="space-y-2">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={`flex items-center p-3 bg-gray-900 rounded ${scene.id === activeSceneId ? 'border-l-4 border-blue-500' : ''} ${isEditing ? 'border-2 border-blue-500' : ''}`}
            >
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">{scene.name}</p>
                    <p className="text-xs text-gray-400">
                      {scene.sources.length} source{scene.sources.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => handleSceneSelect(scene.id)}
                          className={`px-2 py-1 bg-${activeSceneId === scene.id ? 'gray-600' : 'blue-600'} 
                                     hover:bg-${activeSceneId === scene.id ? 'gray-700' : 'blue-700'} 
                                     text-white rounded text-sm`}
                        >
                          Switch
                        </button>
                        <button
                          onClick={() => handleUpdateSceneName(scene.id, scene.name)}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                        >
                          Edit Name
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <input
                          type="text"
                          value={scene.name}
                          onChange={(e) => handleUpdateSceneName(scene.id, e.target.value)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleUpdateSceneName(scene.id, scene.name)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm ml-1"
                        >
                          Save
                        </button>
                      </>
                    )}
                    {scenes.length > 1 && (
                      <button
                        onClick={() => handleRemoveScene(scene.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {scene.sources.map((source) => (
                  <div
                    key={source.id}
                    className={`flex items-center px-2 py-1 bg-gray-700 rounded text-xs ${source.type === 'camera'
                      ? 'border-l-2 border-blue-500'
                      : source.type === 'screen'
                      ? 'border-l-2 border-green-500'
                      : source.type === 'media'
                      ? 'border-l-2 border-purple-500'
                      : source.type === 'text'
                      ? 'border-l-2 border-yellow-500'
                      : 'border-l-2 border-pink-500'}`}
                  >
                    <div className="h-4 w-4 rounded-full">
                      {source.type === 'camera'
                        ? '📹'
                        : source.type === 'screen'
                        ? '🖥️'
                        : source.type === 'media'
                        ? '🎬'
                        : source.type === 'text'
                        ? '📝'
                        : source.type === 'image'
                        ? '🖼️'
                        : '❓'}
                    </div>
                    <div className="ml-2">
                      {source.type === 'camera' ? 'Camera' : 
                       source.type === 'screen' ? 'Screen' : 
                       source.type === 'media' ? 'Media' : 
                       source.type === 'text' ? 'Text' : 
                       source.type === 'image' ? 'Image' : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-700">
        <button
          onClick={handleToggleEdit}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition"
        >
          {isEditing ? 'Done Editing' : 'Edit Scenes'}
        </button>
      </div>
    </div>
  );
};