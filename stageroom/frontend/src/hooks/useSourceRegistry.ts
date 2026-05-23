import { useSyncExternalStore, useCallback } from 'react';
import { useStreamStore } from './useStreamStore';

export interface TrackPair {
  video: MediaStreamTrack | null;
  audio: MediaStreamTrack | null;
}

function subscribeToSourceStreams(callback: () => void) {
  const unsub = useStreamStore.subscribe(() => {
    callback();
  });
  return unsub;
}

function getSnapshot(): Map<string, TrackPair> {
  const sourceStreams = useStreamStore.getState().sourceStreams;
  const result = new Map<string, TrackPair>();
  for (const [sourceId, stream] of sourceStreams) {
    result.set(sourceId, {
      video: stream.getVideoTracks()[0] ?? null,
      audio: stream.getAudioTracks()[0] ?? null,
    });
  }
  return result;
}

export function useSourceRegistry() {
  const tracks = useSyncExternalStore(subscribeToSourceStreams, getSnapshot);

  const getTrack = useCallback(
    (sourceId: string): TrackPair => {
      return tracks.get(sourceId) ?? { video: null, audio: null };
    },
    [tracks],
  );

  const getVideoTrack = useCallback(
    (sourceId: string): MediaStreamTrack | null => {
      return tracks.get(sourceId)?.video ?? null;
    },
    [tracks],
  );

  const getAudioTrack = useCallback(
    (sourceId: string): MediaStreamTrack | null => {
      return tracks.get(sourceId)?.audio ?? null;
    },
    [tracks],
  );

  return {
    tracks,
    getTrack,
    getVideoTrack,
    getAudioTrack,
  };
}

export function getTrackPair(sourceId: string): TrackPair {
  const sourceStreams = useStreamStore.getState().sourceStreams;
  const stream = sourceStreams.get(sourceId);
  if (!stream) return { video: null, audio: null };
  return {
    video: stream.getVideoTracks()[0] ?? null,
    audio: stream.getAudioTracks()[0] ?? null,
  };
}

export function subscribeTracks(callback: () => void): () => void {
  return useStreamStore.subscribe(() => {
    callback();
  });
}
