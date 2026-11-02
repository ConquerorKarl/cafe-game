import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import "@react-three/fiber";
import { ITEMS, KITCHEN_LOOKS, ROOF_STYLES, WALL_PAINTS, getMenu, money } from "@/game/constants";
import {
  BACK_DOOR_X,
  BALCONY_DOOR_X,
  CEIL_H,
  CORNER_RECT,
  DOOR_W,
  DOOR_X,
  FLOOR_Y,
  FREEZER,
  KITCHEN,
  TOILET,
  kitchenSlots,
  POINTS,
  RISE,
  STOREY,
  STRIP,
  WALL_T,
  WELL,
  WELL_CORE,
  WELL_DOOR,
  hasWell,
  helixFlights,
  helixLandings,
  wellLevels,
  type Flight,
  type Installed,
  type Landing,
} from "@/game/layout";
import { addCollider, addFloorMesh, addPlatform, addRoof, addStairs, useInteractable } from "@/game/registry";
import { useGame } from "@/game/store";
import type { FloorId, FloorPattern, RoofStyle, WallPaint } from "@/game/types";
import { Boxes, CounterPickups, PlacedItems, PlacementGhost } from "./Items";
import { NightLight, NightMaterial, SolidBox, TextPlane } from "./primitives";
import { facade, tex } from "./textures";

const T = WALL_T;
const BX0 = -6;
const BX1 = 11;
const BZ0 = -10;
const BZ1 = 4;
const FLOORS_TOTAL = 6;
const ROOF_H = STOREY * FLOORS_TOTAL;
const PLASTER = "#f1e6d2";
const BLOCK = "#d9d4c8";

function floorMap(p: FloorPattern, w: number, d: number): THREE.Texture {
  switch (p) {
    case "walnut": return tex.walnut(w / 2.4, d / 2.4);
    case "herringbone": return tex.herringbone(w / 2.5, d / 2.5);
    case "checker": return tex.checker(w / 1.2, d / 1.2);
    case "terrazzo": return tex.terrazzo(w / 3, d / 3);
    case "concrete": return tex.concrete(w / 3, d / 3, "#9a9a98");
    case "whiteTile": return tex.tiles(w / 1.6, d / 1.6, "#eef0f2");
    case "hanok": return tex.hanok(w / 2, d / 2);
    default: return tex.wood(w / 2.4, d / 2.4);
  }
}
const wallHex = (w: WallPaint) => WALL_PAINTS.find((x) => x.id === w)?.hex ?? PLASTER;
function wallMapFor(w: WallPaint, len: number, h: number): THREE.Texture | undefined {
  return w === "exposedBrick" ? tex.brickRed(len / 2.2, h / 2.2) : undefined;
}
function ceilingProps(r: RoofStyle, w: number, d: number): { color: string; map?: THREE.Texture } {
  if (r === "warm") return { color: "#ffffff", map: tex.timber(w / 2, d / 2) };
  if (r === "sky") return { color: "#ffffff", map: tex.skyCeiling(w / 6, d / 6) };
  return { color: ROOF_STYLES.find((x) => x.id === r)?.hex ?? "#f3eee4" };
}

// ---------------------------------------------------------------------------
// Walls with door / window openings
// ---------------------------------------------------------------------------
interface Opening {
  from: number;
  to: number;
  sill?: number;
  height?: number;
}

function Wall({ axis, at, from, to, y = 0, h = CEIL_H, openings = [], color = PLASTER, map, thickness = T }: { axis: "x" | "z"; at: number; from: number; to: number; y?: number; h?: number; openings?: Opening[]; color?: string; map?: THREE.Texture; thickness?: number }) {
  const segs: { a: number; b: number; y0: number; y1: number }[] = [];
  let cursor = from;
  for (const o of [...openings].sort((p, q) => p.from - q.from)) {
    if (o.from > cursor) segs.push({ a: cursor, b: o.from, y0: 0, y1: h });
    const sill = o.sill ?? 0;
    const head = o.height ?? 2.3;
    if (sill > 0) segs.push({ a: o.from, b: o.to, y0: 0, y1: sill });
    if (head < h) segs.push({ a: o.from, b: o.to, y0: head, y1: h });
    cursor = Math.max(cursor, o.to);
  }
  if (cursor < to) segs.push({ a: cursor, b: to, y0: 0, y1: h });
  return (
    <>
      {segs.map((s, i) => {
        const len = s.b - s.a;
        const mid = (s.a + s.b) / 2;
        const hh = s.y1 - s.y0;
        if (len <= 0.001 || hh <= 0.001) return null;
        const pos: [number, number, number] = axis === "x" ? [mid, y + s.y0 + hh / 2, at] : [at, y + s.y0 + hh / 2, mid];
        const size: [number, number, number] = axis === "x" ? [len, hh, thickness] : [thickness, hh, len];
        return <SolidBox key={i} position={pos} size={size} color={color} map={map} collide={s.y0 < 1.5} />;
      })}
    </>
  );
}

/** Glazing for a window/door opening, visible from both sides. */
function Glass({ axis, at, from, to, y = 0, sill = 0.9, height = 2.6, frame = "#2d3436", mullions = 1 }: { axis: "x" | "z"; at: number; from: number; to: number; y?: number; sill?: number; height?: number; frame?: string; mullions?: number }) {
  const len = to - from;
  const h = height - sill;
  const mid = (from + to) / 2;
  const cy = y + sill + h / 2;
  const P = (a: number, yy: number): [number, number, number] => (axis === "x" ? [a, yy, at] : [at, yy, a]);
  const S = (l: number, hh: number, t: number): [number, number, number] => (axis === "x" ? [l, hh, t] : [t, hh, l]);
  return (
    <group>
      <mesh position={P(mid, cy)}>
        <boxGeometry args={S(len, h, 0.04)} />
        <meshStandardMaterial color="#9fd3f0" transparent opacity={0.32} roughness={0.08} metalness={0.3} depthWrite={false} />
      </mesh>
      <mesh position={P(mid, y + sill + 0.03)}>
        <boxGeometry args={S(len + 0.1, 0.08, 0.12)} />
        <meshStandardMaterial color={frame} />
      </mesh>
      <mesh position={P(mid, y + height - 0.03)}>
        <boxGeometry args={S(len + 0.1, 0.08, 0.12)} />
        <meshStandardMaterial color={frame} />
      </mesh>
      <mesh position={P(from + 0.03, cy)}>
        <boxGeometry args={S(0.08, h, 0.12)} />
        <meshStandardMaterial color={frame} />
      </mesh>
      <mesh position={P(to - 0.03, cy)}>
        <boxGeometry args={S(0.08, h, 0.12)} />
        <meshStandardMaterial color={frame} />
      </mesh>
      {Array.from({ length: mullions }).map((_, i) => (
        <mesh key={i} position={P(from + (len * (i + 1)) / (mullions + 1), cy)}>
          <boxGeometry args={S(0.05, h, 0.1)} />
          <meshStandardMaterial color={frame} />
        </mesh>
      ))}
    </group>
  );
}

