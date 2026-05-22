import { create } from 'zustand';
import * as studioApi from '../api/studio';

export type StageMode = 'ted-talk' | 'podcast' | 'event' | 'worship' | 'classroom' | 'debate' | 'film-premiere';
export type AppView = 'host' | 'viewer' | 'dashboard' | 'events';

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
  uid?: string;
  playbackUrl?: string;
  token?: string;
  overlayText?: string;
  overlayFontSize?: 'small' | 'medium' | 'large';
  overlayTextColor?: string;
  overlayBackgroundColor?: string;
  overlayPosition?: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  offsetX?: number;
  offsetY?: number;
  ltName?: string;
  ltTitle?: string;
  ltTemplate?: 'minimal' | 'standard' | 'social';
  ltVisible?: boolean;
  bgColor?: string;
  imageUrl?: string;
  imageOpacity?: number;
  imageScale?: number;
  animationUrl?: string;
  animationOpacity?: number;
  animationScale?: number;
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

interface Destination {
  id: string;
  name: string;
  platform: string;
  rtmpUrl: string | null;
  streamKey: string | null;
  isEnabled: boolean;
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
  updateSource: (sourceId: string, updates: Partial<SourceItem>) => void;
  updateSourceField: (sourceId: string, field: string, value: any) => void;
  sourceStreams: Map<string, MediaStream>;
  setSourceStream: (sourceId: string, stream: MediaStream | null) => void;
  scenes: Scene[];
  selectedSceneId: string | null;
  programSceneId: string | null;
  programSnapshot: { sceneId: string; timestamp: number; sources: SourceItem[] } | null;
  isStreaming: boolean;
  streamSession: { liveInputUid?: string; whipUrl?: string; whipToken?: string; startedAt?: string; error?: string } | null;
  setStreamSession: (session: { liveInputUid?: string; whipUrl?: string; whipToken?: string; startedAt?: string; error?: string } | null) => void;
  addScene: (name: string, id?: string) => Promise<string>;
  removeScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  selectScene: (sceneId: string) => void;
  pushToProgram: () => void;
  addSourceToScene: (sceneId: string, sourceId: string) => void;
  removeSourceFromScene: (sceneId: string, sourceId: string) => void;
  setStreaming: (value: boolean) => void;
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
  destinations: Destination[];
  setDestinations: (destinations: Destination[]) => void;
  toggleDestination: (id: string) => void;
  setupDone: boolean;
  setSetupDone: (done: boolean) => void;
  loadFromDb: (data: any) => void;
  backfillRtmpSources: () => Promise<void>;
  persistConfig: () => void;
}

function parseDbSource(row: any): SourceItem {
  const config = row.config ? JSON.parse(row.config) : {};
  return {
    id: row.id,
    type: row.type,
    label: row.label || row.type,
    previewUrl: config.previewUrl || '',
    isActive: row.is_active !== 0,
    ndiSourceName: config.ndiSourceName,
    ndiAddress: config.ndiAddress,
    rtmpUrl: config.rtmpUrl,
    rtmpStreamKey: config.rtmpStreamKey,
    uid: row.live_input_uid,
    playbackUrl: row.playback_url,
    token: config.token,
    overlayText: config.overlayText,
    overlayFontSize: config.overlayFontSize,
    overlayTextColor: config.overlayTextColor,
    overlayBackgroundColor: config.overlayBackgroundColor,
    overlayPosition: config.overlayPosition,
    offsetX: config.offsetX,
    offsetY: config.offsetY,
    ltName: config.ltName,
    ltTitle: config.ltTitle,
    ltTemplate: config.ltTemplate,
    ltVisible: config.ltVisible,
    bgColor: config.bgColor,
    imageUrl: config.imageUrl,
    imageOpacity: config.imageOpacity,
    imageScale: config.imageScale,
    animationUrl: config.animationUrl,
    animationOpacity: config.animationOpacity,
    animationScale: config.animationScale,
  };
}

function parseDbScene(row: any): Scene {
  const raw = row.source_ids ? JSON.parse(row.source_ids) : [];
  return {
    id: row.id,
    name: row.name,
    sourceIds: [...new Set<string>(raw)],
  };
}

