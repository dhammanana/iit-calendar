class BellSoundService {
  private static instance: BellSoundService;
  private audioCtx: AudioContext | null = null;

  private constructor() {}

  public static getInstance(): BellSoundService {
    if (!BellSoundService.instance) {
      BellSoundService.instance = new BellSoundService();
    }
    return BellSoundService.instance;
  }

  public initAudio(): void {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playBell(soundEnabled = true, bellType = 'singing_bowl'): void {
    if (!soundEnabled) return;
    this.initAudio();
    const ctx = this.audioCtx;
    if (!ctx) return;

    const now = ctx.currentTime;
    let fundamental = 523.25; // C5
    let partials = [1, 1.503, 1.997, 2.502, 3.011];
    let duration = 4;

    if (bellType === 'gong') {
      fundamental = 130.81; // C3
      partials = [1, 2.05, 3.1, 4.2];
      duration = 6;
    } else if (bellType === 'chime') {
      fundamental = 1046.5; // C6
      partials = [1, 1.2, 1.5];
      duration = 2;
    } else if (bellType === 'tibetan') {
      fundamental = 261.63; // C4
      partials = [1, 1.8, 2.7, 5.4];
      duration = 5;
    } else if (bellType === 'woodblock') {
      fundamental = 800;
      partials = [1, 1.5];
      duration = 0.2;
    } else if (bellType === 'bell') {
      fundamental = 880; // A5
      partials = [1, 2, 3];
      duration = 3;
    }

    partials.forEach((p, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(fundamental * p, now);
      gain.gain.setValueAtTime(0.15 / partials.length, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration + i * 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 1);
    });
  }
}

export const bellSoundService = BellSoundService.getInstance();
