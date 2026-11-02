// Tiny procedural sound effects + weather ambience (no assets needed).
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, slide?: number) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + when;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// ---------------------------------------------------------------------------
// Ambience bus: everything environmental (rain, wind, thunder) goes through a
// low-pass filter + gain that we pull down when the player is indoors.
// ---------------------------------------------------------------------------
let bus: { gain: GainNode; filter: BiquadFilterNode; thunderFilter: BiquadFilterNode; thunderGain: GainNode } | null = null;
let indoorLevel = 0;

function getBus(c: AudioContext) {
  if (bus) return bus;
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 18000;
  filter.Q.value = 0.4;
  gain.gain.value = 1;
  filter.connect(gain).connect(c.destination);
  const thunderFilter = c.createBiquadFilter();
  thunderFilter.type = "lowpass";
  thunderFilter.frequency.value = 220;
  const thunderGain = c.createGain();
  thunderGain.gain.value = 1;
  thunderFilter.connect(thunderGain).connect(c.destination);
  bus = { gain, filter, thunderFilter, thunderGain };
  applyIndoor();
  return bus;
}

function applyIndoor() {
  if (!bus || !ctx) return;
  const t = ctx.currentTime;
  const k = indoorLevel;
  // outside: open; inside: muffled through walls and glass
  bus.filter.frequency.setTargetAtTime(18000 * Math.pow(380 / 18000, k), t, 0.35);
  bus.gain.gain.setTargetAtTime(1 - 0.62 * k, t, 0.35);
  bus.thunderFilter.frequency.setTargetAtTime(220 * Math.pow(90 / 220, k), t, 0.35);
  bus.thunderGain.gain.setTargetAtTime(1 - 0.25 * k, t, 0.35);
}

/** 0 = outdoors, 1 = fully indoors. Call whenever the player crosses a threshold. */
export function setIndoor(level: number) {
  const v = Math.max(0, Math.min(1, level));
  if (Math.abs(v - indoorLevel) < 0.01) return;
  indoorLevel = v;
  applyIndoor();
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

export const sfx = {
  ding: () => {
    tone(880, 0.18, "sine", 0.18);
    tone(1320, 0.3, "sine", 0.14, 0.08);
  },
  cash: () => {
    tone(1200, 0.08, "square", 0.05);
    tone(1600, 0.12, "square", 0.05, 0.08);
  },
  buy: () => {
    tone(520, 0.1, "triangle", 0.12);
    tone(780, 0.14, "triangle", 0.12, 0.09);
  },
  pickup: () => tone(600, 0.08, "triangle", 0.1, 0, 900),
  error: () => tone(180, 0.22, "sawtooth", 0.08, 0, 120),
  brew: () => tone(240, 0.5, "sawtooth", 0.03, 0, 300),
  quest: () => {
    tone(660, 0.12, "sine", 0.14);
    tone(880, 0.12, "sine", 0.14, 0.12);
    tone(1320, 0.3, "sine", 0.14, 0.24);
  },
  open: () => tone(400, 0.08, "sine", 0.08, 0, 500),
  ready: () => {
    tone(1047, 0.09, "sine", 0.12);
    tone(1047, 0.09, "sine", 0.12, 0.14);
  },
  step: (hard = false) => {
    const c = getCtx();
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = getNoise(c);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = hard ? 300 : 220;
    const g = c.createGain();
    const t0 = c.currentTime;
    g.gain.setValueAtTime(hard ? 0.05 : 0.028, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
    src.stop(t0 + 0.1);
  },
  season: () => {
    tone(523, 0.2, "sine", 0.12);
    tone(659, 0.2, "sine", 0.12, 0.18);
    tone(784, 0.2, "sine", 0.12, 0.36);
    tone(1047, 0.5, "sine", 0.14, 0.54);
  },
  thunder: (delay = 0) => {
    const c = getCtx();
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = getNoise(c);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 160;
    const g = c.createGain();
    const t0 = c.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    src.connect(f).connect(g).connect(getBus(c).thunderFilter);
    src.start(t0);
    src.stop(t0 + 3.4);
  },
};

// ---------------------------------------------------------------------------
// Weather ambience loop
// ---------------------------------------------------------------------------
type Ambience = "none" | "rain" | "heavy" | "wind";
let ambNodes: { src: AudioBufferSourceNode; gain: GainNode; lfo?: OscillatorNode } | null = null;
let ambCurrent: Ambience = "none";

export function setAmbience(kind: Ambience) {
  if (kind === ambCurrent) return;
  const c = getCtx();
  if (!c) return;
  ambCurrent = kind;
  if (ambNodes) {
    const old = ambNodes;
    old.gain.gain.cancelScheduledValues(c.currentTime);
    old.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.6);
    window.setTimeout(() => {
      try {
        old.src.stop();
        old.lfo?.stop();
      } catch {
        /* ignore */
      }
    }, 2500);
    ambNodes = null;
  }
  if (kind === "none") return;
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  let target = 0.08;
  let lfo: OscillatorNode | undefined;
  if (kind === "rain") {
    f.type = "lowpass";
    f.frequency.value = 1600;
    target = 0.075;
  } else if (kind === "heavy") {
    f.type = "lowpass";
    f.frequency.value = 1000;
    target = 0.17;
  } else {
    f.type = "bandpass";
    f.frequency.value = 320;
    f.Q.value = 0.7;
    target = 0.14;
    lfo = c.createOscillator();
    lfo.frequency.value = 0.18;
    const lg = c.createGain();
    lg.gain.value = 0.06;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
  }
  g.gain.setTargetAtTime(target, c.currentTime, 1.2);
  src.connect(f).connect(g).connect(getBus(c).filter);
  src.start();
  ambNodes = { src, gain: g, lfo };
}