export const useStreamStore = create<StreamState>((set, get) => ({
  videoDevices: [],
  setVideoDevices: (devices) => set({ videoDevices: devices }),
  audioDevices: [],
  setAudioDevices: (devices) => set({ audioDevices: devices }),
  selectedVideoDevice: null,
  setSelectedVideoDevice: (deviceId) => set({ selectedVideoDevice: deviceId }),
  selectedAudioDevice: null,
  setSelectedAudioDevice: (deviceId) => set({ selectedAudioDevice: deviceId }),
  sources: [],
  setSources: (sources) => set({ sources }),
  addSource: async (source) => {
    set((state) => ({ sources: [...state.sources, source] }));
    await studioApi.createSource({
      id: source.id,
      type: source.type,
      label: source.label,
      sceneId: get().selectedSceneId || undefined,
      config: {
        previewUrl: source.previewUrl,
        ndiSourceName: source.ndiSourceName,
        ndiAddress: source.ndiAddress,
        rtmpUrl: source.rtmpUrl,
        rtmpStreamKey: source.rtmpStreamKey,
        token: source.token,
        overlayText: source.overlayText,
        overlayFontSize: source.overlayFontSize,
        overlayTextColor: source.overlayTextColor,
        overlayBackgroundColor: source.overlayBackgroundColor,
        overlayPosition: source.overlayPosition,
        offsetX: source.offsetX,
        offsetY: source.offsetY,
        ltName: source.ltName,
        ltTitle: source.ltTitle,
        ltTemplate: source.ltTemplate,
        ltVisible: source.ltVisible,
        bgColor: source.bgColor,
        imageUrl: source.imageUrl,
        imageOpacity: source.imageOpacity,
        imageScale: source.imageScale,
        animationUrl: source.animationUrl,
        animationOpacity: source.animationOpacity,
        animationScale: source.animationScale,
      },
      liveInputUid: source.uid,
      playbackUrl: source.playbackUrl,
      isActive: source.isActive,
    });
  },
  removeSource: async (sourceId) => {
    const stream = get().sourceStreams.get(sourceId);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    set((state) => ({
      sources: state.sources.filter(s => s.id !== sourceId),
      scenes: state.scenes.map(s => ({
        ...s,
        sourceIds: s.sourceIds.filter(id => id !== sourceId),
      })),
      sourceStreams: (() => {
        const next = new Map(state.sourceStreams);
        next.delete(sourceId);
        return next;
      })(),
    }));
    await studioApi.deleteSource(sourceId);
  },
  toggleSourceActive: async (sourceId) => {
    const source = get().sources.find(s => s.id === sourceId);
    if (!source) return;
    const newActive = !source.isActive;
    set((state) => ({
      sources: state.sources.map(s =>
        s.id === sourceId ? { ...s, isActive: newActive } : s
      )
    }));
    await studioApi.updateSource(sourceId, { isActive: newActive });
  },
  updateSource: async (sourceId, updates) => {
    set((state) => ({
      sources: state.sources.map(s => s.id === sourceId ? { ...s, ...updates } : s),
    }));
    await studioApi.updateSource(sourceId, updates);
  },
  updateSourceField: (sourceId, field, value) => {
    const state = get();
    const source = state.sources.find(s => s.id === sourceId);
    if (!source) return;
    const updatedSources = state.sources.map(s =>
      s.id === sourceId ? { ...s, [field]: value } : s
    );
    set({ sources: updatedSources });
    const updatedSource = updatedSources.find(s => s.id === sourceId)!;
    if (field === 'label') {
      studioApi.updateSource(sourceId, { label: value });
    } else {
      const configFields: (keyof SourceItem)[] = ['previewUrl', 'ndiSourceName', 'ndiAddress', 'rtmpUrl', 'rtmpStreamKey', 'token', 'overlayText', 'overlayFontSize', 'overlayTextColor', 'overlayBackgroundColor', 'overlayPosition', 'offsetX', 'offsetY', 'ltName', 'ltTitle', 'ltTemplate', 'ltVisible', 'bgColor', 'imageUrl', 'imageOpacity', 'imageScale', 'animationUrl', 'animationOpacity', 'animationScale'];
      const config: Record<string, any> = {};
      for (const f of configFields) {
        const v = (updatedSource as any)[f];
        if (v !== undefined) config[f] = v;
      }
      studioApi.updateSource(sourceId, { config });
    }
  },
  sourceStreams: new Map(),
  setSourceStream: (sourceId, stream) => set((state) => {
    const next = new Map(state.sourceStreams);
    if (stream) next.set(sourceId, stream);
    else next.delete(sourceId);
    return { sourceStreams: next };
  }),
  scenes: [],
  selectedSceneId: null,
  programSceneId: null,
  programSnapshot: null,
  isStreaming: false,
  streamSession: null,
  setStreamSession: (session) => set({ streamSession: session }),
  addScene: async (name, id) => {
    const sceneId = id || `scene${Date.now()}`;
    set((state) => {
      const newScene: Scene = { id: sceneId, name, sourceIds: [] };
      return { scenes: [...state.scenes, newScene] };
    });
    await studioApi.createScene(name, [], sceneId);
    return sceneId;
  },
  removeScene: async (sceneId) => {
    set((state) => ({
      scenes: state.scenes.filter(s => s.id !== sceneId),
      selectedSceneId: state.selectedSceneId === sceneId
        ? (state.scenes.find(s => s.id !== sceneId)?.id || null)
        : state.selectedSceneId,
      programSceneId: state.programSceneId === sceneId ? null : state.programSceneId,
      programSnapshot: state.programSnapshot?.sceneId === sceneId ? null : state.programSnapshot,
    }));
    await studioApi.deleteScene(sceneId);
    get().persistConfig();
  },
  renameScene: async (sceneId, name) => {
    set((state) => ({
      scenes: state.scenes.map(s => s.id === sceneId ? { ...s, name } : s),
    }));
    await studioApi.updateScene(sceneId, { name });
  },
  selectScene: (sceneId) => {
    set({ selectedSceneId: sceneId });
    get().persistConfig();
  },
  pushToProgram: () => {
    set((state) => {
      const scene = state.scenes.find(s => s.id === state.selectedSceneId);
      if (!scene) return {};
      const snapshotSources = scene.sourceIds
        .map(id => state.sources.find(s => s.id === id))
        .filter((s): s is SourceItem => s !== undefined);
      return {
        programSceneId: state.selectedSceneId,
        programSnapshot: {
          sceneId: scene.id,
          timestamp: Date.now(),
          sources: structuredClone(snapshotSources),
        },
      };
    });
    get().persistConfig();
  },
  addSourceToScene: async (sceneId, sourceId) => {
    set((state) => ({
      scenes: state.scenes.map(s =>
        s.id === sceneId && !s.sourceIds.includes(sourceId)
          ? { ...s, sourceIds: [...s.sourceIds, sourceId] }
          : s
      ),
    }));
    const scene = get().scenes.find(s => s.id === sceneId);
    if (scene) {
      await studioApi.updateScene(sceneId, { sourceIds: [...scene.sourceIds, sourceId] });
    }
  },
  removeSourceFromScene: async (sceneId, sourceId) => {
    set((state) => ({
      scenes: state.scenes.map(s =>
        s.id === sceneId
          ? { ...s, sourceIds: s.sourceIds.filter(id => id !== sourceId) }
          : s
      ),
    }));
    const scene = get().scenes.find(s => s.id === sceneId);
    if (scene) {
      await studioApi.updateScene(sceneId, { sourceIds: scene.sourceIds.filter(id => id !== sourceId) });
    }
  },
  setStreaming: (value) => set({ isStreaming: value }),
  stageMode: 'ted-talk',
  setStageMode: (mode) => {
    set({ stageMode: mode });
    get().persistConfig();
  },
  appView: 'host',
  setAppView: (view) => set({ appView: view }),
  spotlightParticipants: [],
  setSpotlightParticipants: (ids) => set({ spotlightParticipants: ids }),
  toggleSpotlight: (participantId) => {
    set((state) => ({
      spotlightParticipants: state.spotlightParticipants.includes(participantId)
        ? state.spotlightParticipants.filter(id => id !== participantId)
        : state.spotlightParticipants.length < 6
          ? [...state.spotlightParticipants, participantId]
          : state.spotlightParticipants,
    }));
    get().persistConfig();
  },
  lyricText: '',
  setLyricText: (text) => set({ lyricText: text }),
  backstageParticipants: [],
  addToBackstage: (participantId) => {
    set((state) => {
      if (state.backstageParticipants.includes(participantId) || state.backstageParticipants.length >= 6) {
        return { backstageParticipants: state.backstageParticipants };
      }
      return { backstageParticipants: [...state.backstageParticipants, participantId] };
    });
    get().persistConfig();
  },
  removeFromBackstage: (participantId) => {
    set((state) => ({
      backstageParticipants: state.backstageParticipants.filter(id => id !== participantId),
    }));
    get().persistConfig();
  },
  liveKitParticipants: [],
  setLiveKitParticipants: (participants) => set({ liveKitParticipants: participants }),
  lowerThird: { visible: false, name: '', title: '', template: 'standard' },
  setLowerThird: (lt) => set((state) => ({ lowerThird: { ...state.lowerThird, ...lt } })),
  stageBackground: '',
  setStageBackground: (color) => set({ stageBackground: color }),
  destinations: [],
  setDestinations: (destinations) => set({ destinations }),
  setupDone: false,
  setSetupDone: (done) => {
    set({ setupDone: done });
    if (done) get().persistConfig();
  },
  toggleDestination: async (id) => {
    set((state) => ({
      destinations: state.destinations.map(d =>
        d.id === id ? { ...d, isEnabled: !d.isEnabled } : d
      ),
    }));
    const dest = get().destinations.find(d => d.id === id);
    if (dest) {
      await fetch(`/api/destinations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !dest.isEnabled }),
      });
    }
  },
  loadFromDb: (data) => {
    const seen = new Map<string, any>();
    (data.sources || []).forEach(s => seen.set(s.id, s));
    const sources = Array.from(seen.values()).map(parseDbSource);
    const rawScenes = (data.scenes || []).map(parseDbScene);
    const sceneMap = new Map<string, Scene>();
    rawScenes.forEach(s => sceneMap.set(s.id, s));
    const scenes = Array.from(sceneMap.values());
    const config = data.config;
    const destinations = (data.destinations || []).map((d: any) => ({
      ...d,
      isEnabled: d.is_enabled === 1,
    }));
    set({
      sources,
      scenes,
      selectedSceneId: config?.selected_scene_id || scenes[0]?.id || null,
      programSceneId: config?.program_scene_id || null,
      programSnapshot: config?.program_snapshot || null,
      stageMode: (config?.stage_mode as StageMode) || 'ted-talk',
      destinations,
      backstageParticipants: config?.backstage_participants ? JSON.parse(config.backstage_participants) : [],
      spotlightParticipants: config?.spotlight_participants ? JSON.parse(config.spotlight_participants) : [],
      setupDone: config?.setup_done === 1 || config?.setup_done === true,
    });
  },
  backfillRtmpSources: async () => {
    const sources = get().sources;
    for (const source of sources) {
      if (source.type !== 'rtmp' || !source.uid || source.rtmpUrl) continue;
      try {
        const res = await fetch(`/api/stream/live-input/${source.uid}`);
        if (!res.ok) continue;
        const data = await res.json();
        const rtmpUrl: string = data.rtmps?.url || '';
        const rtmpStreamKey: string = data.rtmps?.streamKey || '';
        if (!rtmpUrl || !rtmpStreamKey) continue;
        set((state) => ({
          sources: state.sources.map(s =>
            s.id === source.id ? { ...s, rtmpUrl, rtmpStreamKey } : s
          ),
        }));
        const configFields: (keyof SourceItem)[] = ['previewUrl', 'ndiSourceName', 'ndiAddress', 'rtmpUrl', 'rtmpStreamKey', 'token', 'overlayText', 'overlayFontSize', 'overlayTextColor', 'overlayBackgroundColor', 'overlayPosition', 'offsetX', 'offsetY', 'ltName', 'ltTitle', 'ltTemplate', 'ltVisible', 'bgColor', 'imageUrl', 'imageOpacity', 'imageScale', 'animationUrl', 'animationOpacity', 'animationScale'];
        const config: Record<string, any> = {};
        const updated = get().sources.find(s => s.id === source.id)!;
        for (const f of configFields) {
          const v = (updated as any)[f];
          if (v !== undefined) config[f] = v;
        }
        await studioApi.updateSource(source.id, { config });
      } catch (e) {
        console.warn('Failed to backfill RTMP source', source.id, e);
      }
    }
  },
  persistConfig: () => {
    const state = get();
    studioApi.saveStudioConfig({
      selectedSceneId: state.selectedSceneId,
      programSceneId: state.programSceneId,
      programSnapshot: state.programSnapshot,
      stageMode: state.stageMode,
      backstageParticipants: JSON.stringify(state.backstageParticipants),
      spotlightParticipants: JSON.stringify(state.spotlightParticipants),
      setupDone: state.setupDone,
    });
  },
}));
