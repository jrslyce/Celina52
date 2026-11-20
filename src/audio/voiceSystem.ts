import type { VoiceClipId } from '../sim/types';

export class VoiceSystem {
  private muted = false;
  private speaking = false;
  private currentAudio: HTMLAudioElement | null = null;
  private readonly cache = new Map<string, HTMLAudioElement>();
  private readonly onSpeakingChange?: (speaking: boolean) => void;

  constructor(onSpeakingChange?: (speaking: boolean) => void) {
    this.onSpeakingChange = onSpeakingChange;
    if (typeof window !== 'undefined') {
      this.preload(['jugman_intro', 'nevaeh_preview', 'janitor_preview', 'rodney_preview', 'colby_welcome']);
      window.addEventListener('pagehide', () => this.stop());
      window.addEventListener('beforeunload', () => this.stop());
    }
  }

  private getAudio(clipId: VoiceClipId): HTMLAudioElement {
    let audio = this.cache.get(clipId);
    if (!audio) {
      audio = new Audio(`/assets/voices/${clipId}.mp3`);
      audio.preload = 'auto';
      this.cache.set(clipId, audio);
    }
    return audio;
  }

  public preload(ids: VoiceClipId[]): void {
    for (const id of ids) {
      this.getAudio(id).load();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.setSpeaking(false);
  }

  private setSpeaking(val: boolean): void {
    if (this.speaking !== val) {
      this.speaking = val;
      this.onSpeakingChange?.(val);
    }
  }

  public play(clipId: VoiceClipId, options?: { force?: boolean }): boolean {
    if (this.muted) return false;
    if (!options?.force && this.speaking) return false;

    this.stop();
    const audio = this.getAudio(clipId);
    audio.currentTime = 0;
    audio.volume = 0.95;
    this.currentAudio = audio;
    this.setSpeaking(true);

    audio.onended = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.setSpeaking(false);
      }
    };
    audio.onerror = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.setSpeaking(false);
      }
    };

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.setSpeaking(false);
        }
      });
    }
    return true;
  }
}
