import * as THREE from "three";

type Draw = (ctx: CanvasRenderingContext2D, S: number, rnd: () => number) => void;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const canvasCache = new Map<string, HTMLCanvasElement>();
const texCache = new Map<string, THREE.CanvasTexture>();

function canvasFor(key: string, size: number, draw: Draw, seed = 1): HTMLCanvasElement {
  let c = canvasCache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size, mulberry32(seed));
  canvasCache.set(key, c);
  return c;
}

function texture(key: string, size: number, draw: Draw, rx = 1, ry = 1, seed = 1): THREE.CanvasTexture {
  const tk = `${key}|${rx}|${ry}`;
  let t = texCache.get(tk);
  if (t) return t;
  t = new THREE.CanvasTexture(canvasFor(key, size, draw, seed));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(tk, t);
  return t;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

function noise(ctx: CanvasRenderingContext2D, S: number, rnd: () => number, count: number, alpha: number, light = true, dark = true) {
  for (let i = 0; i < count; i++) {
    const v = Math.floor(rnd() * 255);
    if ((!light && v > 127) || (!dark && v <= 127)) continue;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

const DRAW = {
  brick:
    (base: string, mortar: string): Draw =>
    (ctx, S, rnd) => {
      ctx.fillStyle = mortar;
      ctx.fillRect(0, 0, S, S);
      const bw = S / 8;
      const bh = S / 16;
      for (let row = 0; row < 16; row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let col = -1; col < 9; col++) {
          ctx.fillStyle = shade(base, Math.floor((rnd() - 0.5) * 36));
          ctx.fillRect(col * bw + off + 1.5, row * bh + 1.5, bw - 3, bh - 3);
        }
      }
      noise(ctx, S, rnd, 1500, 0.08);
    },
  paving: ((ctx, S, rnd) => {
    ctx.fillStyle = "#9a938b";
    ctx.fillRect(0, 0, S, S);
    const n = 6;
    const t = S / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const pink = (x + y) % 2 === 0;
        ctx.fillStyle = shade(pink ? "#c9b4a8" : "#bdb5ac", Math.floor((rnd() - 0.5) * 24));
        ctx.fillRect(x * t + 1.5, y * t + 1.5, t - 3, t - 3);
      }
    }
    noise(ctx, S, rnd, 2500, 0.07);
  }) as Draw,
  asphalt: ((ctx, S, rnd) => {
    ctx.fillStyle = "#4a4e55";
    ctx.fillRect(0, 0, S, S);
    noise(ctx, S, rnd, 9000, 0.14);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(rnd() * S, rnd() * S, 6 + rnd() * 20, 2 + rnd() * 6);
    }
  }) as Draw,
  wood: ((ctx, S, rnd) => {
    const planks = 8;
    const h = S / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = shade("#9a6b43", Math.floor((rnd() - 0.5) * 40));
      ctx.fillRect(0, i * h, S, h);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, i * h, S, 2);
      for (let g = 0; g < 14; g++) {
        ctx.fillStyle = `rgba(60,30,10,${0.08 + rnd() * 0.12})`;
        ctx.fillRect(rnd() * S, i * h + rnd() * h, 20 + rnd() * 120, 1);
      }
      const split = rnd() * S;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(split, i * h, 2, h);
    }
  }) as Draw,
  concrete:
    (base: string): Draw =>
    (ctx, S, rnd) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, S, S);
      noise(ctx, S, rnd, 6000, 0.08);
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rnd() * S, rnd() * S);
        ctx.lineTo(rnd() * S, rnd() * S);
        ctx.stroke();
      }
    },
  tiles:
    (base: string): Draw =>
    (ctx, S, rnd) => {
      ctx.fillStyle = shade(base, -40);
      ctx.fillRect(0, 0, S, S);
      const n = 8;
      const t = S / n;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          ctx.fillStyle = shade(base, Math.floor((rnd() - 0.5) * 16));
          ctx.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
        }
    },
  snow: ((ctx, S, rnd) => {
    ctx.fillStyle = "#eef3f8";
    ctx.fillRect(0, 0, S, S);
    noise(ctx, S, rnd, 4000, 0.05, true, false);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = "rgba(200,215,230,0.35)";
      ctx.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 6, 1 + rnd() * 3);
    }
  }) as Draw,
  mural: ((ctx, S, rnd) => {
    ctx.fillStyle = "#1f2a44";
    ctx.fillRect(0, 0, S, S);
    const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#ff9ff3", "#f368e0", "#54a0ff", "#ffffff"];
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      ctx.globalAlpha = 0.65 + rnd() * 0.35;
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 10 + rnd() * 60;
      if (rnd() < 0.5) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillRect(-r / 2, -r / 6, r, r / 3);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 150px 'Trebuchet MS', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#111";
    ctx.strokeText("HONGDAE", S / 2, S * 0.42);
    ctx.fillText("HONGDAE", S / 2, S * 0.42);
    ctx.font = "bold 120px 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";
    ctx.fillStyle = "#feca57";
    ctx.strokeText("홍대 걷고싶은 거리", S / 2, S * 0.66);
    ctx.fillText("홍대 걷고싶은 거리", S / 2, S * 0.66);
  }) as Draw,
};

