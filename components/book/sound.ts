/**
 * A soft paper-rustle for page turns, made on the fly with the Web Audio API,
 * so there is no sound file to download. Off unless the visitor turns it on.
 */

const KEY = "ff-book-sound";
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
const listeners = new Set<() => void>();

export function soundOn() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function subscribeSound(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // ignore storage errors
  }
  if (on) prepare();
  listeners.forEach((cb) => cb());
}

function prepare() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    // one second of soft noise, reused for every page
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // brown-ish noise: gentler than white noise, closer to paper
      last = (last + 0.06 * (Math.random() * 2 - 1)) / 1.06;
      data[i] = last * 3.2;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
}

/** One page turn. Each call varies a little, so repeated turns do not sound mechanical. */
export function playPageTurn() {
  if (!soundOn()) return;
  prepare();
  if (!ctx || !noise) return;
  const now = ctx.currentTime;
  const length = 0.32 + Math.random() * 0.12;

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.85 + Math.random() * 0.3;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.7;
  band.frequency.setValueAtTime(900, now);
  band.frequency.linearRampToValueAtTime(2600 + Math.random() * 800, now + length * 0.6);
  band.frequency.linearRampToValueAtTime(1200, now + length);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.05, now + length * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

  src.connect(band).connect(gain).connect(ctx.destination);
  src.start(now, Math.random() * 0.5, length);
}
