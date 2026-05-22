import { useState, useEffect } from 'react';
import { useStreamStore } from '../../hooks/useStreamStore';

type TabType = 'sources' | 'scenes' | 'destinations';

export const StudioPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sources');

  return (
    <div>
      <div className="flex border-b border-gray-700 mb-3">
        <button
          onClick={() => setActiveTab('sources')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'sources' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          Sources
        </button>
        <button
          onClick={() => setActiveTab('scenes')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'scenes' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          Scenes
        </button>
        <button
          onClick={() => setActiveTab('destinations')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'destinations' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
        >
          Destinations
        </button>
      </div>

      {activeTab === 'sources' && <SourcesTab />}
      {activeTab === 'scenes' && <ScenesTab />}
      {activeTab === 'destinations' && <DestinationsTab />}
    </div>
  );
};

const SourcesTab: React.FC = () => {
  const {
    sources, addSource, removeSource,
    selectedSceneId, addSourceToScene, removeSourceFromScene,
  } = useStreamStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'camera' | 'screen' | 'media' | 'ndi' | 'rtmp' | 'text-overlay' | 'image-overlay' | 'animated-overlay' | 'lower-third' | 'stage-background'>('camera');
  const [sourceLabel, setSourceLabel] = useState('');
  const [ndiSourceName, setNdiSourceName] = useState('');
  const [ndiAddress, setNdiAddress] = useState('');
  const [rtmpLoading, setRtmpLoading] = useState(false);
  const [rtmpError, setRtmpError] = useState('');
  const [rtmpCreatedData, setRtmpCreatedData] = useState<{ uid: string; url: string; streamKey: string; playbackUrl: string } | null>(null);
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
  const [fileUploading, setFileUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageOpacity, setImageOpacity] = useState(1);
  const [imageScale, setImageScale] = useState(1);
  const [animationUrl, setAnimationUrl] = useState('');
  const [animationOpacity, setAnimationOpacity] = useState(1);
  const [animationScale, setAnimationScale] = useState(1);

  const { scenes, selectedSceneId: selSceneId } = useStreamStore();
  const selectedScene = scenes.find(s => s.id === selSceneId);
  const sourcesInScene = selectedScene?.sourceIds || [];

  const isSourceInScene = (sourceId: string) => sourcesInScene.includes(sourceId);

  const handleToggleSourceInScene = (sourceId: string) => {
    if (!selSceneId) return;
    if (isSourceInScene(sourceId)) {
      removeSourceFromScene(selSceneId, sourceId);
    } else {
      addSourceToScene(selSceneId, sourceId);
    }
  };

  const handleAddSource = async () => {
    let rtmpData: { uid?: string; url?: string; token?: string; playbackUrl?: string; streamKey?: string } = {};

    if (sourceType === 'rtmp') {
      setRtmpLoading(true);
      setRtmpError('');

      try {
        const response = await fetch('/api/stream/live-input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || 'Failed to create RTMP live input');
        }

        const data = await response.json();
        console.log('Cloudflare live input response:', data);
        setRtmpCreatedData({
          uid: data.uid,
          url: data.rtmps?.url || data.url,
          streamKey: data.rtmps?.streamKey || data.streamKey,
          playbackUrl: `https://cloudflarestream.com/${data.uid}/manifest/video.m3u8`,
        });
        setRtmpLoading(false);
        return;
      } catch (err: any) {
        setRtmpError(err.message || 'Failed to create RTMP input');
        setRtmpLoading(false);
        return;
      }
    }

    const newSource = {
      id: `${sourceType}${Date.now()}`,
      type: sourceType,
      label: sourceLabel || `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} ${Date.now()}`,
      previewUrl: sourceType === 'media' ? mediaFileUrl : '',
      isActive: true,
      ...(sourceType === 'ndi' ? { ndiSourceName, ndiAddress } : {}),
      ...(sourceType === 'rtmp' ? rtmpData : {}),
      ...(sourceType === 'text-overlay' ? {
        overlayText,
        overlayFontSize,
        overlayTextColor,
        overlayBackgroundColor,
        overlayPosition,
      } : {}),
      ...(sourceType === 'lower-third' ? { ltName, ltTitle, ltTemplate, ltVisible } : {}),
      ...(sourceType === 'stage-background' ? { bgColor } : {}),
      ...(sourceType === 'image-overlay' ? { imageUrl, imageOpacity, imageScale, overlayPosition } : {}),
      ...(sourceType === 'animated-overlay' ? { animationUrl, animationOpacity, animationScale, overlayPosition } : {}),
    };
    addSource(newSource);
    setShowAddModal(false);
    setSourceLabel('');
    setNdiSourceName('');
    setNdiAddress('');
    setRtmpError('');
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
    setImageUrl('');
    setImageOpacity(1);
    setImageScale(1);
    setAnimationUrl('');
    setAnimationOpacity(1);
    setAnimationScale(1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: await file.arrayBuffer(),
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (sourceType === 'media') {
        setMediaFileUrl(data.url);
      } else if (sourceType === 'image-overlay') {
        setImageUrl(data.url);
      } else if (sourceType === 'animated-overlay') {
        setAnimationUrl(data.url);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setFileUploading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => { setShowAddModal(true); setRtmpCreatedData(null); setRtmpError(''); }}
        className="w-full mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
      >
        + Add Source
      </button>

      <div className="space-y-2">
        {sources.map(source => {
          const isExpanded = expandedSourceId === source.id;
          return (
            <div key={source.id}>
              <div
                className={`flex items-center justify-between p-2.5 rounded cursor-pointer
                  ${isSourceInScene(source.id)
                    ? 'bg-gray-900 border-l-4 border-blue-500'
                    : 'bg-gray-900 border-l-4 border-transparent'}
                  ${isExpanded ? 'rounded-b-none' : ''}`}
                onClick={() => setExpandedSourceId(isExpanded ? null : source.id)}
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
                  <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  {selSceneId && (
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
                    ✕
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="bg-gray-850 border-t border-gray-700 rounded-b px-3 py-2 space-y-2"
                  style={{ backgroundColor: '#1a1a2e' }}>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Label</label>
                    <input value={source.label} onChange={e => {
                      useStreamStore.getState().updateSourceField(source.id, 'label', e.target.value);
                    }}
                      className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                  </div>

                  {source.type === 'rtmp' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">RTMP URL</label>
                        <div className="flex">
                          <input readOnly value={(source as any).rtmpUrl || (source as any).url || ''}
                            className="flex-1 px-2 py-1 bg-gray-700 text-white rounded-l text-xs font-mono truncate" />
                          <button onClick={() => navigator.clipboard.writeText((source as any).rtmpUrl || (source as any).url || '')}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-xs shrink-0">
                            Copy
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Stream Key</label>
                        <div className="flex">
                          <input readOnly value={(source as any).rtmpStreamKey || (source as any).streamKey || ''}
                            className="flex-1 px-2 py-1 bg-gray-700 text-white rounded-l text-xs font-mono truncate" />
                          <button onClick={() => navigator.clipboard.writeText((source as any).rtmpStreamKey || (source as any).streamKey || '')}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-xs shrink-0">
                            Copy
                          </button>
                        </div>
                      </div>
                      {source.playbackUrl && (
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Playback URL</label>
                          <div className="flex">
                            <input readOnly value={source.playbackUrl}
                              className="flex-1 px-2 py-1 bg-gray-700 text-white rounded-l text-xs font-mono truncate" />
                            <button onClick={() => navigator.clipboard.writeText(source.playbackUrl || '')}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-xs shrink-0">
                              Copy
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {source.type === 'text-overlay' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Text</label>
                        <textarea value={source.overlayText || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'overlayText', e.target.value);
                        }}
                          placeholder="Enter text to display"
                          rows={2}
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs resize-none" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Font Size</label>
                          <select value={source.overlayFontSize || 'medium'} onChange={e => {
                            useStreamStore.getState().updateSourceField(source.id, 'overlayFontSize', e.target.value);
                          }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs">
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Color</label>
                          <input type="color" value={source.overlayTextColor || '#ffffff'} onChange={e => {
                            useStreamStore.getState().updateSourceField(source.id, 'overlayTextColor', e.target.value);
                          }}
                            className="w-8 h-8 p-0.5 bg-gray-700 rounded cursor-pointer" />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <label className="text-xs text-gray-400">Bg</label>
                          <input type="color" value={source.overlayBackgroundColor === 'transparent' ? '#000000' : source.overlayBackgroundColor || '#000000'}
                            onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'overlayBackgroundColor', e.target.value);
                            }}
                            className="w-7 h-7 p-0.5 bg-gray-700 rounded cursor-pointer" />
                          <button onClick={() => {
                            useStreamStore.getState().updateSourceField(source.id, 'overlayBackgroundColor', 'transparent');
                          }}
                            className={`px-2 py-1 rounded text-xs ${source.overlayBackgroundColor === 'transparent' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                            Transparent
                          </button>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Position</label>
                          <select value={source.overlayPosition || 'bottom-left'} onChange={e => {
                            useStreamStore.getState().updateSourceField(source.id, 'overlayPosition', e.target.value);
                          }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs">
                            <option value="top-left">Top Left</option>
                            <option value="top-center">Top Center</option>
                            <option value="top-right">Top Right</option>
                            <option value="center">Center</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-center">Bottom Center</option>
                            <option value="bottom-right">Bottom Right</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">X Offset (vw)</label>
                          <input type="number" step="0.1"
                            value={source.offsetX ?? 0} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'offsetX', parseFloat(e.target.value) || 0);
                            }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Y Offset (vw)</label>
                          <input type="number" step="0.1"
                            value={source.offsetY ?? 0} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'offsetY', parseFloat(e.target.value) || 0);
                            }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                        </div>
                      </div>
                    </>
                  )}

                  {source.type === 'ndi' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">NDI Source Name</label>
                        <input value={source.ndiSourceName || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'ndiSourceName', e.target.value);
                        }}
                          placeholder="NDI source name"
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">NDI Address</label>
                        <input value={source.ndiAddress || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'ndiAddress', e.target.value);
                        }}
                          placeholder="e.g. 192.168.1.100"
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                      </div>
                    </>
                  )}

                  {source.type === 'media' && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-0.5">Media File URL</label>
                      <input value={source.previewUrl || ''} onChange={e => {
                        useStreamStore.getState().updateSourceField(source.id, 'previewUrl', e.target.value);
                      }}
                        placeholder="URL to media file"
                        className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                    </div>
                  )}

                  {source.type === 'image-overlay' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Image URL</label>
                        <input value={source.imageUrl || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'imageUrl', e.target.value);
                        }}
                          placeholder="URL to image"
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Opacity</label>
                          <input type="range" min="0" max="1" step="0.1"
                            value={source.imageOpacity ?? 1} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'imageOpacity', parseFloat(e.target.value));
                            }} className="w-full" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Scale</label>
                          <input type="range" min="0.1" max="2" step="0.1"
                            value={source.imageScale ?? 1} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'imageScale', parseFloat(e.target.value));
                            }} className="w-full" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Position</label>
                        <select value={source.overlayPosition || 'center'} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'overlayPosition', e.target.value);
                        }}
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs">
                          <option value="top-left">Top Left</option>
                          <option value="top-center">Top Center</option>
                          <option value="top-right">Top Right</option>
                          <option value="center">Center</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-center">Bottom Center</option>
                          <option value="bottom-right">Bottom Right</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">X Offset (vw)</label>
                          <input type="number" step="0.1"
                            value={source.offsetX ?? 0} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'offsetX', parseFloat(e.target.value) || 0);
                            }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Y Offset (vw)</label>
                          <input type="number" step="0.1"
                            value={source.offsetY ?? 0} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'offsetY', parseFloat(e.target.value) || 0);
                            }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                        </div>
                      </div>
                    </>
                  )}

                  {source.type === 'animated-overlay' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Animation URL</label>
                        <input value={source.animationUrl || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'animationUrl', e.target.value);
                        }}
                          placeholder="URL to animated file"
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Opacity</label>
                          <input type="range" min="0" max="1" step="0.1"
                            value={source.animationOpacity ?? 1} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'animationOpacity', parseFloat(e.target.value));
                            }} className="w-full" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Scale</label>
                          <input type="range" min="0.1" max="2" step="0.1"
                            value={source.animationScale ?? 1} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'animationScale', parseFloat(e.target.value));
                            }} className="w-full" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Position</label>
                        <select value={source.overlayPosition || 'center'} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'overlayPosition', e.target.value);
                        }}
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs">
                          <option value="top-left">Top Left</option>
                          <option value="top-center">Top Center</option>
                          <option value="top-right">Top Right</option>
                          <option value="center">Center</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-center">Bottom Center</option>
                          <option value="bottom-right">Bottom Right</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">X Offset (vw)</label>
                          <input type="number" step="0.1"
                            value={source.offsetX ?? 0} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'offsetX', parseFloat(e.target.value) || 0);
                            }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-0.5">Y Offset (vw)</label>
                          <input type="number" step="0.1"
                            value={source.offsetY ?? 0} onChange={e => {
                              useStreamStore.getState().updateSourceField(source.id, 'offsetY', parseFloat(e.target.value) || 0);
                            }}
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                        </div>
                      </div>
                    </>
                  )}

                  {source.type === 'lower-third' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Visible</span>
                        <button onClick={() => {
                          useStreamStore.getState().updateSourceField(source.id, 'ltVisible', !source.ltVisible);
                        }}
                          className={`px-2 py-0.5 rounded text-xs ${source.ltVisible !== false ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {source.ltVisible !== false ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Name</label>
                        <input value={source.ltName || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'ltName', e.target.value);
                        }}
                          placeholder="Speaker name"
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Title</label>
                        <input value={source.ltTitle || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'ltTitle', e.target.value);
                        }}
                          placeholder="Role or topic"
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Template</label>
                        <select value={source.ltTemplate || 'standard'} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'ltTemplate', e.target.value);
                        }}
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded text-xs">
                          <option value="minimal">Minimal</option>
                          <option value="standard">Standard</option>
                          <option value="social">Social</option>
                        </select>
                      </div>
                    </>
                  )}

                  {source.type === 'stage-background' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Presets</label>
                        <div className="flex items-center space-x-1.5">
                          {['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2d2d2d', '#3d0000', '#1b4332', '#f5f5f5'].map(c => (
                            <button key={c} onClick={() => {
                              useStreamStore.getState().updateSourceField(source.id, 'bgColor', c);
                            }}
                              className={`w-5 h-5 rounded-full border ${source.bgColor === c ? 'border-blue-400' : 'border-transparent'}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="color" value={source.bgColor || '#1a1a2e'} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'bgColor', e.target.value);
                        }}
                          className="w-7 h-7 p-0.5 bg-gray-700 rounded cursor-pointer" />
                        <input value={source.bgColor || ''} onChange={e => {
                          useStreamStore.getState().updateSourceField(source.id, 'bgColor', e.target.value);
                        }}
                          placeholder="#hex or linear-gradient(...)"
                          className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs" />
                      </div>
                    </>
                  )}
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
                    if (t !== 'rtmp') { setRtmpCreatedData(null); }
                    if (t !== 'media') setMediaFileUrl('');
                    if (t !== 'text-overlay') { setOverlayText(''); setOverlayFontSize('medium'); setOverlayTextColor('#ffffff'); setOverlayBackgroundColor('transparent'); setOverlayPosition('bottom-left'); }
                    if (t !== 'lower-third') { setLtName(''); setLtTitle(''); setLtTemplate('standard'); setLtVisible(true); }
                    if (t !== 'stage-background') setBgColor('#1a1a2e');
                    if (t !== 'image-overlay') { setImageUrl(''); setImageOpacity(1); setImageScale(1); }
                    if (t !== 'animated-overlay') { setAnimationUrl(''); setAnimationOpacity(1); setAnimationScale(1); }
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

              {sourceType === 'rtmp' && !rtmpCreatedData && (
                <>
                  {rtmpError && (
                    <div className="text-red-400 text-xs">{rtmpError}</div>
                  )}
                  <div className="text-gray-400 text-xs">
                    A Cloudflare Stream live input will be created for RTMP ingest. Credentials will be shown after creation.
                  </div>
                </>
              )}

              {sourceType === 'rtmp' && rtmpCreatedData && (
                <div>
                  <p className="text-sm text-green-400 font-medium mb-3">✓ RTMP Ingest Created</p>
                  <p className="text-xs text-gray-400 mb-3">Use these credentials in OBS or any RTMP encoder:</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">RTMPS URL</label>
                      <div className="flex">
                        <input readOnly value={rtmpCreatedData.url}
                          className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l text-sm font-mono" />
                        <button onClick={() => navigator.clipboard.writeText(rtmpCreatedData.url)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-sm shrink-0">
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Stream Key</label>
                      <div className="flex">
                        <input readOnly value={rtmpCreatedData.streamKey}
                          className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l text-sm font-mono" />
                        <button onClick={() => navigator.clipboard.writeText(rtmpCreatedData.streamKey)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-sm shrink-0">
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Playback URL</label>
                      <div className="flex">
                        <input readOnly value={rtmpCreatedData.playbackUrl}
                          className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l text-sm font-mono" />
                        <button onClick={() => navigator.clipboard.writeText(rtmpCreatedData.playbackUrl)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-sm shrink-0">
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {sourceType === 'media' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Media File:</label>
                  <div className="flex items-center space-x-2">
                    <input type="file" accept="video/*" onChange={handleFileUpload}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white" />
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-1">Or enter URL:</label>
                    <input value={mediaFileUrl} onChange={e => setMediaFileUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                  </div>
                  {fileUploading && <p className="text-xs text-blue-400 mt-1">Uploading...</p>}
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
                </div>
              )}

              {sourceType === 'image-overlay' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Image:</label>
                    <input type="file" accept="image/*" onChange={handleFileUpload}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white" />
                    <div className="mt-2">
                      <label className="block text-xs text-gray-400 mb-1">Or enter URL:</label>
                      <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.png" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                    </div>
                    {fileUploading && <p className="text-xs text-blue-400 mt-1">Uploading...</p>}
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-300 mb-1">Opacity:</label>
                      <input type="range" min="0" max="1" step="0.1" value={imageOpacity}
                        onChange={e => setImageOpacity(parseFloat(e.target.value))}
                        className="w-full" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-300 mb-1">Scale:</label>
                      <input type="range" min="0.1" max="2" step="0.1" value={imageScale}
                        onChange={e => setImageScale(parseFloat(e.target.value))}
                        className="w-full" />
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

              {sourceType === 'animated-overlay' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Animated File:</label>
                    <input type="file" accept="video/*,image/gif,image/apng,image/webp" onChange={handleFileUpload}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white" />
                    <div className="mt-2">
                      <label className="block text-xs text-gray-400 mb-1">Or enter URL:</label>
                      <input value={animationUrl} onChange={e => setAnimationUrl(e.target.value)}
                        placeholder="https://example.com/animation.gif" className="w-full px-3 py-2 bg-gray-700 text-white rounded" />
                    </div>
                    {fileUploading && <p className="text-xs text-blue-400 mt-1">Uploading...</p>}
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-300 mb-1">Opacity:</label>
                      <input type="range" min="0" max="1" step="0.1" value={animationOpacity}
                        onChange={e => setAnimationOpacity(parseFloat(e.target.value))}
                        className="w-full" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-300 mb-1">Scale:</label>
                      <input type="range" min="0.1" max="2" step="0.1" value={animationScale}
                        onChange={e => setAnimationScale(parseFloat(e.target.value))}
                        className="w-full" />
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
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => { setShowAddModal(false); setRtmpCreatedData(null); }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">
                {rtmpCreatedData ? 'Cancel' : 'Cancel'}
              </button>
              {rtmpCreatedData ? (
                <button onClick={() => {
                  const newSource = {
                    id: `rtmp${Date.now()}`,
                    type: 'rtmp',
                    label: sourceLabel || `RTMP ${Date.now()}`,
                    previewUrl: '',
                    isActive: true,
                    uid: rtmpCreatedData.uid,
                    rtmpUrl: rtmpCreatedData.url,
                    rtmpStreamKey: rtmpCreatedData.streamKey,
                    playbackUrl: rtmpCreatedData.playbackUrl,
                  };
                  addSource(newSource);
                  setRtmpCreatedData(null);
                  setShowAddModal(false);
                  setSourceLabel('');
                  setRtmpError('');
                }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition">
                  Done
                </button>
              ) : (
                <button onClick={handleAddSource} disabled={rtmpLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition">
                  {rtmpLoading ? 'Creating...' : 'Add Source'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScenesTab: React.FC = () => {
  const {
    sources, scenes, selectedSceneId, selectScene, addScene, removeScene, renameScene,
    addSourceToScene, removeSourceFromScene,
  } = useStreamStore();

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

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
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
            onClick={async () => {
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
                const sceneId = await addScene(preset.name);
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

      <div className="space-y-2">
        {sources.map(source => (
          <div key={source.id}
            className={`flex items-center justify-between p-2.5 rounded bg-gray-900
              ${isSourceInScene(source.id) ? 'border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}>
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
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              {selectedSceneId && (
                <button
                  onClick={() => handleToggleSourceInScene(source.id)}
                  className={`px-2 py-1 rounded text-xs
                    ${isSourceInScene(source.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  {isSourceInScene(source.id) ? 'In Scene' : '+ Scene'}
                </button>
              )}
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            No sources available. Add sources in the Sources tab first.
          </p>
        )}
      </div>
    </div>
  );
};

const DestinationsTab: React.FC = () => {
  const { destinations, setDestinations, toggleDestination } = useStreamStore();
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
    if (!formData.rtmpUrl || !formData.streamKey) {
      setError('RTMP URL and Stream Key are required');
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

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this destination?')) return;
    try {
      await fetch(`/api/destinations/${id}`, { method: 'DELETE' });
      await loadDestinations();
    } catch (err) {
      console.error('Failed to delete destination:', err);
    }
  };

  const handleEdit = (dest: (typeof destinations)[0]) => {
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
    <div>
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
                onClick={() => toggleDestination(dest.id)}
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
