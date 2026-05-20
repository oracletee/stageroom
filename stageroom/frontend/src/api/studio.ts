function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loadStudioConfig() {
  try {
    const [configRes, scenesRes, sourcesRes, destinationsRes] = await Promise.all([
      fetch('/api/studio/config', { headers: { ...getAuthHeader() } }),
      fetch('/api/scenes', { headers: { ...getAuthHeader() } }),
      fetch('/api/sources', { headers: { ...getAuthHeader() } }),
      fetch('/api/destinations', { headers: { ...getAuthHeader() } }),
    ]);

    const config = configRes.ok ? await configRes.json() : null;
    const scenes = scenesRes.ok ? await scenesRes.json() : { scenes: [] };
    const sources = sourcesRes.ok ? await sourcesRes.json() : { sources: [] };
    const destinations = destinationsRes.ok ? await destinationsRes.json() : { destinations: [] };

    return {
      ...config,
      scenes: scenes.scenes || [],
      sources: sources.sources || [],
      destinations: destinations.destinations || [],
    };
  } catch {
    return null;
  }
}

export async function saveStudioConfig(config: {
  selectedSceneId?: string | null;
  programSceneId?: string | null;
  programSnapshot?: { sceneId: string; timestamp: number; sources: any[] } | null;
  stageMode?: string;
}) {
  try {
    await fetch('/api/studio/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(config),
    });
  } catch {
    // Silently fail
  }
}

export async function createScene(name: string, sourceIds: string[] = [], id?: string) {
  try {
    const res = await fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ name, sourceIds, id }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateScene(sceneId: string, updates: { name?: string; sourceIds?: string[] }) {
  try {
    await fetch(`/api/scenes/${sceneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates),
    });
  } catch {
    // Silently fail
  }
}

export async function deleteScene(sceneId: string) {
  try {
    await fetch(`/api/scenes/${sceneId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
  } catch {
    // Silently fail
  }
}

export async function createSource(source: {
  type: string;
  label: string;
  sceneId?: string;
  config?: Record<string, any>;
  liveInputUid?: string;
  playbackUrl?: string;
  isActive?: boolean;
}) {
  try {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(source),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateSource(sourceId: string, updates: {
  label?: string;
  config?: Record<string, any>;
  isActive?: boolean;
  sceneId?: string;
  liveInputUid?: string;
  playbackUrl?: string;
}) {
  try {
    await fetch(`/api/sources/${sourceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates),
    });
  } catch {
    // Silently fail
  }
}

export async function deleteSource(sourceId: string) {
  try {
    await fetch(`/api/sources/${sourceId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
  } catch {
    // Silently fail
  }
}
