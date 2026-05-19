import { create } from 'zustand';

export type StageMode = 'ted-talk' | 'podcast' | 'event' | 'worship' | 'classroom' | 'debate' | 'film-premiere';
export type AppView = 'host' | 'viewer' | 'dashboard';

interface SourceItem {
  id: string;
  type: 'camera' | 'screen' | 'media' | 'text' | 'image' | 'text-overlay' | 'image-overlay' | 'animated-overlay' | 'ndi' | 'rtmp' | 'lower-third' | 'stage-background';
  label: string;
  previewUrl?: string;
  isActive: boolean;
  ndiSourceName?: string;
  ndiAddress?: string;
  rtmpUrl?: string;
  rtmpStreamKey?: string;
  overlayText?: string;
  overlayFontSize?: 'small' | 'medium' | 'large';
  overlayTextColor?: string;
  overlayBackgroundColor?: string;
  overlayPosition?: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  ltName?: string;
  ltTitle?: string;
  ltTemplate?: 'minimal' | 'standard' | 'social';
  ltVisible?: boolean;
  bgColor?: string;
}

interface Scene {
  id: string;
  name: string;
  sourceIds: string[];
}

interface LowerThird {
  visible: boolean;
  name: string;
  title: string;
  template: 'minimal' | 'standard' | 'social';
}

interface StreamState {
  videoDevices: MediaDeviceInfo[];
  setVideoDevices: (devices: MediaDeviceInfo[]) => void;
  audioDevices: MediaDeviceInfo[];
  setAudioDevices: (devices: MediaDeviceInfo[]) => void;
  selectedVideoDevice: string | null;
  setSelectedVideoDevice: (deviceId: string | null) => void;
  selectedAudioDevice: string | null;
  setSelectedAudioDevice: (deviceId: string | null) => void;
  sources: SourceItem[];
  setSources: (sources: SourceItem[]) => void;
  addSource: (source: SourceItem) => void;
  removeSource: (sourceId: string) => void;
  toggleSourceActive: (sourceId: string) => void;
  scenes: Scene[];
  selectedSceneId: string | null;
  programSceneId: string | null;
  isStreaming: boolean;
  isRecording: boolean;
  addScene: (name: string, id?: string) => string;
  removeScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  selectScene: (sceneId: string) => void;
  pushToProgram: () => void;
  addSourceToScene: (sceneId: string, sourceId: string) => void;
  removeSourceFromScene: (sceneId: string, sourceId: string) => void;
  setStreaming: (value: boolean) => void;
  setRecording: (value: boolean) => void;
  stageMode: StageMode;
  setStageMode: (mode: StageMode) => void;
  appView: AppView;
  setAppView: (view: AppView) => void;
  spotlightParticipants: string[];
  setSpotlightParticipants: (ids: string[]) => void;
  toggleSpotlight: (participantId: string) => void;
  lyricText: string;
  setLyricText: (text: string) => void;
  liveKitParticipants: { identity: string; hasVideo: boolean }[];
  setLiveKitParticipants: (participants: { identity: string; hasVideo: boolean }[]) => void;
  backstageParticipants: string[];
  addToBackstage: (participantId: string) => void;
  removeFromBackstage: (participantId: string) => void;
  lowerThird: LowerThird;
  setLowerThird: (lt: Partial<LowerThird>) => void;
  stageBackground: string;
  setStageBackground: (color: string) => void;
}

