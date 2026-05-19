import { useState } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';

export const SourcesPanel: React.FC = () => {
  const {
    sources, addSource, removeSource,
    scenes, selectedSceneId, selectScene, addScene, removeScene, renameScene,
    addSourceToScene, removeSourceFromScene,
  } = useStreamStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'camera' | 'screen' | 'media' | 'ndi' | 'rtmp' | 'text-overlay' | 'image-overlay' | 'animated-overlay' | 'lower-third' | 'stage-background'>('camera');
  const [sourceLabel, setSourceLabel] = useState('');
  const [ndiSourceName, setNdiSourceName] = useState('');
  const [ndiAddress, setNdiAddress] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [rtmpStreamKey, setRtmpStreamKey] = useState('');
  const [mediaFileUrl, setMediaFileUrl] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [overlayFontSize, setOverlayFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [overlayTextColor, setOverlayTextColor] = useState('#ffffff');
  const [overlayBackgroundColor, setOverlayBackgroundColor] = useState('transparent');
  const [overlayPosition, setOverlayPosition] = useState<'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right'>('bottom-left');
  const [ltName, setLtName] = useState('');
  const [ltTitle, setLtTitle] = useState('');
  const [ltTemplate, setLtTemplate] = useState<'minimal' | 'standard' | 'social'>('standard');
  const [ltVisible, setLtVisible] = useState(true);
  const [bgColor, setBgColor] = useState('#1a1a2e');

  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  const sourcesInScene = selectedScene?.sourceIds || [];

  const isSourceInScene = (sourceId: string) => sourcesInScene.includes(sourceId);

  const handleToggleSourceInScene = (sourceId: string) => {
    if (!selectedSceneId) return;
    if (isSourceInScene(sourceId)) {
      removeSourceFromScene(selectedSceneId, sourceId);
    } else {
      addSourceToScene(selectedSceneId, sourceId);
    }
  };

  const handleAddSource = () => {
    const newSource = {
      id: `${sourceType}${Date.now()}`,
      type: sourceType,
      label: sourceLabel || `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} ${Date.now()}`,
      previewUrl: sourceType === 'media' ? mediaFileUrl : '',
      isActive: true,
      ...(sourceType === 'ndi' ? { ndiSourceName, ndiAddress } : {}),
      ...(sourceType === 'rtmp' ? { rtmpUrl, rtmpStreamKey } : {}),
      ...(sourceType === 'text-overlay' ? {
        overlayText,
        overlayFontSize,
        overlayTextColor,
        overlayBackgroundColor,
        overlayPosition,
      } : {}),
      ...(sourceType === 'lower-third' ? { ltName, ltTitle, ltTemplate, ltVisible } : {}),
      ...(sourceType === 'stage-background' ? { bgColor } : {}),
    };
    addSource(newSource);
    if (selectedSceneId) {
      addSourceToScene(selectedSceneId, newSource.id);
    }
    setShowAddModal(false);
    setSourceLabel('');
    setNdiSourceName('');
    setNdiAddress('');
    setRtmpUrl('');
    setRtmpStreamKey('');
    setMediaFileUrl('');
    setOverlayText('');
    setOverlayFontSize('medium');
    setOverlayTextColor('#ffffff');
    setOverlayBackgroundColor('transparent');
    setOverlayPosition('bottom-left');
    setLtName('');
    setLtTitle('');
    setLtTemplate('standard');
    setLtVisible(true);
    setBgColor('#1a1a2e');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">Sources</h2>

      {/* Scene bar */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {scenes.map(scene => (
            <div key={scene.id} className="flex items-center">
              <button
                onClick={() => selectScene(scene.id)}
                className={`px-3 py-1.5 rounded-l text-sm whitespace-nowrap
                  ${selectedSceneId === scene.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {scene.name}
              </button>
              <button
                onClick={() => {
                  const name = prompt('Rename scene:', scene.name);
                  if (name) renameScene(scene.id, name);
                }}
                className={`px-1.5 py-1.5 rounded-r text-xs border-l border-gray-600
                  ${selectedSceneId === scene.id
                    ? 'bg-blue-500 text-white hover:bg-blue-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                ✏️
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const presets = [
                { name: 'Blank Scene', sources: [] as string[] },
                { name: 'Talking Head', sources: sources.filter(s => s.type === 'camera').map(s => s.id) },
                { name: 'Full Screen', sources: sources.filter(s => s.type === 'screen').map(s => s.id) },
                { name: 'Picture in Picture', sources: sources.filter(s => s.type === 'screen' || s.type === 'camera').map(s => s.id) },
                { name: 'Break Scene', sources: sources.filter(s => s.type === 'media' || s.type.includes('overlay')).map(s => s.id) },
              ];
              const choice = prompt(
                `Choose a preset:\n1. Blank Scene\n2. Talking Head\n3. Full Screen\n4. Picture in Picture\n5. Break Scene\n\nEnter number or custom name:`
              );
              if (!choice) return;
              const presetIdx = parseInt(choice) - 1;
              if (presetIdx >= 0 && presetIdx < presets.length) {
                const preset = presets[presetIdx];
                const sceneId = addScene(preset.name);
                preset.sources.forEach(sid => addSourceToScene(sceneId, sid));
              } else if (choice.trim()) {
                addScene(choice.trim());
              }
            }}
            className="px-3 py-1.5 rounded text-sm bg-green-700 hover:bg-green-600 text-white"
          >
            + Scene
          </button>
          {selectedScene && (
            <button
              onClick={() => {
                if (confirm(`Remove "${selectedScene.name}"?`)) {
                  removeScene(selectedScene.id);
                }
              }}
              className="px-3 py-1.5 rounded text-sm bg-red-700 hover:bg-red-600 text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Add Source button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
      >
        + Add Source
      </button>

      {/* Source list */}
      <div className="space-y-2">
        {sources.map(source => {
          const hasInlineConfig = source.type === 'lower-third' || source.type === 'stage-background';
          const isExpanded = expandedSourceId === source.id;
          return (
            <div key={source.id}>
              <div
                className={`flex items-center justify-between p-2.5 rounded cursor-pointer
                  ${isSourceInScene(source.id)
                    ? 'bg-gray-900 border-l-4 border-blue-500'
                    : 'bg-gray-900 border-l-4 border-transparent'}
                  ${isExpanded ? 'rounded-b-none' : ''}`}
                onClick={() => hasInlineConfig && setExpandedSourceId(isExpanded ? null : source.id)}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="text-lg shrink-0">
                    {source.type === 'camera' ? '📹'
                      : source.type === 'screen' ? '🖥️'
                      : source.type === 'media' ? '🎬'
                      : source.type === 'ndi' ? '📡'
                      : source.type === 'rtmp' ? '📡'
                      : source.type === 'lower-third' ? '💬'
                      : source.type === 'stage-background' ? '🎨'
                      : source.type.includes('text') ? '🔤'
                      : source.type.includes('image') ? '🖼️'
                      : source.type.includes('animated') ? '✨'
                      : '❓'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{source.label}</p>
                    <p className="text-xs text-gray-400">{source.type}</p>
                  </div>
                  {hasInlineConfig && (
                    <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  {selectedSceneId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleSourceInScene(source.id); }}
                      className={`px-2 py-1 rounded text-xs
                        ${isSourceInScene(source.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                      {isSourceInScene(source.id) ? 'In Scene' : '+ Scene'}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSource(source.id); }}
                    className="px-2 py-1 rounded text-xs bg-red-700 hover:bg-red-600 text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {isExpanded && source.type === 'lower-third' && (
                <div className="bg-gray-850 border-t border-gray-700 rounded-b px-3 py-2 space-y-2"
                  style={{ backgroundColor: '#1a1a2e' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Visible</span>
                    <button onClick={(e) => { e.stopPropagation();
                      const updated = sources.map(s => s.id === source.id ? { ...s, ltVisible: !s.ltVisible } : s);
                      useStreamStore.getState().setSources(updated);
                    }}
                      className={`px-2 py-0.5 rounded text-xs ${source.ltVisible !== false ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                      {source.ltVisible !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Name</label>
                    <input value={source.ltName || ''} onChange={e => {
                      const updated = sources.map(s => s.id === source.id ? { ...s, ltName: e.target.value } : s);
                      useStreamStore.getState().setSources(updated);
                    }}
                      placeholder="Speaker name"
                      className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Title</label>
                    <input value={source.ltTitle || ''} onChange={e => {
                      const updated = sources.map(s => s.id === source.id ? { ...s, ltTitle: e.target.value } : s);
                      useStreamStore.getState().setSources(updated);
                    }}
                      placeholder="Role or topic"
                      className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Template</label>
                    <select value={source.ltTemplate || 'standard'} onChange={e => {
                      const updated = sources.map(s => s.id === source.id ? { ...s, ltTemplate: e.target.value } : s);
                      useStreamStore.getState().setSources(updated);
                    }}
                      className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs">
                      <option value="minimal">Minimal</option>
                      <option value="standard">Standard</option>
                      <option value="social">Social</option>
                    </select>
                  </div>
                </div>
              )}
              {isExpanded && source.type === 'stage-background' && (
                <div className="bg-gray-850 border-t border-gray-700 rounded-b px-3 py-2"
                  style={{ backgroundColor: '#1a1a2e' }}>
                  <div className="flex items-center space-x-1.5 mb-2">
                    {['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2d2d2d', '#3d0000', '#1b4332', '#f5f5f5'].map(c => (
                      <button key={c} onClick={() => {
                        const updated = sources.map(s => s.id === source.id ? { ...s, bgColor: c } : s);
                        useStreamStore.getState().setSources(updated);
                      }}
                        className={`w-5 h-5 rounded-full border ${source.bgColor === c ? 'border-blue-400' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="color" value={source.bgColor || '#1a1a2e'} onChange={e => {
                      const updated = sources.map(s => s.id === source.id ? { ...s, bgColor: e.target.value } : s);
                      useStreamStore.getState().setSources(updated);
                    }}
                      className="w-7 h-7 p-0.5 bg-gray-700 rounded cursor-pointer" />
                    <input value={source.bgColor || ''} onChange={e => {
                      const updated = sources.map(s => s.id === source.id ? { ...s, bgColor: e.target.value } : s);
                      useStreamStore.getState().setSources(updated);
                    }}
                      placeholder="#hex or gradient"
                      className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {sources.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            No sources yet. Click "+ Add Source" to get started.
          </p>
        )}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Add Source</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Label:</label>
                <input
                  value={sourceLabel}
                  onChange={e => setSourceLabel(e.target.value)}
                  placeholder="Source name"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type:</label>
                <select
                  value={sourceType}
                  onChange={e => {
                    const t = e.target.value as typeof sourceType;
                    setSourceType(t);
                    if (!sourceLabel) {
                      setSourceLabel(`${t.charAt(0).toUpperCase() + t.slice(1)} ${Date.now()}`);
                    }
                    if (t !== 'ndi') { setNdiSourceName(''); setNdiAddress(''); }
                    if (t !== 'rtmp') { setRtmpUrl(''); setRtmpStreamKey(''); }
                    if (t !== 'media') setMediaFileUrl('');
                    if (t !== 'text-overlay') { setOverlayText(''); setOverlayFontSize('medium'); setOverlayTextColor('#ffffff'); setOverlayBackgroundColor('transparent'); setOverlayPosition('bottom-left'); }
                    if (t !== 'lower-third') { setLtName(''); setLtTitle(''); setLtTemplate('standard'); setLtVisible(true); }
                    if (t !== 'stage-background') setBgColor('#1a1a2e');
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                >
                  <option value="camera">Camera / Webcam</option>
                  <option value="screen">Screen Share</option>
                  <option value="media">Media File</option>
                  <option value="ndi">NDI Source</option>
                  <option value="rtmp">RTMP Ingest</option>
                  <option value="text-overlay">Text Overlay</option>
                  <option value="image-overlay">Image Overlay</option>
                  <option value="animated-overlay">Animated Overlay</option>
                  <option value="lower-third">Lower Third</option>
                  <option value="stage-background">Stage Background</option>
                </select>
              </div>

              {sourceType === 'ndi' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">NDI Source Name:</label>
                    <input value={ndiSourceName} onChange={e => setNdiSourceName(e.target.value)}
                      placeholder="NDI source name" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">NDI Address:</label>
                    <input value={ndiAddress} onChange={e => setNdiAddress(e.target.value)}
                      placeholder="e.g. 192.168.1.100" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                  </div>
                </>
              )}

              {sourceType === 'rtmp' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">RTMP URL:</label>
                    <input value={rtmpUrl} onChange={e => setRtmpUrl(e.target.value)}
                      placeholder="rtmp://..." className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Stream Key:</label>
                    <input value={rtmpStreamKey} onChange={e => setRtmpStreamKey(e.target.value)}
                      placeholder="Stream key" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                  </div>
                </>
              )}

              {sourceType === 'media' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Media File URL:</label>
                  <input value={mediaFileUrl} onChange={e => setMediaFileUrl(e.target.value)}
                    placeholder="URL to media file" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                </div>
              )}

              {sourceType === 'text-overlay' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Text Content:</label>
                    <textarea value={overlayText} onChange={e => setOverlayText(e.target.value)}
                      placeholder="Enter text to display"
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Font Size:</label>
                    <select value={overlayFontSize} onChange={e => setOverlayFontSize(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded">
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Text Color:</label>
                    <input type="color" value={overlayTextColor} onChange={e => setOverlayTextColor(e.target.value)}
                      className="w-10 h-10 p-0.5 bg-gray-700 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Background:</label>
                    <div className="flex items-center space-x-2">
                      <input type="color" value={overlayBackgroundColor === 'transparent' ? '#000000' : overlayBackgroundColor}
                        onChange={e => setOverlayBackgroundColor(e.target.value)}
                        className="w-10 h-10 p-0.5 bg-gray-700 rounded cursor-pointer" />
                      <button onClick={() => setOverlayBackgroundColor('transparent')}
                        className={`px-3 py-1.5 rounded text-xs ${overlayBackgroundColor === 'transparent' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                        Transparent
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Position:</label>
                    <select value={overlayPosition} onChange={e => setOverlayPosition(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded">
                      <option value="top-left">Top Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                      <option value="center">Center</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </>
              )}

              {sourceType === 'lower-third' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Subject Name:</label>
                    <input value={ltName} onChange={e => setLtName(e.target.value)}
                      placeholder="Speaker name" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Title / Subtitle:</label>
                    <input value={ltTitle} onChange={e => setLtTitle(e.target.value)}
                      placeholder="Role or topic" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Template:</label>
                    <select value={ltTemplate} onChange={e => setLtTemplate(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded">
                      <option value="minimal">Minimal (name only)</option>
                      <option value="standard">Standard (name + title)</option>
                      <option value="social">Social (name + handle)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Visible</span>
                    <button onClick={() => setLtVisible(!ltVisible)}
                      className={`px-3 py-1 rounded text-xs ${ltVisible ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                      {ltVisible ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </>
              )}

              {sourceType === 'stage-background' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Background Color:</label>
                  <div className="flex items-center space-x-2">
                    {['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2d2d2d', '#3d0000', '#1b4332', '#f5f5f5'].map(c => (
                      <button key={c} onClick={() => setBgColor(c)}
                        className={`w-7 h-7 rounded-full border-2 ${bgColor === c ? 'border-blue-400' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                      className="w-8 h-8 p-0.5 bg-gray-700 rounded cursor-pointer" />
                    <input value={bgColor} onChange={e => setBgColor(e.target.value)}
                      placeholder="#hex or linear-gradient(...)"
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded text-xs" />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">
                Cancel
              </button>
              <button onClick={handleAddSource}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