function DoorFrame({ axis, at, from, to, y = 0, height = 2.2, color = "#3b2a1e" }: { axis: "x" | "z"; at: number; from: number; to: number; y?: number; height?: number; color?: string }) {
  const P = (a: number, yy: number): [number, number, number] => (axis === "x" ? [a, yy, at] : [at, yy, a]);
  const S = (l: number, hh: number, t: number): [number, number, number] => (axis === "x" ? [l, hh, t] : [t, hh, l]);
  return (
    <group>
      <mesh position={P(from - 0.04, y + height / 2)}>
        <boxGeometry args={S(0.08, height, T + 0.06)} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={P(to + 0.04, y + height / 2)}>
        <boxGeometry args={S(0.08, height, T + 0.06)} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={P((from + to) / 2, y + height + 0.04)}>
        <boxGeometry args={S(to - from + 0.16, 0.08, T + 0.06)} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Floor slabs (walkable platform + placement surface) and ceilings
// ---------------------------------------------------------------------------
const PAD = 0.4; // platforms extend under the walls so doorways never have a gap

function Slab({ x0, x1, z0, z1, y, floor, map, color = "#ffffff", thick = 0.3, underside = true, undersideColor = "#f3eee4", undersideMap }: { x0: number; x1: number; z0: number; z1: number; y: number; floor: FloorId; map?: THREE.Texture; color?: string; thick?: number; underside?: boolean; undersideColor?: string; undersideMap?: THREE.Texture }) {
  const ref = useRef<THREE.Mesh>(null!);
  useEffect(() => {
    const cleanups = [addPlatform({ x0: x0 - PAD, x1: x1 + PAD, z0: z0 - PAD, z1: z1 + PAD, y })];
    const m = ref.current;
    if (m) {
      m.userData.floor = floor;
      cleanups.push(addFloorMesh(m));
    }
    return () => cleanups.forEach((f) => f());
  }, [x0, x1, z0, z1, y, floor]);
  return (
    <group>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, y + 0.02, (z0 + z1) / 2]} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={map ?? null} color={color} roughness={0.75} />
      </mesh>
      {underside && Math.abs(y) > 0.5 && (
        <>
          <mesh position={[(x0 + x1) / 2, y - thick / 2 + 0.01, (z0 + z1) / 2]}>
            <boxGeometry args={[x1 - x0, thick, z1 - z0]} />
            <meshStandardMaterial color={undersideMap ? "#ffffff" : undersideColor} map={undersideMap ?? null} roughness={1} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Ceiling({ x0, x1, z0, z1, y, color = "#f3eee4", map }: { x0: number; x1: number; z0: number; z1: number; y: number; color?: string; map?: THREE.Texture }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, y, (z0 + z1) / 2]}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial color={color} map={map ?? null} roughness={1} />
    </mesh>
  );
}

/** Interior paint on a wall face (a thin plane just in front of the structural wall). */
function Paint({ axis, at, from, to, y = 0, h = CEIL_H, paint, flip = false }: { axis: "x" | "z"; at: number; from: number; to: number; y?: number; h?: number; paint: WallPaint; flip?: boolean }) {
  const len = to - from;
  const map = wallMapFor(paint, len, h);
  const rot: [number, number, number] = axis === "x" ? [0, flip ? Math.PI : 0, 0] : [0, flip ? -Math.PI / 2 : Math.PI / 2, 0];
  const pos: [number, number, number] = axis === "x" ? [(from + to) / 2, y + h / 2, at] : [at, y + h / 2, (from + to) / 2];
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[len, h]} />
      <meshStandardMaterial color={map ? "#ffffff" : wallHex(paint)} map={map ?? null} roughness={1} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// The stairwell tower
// ---------------------------------------------------------------------------
const TREAD_A = "#a98467";
const TREAD_B = "#977355";
const RAIL = "#2d3436";

function FlightMesh({ f }: { f: Flight }) {
  const run = f.axis === "x" ? f.x1 - f.x0 : f.z1 - f.z0;
  const steps = 5;
  const L = Math.hypot(run, RISE);
  const ang = Math.atan2(RISE, run);
  const cx = (f.x0 + f.x1) / 2;
  const cz = (f.z0 + f.z1) / 2;
  const lowEnd = f.axis === "x" ? (f.dir === 1 ? f.x0 : f.x1) : f.dir === 1 ? f.z0 : f.z1;
  const slabRot: [number, number, number] = f.axis === "x" ? [0, 0, f.dir * ang] : [f.dir * -ang, 0, 0];
  const slabSize: [number, number, number] = f.axis === "x" ? [L, 0.22, STRIP] : [STRIP, 0.22, L];
  const railOffset = 0.07;
  const railPos = (along: number, yy: number): [number, number, number] => {
    const a = f.axis === "x" ? lowEnd + f.dir * along : cx;
    const z = f.axis === "z" ? lowEnd + f.dir * along : cz;
    const rx = f.railSide === "minX" ? f.x0 + railOffset : f.railSide === "maxX" ? f.x1 - railOffset : a;
    const rz = f.railSide === "minZ" ? f.z0 + railOffset : f.railSide === "maxZ" ? f.z1 - railOffset : z;
    return [rx, yy, rz];
  };
  return (
    <group>
      {/* sloped soffit slab */}
      <mesh position={[cx, (f.lowY + f.highY) / 2 - 0.13, cz]} rotation={slabRot} castShadow receiveShadow>
        <boxGeometry args={slabSize} />
        <meshStandardMaterial color="#cfc8bd" roughness={0.9} />
      </mesh>
      {/* treads */}
      {Array.from({ length: steps }).map((_, i) => {
        const along = (i + 0.5) * (run / steps);
        const top = f.lowY + (RISE * (i + 1)) / steps;
        const a = lowEnd + f.dir * along;
        const pos: [number, number, number] = f.axis === "x" ? [a, top - RISE / steps / 2, cz] : [cx, top - RISE / steps / 2, a];
        const size: [number, number, number] = f.axis === "x" ? [run / steps, RISE / steps, STRIP] : [STRIP, RISE / steps, run / steps];
        return (
          <mesh key={i} position={pos} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={i % 2 ? TREAD_A : TREAD_B} roughness={0.8} />
          </mesh>
        );
      })}
      {/* wall-mounted handrail on the core side */}
      <mesh position={railPos(run / 2, (f.lowY + f.highY) / 2 + 0.95)} rotation={f.axis === "x" ? [0, 0, f.dir * (-Math.PI / 2 + ang)] : [f.dir * (Math.PI / 2 - ang), 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, L, 8]} />
        <meshStandardMaterial color={RAIL} metalness={0.6} roughness={0.4} />
      </mesh>
      {[0.3, run - 0.3].map((along, i) => (
        <mesh key={i} position={railPos(along, f.lowY + (RISE * along) / run + 0.88)}>
          <boxGeometry args={[0.05, 0.14, 0.05]} />
          <meshStandardMaterial color={RAIL} />
        </mesh>
      ))}
    </group>
  );
}

function LandingMesh({ l, solidFrom }: { l: Landing; solidFrom: number | null }) {
  const h = solidFrom !== null ? l.y - solidFrom : 0.25;
  if (h <= 0.001) return null;
  return (
    <mesh position={[(l.x0 + l.x1) / 2, l.y - h / 2, (l.z0 + l.z1) / 2]} castShadow receiveShadow>
      <boxGeometry args={[l.x1 - l.x0, h, l.z1 - l.z0]} />
      <meshStandardMaterial color={l.corner === "A" ? "#9b7a55" : "#cfc8bd"} roughness={0.85} />
    </mesh>
  );
}

function Stairwell({ inst }: { inst: Installed }) {
  const lv = wellLevels(inst);
  const flights = useMemo(() => helixFlights(lv.ks), [lv.ks.join()]);
  const landings = useMemo(() => helixLandings(lv.ks), [lv.ks.join()]);
  const yBottom = STOREY * lv.kmin;
  const yTopLanding = STOREY * (lv.kmax + 1);
  const yTop = yTopLanding + CEIL_H;

  useEffect(() => {
    if (!lv.exists) return;
    const cleanups: (() => void)[] = [];
    for (const f of flights) cleanups.push(addStairs({ x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z1, axis: f.axis, yAt0: f.yAt0, yAt1: f.yAt1 }));
    for (const l of landings) cleanups.push(addPlatform({ x0: l.x0 - PAD, x1: l.x1 + PAD, z0: l.z0 - PAD, z1: l.z1 + PAD, y: l.y }));
    cleanups.push(addPlatform({ ...WELL, y: yBottom }));
    cleanups.push(addRoof({ minX: WELL.x0 - T, maxX: WELL.x1, minZ: WELL.z0 - T, maxZ: WELL.z1 + T, minY: -100, maxY: 100 }));
    // central core column
    cleanups.push(addCollider({ minX: WELL_CORE.x0, maxX: WELL_CORE.x1, minZ: WELL_CORE.z0, maxZ: WELL_CORE.z1, minY: yBottom - 1, maxY: yTop + 1 }));
    // gate at the top landing (west edge of corner A)
    cleanups.push(addCollider({ minX: CORNER_RECT.A.x0 - 0.06, maxX: CORNER_RECT.A.x0 + 0.06, minZ: CORNER_RECT.A.z0, maxZ: CORNER_RECT.A.z1, minY: yTopLanding - 0.2, maxY: yTopLanding + 1.2 }));
    // closet door under the lowest descending flight — the only way into the space under the stairs
    cleanups.push(addCollider({ minX: CORNER_RECT.A.x0, maxX: CORNER_RECT.A.x1, minZ: CORNER_RECT.A.z1 - 0.06, maxZ: CORNER_RECT.A.z1 + 0.06, minY: yBottom - 0.2, maxY: yBottom + 2.4 }));
    return () => cleanups.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lv.ks.join(), flights, landings, yBottom, yTop, yTopLanding]);

  if (!lv.exists) return null;
  const wallMap = tex.concrete(2, 4, BLOCK);
  const x0 = WELL.x0;
  const x1 = WELL.x1;
  const z0 = WELL.z0;
  const z1 = WELL.z1;
  const wallH = yTop - yBottom;
  const wallY = yBottom + wallH / 2;
  const glassBottom = Math.max(yBottom, 0) + 1.0;
  const glassTop = yTop - 0.5;
  const levels = [...lv.ks.map((k) => k), lv.kmax + 1];

  return (
    <group>
      {/* exterior walls: west, back, front piers & spandrels */}
      <SolidBox position={[x0 - T / 2, wallY, (z0 - T + z1 + T) / 2]} size={[T, wallH, z1 - z0 + 2 * T]} color="#ffffff" map={wallMap} />
      <SolidBox position={[(x0 - T + x1) / 2, wallY, z0 - T / 2]} size={[x1 - x0 + T, wallH, T]} color="#ffffff" map={wallMap} />
      <SolidBox position={[x0 - T + 0.35, wallY, z1 + T / 2]} size={[0.7, wallH, T]} color="#ffffff" map={wallMap} />
      <SolidBox position={[x1 - 0.3, wallY, z1 + T / 2]} size={[0.6, wallH, T]} color="#ffffff" map={wallMap} />
      <SolidBox position={[(x0 - T + 0.7 + x1 - 0.6) / 2, (yBottom + glassBottom) / 2, z1 + T / 2]} size={[x1 - x0 + T - 1.3, glassBottom - yBottom, T]} color="#ffffff" map={wallMap} />
      <SolidBox position={[(x0 - T + 0.7 + x1 - 0.6) / 2, (glassTop + yTop) / 2, z1 + T / 2]} size={[x1 - x0 + T - 1.3, yTop - glassTop, T]} color="#ffffff" map={wallMap} collide={false} />
      {/* the glass front */}
      <SolidBox position={[(x0 - T + 0.7 + x1 - 0.6) / 2, (glassBottom + glassTop) / 2, z1 + T / 2]} size={[x1 - x0 + T - 1.3, glassTop - glassBottom, 0.06]} color="#9fd3f0" transparent opacity={0.3} roughness={0.08} metalness={0.3} castShadow={false} />
      {levels.map((k) => (
        <mesh key={k} position={[(x0 - T + 0.7 + x1 - 0.6) / 2, STOREY * k + 0.95, z1 + T / 2]}>
          <boxGeometry args={[x1 - x0 + T - 1.3, 0.1, T + 0.04]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
      ))}
      <mesh position={[(x0 - T + 0.7 + x1 - 0.6) / 2, (glassBottom + glassTop) / 2, z1 + T / 2]}>
        <boxGeometry args={[0.08, glassTop - glassBottom, T + 0.04]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      {/* roof slab + parapet */}
      <mesh position={[(x0 - T + x1) / 2, yTop + 0.15, (z0 - T + z1 + T) / 2]}>
        <boxGeometry args={[x1 - x0 + T, 0.3, z1 - z0 + 2 * T]} />
        <meshStandardMaterial map={tex.concrete(2, 2, "#8d8680")} />
      </mesh>
      <mesh position={[(x0 - T + x1) / 2, yTop + 0.5, (z0 - T + z1 + T) / 2]}>
        <boxGeometry args={[x1 - x0 + T + 0.1, 0.4, z1 - z0 + 2 * T + 0.1]} />
        <meshStandardMaterial color="#8d8680" />
      </mesh>
      <mesh position={[x0 + 1.2, yTop + 0.9, z0 + 1.0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.4]} />
        <meshStandardMaterial color="#d8dde3" roughness={0.6} metalness={0.2} />
      </mesh>
      <Ceiling x0={x0} x1={x1} z0={z0} z1={z1} y={yTop - 0.02} />
      {/* floor of the well at the lowest level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, yBottom + 0.02, (z0 + z1) / 2]} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={tex.concrete(2, 2, "#b9b3a8")} />
      </mesh>
      {/* central core */}
      <mesh position={[(WELL_CORE.x0 + WELL_CORE.x1) / 2, (yBottom + yTop) / 2, (WELL_CORE.z0 + WELL_CORE.z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[WELL_CORE.x1 - WELL_CORE.x0, yTop - yBottom, WELL_CORE.z1 - WELL_CORE.z0]} />
        <meshStandardMaterial color="#6b4a35" roughness={0.9} />
      </mesh>
      {/* flights & landings */}
      {flights.map((f) => (
        <FlightMesh key={`${f.k}-${f.i}`} f={f} />
      ))}
      {landings.map((l) => (
        <LandingMesh key={l.key} l={l} solidFrom={l.k === lv.kmin && l.corner !== "A" ? yBottom : null} />
      ))}
      {/* solid fill under the lowest flights 2 & 3 */}
      <mesh position={[(WELL.x0 + WELL_CORE.x0) / 2, yBottom + RISE / 2, (WELL_CORE.z0 + WELL_CORE.z1) / 2]}>
        <boxGeometry args={[WELL_CORE.x0 - WELL.x0, RISE, WELL_CORE.z1 - WELL_CORE.z0]} />
        <meshStandardMaterial color="#cfc8bd" />
      </mesh>
      <mesh position={[(WELL_CORE.x0 + WELL_CORE.x1) / 2, yBottom + RISE, (WELL_CORE.z1 + WELL.z1) / 2]}>
        <boxGeometry args={[WELL_CORE.x1 - WELL_CORE.x0, RISE * 2, WELL.z1 - WELL_CORE.z1]} />
        <meshStandardMaterial color="#cfc8bd" />
      </mesh>
      {/* top gate */}
      <group position={[CORNER_RECT.A.x0, yTopLanding, (CORNER_RECT.A.z0 + CORNER_RECT.A.z1) / 2]}>
        {[0.1, 1.1].map((z) => (
          <mesh key={z} position={[0, 0.55, z - 0.6]}>
            <boxGeometry args={[0.05, 1.1, 0.05]} />
            <meshStandardMaterial color={RAIL} />
          </mesh>
        ))}
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.05, 0.06, 1.2]} />
          <meshStandardMaterial color={RAIL} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.02, 0.8, 1.1]} />
          <meshStandardMaterial color="#9fd3f0" transparent opacity={0.35} />
        </mesh>
      </group>
      {/* under-stair closet door at the lowest level */}
      <group position={[(CORNER_RECT.A.x0 + CORNER_RECT.A.x1) / 2, yBottom, CORNER_RECT.A.z1]}>
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[1.1, 2.1, 0.06]} />
          <meshStandardMaterial color="#5c4433" />
        </mesh>
        <mesh position={[0.4, 1.0, 0.05]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
        </mesh>
        <TextPlane lines={["창고"]} width={0.5} height={0.2} bg="#2d3436" color="#ffffff" position={[0, 1.7, 0.04]} />
      </group>
      {/* doors from the rooms, floor plates, lights */}
      {levels.map((k) => {
        const y = STOREY * k;
        const label = k === -1 ? "B1" : `${k + 1}F`;
        return (
          <group key={k}>
            <DoorFrame axis="z" at={x1 + T / 2} from={WELL_DOOR[0]} to={WELL_DOOR[1]} y={y} />
            <TextPlane lines={[label]} width={0.4} height={0.3} bg="#1f2a24" color="#f3e7c9" lit position={[x1 - 0.02, y + 2.5, 0.6]} rotation={[0, -Math.PI / 2, 0]} />
            <TextPlane lines={[`계단 STAIRS ${label}`]} width={0.9} height={0.26} bg="#1f2a24" color="#f3e7c9" position={[x1 + T + 0.02, y + 2.45, 0.6]} rotation={[0, Math.PI / 2, 0]} />
            <pointLight position={[-6.9, y + 2.9, 2.0]} intensity={9} distance={7} decay={2} color="#fff1dc" />
            <mesh position={[x0 + 0.05, y + 2.4, 2.0]}>
              <boxGeometry args={[0.08, 0.25, 0.4]} />
              <NightMaterial color="#fff6d6" emissive="#ffe3a0" k={2} />
            </mesh>
          </group>
        );
      })}
      <NightLight position={[(x0 + x1) / 2, yTop - 0.4, 2]} intensity={6} distance={6} color="#ffe0a8" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Back rooms: bedroom / study, corridor, reserved toilet
// ---------------------------------------------------------------------------
function Bedroom() {
  const bed = useRef<THREE.Group>(null!);
  const desk = useRef<THREE.Group>(null!);
  useInteractable(bed, useMemo(() => ({ kind: "bed" as const }), []));
  useInteractable(desk, useMemo(() => ({ kind: "computer" as const }), []));
  return (
    <group>
      <group ref={bed} position={[POINTS.bed[0], 0, POINTS.bed[2]]}>
        <SolidBox position={[0, 0.25, 0]} size={[1.2, 0.5, 2.0]} color="#6b4a35" />
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[1.14, 0.14, 1.94]} />
          <meshStandardMaterial color="#f5f6fa" />
        </mesh>
        <mesh position={[0, 0.66, 0.2]}>
          <boxGeometry args={[1.14, 0.1, 1.4]} />
          <meshStandardMaterial color="#5f7fbf" roughness={1} />
        </mesh>
        <mesh position={[0, 0.7, -0.75]}>
          <boxGeometry args={[0.6, 0.14, 0.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.8, -1.02]}>
          <boxGeometry args={[1.2, 1.0, 0.06]} />
          <meshStandardMaterial color="#6b4a35" />
        </mesh>
      </group>
      <group ref={desk} position={[POINTS.desk[0], 0, POINTS.desk[2]]}>
        <SolidBox position={[0, 0.38, 0]} size={[1.4, 0.76, 0.7]} color="#a67c52" />
        <mesh position={[0, 1.0, -0.15]} castShadow>
          <boxGeometry args={[0.66, 0.42, 0.04]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
        <mesh position={[0, 1.0, -0.127]}>
          <planeGeometry args={[0.6, 0.36]} />
          <meshStandardMaterial color="#74b9ff" emissive="#4aa3ff" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.7, -0.15]}>
          <boxGeometry args={[0.1, 0.2, 0.08]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
        <mesh position={[0, 0.78, 0.12]}>
          <boxGeometry args={[0.45, 0.03, 0.16]} />
          <meshStandardMaterial color="#dfe6e9" />
        </mesh>
        <mesh position={[0.5, 0.86, 0.0]}>
          <cylinderGeometry args={[0.04, 0.03, 0.1, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <pointLight position={[0, 1.2, 0.3]} intensity={0.8} distance={2.5} color="#74b9ff" />
        <mesh position={[-0.5, 1.05, -0.1]}>
          <coneGeometry args={[0.12, 0.14, 10, 1, true]} />
          <meshStandardMaterial color="#2d3436" side={THREE.DoubleSide} emissive="#ffd9a0" emissiveIntensity={0.4} />
        </mesh>
        <pointLight position={[-0.5, 1.0, 0]} intensity={2.5} distance={3} color="#ffd9a0" />
        <mesh position={[0, 0.45, 0.75]}>
          <boxGeometry args={[0.44, 0.06, 0.44]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
        <mesh position={[0, 0.75, 0.95]}>
          <boxGeometry args={[0.44, 0.5, 0.05]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
      </group>
      {/* bookshelf against the corridor partition */}
      <group position={[-2.35, 0, -7.0]}>
        <SolidBox position={[0, 1.0, 0]} size={[0.4, 2.0, 1.2]} color="#6b4a35" />
        {[0.45, 0.95, 1.45].map((y) =>
          [-0.4, -0.15, 0.1, 0.35].map((z, i) => (
            <mesh key={`${y}${z}`} position={[-0.21, y + 0.17, z]}>
              <boxGeometry args={[0.03, 0.34, 0.2]} />
              <meshStandardMaterial color={["#c0392b", "#2980b9", "#27ae60", "#f39c12"][(i + Math.round(y)) % 4]} />
            </mesh>
          ))
        )}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.0, 0.03, -7.4]} receiveShadow>
        <planeGeometry args={[1.8, 1.6]} />
        <meshStandardMaterial color="#8e6c88" />
      </mesh>
      <mesh position={[-4.0, 1.9, -9.97]}>
        <boxGeometry args={[0.5, 0.7, 0.04]} />
        <meshStandardMaterial color="#3b2a1e" />
      </mesh>
      <mesh position={[-4.0, 1.9, -9.94]}>
        <planeGeometry args={[0.42, 0.6]} />
        <meshStandardMaterial color="#f7b7d2" />
      </mesh>
      <NightLight position={[-4, 2.6, -8]} intensity={6} distance={6} color="#ffd9a0" />
      <TextPlane lines={["🛏️ 침실 · Bedroom & Study"]} width={1.1} height={0.22} bg="#3b2a1e" color="#f3e7c9" position={[-1.9, 2.3, -7.0]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

function ToiletRoom() {
  const { x0, x1, z0, z1, doorFrom, doorTo } = TOILET;
  return (
    <group>
      {/* partition from the extension seating, with a door */}
      <Wall axis="x" at={z1} from={x0} to={x1 + T} openings={[{ from: doorFrom, to: doorTo, height: 2.1 }]} thickness={0.2} />
      <DoorFrame axis="x" at={z1} from={doorFrom} to={doorTo} height={2.1} />
      <mesh position={[doorTo - 0.02, 1.05, z1 + 0.1]} rotation={[0, -1.1, 0]}>
        <boxGeometry args={[0.98, 2.0, 0.05]} />
        <meshStandardMaterial color="#5c4433" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.028, (z0 + z1) / 2]} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={tex.tiles(5, 3, "#dfe6e9")} roughness={0.5} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, 1.2, z0 + 0.02]}>
        <planeGeometry args={[x1 - x0, 2.4]} />
        <meshStandardMaterial map={tex.subway(5, 2.4, "#ffffff", "#c9ced3")} roughness={0.4} />
      </mesh>
      {/* two cubicles + basin */}
      {[x0 + 1.2, x0 + 2.6].map((cx, i) => (
        <group key={i}>
          <SolidBox position={[cx, 0.2, z0 + 0.6]} size={[0.5, 0.4, 0.7]} color="#f5f6fa" />
          <mesh position={[cx, 0.75, z0 + 0.3]}>
            <boxGeometry args={[0.46, 0.7, 0.2]} />
            <meshStandardMaterial color="#f5f6fa" />
          </mesh>
          <Wall axis="z" at={cx + 0.7} from={z0} to={z0 + 1.6} h={2.0} thickness={0.06} color="#b2bec3" />
        </group>
      ))}
      <SolidBox position={[x1 - 1.0, 0.78, z0 + 0.55]} size={[1.0, 0.14, 0.5]} color="#f5f6fa" />
      <mesh position={[x1 - 1.0, 0.4, z0 + 0.55]}>
        <boxGeometry args={[0.16, 0.7, 0.16]} />
        <meshStandardMaterial color="#dfe6e9" />
      </mesh>
      <mesh position={[x1 - 1.0, 1.55, z0 + 0.03]}>
        <planeGeometry args={[0.8, 0.7]} />
        <meshStandardMaterial color="#bfe4f7" metalness={0.6} roughness={0.1} />
      </mesh>
      <mesh position={[x1 - 1.6, 1.0, z0 + 0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#b2bec3" metalness={0.9} roughness={0.2} />
      </mesh>
      <TextPlane lines={["🚻 화장실 RESTROOM"]} width={0.9} height={0.26} bg="#1e8449" color="#ffffff" lit position={[(doorFrom + doorTo) / 2, 2.4, z1 + 0.12]} />
      <pointLight position={[(x0 + x1) / 2, 2.8, (z0 + z1) / 2]} intensity={6} distance={5} color="#ffffff" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Kitchen (rear of the extension unit)
// ---------------------------------------------------------------------------
function KitchenRoom({ look, full }: { look: string; full: boolean }) {
  const { x0, x1, z0, z1, doorFrom, doorTo, passFrom, passTo } = KITCHEN;
  const lk = KITCHEN_LOOKS.find((k) => k.id === look) ?? KITCHEN_LOOKS[0];
  const steel = lk.hex;
  const tileMap = look === "whiteTile" ? tex.subway(4, 2.2, "#ffffff", "#c9ced3") : look === "blackTile" ? tex.subway(4, 2.2, "#1e272e", "#3d4852") : look === "copper" ? tex.tiles(4, 2.2, lk.tile) : tex.tiles(4, 2.2, lk.tile);
  const trim = look === "blackTile" ? "#c9a24d" : look === "copper" ? "#8a5a2b" : "#9aa0a6";
  return (
    <group>
      {/* pass-through window onto the main room: counter-height sill, open above */}
      <Wall axis="x" at={-6 - T / 2} from={x0} to={6} openings={[{ from: passFrom, to: passTo, sill: 1.05, height: 2.3 }]} />
      {/* door from the corridor */}
      <Wall axis="z" at={1.5} from={z0} to={z1} openings={[{ from: doorFrom, to: doorTo, height: 2.1 }]} thickness={0.2} />
      <DoorFrame axis="z" at={1.5} from={doorFrom} to={doorTo} height={2.1} />
      <mesh position={[1.6, 1.05, doorFrom + 0.05]} rotation={[0, 1.0, 0]}>
        <boxGeometry args={[0.98, 2.0, 0.05]} />
        <meshStandardMaterial color="#b2bec3" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[1.6, 1.4, doorFrom + 0.05]} rotation={[0, 1.0, 0]}>
        <planeGeometry args={[0.36, 0.5]} />
        <meshStandardMaterial color="#9fd3f0" transparent opacity={0.5} />
      </mesh>
      {/* the pass counter under the window */}
      <SolidBox position={[(passFrom + passTo) / 2, 0.52, -6]} size={[passTo - passFrom + 0.2, 1.04, 0.8]} color={steel} metalness={0.6} roughness={0.35} />
      <mesh position={[(passFrom + passTo) / 2, 1.06, -6]}>
        <boxGeometry args={[passTo - passFrom + 0.3, 0.05, 0.9]} />
        <meshStandardMaterial color={trim} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* heat lamps over the pass */}
      {[passFrom + 0.6, (passFrom + passTo) / 2, passTo - 0.6].map((x) => (
        <group key={x} position={[x, 2.3, -6.05]}>
          <mesh>
            <coneGeometry args={[0.16, 0.22, 12, 1, true]} />
            <meshStandardMaterial color={trim} side={THREE.DoubleSide} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#ffb366" emissive="#ff8c42" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <pointLight position={[0, -0.2, 0]} intensity={2} distance={2.5} color="#ff9f66" />
        </group>
      ))}
      <mesh position={[(passFrom + passTo) / 2, 2.3, -6.05]}>
        <boxGeometry args={[passTo - passFrom, 0.05, 0.05]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      <TextPlane lines={["PASS · 음식 나오는 곳"]} width={1.4} height={0.26} bg="#1f2a24" color="#f3e7c9" position={[(passFrom + passTo) / 2, 2.45, -6 + T / 2 + 0.17]} />
      {/* tiled floor & walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.028, (z0 + z1) / 2]} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={look === "copper" ? tex.wood(4, 4) : tex.tiles(4, 4, look === "blackTile" ? "#3a3f45" : "#d9dde0")} roughness={0.5} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, 1.2, z0 + 0.02]}>
        <planeGeometry args={[x1 - x0, 2.4]} />
        <meshStandardMaterial map={tileMap} roughness={0.4} />
      </mesh>
      <mesh position={[x1 - 0.02, 1.2, (z0 + z1) / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[z1 - z0, 2.4]} />
        <meshStandardMaterial map={tileMap} roughness={0.4} />
      </mesh>
      <mesh position={[x0 + 0.12, 1.2, (z0 + z1) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[z1 - z0, 2.4]} />
        <meshStandardMaterial map={tileMap} roughness={0.4} />
      </mesh>
      {/* prep counter along the back wall, sink, hood */}
      <SolidBox position={[(x0 + x1) / 2 + 0.2, 0.45, z0 + 0.4]} size={[x1 - x0 - 0.8, 0.9, 0.7]} color={steel} metalness={0.6} roughness={0.35} />
      <mesh position={[x1 - 0.9, 0.86, z0 + 0.4]}>
        <boxGeometry args={[0.55, 0.12, 0.5]} />
        <meshStandardMaterial color="#8a9096" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[x1 - 0.9, 1.15, z0 + 0.25]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
        <meshStandardMaterial color="#b2bec3" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, 2.5, z0 + 0.55]}>
        <boxGeometry args={[x1 - x0 - 1.4, 0.5, 1.0]} />
        <meshStandardMaterial color={steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, 3.0, z0 + 0.4]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={trim} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* shelf with pots & jars */}
      <mesh position={[(x0 + x1) / 2 - 0.3, 1.7, z0 + 0.2]}>
        <boxGeometry args={[2.6, 0.05, 0.35]} />
        <meshStandardMaterial color={steel} metalness={0.6} roughness={0.35} />
      </mesh>
      {[-1.0, -0.6, -0.2, 0.2, 0.6, 1.0].map((dx, i) => (
        <mesh key={i} position={[(x0 + x1) / 2 - 0.3 + dx, 1.85, z0 + 0.2]}>
          <cylinderGeometry args={[0.09, 0.09, i % 2 ? 0.25 : 0.18, 10]} />
          <meshStandardMaterial color={["#dfe6e9", "#e17055", "#dfe6e9", "#fdcb6e", "#b2bec3", "#c0392b"][i]} metalness={i % 2 ? 0 : 0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[x0 + 1.0, 0.93, z0 + 0.4]}>
        <boxGeometry args={[0.5, 0.03, 0.35]} />
        <meshStandardMaterial color="#c9a070" />
      </mesh>
      {/* ticket rail inside the window */}
      <mesh position={[(passFrom + passTo) / 2, 2.05, -6.15]}>
        <boxGeometry args={[passTo - passFrom - 0.4, 0.03, 0.03]} />
        <meshStandardMaterial color="#636e72" />
      </mesh>
      {[0.3, 0.6, 0.9].map((t, i) => (
        <mesh key={i} position={[passFrom + 0.4 + t * 1.8, 1.95, -6.15]}>
          <planeGeometry args={[0.16, 0.2]} />
          <meshStandardMaterial color="#fff8dc" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <TextPlane lines={["주방 KITCHEN", full ? "FULL · 4 SLOTS" : "HALF · 1 SLOT"]} width={0.9} height={0.5} bg="#c0392b" color="#ffffff" lit position={[1.4, 2.4, (doorFrom + doorTo) / 2]} rotation={[0, -Math.PI / 2, 0]} />
      {/* empty appliance slots (steel pedestals) */}
      <SlotPedestals full={full} />
      {/* walk-in freezer (full kitchen) */}
      {full && <FreezerRoom trim={trim} />}
      <pointLight position={[(x0 + x1) / 2, 3.0, (z0 + z1) / 2]} intensity={14} distance={9} decay={2} color="#ffffff" />
    </group>
  );
}

function SlotPedestals({ full }: { full: boolean }) {
  void full;
  const inst = useGame((s) => s.installations);
  const placed = useGame((s) => s.placed);
  const slots = kitchenSlots(inst);
  return (
    <>
      {slots.map(([sx, sz], i) => {
        const occupied = placed.some((p) => ITEMS[p.item].slot && Math.hypot(p.x - sx, p.z - sz) < 0.9);
        return (
          <group key={i} position={[sx, 0, sz]}>
            <mesh position={[0, 0.42, 0]}>
              <boxGeometry args={[0.95, 0.84, 0.75]} />
              <meshStandardMaterial color={occupied ? "#9aa5ad" : "#b8c0c8"} metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.86, 0]}>
              <boxGeometry args={[1.0, 0.05, 0.8]} />
              <meshStandardMaterial color="#2d3436" />
            </mesh>
            {!occupied && (
              <TextPlane lines={["APPLIANCE", "SLOT"]} width={0.7} height={0.4} bg="#1f2a24" color="#f9ca24" lit position={[0, 0.45, 0.38]} />
            )}
          </group>
        );
      })}
    </>
  );
}

function FreezerRoom({ trim: _trim }: { trim: string }) {
  const { x0, x1, z0, z1, doorFrom, doorTo } = FREEZER;
  return (
    <group>
      {/* cold room shell on the kitchen's back-right corner */}
      <Wall axis="z" at={x0} from={z0} to={z1} openings={[]} thickness={0.25} color="#cfe3f2" />
      <Wall axis="x" at={z0} from={x0} to={x1} thickness={0.25} color="#cfe3f2" />
      <Wall axis="x" at={z1} from={x0} to={x1} openings={[{ from: doorFrom, to: doorTo, height: 2.1 }]} thickness={0.25} color="#cfe3f2" />
      <DoorFrame axis="x" at={z1} from={doorFrom} to={doorTo} height={2.1} />
      <mesh position={[doorTo + 0.05, 1.05, z1 + 0.12]} rotation={[0, -1.15, 0]}>
        <boxGeometry args={[0.95, 2.0, 0.06]} />
        <meshStandardMaterial color="#9fc6e8" transparent opacity={0.6} metalness={0.4} roughness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.035, (z0 + z1) / 2]}>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={tex.snow(2, 2)} roughness={1} />
      </mesh>
      {/* frost + compressor unit */}
      <mesh position={[x0 + 0.15, 1.4, z0 + 0.15]}>
        <boxGeometry args={[0.5, 0.7, 0.4]} />
        <meshStandardMaterial color="#eef4fa" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[x0 + 0.15, 1.78, z0 + 0.15]}>
        <circleGeometry args={[0.16, 12]} />
        <meshStandardMaterial color="#74b9ff" emissive="#74b9ff" emissiveIntensity={1.5} />
      </mesh>
      <TextPlane lines={["냉동고 FREEZER", "육류 · 아이스크림"]} width={0.9} height={0.5} bg="#0984e3" color="#ffffff" lit position={[(doorFrom + doorTo) / 2, 2.35, z1 + 0.14]} />
      <pointLight position={[(x0 + x1) / 2, 2.6, (z0 + z1) / 2]} intensity={4} distance={5} color="#bfe4ff" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Upper rooms with windows, balcony, basement
// ---------------------------------------------------------------------------
function UpperRoom({ y, label, balcony, topFloor, wallMap, paint, ceiling }: { y: number; label: string; balcony: boolean; topFloor: boolean; wallMap: THREE.Texture; paint: WallPaint; ceiling: RoofStyle }) {
  const cp = ceilingProps(ceiling, 12, 10);
  const front: Opening[] = [
    { from: -5.4, to: -0.6, sill: 0.9, height: 2.7 },
    { from: 2.6, to: 5.4, sill: 0.9, height: 2.7 },
    balcony ? { from: BALCONY_DOOR_X - 0.6, to: BALCONY_DOOR_X + 0.6, sill: 0, height: 2.3 } : { from: 0.6, to: 2.0, sill: 0.9, height: 2.7 },
  ];
  const west: Opening[] = [{ from: WELL_DOOR[0], to: WELL_DOOR[1], height: 2.2 }, { from: -5.4, to: -2.6, sill: 0.9, height: 2.5 }];
  return (
    <group>
      <Wall axis="x" at={-6 - T / 2} from={-6 - T} to={6 + T} y={y} color={wallHex(paint)} map={wallMapFor(paint, 12, CEIL_H)} />
      <Wall axis="x" at={4 + T / 2} from={-6 - T} to={6 + T} y={y} openings={front} color="#ffffff" map={wallMap} />
      <Wall axis="z" at={-6 - T / 2} from={-6} to={4} y={y} openings={west} color="#ffffff" map={wallMap} />
      <Wall axis="z" at={6 + T / 2} from={-6} to={4} y={y} color={wallHex(paint)} map={wallMapFor(paint, 10, CEIL_H)} />
      <Paint axis="x" at={4 + T / 2 - T / 2 - 0.012} from={-5.98} to={5.98} y={y} paint={paint} flip />
      <Paint axis="z" at={-6 - 0.012} from={-5.98} to={3.98} y={y} paint={paint} />
      {front.map((o, i) =>
        o.sill ? (
          <Glass key={i} axis="x" at={4 + T / 2} from={o.from} to={o.to} y={y} sill={o.sill} height={o.height ?? 2.6} mullions={2} />
        ) : (
          <group key={i}>
            <DoorFrame axis="x" at={4 + T / 2} from={o.from} to={o.to} y={y} height={o.height ?? 2.3} />
            <Glass axis="x" at={4 + T / 2 + 0.17} from={o.to - 0.55} to={o.to - 0.05} y={y} sill={0.1} height={2.2} mullions={0} />
          </group>
        )
      )}
      <Glass axis="z" at={-6 - T / 2} from={-5.4} to={-2.6} y={y} sill={0.9} height={2.5} mullions={1} />
      <DoorFrame axis="z" at={-6 - T / 2} from={WELL_DOOR[0]} to={WELL_DOOR[1]} y={y} />
      {topFloor && <Ceiling x0={-6} x1={6} z0={-6} z1={4} y={y + CEIL_H} color={cp.color} map={cp.map} />}
      <TextPlane lines={[label]} width={2.4} height={0.4} bg="#1f2a24" color="#f3e7c9" position={[0, y + 2.6, -6 + 0.16]} />
      <pointLight position={[-2, y + 3.0, -1]} intensity={14} distance={11} decay={2} color="#fff1dc" />
      <pointLight position={[3, y + 3.0, 2]} intensity={12} distance={11} decay={2} color="#fff1dc" />
    </group>
  );
}

function Balcony() {
  const y = FLOOR_Y[1];
  const x0 = -4.2;
  const x1 = 4.2;
  const z0 = 4.3;
  const z1 = 6.4;
  useEffect(() => {
    const cleanups = [
      addRoof({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, minY: -1, maxY: y - 0.1 }, false),
      addCollider({ minX: x0, maxX: x1, minZ: z1 - 0.05, maxZ: z1 + 0.05, minY: y, maxY: y + 1.2 }),
      addCollider({ minX: x0 - 0.05, maxX: x0 + 0.05, minZ: z0, maxZ: z1, minY: y, maxY: y + 1.2 }),
      addCollider({ minX: x1 - 0.05, maxX: x1 + 0.05, minZ: z0, maxZ: z1, minY: y, maxY: y + 1.2 }),
    ];
    return () => cleanups.forEach((f) => f());
  }, [y]);
  const posts: [number, number][] = [];
  for (let x = x0; x <= x1 + 0.01; x += 1.2) posts.push([x, z1]);
  for (let z = z0 + 1.05; z < z1; z += 1.05) posts.push([x0, z], [x1, z]);
  return (
    <group>
      <Slab x0={x0} x1={x1} z0={z0} z1={z1} y={y} floor={1} map={tex.paving(3, 1)} thick={0.28} undersideColor={BLOCK} />
      {/* railings */}
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, y + 0.55, z]}>
          <boxGeometry args={[0.06, 1.1, 0.06]} />
          <meshStandardMaterial color={RAIL} />
        </mesh>
      ))}
      <mesh position={[(x0 + x1) / 2, y + 1.08, z1]}>
        <boxGeometry args={[x1 - x0 + 0.06, 0.06, 0.06]} />
        <meshStandardMaterial color={RAIL} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, y + 0.6, z1]}>
        <boxGeometry args={[x1 - x0, 0.9, 0.02]} />
        <meshStandardMaterial color="#9fd3f0" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {[x0, x1].map((x) => (
        <group key={x}>
          <mesh position={[x, y + 1.08, (z0 + z1) / 2]}>
            <boxGeometry args={[0.06, 0.06, z1 - z0]} />
            <meshStandardMaterial color={RAIL} />
          </mesh>
          <mesh position={[x, y + 0.6, (z0 + z1) / 2]}>
            <boxGeometry args={[0.02, 0.9, z1 - z0]} />
            <meshStandardMaterial color="#9fd3f0" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <NightLight position={[0, y + 2.4, 5.2]} intensity={6} distance={6} color="#ffd9a0" />
      <TextPlane lines={["2F 테라스 BALCONY"]} width={1.4} height={0.3} bg="#1f2a24" color="#f3e7c9" lit position={[0, y + 0.0 - 0.14, z1 + 0.01]} />
    </group>
  );
}

function BasementRoom({ style }: { style: { floor: FloorPattern; wall: WallPaint; ceiling: RoofStyle } }) {
  const y = FLOOR_Y[-1];
  const wm = wallMapFor(style.wall, 12, CEIL_H);
  const wc = wm ? "#ffffff" : wallHex(style.wall);
  const cp = ceilingProps(style.ceiling, 12, 10);
  return (
    <group>
      <Slab x0={-6} x1={6} z0={-6} z1={4} y={y} floor={-1} map={floorMap(style.floor, 12, 10)} underside={false} />
      <Wall axis="x" at={-6 - T / 2} from={-6 - T} to={6 + T} y={y} color={wc} map={wm} />
      <Wall axis="x" at={4 + T / 2} from={-6 - T} to={6 + T} y={y} color={wc} map={wm} />
      <Wall axis="z" at={-6 - T / 2} from={-6} to={4} y={y} openings={[{ from: WELL_DOOR[0], to: WELL_DOOR[1], height: 2.2 }]} color={wc} map={wm} />
      <Wall axis="z" at={6 + T / 2} from={-6} to={4} y={y} color={wc} map={wm} />
      <DoorFrame axis="z" at={-6 - T / 2} from={WELL_DOOR[0]} to={WELL_DOOR[1]} y={y} />
      <Ceiling x0={-6} x1={6} z0={-6} z1={4} y={y + CEIL_H} color={cp.color} map={cp.map} />
      <pointLight position={[0, y + 2.9, 0]} intensity={14} distance={11} decay={2} color="#ffd9a0" />
      <TextPlane lines={["B1 · 지하 라운지 LOUNGE"]} width={2.6} height={0.5} bg="#1a1030" color="#ff7bd5" neon position={[0, y + 2.4, -6 + 0.17]} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// The building
// ---------------------------------------------------------------------------
function Dumpster() {
  const ref = useRef<THREE.Group>(null!);
  useInteractable(ref, useMemo(() => ({ kind: "dumpster" as const }), []));
  return (
    <group ref={ref} position={[8.8, 0, -13.5]}>
      <SolidBox position={[0, 0.65, 0]} size={[2.0, 1.3, 1.1]} color="#2e7d32" roughness={0.6} metalness={0.2} />
      <mesh position={[0, 1.36, -0.05]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[2.06, 0.1, 1.2]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.6} metalness={0.2} />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.12, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 0.1, 10]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <TextPlane lines={["폐기물 · WASTE", "가구 · 가전 처분 (20% 고철값)"]} width={1.6} height={0.5} bg="#1b5e20" color="#ffffff" position={[0, 0.7, 0.56]} />
      <mesh position={[0.6, 1.5, 0.1]}>
        <boxGeometry args={[0.5, 0.35, 0.4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function RoofArea() {
  useEffect(() => addRoof({ minX: BX0 - T - 0.1, maxX: BX1 + T + 0.1, minZ: BZ0 - T - 0.1, maxZ: BZ1 + T + 0.1, minY: -100, maxY: 100 }), []);
  return null;
}

function MenuBoards() {
  const prices = useGame((s) => s.prices);
  const placed = useGame((s) => s.placed);
  const lines = useMemo(() => {
    const menu = getMenu({ placed });
    const d = menu.filter((p) => p.station !== "display");
    const f = menu.filter((p) => p.station === "display");
    return [["— DRINKS 음료 —", ...d.map((p) => `${p.name}  ${money(prices[p.id])}`)], ["— BAKERY 베이커리 —", ...f.map((p) => `${p.name}  ${money(prices[p.id])}`)]];
  }, [prices, placed]);
  return (
    <>
      <TextPlane lines={lines[0].length > 1 ? lines[0] : ["— DRINKS 음료 —", "(no espresso machine)"]} width={3.4} height={2.2} bg="#1f2a24" color="#f3e7c9" position={[-3.6, 2.1, -6 - T / 2 + 0.17]} align="left" />
      <TextPlane lines={lines[1].length > 1 ? lines[1] : ["— BAKERY 베이커리 —", "(no display case)"]} width={2.6} height={2.2} bg="#1f2a24" color="#f3e7c9" position={[3.8, 2.1, -6 - T / 2 + 0.17]} align="left" />
    </>
  );
}

export function CafeBuilding() {
  const inst = useGame((s) => s.installations);
  const cafeName = useGame((s) => s.cafeName);
  const style = useGame((s) => s.style);
  const st0 = style.floors["0"];
  const st1 = style.floors["1"];
  const st2 = style.floors["2"];
  const stB = style.floors["-1"];
  const mainFloor = floorMap(st0.floor, 12, 10);
  const extFloor = floorMap(st0.floor, 5, 14);
  const tileTex = tex.tiles(6, 2, "#e9e4d8");
  const extWall = tex.concrete(3, 1.6, BLOCK);
  const brick = tex.brickRed(4, 1.6);
  void brick;
  const facadePaint = WALL_PAINTS.find((w) => w.id === style.facade) ?? WALL_PAINTS[0];
  const facadeMap = style.facade === "exposedBrick" ? tex.brickRed(9, 1.6) : tex.tiles(9, 1.6, facadePaint.hex);
  const ceil0 = ceilingProps(st0.ceiling, 17, 14);
  const ceil1 = ceilingProps(st1.ceiling, 12, 10);

  const hasExt = !!inst.ext_front;
  const hasToilet = !!inst.toilet;
  const hasF2 = !!inst.floor2;
  const hasF3 = !!inst.floor2 && !!inst.floor3;
  const hasBase = !!inst.basement;
  const hasBalcony = hasF2 && !!inst.balcony;
  const hasKitchen = hasExt && !!inst.kitchen;
  const extZ0 = hasToilet ? -7 : -10;
  const well = hasWell(inst);
  const ownedFloors = 1 + (hasF2 ? 1 : 0) + (hasF3 ? 1 : 0);
  const yOwnedTop = STOREY * ownedFloors;
  const aboveRows = FLOORS_TOTAL - ownedFloors;
  const frontFacade = useMemo(() => facade(7, Math.max(1, aboveRows), 41, BLOCK, 0.55), [aboveRows]);
  const sideFacade = useMemo(() => facade(5, Math.max(1, aboveRows), 42, BLOCK, 0.5), [aboveRows]);
  const tenantFacade = useMemo(() => facade(2, Math.max(1, ownedFloors - 1), 43, BLOCK, 0.6), [ownedFloors]);

  const frontOpenings: Opening[] = [
    { from: DOOR_X - DOOR_W / 2, to: DOOR_X + DOOR_W / 2, height: 2.4 },
    { from: -5.2, to: -1.0, sill: 0.9, height: 2.6 },
    { from: 3.2, to: 5.4, sill: 0.9, height: 2.6 },
    ...(hasExt ? [{ from: 6.6, to: 10.6, sill: 0.9, height: 2.6 }] : []),
  ];
  const westOpenings: Opening[] = [
    ...(well ? [{ from: WELL_DOOR[0], to: WELL_DOOR[1], height: 2.2 }] : []),
    { from: -5.2, to: -2.6, sill: 0.9, height: 2.5 },
    { from: -9.4, to: -7.0, sill: 0.9, height: 2.3 },
  ];

  return (
    <group>
      <RoofArea />

      {/* ---------------- ground floor slabs (non-overlapping pieces) ---------------- */}
      <Slab x0={-6} x1={6} z0={-6} z1={4} y={0} floor={0} map={mainFloor} />
      <Slab x0={-6} x1={1.5} z0={-10} z1={-6} y={0} floor={0} map={tileTex} />
      {!hasKitchen && <Slab x0={1.5} x1={6} z0={-10} z1={-6} y={0} floor={0} map={tileTex} />}
      {hasKitchen && <Slab x0={1.5} x1={6} z0={-10} z1={-6} y={0} floor={0} map={tex.tiles(4, 4, "#d9dde0")} />}
      <Slab x0={-6} x1={6} z0={4.45} z1={6.6} y={0} floor={0} map={tex.paving(4, 1)} />
      {hasExt && <Slab x0={6} x1={11} z0={extZ0} z1={4} y={0} floor={0} map={extFloor} />}
      {hasExt && hasToilet && <Slab x0={6} x1={11} z0={-10} z1={-7} y={0} floor={0} map={tex.tiles(5, 3, "#dfe6e9")} />}
      {hasF2 ? null : <Ceiling x0={-6} x1={6} z0={-6} z1={4} y={CEIL_H} color={ceil0.color} map={ceil0.map} />}
      <Ceiling x0={-6} x1={6} z0={-10} z1={-6} y={CEIL_H - 0.005} color={ceil0.color} map={ceil0.map} />
      {hasExt && <Ceiling x0={6} x1={11} z0={-10} z1={4} y={CEIL_H - 0.005} color={ceil0.color} map={ceil0.map} />}

      {/* ---------------- exterior walls (ground floor) ---------------- */}
      <Wall axis="x" at={BZ1 + T / 2} from={BX0 - T} to={BX1 + T} openings={frontOpenings} color="#ffffff" map={facadeMap} />
      <Wall axis="x" at={BZ0 - T / 2} from={BX0 - T} to={BX1 + T} openings={[{ from: BACK_DOOR_X - 0.55, to: BACK_DOOR_X + 0.55, height: 2.1 }]} color="#ffffff" map={extWall} />
      <Wall axis="z" at={BX0 - T / 2} from={BZ0 - T} to={BZ1 + T} openings={westOpenings} color="#ffffff" map={extWall} />
      <Wall axis="z" at={BX1 + T / 2} from={BZ0 - T} to={BZ1 + T} color="#ffffff" map={extWall} />
      {/* glazing */}
      <Glass axis="x" at={BZ1 + T / 2} from={-5.2} to={-1.0} sill={0.9} height={2.6} mullions={2} />
      <Glass axis="x" at={BZ1 + T / 2} from={3.2} to={5.4} sill={0.9} height={2.6} mullions={1} />
      {hasExt && <Glass axis="x" at={BZ1 + T / 2} from={6.6} to={10.6} sill={0.9} height={2.6} mullions={3} />}
      <Glass axis="z" at={BX0 - T / 2} from={-5.2} to={-2.6} sill={0.9} height={2.5} mullions={1} />
      <Glass axis="z" at={BX0 - T / 2} from={-9.4} to={-7.0} sill={0.9} height={2.3} mullions={1} />
      {well && <DoorFrame axis="z" at={BX0 - T / 2} from={WELL_DOOR[0]} to={WELL_DOOR[1]} />}
      {/* front door frame + open glass door */}
      <DoorFrame axis="x" at={BZ1 + T / 2} from={DOOR_X - DOOR_W / 2} to={DOOR_X + DOOR_W / 2} height={2.4} />
      <group position={[DOOR_X + DOOR_W / 2, 0, BZ1 + T + 0.05]} rotation={[0, -Math.PI / 2 + 0.35, 0]}>
        <mesh position={[-DOOR_W / 2 + 0.1, 1.2, 0]}>
          <boxGeometry args={[DOOR_W - 0.2, 2.35, 0.04]} />
          <meshStandardMaterial color="#9fd3f0" transparent opacity={0.4} roughness={0.1} metalness={0.3} />
        </mesh>
      </group>
      {/* back door */}
      <DoorFrame axis="x" at={BZ0 - T / 2} from={BACK_DOOR_X - 0.55} to={BACK_DOOR_X + 0.55} height={2.1} />
      {/* ext unit shutter when not owned */}
      {!hasExt && (
        <group position={[8.5, 1.4, BZ1 + T + 0.01]}>
          <mesh>
            <planeGeometry args={[4.6, 2.6]} />
            <meshStandardMaterial map={tex.shutter()} />
          </mesh>
          <TextPlane lines={["임대문의 FOR RENT", "010-2345-6789"]} width={1.8} height={0.7} bg="#f9ca24" color="#2d2d2d" position={[0, 0.3, 0.02]} />
        </group>
      )}
      {/* signboard & neon */}
      <group position={[0.8, CEIL_H - 0.5, BZ1 + T + 0.06]}>
        <mesh position={[0, 0, -0.07]}>
          <boxGeometry args={[9.2, 1.1, 0.12]} />
          <meshStandardMaterial color="#3b2a1e" />
        </mesh>
        <TextPlane lines={[cafeName]} width={9} height={0.95} bg="#1f2a24" color="#f3e7c9" lit position={[0, 0, 0]} />
      </group>
      {inst.sign && (
        <group position={[0.8, STOREY + 1.0, BZ1 + T + 0.45]}>
          <mesh>
            <boxGeometry args={[8.6, 1.2, 0.1]} />
            <meshStandardMaterial color="#1a1030" />
          </mesh>
          <TextPlane lines={[`☕ ${cafeName} ☕`]} width={8.4} height={1.0} bg="#1a1030" color="#ff7bd5" neon position={[0, 0, 0.06]} />
          <NightLight position={[0, 0, 1.5]} intensity={10} distance={10} color="#ff7bd5" />
        </group>
      )}
      <TextPlane lines={["OPEN · 영업중"]} width={0.9} height={0.3} bg="#c0392b" color="#ffffff" lit position={[3.0, 2.15, BZ1 + T + 0.02]} />

      {/* ---------------- interior walls (ground floor) ---------------- */}
      {/* back wall of the main room: door to the corridor; the kitchen section is drawn by KitchenRoom (pass window) */}
      <Wall axis="x" at={-6 - T / 2} from={-6} to={hasKitchen ? 1.5 : 6} openings={[{ from: BACK_DOOR_X - 0.6, to: BACK_DOOR_X + 0.6, height: 2.2 }]} color={wallHex(st0.wall)} map={wallMapFor(st0.wall, 12, CEIL_H)} />
      <DoorFrame axis="x" at={-6 - T / 2} from={BACK_DOOR_X - 0.6} to={BACK_DOOR_X + 0.6} />
      {/* interior plaster on the back wall's room side */}
      <mesh position={[0, CEIL_H / 2, -6 + 0.16]}>
        <planeGeometry args={[12, CEIL_H]} />
        <meshStandardMaterial color={wallHex(st0.wall)} map={wallMapFor(st0.wall, 12, CEIL_H) ?? null} roughness={1} />
      </mesh>
      <mesh position={[-6 + 0.16, CEIL_H / 2, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, CEIL_H]} />
        <meshStandardMaterial color={wallHex(st0.wall)} roughness={1} />
      </mesh>
      {!hasExt && <Wall axis="z" at={6 + T / 2} from={-10 - T} to={4 + T} color={wallHex(st0.wall)} map={wallMapFor(st0.wall, 14, CEIL_H)} />}
      {hasExt && (
        <>
          <Wall axis="z" at={6} from={-6} to={4} openings={[{ from: -3.4, to: 3.4, height: 2.8 }]} thickness={0.2} color={wallHex(st0.wall)} map={wallMapFor(st0.wall, 10, CEIL_H)} />
          <Wall axis="z" at={6} from={-10} to={-6} thickness={0.2} color={wallHex(st0.wall)} />
        </>
      )}
      {/* paint the main room's west & front interior faces */}
      <Paint axis="z" at={-6 + 0.012} from={-5.98} to={-0.02} paint={st0.wall} />
      <Paint axis="z" at={-6 + 0.012} from={1.22} to={3.98} paint={st0.wall} />
      <Wall axis="z" at={-2} from={-10} to={-6} openings={[{ from: -8.6, to: -7.6, height: 2.1 }]} thickness={0.2} />
      <DoorFrame axis="z" at={-2} from={-8.6} to={-7.6} height={2.1} />
      {!hasKitchen && (
        <>
          <Wall axis="z" at={1.5} from={-10} to={-6} thickness={0.2} />
          {/* reserved: storage behind a closed door until the kitchen is built */}
          <mesh position={[1.5, 1.05, -8.1]}>
            <boxGeometry args={[0.06, 2.1, 1.0]} />
            <meshStandardMaterial color="#5c4433" />
          </mesh>
          <TextPlane lines={["창고 STORAGE", "주방 예정 · future kitchen"]} width={0.9} height={0.5} bg="#636e72" color="#ffffff" position={[1.46, 1.75, -8.1]} rotation={[0, -Math.PI / 2, 0]} />
          <SolidBox position={[4.5, 0.4, -9.3]} size={[1.2, 0.8, 0.9]} color="#c89b63" />
          <SolidBox position={[3.0, 0.3, -9.4]} size={[0.8, 0.6, 0.7]} color="#b5894f" />
        </>
      )}
      {/* utility room dressing (sink/rack/cupboard are placed items) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.25, 0.028, -8]} receiveShadow>
        <planeGeometry args={[3.5, 4]} />
        <meshStandardMaterial map={tex.tiles(3, 4, "#cfd8dc")} roughness={0.5} />
      </mesh>
      {/* south wall tiles, split around the alley door opening (x -0.85..0.25, h 2.1) */}
      <mesh position={[-1.4, 1.2, -9.98]}>
        <planeGeometry args={[1.1, 2.4]} />
        <meshStandardMaterial map={tex.subway(1.1, 2.4, "#eceff1", "#b0bec5")} roughness={0.4} />
      </mesh>
      <mesh position={[0.85, 1.2, -9.98]}>
        <planeGeometry args={[1.2, 2.4]} />
        <meshStandardMaterial map={tex.subway(1.2, 2.4, "#eceff1", "#b0bec5")} roughness={0.4} />
      </mesh>
      <mesh position={[-0.3, 2.25, -9.98]}>
        <planeGeometry args={[1.2, 0.3]} />
        <meshStandardMaterial map={tex.subway(1.2, 0.3, "#eceff1", "#b0bec5")} roughness={0.4} />
      </mesh>
      <TextPlane lines={["유틸리티 UTILITY", "싱크대 · 식기대 · 컵장"]} width={1.8} height={0.5} bg="#455a64" color="#ffffff" lit position={[-0.25, 2.5, -9.83]} />
      <pointLight position={[-0.25, 2.8, -8]} intensity={6} distance={5} color="#ffffff" />
      <MenuBoards />
      <Bedroom />
      {hasExt && hasToilet && <ToiletRoom />}
      {hasExt && !hasToilet && (
        <group>
          <TextPlane lines={["화장실 예정 · future restroom"]} width={1.6} height={0.3} bg="#636e72" color="#ffffff" position={[8.5, 2.2, -9.83]} />
          <SolidBox position={[9.5, 0.4, -9.4]} size={[1.0, 0.8, 0.8]} color="#c89b63" />
        </group>
      )}
      {hasKitchen && <KitchenRoom look={style.kitchen} full={!!inst.kitchen2} />}

      {/* ---------------- stairwell tower, upper floors, basement, balcony ---------------- */}
      <Stairwell inst={inst} />
      {hasF2 && (
        <>
          <Slab x0={-6} x1={6} z0={-6} z1={4} y={FLOOR_Y[1]} floor={1} map={floorMap(st1.floor, 12, 10)} undersideColor={ceil0.color} undersideMap={ceil0.map} />
          <UpperRoom y={FLOOR_Y[1]} label={`2F · ${cafeName}`} balcony={hasBalcony} topFloor={!hasF3} wallMap={extWall} paint={st1.wall} ceiling={st1.ceiling} />
        </>
      )}
      {hasF3 && (
        <>
          <Slab x0={-6} x1={6} z0={-6} z1={4} y={FLOOR_Y[2]} floor={2} map={floorMap(st2.floor, 12, 10)} undersideColor={ceil1.color} undersideMap={ceil1.map} />
          <UpperRoom y={FLOOR_Y[2]} label={`3F · ${cafeName}`} balcony={false} topFloor wallMap={extWall} paint={st2.wall} ceiling={st2.ceiling} />
        </>
      )}
      {hasBalcony && <Balcony />}
      {hasBase && <BasementRoom style={stB} />}

      {/* ---------------- the rest of the apartment block ---------------- */}
      {/* storeys above the ones we own */}
      <mesh position={[(BX0 - T + BX1 + T) / 2, (yOwnedTop + ROOF_H) / 2, (BZ0 - T + BZ1 + T) / 2]} castShadow>
        <boxGeometry args={[BX1 - BX0 + 2 * T, ROOF_H - yOwnedTop, BZ1 - BZ0 + 2 * T]} />
        <meshStandardMaterial map={tex.concrete(6, 6, BLOCK)} />
      </mesh>
      <mesh position={[(BX0 - T + BX1 + T) / 2, (yOwnedTop + ROOF_H) / 2, BZ1 + T + 0.02]}>
        <planeGeometry args={[BX1 - BX0 + 2 * T - 0.1, ROOF_H - yOwnedTop - 0.1]} />
        <NightMaterial map={frontFacade.map} emissiveMap={frontFacade.emissiveMap} k={1.4} emissive="#ffffff" />
      </mesh>
      <mesh position={[BX0 - T - 0.02, (yOwnedTop + ROOF_H) / 2, (BZ0 - T + BZ1 + T) / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[BZ1 - BZ0 + 2 * T - 0.1, ROOF_H - yOwnedTop - 0.1]} />
        <NightMaterial map={sideFacade.map} emissiveMap={sideFacade.emissiveMap} k={1.2} emissive="#ffffff" />
      </mesh>
      {/* other tenants beside / behind our upper rooms */}
      {ownedFloors > 1 && (
        <>
          <mesh position={[(6 + BX1 + T) / 2, (STOREY + yOwnedTop) / 2, (BZ0 - T + BZ1 + T) / 2]} castShadow>
            <boxGeometry args={[BX1 + T - 6, yOwnedTop - STOREY, BZ1 - BZ0 + 2 * T]} />
            <meshStandardMaterial map={tex.concrete(2, 2, BLOCK)} />
          </mesh>
          <mesh position={[(6 + BX1 + T) / 2, (STOREY + yOwnedTop) / 2, BZ1 + T + 0.02]}>
            <planeGeometry args={[BX1 + T - 6 - 0.1, yOwnedTop - STOREY - 0.1]} />
            <NightMaterial map={tenantFacade.map} emissiveMap={tenantFacade.emissiveMap} k={1.4} emissive="#ffffff" />
          </mesh>
          <mesh position={[(BX0 - T + 6) / 2, (STOREY + yOwnedTop) / 2, (BZ0 - T - 6) / 2]}>
            <boxGeometry args={[6 - BX0 + T, yOwnedTop - STOREY, -6 - (BZ0 - T)]} />
            <meshStandardMaterial map={tex.concrete(2, 2, BLOCK)} />
          </mesh>
        </>
      )}
      {/* rooftop */}
      <mesh position={[(BX0 - T + BX1 + T) / 2, ROOF_H + 0.2, (BZ0 - T + BZ1 + T) / 2]}>
        <boxGeometry args={[BX1 - BX0 + 2 * T + 0.1, 0.4, BZ1 - BZ0 + 2 * T + 0.1]} />
        <meshStandardMaterial color="#8d8680" />
      </mesh>
      {[-2, 4].map((x) => (
        <mesh key={x} position={[x, ROOF_H + 1.0, -6]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 1.2, 14]} />
          <meshStandardMaterial color="#e0cf6c" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[9, ROOF_H + 1.3, -3]} castShadow>
        <boxGeometry args={[2.4, 2.2, 2.6]} />
        <meshStandardMaterial color={BLOCK} />
      </mesh>

      {/* side slot between us and the next building: gate at the street when no stairwell yet */}
      {!well && (
        <group>
          <SolidBox position={[(WELL.x0 - T + WELL.x1) / 2, 1.2, BZ1 + T / 2]} size={[WELL.x1 - WELL.x0 + T, 2.4, 0.12]} color="#4a4f55" metalness={0.5} roughness={0.5} />
          <TextPlane lines={["관계자외 출입금지", "STAFF ONLY · 증축 예정 (future stairwell)"]} width={2.4} height={0.7} bg="#2d3436" color="#f9ca24" position={[(WELL.x0 + WELL.x1) / 2, 1.5, BZ1 + T + 0.01]} />
        </group>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(WELL.x0 - T + WELL.x1) / 2, 0.008, (BZ0 + BZ1) / 2]}>
        <planeGeometry args={[WELL.x1 - WELL.x0 + T, BZ1 - BZ0]} />
        <meshStandardMaterial map={tex.concrete(1, 4, "#9e9a94")} />
      </mesh>
      <SolidBox position={[(WELL.x0 - T + WELL.x1) / 2, 1.3, BZ0 - T / 2]} size={[WELL.x1 - WELL.x0 + T, 2.6, T]} color="#9c4a3a" map={brick} />

      {/* ---------------- alley & delivery spot ---------------- */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, 0.005, -12.4]} receiveShadow>
          <planeGeometry args={[18, 4.2]} />
          <meshStandardMaterial map={tex.asphalt(6, 1.5)} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POINTS.delivery[0], 0.012, POINTS.delivery[2]]}>
          <planeGeometry args={[4.2, 2.8]} />
          <meshStandardMaterial color="#f1c40f" transparent opacity={0.55} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POINTS.delivery[0], 0.016, POINTS.delivery[2]]}>
          <planeGeometry args={[3.8, 2.4]} />
          <meshStandardMaterial map={tex.asphalt(2, 1.2)} />
        </mesh>
        <TextPlane lines={["📦 배달 · DELIVERY", `${cafeName}`]} width={3.2} height={0.9} bg="#f1c40f" color="#2d2d2d" position={[POINTS.delivery[0], 1.6, -14.33]} />
        <SolidBox position={[BX0 - T / 2, 1.3, -12.4]} size={[T, 2.6, 4.4]} color="#9c4a3a" map={brick} />
        <SolidBox position={[BX1 + T / 2, 1.3, -12.4]} size={[T, 2.6, 4.4]} color="#9c4a3a" map={brick} />
        <SolidBox position={[2.5, 1.3, -14.5 - T / 2]} size={[18, 2.6, T]} color="#9c4a3a" map={tex.brickRed(8, 1.2)} />
        <TextPlane lines={["배달 전용 출입구", "DELIVERY ENTRANCE"]} width={1.6} height={0.6} bg="#2d3436" color="#f9ca24" position={[BX1 + 0.1, 1.6, -12.4]} rotation={[0, -Math.PI / 2, 0]} />
        <TextPlane lines={["← 매장 STAFF ONLY"]} width={1.1} height={0.26} bg="#2d3436" color="#ffffff" position={[BACK_DOOR_X + 1.3, 2.0, BZ0 - T - 0.02]} rotation={[0, Math.PI, 0]} />
        <Dumpster />
        <SolidBox position={[-4, 0.6, -13.5]} size={[1.2, 1.2, 0.8]} color="#636e72" />
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-2.5 + i * 0.5, 0.25, -13.7]}>
            <cylinderGeometry args={[0.18, 0.18, 0.5, 10]} />
            <meshStandardMaterial color={["#0984e3", "#0984e3", "#e17055"][i]} />
          </mesh>
        ))}
        <NightLight position={[2, 3.2, -12]} intensity={12} distance={9} color="#ffe0a8" />
        <mesh position={[BACK_DOOR_X, 2.5, BZ0 - T - 0.2]}>
          <boxGeometry args={[0.3, 0.12, 0.3]} />
          <NightMaterial color="#fff6d6" emissive="#ffe3a0" k={3} />
        </mesh>
      </group>

      {/* interior lights */}
      <pointLight position={[-2.5, 3.0, -3.0]} intensity={16} distance={12} decay={2} color="#fff1dc" />
      <pointLight position={[2.5, 3.0, 1.5]} intensity={16} distance={12} decay={2} color="#fff1dc" />
      {hasExt && <pointLight position={[8.5, 3.0, -2]} intensity={16} distance={12} decay={2} color="#fff1dc" />}
      <pointLight position={[-0.3, 2.9, -8]} intensity={6} distance={6} decay={2} color="#fff1dc" />

      <PlacedItems />
      <CounterPickups />
      <Boxes />
      <PlacementGhost />
    </group>
  );
}

export const cafeBuildingBounds = { BX0, BX1, BZ0, BZ1 };