const DRAW2 = {
  shutter: ((ctx, S, rnd) => {
    ctx.fillStyle = "#8d949b";
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 16) {
      ctx.fillStyle = y % 32 ? "#9aa1a8" : "#7f868d";
      ctx.fillRect(0, y, S, 16);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, y + 14, S, 2);
    }
    noise(ctx, S, rnd, 1500, 0.08);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(120,60,20,${0.15 + rnd() * 0.2})`;
      ctx.fillRect(rnd() * S, rnd() * S, 4 + rnd() * 20, 2 + rnd() * 40);
    }
  }) as Draw,
  glass: ((ctx, S, rnd) => {
    ctx.fillStyle = "#1f2f3f";
    ctx.fillRect(0, 0, S, S);
    const n = 4;
    const t = S / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const g = 0.6 + rnd() * 0.4;
        ctx.fillStyle = `rgb(${Math.floor(60 * g)},${Math.floor(95 * g)},${Math.floor(130 * g)})`;
        ctx.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x * t + 2, y * t + 2, t * 0.4, t - 4);
      }
  }) as Draw,
};

const DRAW3 = {
  walnut: ((ctx, S, rnd) => {
    const planks = 8;
    const h = S / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = shade("#5a3b26", Math.floor((rnd() - 0.5) * 30));
      ctx.fillRect(0, i * h, S, h);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, i * h, S, 2);
      for (let g = 0; g < 12; g++) {
        ctx.fillStyle = `rgba(20,10,5,${0.1 + rnd() * 0.12})`;
        ctx.fillRect(rnd() * S, i * h + rnd() * h, 30 + rnd() * 140, 1);
      }
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(rnd() * S, i * h, 2, h);
    }
  }) as Draw,
  herringbone: ((ctx, S, rnd) => {
    ctx.fillStyle = "#8a6240";
    ctx.fillRect(0, 0, S, S);
    const w = S / 8;
    const l = w * 3;
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.PI / 4);
    for (let y = -S; y < S; y += w) {
      for (let x = -S; x < S; x += l) {
        const even = Math.round(y / w) % 2 === 0;
        ctx.fillStyle = shade("#b08055", Math.floor((rnd() - 0.5) * 40));
        if (even) ctx.fillRect(x + 1, y + 1, l - 2, w - 2);
        else ctx.fillRect(x + l / 2 + 1, y + 1, l - 2, w - 2);
      }
    }
    ctx.restore();
    noise(ctx, S, rnd, 1500, 0.06);
  }) as Draw,
  checker: ((ctx, S) => {
    const n = 4;
    const t = S / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#2b2b2b" : "#e9e9e6";
        ctx.fillRect(x * t, y * t, t, t);
      }
  }) as Draw,
  terrazzo: ((ctx, S, rnd) => {
    ctx.fillStyle = "#e7e0d6";
    ctx.fillRect(0, 0, S, S);
    const chips = ["#c0392b", "#2d3436", "#f39c12", "#7f8c8d", "#d35400", "#95a5a6", "#8e44ad"];
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = chips[Math.floor(rnd() * chips.length)];
      ctx.globalAlpha = 0.55 + rnd() * 0.4;
      ctx.beginPath();
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 2 + rnd() * 7;
      ctx.moveTo(x + r, y);
      for (let k = 1; k < 6; k++) ctx.lineTo(x + Math.cos((k / 6) * Math.PI * 2) * r * (0.6 + rnd() * 0.6), y + Math.sin((k / 6) * Math.PI * 2) * r * (0.6 + rnd() * 0.6));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }) as Draw,
  hanok: ((ctx, S, rnd) => {
    ctx.fillStyle = "#8a8078";
    ctx.fillRect(0, 0, S, S);
    const n = 4;
    const t = S / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = shade("#6f665e", Math.floor((rnd() - 0.5) * 30));
        ctx.fillRect(x * t + 3, y * t + 3, t - 6, t - 6);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x * t + 3, y * t + 3, t - 6, 4);
      }
    noise(ctx, S, rnd, 3000, 0.07);
  }) as Draw,
  skyCeiling: ((ctx, S, rnd) => {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, "#9fd0f0");
    g.addColorStop(1, "#dbeefa");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 14; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(x + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 18, 10 + rnd() * 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }) as Draw,
  timber: ((ctx, S, rnd) => {
    ctx.fillStyle = "#a07d58";
    ctx.fillRect(0, 0, S, S);
    const beams = 4;
    const h = S / beams;
    for (let i = 0; i < beams; i++) {
      ctx.fillStyle = shade("#b8926a", Math.floor((rnd() - 0.5) * 24));
      ctx.fillRect(0, i * h, S, h);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, i * h, S, 6);
      for (let g = 0; g < 10; g++) {
        ctx.fillStyle = `rgba(60,30,10,${0.08 + rnd() * 0.1})`;
        ctx.fillRect(rnd() * S, i * h + rnd() * h, 40 + rnd() * 120, 1);
      }
    }
  }) as Draw,
  subway: ((base: string, grout: string): Draw => (ctx, S, rnd) => {
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, S, S);
    const bw = S / 4;
    const bh = S / 8;
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < 5; col++) {
        ctx.fillStyle = shade(base, Math.floor((rnd() - 0.5) * 10));
        ctx.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, 4);
      }
    }
  }),
};

export const tex = {
  walnut: (rx = 1, ry = 1) => texture("walnut", 256, DRAW3.walnut, rx, ry),
  herringbone: (rx = 1, ry = 1) => texture("herringbone", 256, DRAW3.herringbone, rx, ry),
  checker: (rx = 1, ry = 1) => texture("checker", 256, DRAW3.checker, rx, ry),
  terrazzo: (rx = 1, ry = 1) => texture("terrazzo", 256, DRAW3.terrazzo, rx, ry),
  hanok: (rx = 1, ry = 1) => texture("hanok", 256, DRAW3.hanok, rx, ry),
  skyCeiling: (rx = 1, ry = 1) => texture("sky-ceiling", 256, DRAW3.skyCeiling, rx, ry),
  timber: (rx = 1, ry = 1) => texture("timber", 256, DRAW3.timber, rx, ry),
  subway: (rx = 1, ry = 1, base = "#ffffff", grout = "#c9ced3") => texture(`subway-${base}-${grout}`, 256, DRAW3.subway(base, grout), rx, ry),
  shutter: () => texture("shutter", 256, DRAW2.shutter, 2, 1),
  glass: (rx = 1, ry = 1) => texture("glass", 256, DRAW2.glass, rx, ry),
  brickRed: (rx = 1, ry = 1) => texture("brick-red", 256, DRAW.brick("#9c4a3a", "#cfc5b8"), rx, ry),
  brickGrey: (rx = 1, ry = 1) => texture("brick-grey", 256, DRAW.brick("#8a8580", "#b8b2aa"), rx, ry),
  brickTan: (rx = 1, ry = 1) => texture("brick-tan", 256, DRAW.brick("#c89a6b", "#e5dccf"), rx, ry),
  paving: (rx = 1, ry = 1) => texture("paving", 256, DRAW.paving, rx, ry),
  asphalt: (rx = 1, ry = 1) => texture("asphalt", 256, DRAW.asphalt, rx, ry),
  wood: (rx = 1, ry = 1) => texture("wood", 256, DRAW.wood, rx, ry),
  concrete: (rx = 1, ry = 1, base = "#cfc8bd") => texture(`concrete-${base}`, 256, DRAW.concrete(base), rx, ry),
  tiles: (rx = 1, ry = 1, base = "#e9e4d8") => texture(`tiles-${base}`, 256, DRAW.tiles(base), rx, ry),
  snow: (rx = 1, ry = 1) => texture("snow", 256, DRAW.snow, rx, ry),
  mural: () => texture("mural", 1024, DRAW.mural, 1, 1),
};

// ---------------------------------------------------------------------------
// Building facades with windows (map + emissive map for night)
// ---------------------------------------------------------------------------
export interface Facade {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

const facadeCache = new Map<string, Facade>();

export function facade(cols: number, rows: number, seed: number, wall: string, lit = 0.55): Facade {
  const key = `${cols}x${rows}:${seed}:${wall}:${lit}`;
  const cached = facadeCache.get(key);
  if (cached) return cached;
  const W = 256;
  const H = Math.min(1024, Math.max(64, Math.round((W * rows) / cols)));
  const rnd = mulberry32(seed);
  const mk = (emissive: boolean) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = emissive ? "#000000" : wall;
    ctx.fillRect(0, 0, W, H);
    if (!emissive) {
      for (let i = 0; i < 900; i++) {
        const v = Math.floor(rnd() * 255);
        ctx.fillStyle = `rgba(${v},${v},${v},0.06)`;
        ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
    }
    const cw = W / cols;
    const ch = H / rows;
    const r2 = mulberry32(seed + 7);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const on = r2() < lit;
        const wx = x * cw + cw * 0.22;
        const wy = y * ch + ch * 0.2;
        const ww = cw * 0.56;
        const wh = ch * 0.55;
        if (emissive) {
          if (on) {
            const warm = r2() < 0.75;
            const b = 0.6 + r2() * 0.4;
            ctx.fillStyle = warm ? `rgba(255,${Math.floor(200 * b)},${Math.floor(120 * b)},1)` : `rgba(${Math.floor(190 * b)},${Math.floor(220 * b)},255,1)`;
            ctx.fillRect(wx, wy, ww, wh);
          }
        } else {
          ctx.fillStyle = "#4b5563";
          ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
          ctx.fillStyle = on ? "#aab7c4" : "#6f8196";
          ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fillRect(wx, wy, ww * 0.35, wh);
          ctx.fillStyle = "#4b5563";
          ctx.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
          // sill
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(wx - 6, wy + wh + 3, ww + 12, 4);
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const f = { map: mk(false), emissiveMap: mk(true) };
  facadeCache.set(key, f);
  return f;
}
