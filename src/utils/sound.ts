/**
 * Tiny WebAudio synth — no audio assets needed. Generates short tones for
 * correct / incorrect / complete events. Lazily creates the AudioContext on
 * first use so we respect browser autoplay policies (first sound fires after a
 * user gesture, which gameplay guarantees).
 */
type SoundName = 'correct' | 'incorrect' | 'complete';

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

interface Tone {
  freq: number;
  duration: number;
  type: OscillatorType;
  /** Start offset in seconds for layered notes. */
  delay?: number;
}

const RECIPES: Record<SoundName, Tone[]> = {
  correct: [{ freq: 660, duration: 0.09, type: 'sine' }],
  incorrect: [{ freq: 180, duration: 0.18, type: 'sawtooth' }],
  complete: [
    { freq: 523.25, duration: 0.12, type: 'sine', delay: 0 },
    { freq: 659.25, duration: 0.12, type: 'sine', delay: 0.1 },
    { freq: 783.99, duration: 0.2, type: 'sine', delay: 0.2 },
  ],
};

export function playSound(name: SoundName, volume: number): void {
  const ac = context();
  if (!ac || volume <= 0) return;
  if (ac.state === 'suspended') void ac.resume();

  const now = ac.currentTime;
  for (const tone of RECIPES[name]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const start = now + (tone.delay ?? 0);
    const peak = Math.min(1, volume) * 0.22;

    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, start);

    // Quick attack, exponential release — soft, clicky envelope.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + tone.duration + 0.02);
  }
}
