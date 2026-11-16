// Original sounds, synthesised live with WebAudio: no audio files, no network.
// The context is created on the first player gesture, so nothing plays before the
// player starts, and M toggles mute. Every function is safe to call before that.
export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = 0) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const start = ctx.currentTime + when;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    } catch {
      // Sound is decoration: never let it break the game.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** Catch chime: pitch climbs with the combo, so a streak sounds like a streak. */
    catch(combo) {
      const base = 520 + Math.min(combo, 5) * 70;
      tone(base, 0.16, 'sine', 0.16);
      tone(base * 1.5, 0.2, 'sine', 0.1, 0.05);
    },
    shard() {
      tone(660, 0.14, 'triangle', 0.16);
      tone(880, 0.14, 'triangle', 0.14, 0.07);
      tone(1320, 0.26, 'triangle', 0.12, 0.14);
    },
    hit() {
      tone(160, 0.3, 'sawtooth', 0.16, 0, 60);
      tone(90, 0.35, 'square', 0.1, 0, 45);
    },
    level() {
      tone(440, 0.12, 'triangle', 0.12);
      tone(587, 0.16, 'triangle', 0.12, 0.09);
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, index) => tone(freq, 0.3, 'triangle', 0.14, index * 0.11));
    },
  };
}