export const useStreamStore = create<StreamState>((set) => ({
  videoDevices: [],
  setVideoDevices: (devices) => set({ videoDevices: devices }),
  audioDevices: [],
  setAudioDevices: (devices) => set({ audioDevices: devices }),
  selectedVideoDevice: null,
  setSelectedVideoDevice: (deviceId) => set({ selectedVideoDevice: deviceId }),
  selectedAudioDevice: null,
  setSelectedAudioDevice: (deviceId) => set({ selectedAudioDevice: deviceId }),
  sources: [
    { id: 'cam1', type: 'camera', label: 'Camera 1', previewUrl: '', isActive: true },
    { id: 'scr1', type: 'screen', label: 'Screen Share', previewUrl: '', isActive: false },
  ],
  setSources: (sources) => set({ sources }),
  addSource: (source) => set((state) => ({ sources: [...state.sources, source] })),
  removeSource: (sourceId) => set((state) => ({
    sources: state.sources.filter(s => s.id !== sourceId),
  })),
  toggleSourceActive: (sourceId) => set((state) => ({
    sources: state.sources.map(s =>
      s.id === sourceId ? { ...s, isActive: !s.isActive } : s
    )
  })),
  scenes: [
    { id: 'scene1', name: 'Scene 1', sourceIds: ['cam1'] },
  ],
  selectedSceneId: 'scene1',
  programSceneId: null,
  isStreaming: false,
  isRecording: false,
  addScene: (name, id) => {
    const sceneId = id || `scene${Date.now()}`;
    set((state) => {
      const newScene: Scene = {
        id: sceneId,
        name,
        sourceIds: [],
      };
      return { scenes: [...state.scenes, newScene] };
    });
    return sceneId;
  },
  removeScene: (sceneId) => set((state) => ({
    scenes: state.scenes.filter(s => s.id !== sceneId),
    selectedSceneId: state.selectedSceneId === sceneId
      ? (state.scenes.find(s => s.id !== sceneId)?.id || null)
      : state.selectedSceneId,
    programSceneId: state.programSceneId === sceneId ? null : state.programSceneId,
  })),
  renameScene: (sceneId, name) => set((state) => ({
    scenes: state.scenes.map(s => s.id === sceneId ? { ...s, name } : s),
  })),
  selectScene: (sceneId) => set({ selectedSceneId: sceneId }),
  pushToProgram: () => set((state) => ({
    programSceneId: state.selectedSceneId,
  })),
  addSourceToScene: (sceneId, sourceId) => set((state) => ({
    scenes: state.scenes.map(s =>
      s.id === sceneId && !s.sourceIds.includes(sourceId)
        ? { ...s, sourceIds: [...s.sourceIds, sourceId] }
        : s
    ),
  })),
  removeSourceFromScene: (sceneId, sourceId) => set((state) => ({
    scenes: state.scenes.map(s =>
      s.id === sceneId
        ? { ...s, sourceIds: s.sourceIds.filter(id => id !== sourceId) }
        : s
    ),
  })),
  setStreaming: (value) => set({ isStreaming: value }),
  setRecording: (value) => set({ isRecording: value }),
  stageMode: 'ted-talk',
  setStageMode: (mode) => set({ stageMode: mode }),
  appView: 'host',
  setAppView: (view) => set({ appView: view }),
  spotlightParticipants: [],
  setSpotlightParticipants: (ids) => set({ spotlightParticipants: ids }),
  toggleSpotlight: (participantId) => set((state) => ({
    spotlightParticipants: state.spotlightParticipants.includes(participantId)
      ? state.spotlightParticipants.filter(id => id !== participantId)
      : state.spotlightParticipants.length < 6
        ? [...state.spotlightParticipants, participantId]
        : state.spotlightParticipants,
  })),
  lyricText: '',
  setLyricText: (text) => set({ lyricText: text }),
  backstageParticipants: [],
  addToBackstage: (participantId) => set((state) => ({
    backstageParticipants: state.backstageParticipants.includes(participantId) || state.backstageParticipants.length >= 6
      ? state.backstageParticipants
      : [...state.backstageParticipants, participantId],
  })),
  removeFromBackstage: (participantId) => set((state) => ({
    backstageParticipants: state.backstageParticipants.filter(id => id !== participantId),
  })),
  liveKitParticipants: [],
  setLiveKitParticipants: (participants) => set({ liveKitParticipants: participants }),
  lowerThird: { visible: false, name: '', title: '', template: 'standard' },
  setLowerThird: (lt) => set((state) => ({ lowerThird: { ...state.lowerThird, ...lt } })),
  stageBackground: '',
  setStageBackground: (color) => set({ stageBackground: color }),
}));
