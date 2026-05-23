export class AudioMixer {
  private ctx: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private sourceNodes = new Map<string, MediaStreamAudioSourceNode>();
  private gainNodes = new Map<string, GainNode>();
  private mutes = new Map<string, boolean>();

  constructor() {
    this.ctx = new AudioContext();
    this.destination = this.ctx.createMediaStreamDestination();
  }

  addTrack(sourceId: string, track: MediaStreamTrack): void {
    if (this.sourceNodes.has(sourceId)) return;
    const stream = new MediaStream([track]);
    const source = this.ctx.createMediaStreamSource(stream);
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(this.destination);
    this.sourceNodes.set(sourceId, source);
    this.gainNodes.set(sourceId, gain);
    this.mutes.set(sourceId, false);
  }

  removeTrack(sourceId: string): void {
    const source = this.sourceNodes.get(sourceId);
    if (!source) return;
    try { source.disconnect(); } catch {}
    const gain = this.gainNodes.get(sourceId);
    if (gain) {
      try { gain.disconnect(); } catch {}
    }
    this.sourceNodes.delete(sourceId);
    this.gainNodes.delete(sourceId);
    this.mutes.delete(sourceId);
  }

  setGain(sourceId: string, gain: number): void {
    const node = this.gainNodes.get(sourceId);
    if (node) node.gain.value = Math.max(0, Math.min(2, gain));
  }

  setMute(sourceId: string, muted: boolean): void {
    this.mutes.set(sourceId, muted);
    const gain = this.gainNodes.get(sourceId);
    if (gain) gain.gain.value = muted ? 0 : 1;
  }

  isMuted(sourceId: string): boolean {
    return this.mutes.get(sourceId) ?? false;
  }

  getOutputStream(): MediaStream {
    return this.destination.stream;
  }

  getAudioContext(): AudioContext {
    return this.ctx;
  }

  resume(): Promise<void> {
    return this.ctx.resume();
  }

  destroy(): void {
    for (const [id] of this.sourceNodes) {
      this.removeTrack(id);
    }
    this.destination.disconnect();
    this.ctx.close();
  }
}
