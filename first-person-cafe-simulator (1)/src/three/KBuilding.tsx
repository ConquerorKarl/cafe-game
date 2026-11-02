import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import "@react-three/fiber";
import { addPlatform, addRoof, addStairs, useInteractable } from "@/game/registry";
import { NightLight, NightMaterial, Person, PersonLow, SolidBox, TextPlane } from "./primitives";
import { facade, tex } from "./textures";
import type { CustomerColors, Outfit } from "@/game/types";

const RES_SHIRTS = ["#e06c75", "#61afef", "#98c379", "#e5c07b", "#c678dd", "#56b6c2", "#f5f6fa", "#2d3436"];
const RES_SKINS = ["#f6d7b0", "#f1c27d", "#e8b98a", "#ffdbac", "#e0ac69"];
const RES_HAIRS = ["#1c1c1c", "#2b1b17", "#4a2c2a", "#8b5a2b"];
const NO_OUTFIT: Outfit = { umbrella: null, scalar: null, beanie: false, mask: false, shortSleeves: false, coat: false } as unknown as Outfit;
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function resColors(r: () => number): CustomerColors {
  return { shirt: RES_SHIRTS[Math.floor(r() * RES_SHIRTS.length)], pants: ["#2f3542", "#3d4a63", "#4b3832"][Math.floor(r() * 3)], skin: RES_SKINS[Math.floor(r() * RES_SKINS.length)], hair: RES_HAIRS[Math.floor(r() * RES_HAIRS.length)] };
}

/** Small apartment balconies on the upper facade, some with residents, laundry and plants. */
export function Balconies({ width, floors, seed, hz, count = 3, startFloor = 2 }: { width: number; floors: number; seed: number; hz: number; count?: number; startFloor?: number }) {
  const items = useMemo(() => {
    const r = seeded(seed * 7 + 3);
    const out: { x: number; floor: number; person: 0 | 1 | 2; laundry: boolean; plant: boolean; light: boolean; colors: CustomerColors }[] = [];
    const slots = Math.max(1, Math.floor((width - 1.5) / 2.2));
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      const slot = Math.floor(r() * slots);
      const floor = startFloor + Math.floor(r() * Math.max(1, floors - startFloor));
      const key = `${slot}:${floor}`;
      if (used.has(key) || floor >= floors) continue;
      used.add(key);
      const pr = r();
      out.push({ x: -width / 2 + 1.1 + slot * ((width - 1.5) / slots) + 0.4, floor, person: pr < 0.4 ? 1 : pr < 0.55 ? 2 : 0, laundry: r() < 0.5, plant: r() < 0.7, light: r() < 0.6, colors: resColors(r) });
    }
    return out;
  }, [width, floors, seed, count, startFloor]);
  return (
    <>
      {items.map((b, i) => {
        const y = b.floor * FLOOR_H;
        return (
          <group key={i} position={[b.x, y, hz + 0.6]}>
            <mesh position={[0, 0.06, 0]} castShadow>
              <boxGeometry args={[1.8, 0.12, 1.2]} />
              <meshStandardMaterial color="#b8b2a8" />
            </mesh>
            <mesh position={[0, 0.6, 0.58]}>
              <boxGeometry args={[1.8, 1.0, 0.04]} />
              <meshStandardMaterial color="#8fa3b5" transparent opacity={0.55} metalness={0.4} roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.1, 0.58]}>
              <boxGeometry args={[1.84, 0.06, 0.06]} />
              <meshStandardMaterial color="#2d3436" />
            </mesh>
            {b.plant && (
              <group position={[-0.65, 0.12, 0.2]}>
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.14, 0.11, 0.3, 8]} />
                  <meshStandardMaterial color="#b5593a" />
                </mesh>
                <mesh position={[0, 0.45, 0]}>
                  <sphereGeometry args={[0.24, 7, 6]} />
                  <meshStandardMaterial color="#3e9a4b" />
                </mesh>
              </group>
            )}
            {b.laundry && (
              <group position={[0.2, 1.9, 0.1]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.012, 0.012, 1.4, 5]} />
                  <meshStandardMaterial color="#555" />
                </mesh>
                {[-0.45, -0.05, 0.4].map((x, j) => (
                  <mesh key={j} position={[x, -0.3, 0]}>
                    <boxGeometry args={[0.28, 0.5, 0.03]} />
                    <meshStandardMaterial color={["#f5f6fa", "#74b9ff", "#ffeaa7"][j]} />
                  </mesh>
                ))}
              </group>
            )}
            {b.person === 1 && (
              <group position={[0.3, 0.12, 0.1]}>
                <PersonLow colors={b.colors} />
              </group>
            )}
            {b.person === 2 && (
              <group position={[0.3, 0.12, 0.1]}>
                <Person colors={b.colors} outfit={NO_OUTFIT} />
              </group>
            )}
            {b.light && (
              <mesh position={[0, 2.3, -0.5]}>
                <boxGeometry args={[0.3, 0.1, 0.3]} />
                <NightMaterial color="#fff6d6" emissive="#ffe3a0" k={2.5} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

export type Facing = "N" | "S" | "E" | "W";
export const facingYaw: Record<Facing, number> = { S: 0, N: Math.PI, W: -Math.PI / 2, E: Math.PI / 2 };

export interface SignDef {
  text: string;
  bg: string;
  color: string;
  floor: number;
  side?: "left" | "right" | "full";
  neon?: boolean;
}

export interface KBuildingProps {
  position: [number, number];
  facing?: Facing;
  width: number;
  depth: number;
  floors: number;
  wall: "brickRed" | "brickGrey" | "brickTan" | "concrete" | "tiles" | "glass";
  wallColor?: string;
  seed?: number;
  shop?: { name: string; kr?: string; bg: string; color: string; glow?: string; neon?: boolean; interior?: string };
  signs?: SignDef[];
  verticalSign?: { text: string; bg: string; color: string; neon?: boolean };
  billboard?: { lines: string[]; bg: string; color: string; neon?: boolean };
  led?: boolean;
  acUnits?: number;
  competitorId?: string;
  lit?: number;
  far?: boolean;
  /** Hollow, enterable ground floor(s). */
  interior?: { floors: 1 | 2; floor?: "wood" | "tiles" | "concrete"; wallColor?: string; children?: ReactNode };
  /** Things visible through the shop window (local space, behind the glass). */
  display?: ReactNode;
  /** Narrow residents' entrance at the right end of the facade. */
  sideDoor?: string;
  /** Cinema-style marquee above the signboard. */
  marquee?: { lines: string[]; bg: string; color: string };
  /** Apartment balconies with residents on the upper floors. */
  balconies?: number;
  /** Rooftop with a resident hanging laundry / a water tank, etc. */
  roofLife?: boolean;
}

export const FLOOR_H = 3.2;

export function KBuilding({ position, facing = "S", width, depth, floors, wall, wallColor = "#cfc8bd", seed = 1, shop, signs = [], verticalSign, billboard, led, acUnits = 2, competitorId, lit = 0.5, far = false, interior, display, sideDoor, marquee, balconies = 0, roofLife = false }: KBuildingProps) {
  const H = floors * FLOOR_H + 0.3;
  const hollowH = interior ? interior.floors * FLOOR_H : 0;
  const upperH = H - Math.max(FLOOR_H, hollowH);
  const upperY = Math.max(FLOOR_H, hollowH);
  const cols = Math.max(2, Math.round(width / 2.4));
  const sideCols = Math.max(1, Math.round(depth / 2.4));
  const rows = Math.max(1, Math.round(upperH / FLOOR_H));
  const front = useMemo(() => facade(cols, rows, seed, wallColor, lit), [cols, rows, seed, wallColor, lit]);
  const side = useMemo(() => facade(sideCols, rows, seed + 3, wallColor, lit * 0.8), [sideCols, rows, seed, wallColor, lit]);
  const wallMap =
    wall === "brickRed" ? tex.brickRed(width / 2.2, H / 2.2) : wall === "brickGrey" ? tex.brickGrey(width / 2.2, H / 2.2) : wall === "brickTan" ? tex.brickTan(width / 2.2, H / 2.2) : wall === "tiles" ? tex.tiles(width / 2, H / 2, wallColor) : wall === "glass" ? tex.glass(width / 3, H / 3) : tex.concrete(width / 3, H / 3, wallColor);
  const bodyColor = wall === "concrete" || wall === "tiles" || wall === "glass" ? "#ffffff" : wallColor;

  const ref = useRef<THREE.Group>(null!);
  const target = useMemo(() => (competitorId ? { kind: "competitor" as const, id: competitorId } : null), [competitorId]);
  useInteractable(ref, target);

  const hz = depth / 2;
  const hw = width / 2;
  const glow = shop?.glow ?? "#ffd9a0";
  const yaw = facingYaw[facing];

  useEffect(() => {
    const r = Math.max(hw, hz) + 0.3;
    return addRoof({ minX: position[0] - r, maxX: position[0] + r, minZ: position[1] - r, maxZ: position[1] + r, minY: -100, maxY: 100 });
  }, [position, hw, hz]);

  // register platform / stairs for a 2-floor interior (world coords)
  useEffect(() => {
    if (!interior || interior.floors !== 2) return;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const toWorld = (lx: number, lz: number): [number, number] => [position[0] + lx * c + lz * s, position[1] - lx * s + lz * c];
    const rect = (ax: number, az: number, bx: number, bz: number) => {
      const [x0, z0] = toWorld(ax, az);
      const [x1, z1] = toWorld(bx, bz);
      return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
    };
    const cleanups: (() => void)[] = [];
    // upper platform
    cleanups.push(addPlatform({ ...rect(-hw + 0.3, -hz + 0.3, hw - 0.3, hz - 0.3), y: FLOOR_H }));
    // stairs along the left wall, entrance at the front (+z local), top at the back
    const sx0 = -hw + 0.35;
    const sx1 = -hw + 1.55;
    const sz0 = -hz + 0.4; // top (back)
    const sz1 = -hz + 4.4; // bottom (front side)
    const r = rect(sx0, sz0, sx1, sz1);
    const [, wz0] = toWorld(0, sz0);
    const [, wz1] = toWorld(0, sz1);
    // yAtZ0 corresponds to the world min-z end
    const topAtMinZ = wz0 < wz1;
    cleanups.push(addStairs({ ...r, axis: "z", yAt0: topAtMinZ ? FLOOR_H : 0, yAt1: topAtMinZ ? 0 : FLOOR_H }));
    return () => cleanups.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interior?.floors, position[0], position[1], yaw, hw, hz]);

  const floorMap = interior?.floor === "tiles" ? tex.tiles(width / 1.6, depth / 1.6, "#e9e4d8") : interior?.floor === "concrete" ? tex.concrete(width / 3, depth / 3, "#9e9a94") : tex.wood(width / 2.4, depth / 2.4);
  const intWall = interior?.wallColor ?? "#f1e6d2";

  return (
    <group ref={ref} position={[position[0], 0, position[1]]} rotation={[0, yaw, 0]}>
      {/* main body (hollow ground floor if interior) */}
      {interior ? (
        <>
          <mesh position={[0, hollowH + (H - hollowH) / 2, 0]}>
            <boxGeometry args={[width, H - hollowH, depth]} />
            <meshStandardMaterial color={bodyColor} map={wallMap} />
          </mesh>
          {/* interior shell */}
          <SolidBox position={[0, hollowH / 2, -hz + 0.15]} size={[width, hollowH, 0.3]} color={intWall} roof />
          <SolidBox position={[-hw + 0.15, hollowH / 2, 0]} size={[0.3, hollowH, depth]} color={intWall} />
          <SolidBox position={[hw - 0.15, hollowH / 2, 0]} size={[0.3, hollowH, depth]} color={intWall} />
          {/* front: glass piers + lintel + door opening */}
          <SolidBox position={[-(hw + 0.8) / 2 - 0.0, 1.3, hz - 0.1]} size={[hw - 0.8, 2.6, 0.08]} color="#bfe4f7" transparent opacity={0.3} roughness={0.05} metalness={0.3} />
          <SolidBox position={[(hw + 0.8) / 2, 1.3, hz - 0.1]} size={[hw - 0.8, 2.6, 0.08]} color="#bfe4f7" transparent opacity={0.3} roughness={0.05} metalness={0.3} />
          <SolidBox position={[0, 2.6 + (hollowH - 2.6) / 2, hz - 0.15]} size={[width, hollowH - 2.6, 0.3]} color={intWall} collide={false} />
          <SolidBox position={[-0.8, 1.3, hz - 0.1]} size={[0.1, 2.6, 0.14]} color="#2d3436" />
          <SolidBox position={[0.8, 1.3, hz - 0.1]} size={[0.1, 2.6, 0.14]} color="#2d3436" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
            <planeGeometry args={[width - 0.6, depth - 0.6]} />
            <meshStandardMaterial map={floorMap} roughness={0.75} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, hollowH - 0.02, 0]}>
            <planeGeometry args={[width - 0.6, depth - 0.6]} />
            <meshStandardMaterial color="#f3eee4" />
          </mesh>
          {interior.floors === 2 && (
            <>
              {/* mezzanine slab with stair hole along the left wall */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(-hw + 1.6 + hw - 0.3) / 2, FLOOR_H + 0.02, 0]} receiveShadow>
                <planeGeometry args={[width - 0.3 - 1.9, depth - 0.6]} />
                <meshStandardMaterial map={floorMap} roughness={0.75} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-hw + 0.95, FLOOR_H + 0.02, (-hz + 4.4 + hz - 0.3) / 2]} receiveShadow>
                <planeGeometry args={[1.3, depth - 0.3 - 4.7]} />
                <meshStandardMaterial map={floorMap} roughness={0.75} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, FLOOR_H - 0.26, 0]}>
                <planeGeometry args={[width - 0.6, depth - 0.6]} />
                <meshStandardMaterial color="#f3eee4" />
              </mesh>
              {/* stairs (visual) + guard walls */}
              {Array.from({ length: 10 }).map((_, i) => {
                const t = (i + 0.5) / 10;
                const z = -hz + 4.4 - t * 4;
                const y = t * FLOOR_H;
                return (
                  <mesh key={i} position={[-hw + 0.95, y - 0.16, z]} castShadow>
                    <boxGeometry args={[1.2, 0.32, 0.4]} />
                    <meshStandardMaterial color={i % 2 ? "#9b7a55" : "#8f6f4c"} />
                  </mesh>
                );
              })}
              <SolidBox position={[-hw + 1.55, FLOOR_H / 2 + 0.6, -hz + 0.9 + 1.75]} size={[0.08, FLOOR_H + 1.4, 3.5]} color="#e9e2d6" />
              <SolidBox position={[-hw + 1.55, 1.0, -hz + 0.45]} size={[0.08, 2.4, 0.9]} color="#e9e2d6" />
              <SolidBox position={[-hw + 0.95, FLOOR_H + 0.6, -hz + 4.4]} size={[1.2, 1.2, 0.08]} color="#e9e2d6" />
              <pointLight position={[0, FLOOR_H * 2 - 0.4, 0]} intensity={14} distance={12} decay={2} color="#fff1dc" />
            </>
          )}
          <pointLight position={[0, FLOOR_H - 0.4, 0]} intensity={14} distance={12} decay={2} color="#fff1dc" />
          <group>{interior.children}</group>
        </>
      ) : (
        <SolidBox position={[0, H / 2, 0]} size={[width, H, depth]} color={bodyColor} map={wallMap} roof castShadow={false} receiveShadow={!far} />
      )}

      {/* upper-floor facades with windows */}
      {rows > 0 && upperH > 0.5 && (
        <>
          <mesh position={[0, upperY + upperH / 2, hz + 0.02]}>
            <planeGeometry args={[width - 0.1, upperH - 0.1]} />
            <NightMaterial map={front.map} emissiveMap={front.emissiveMap} k={1.4} emissive="#ffffff" />
          </mesh>
          <mesh position={[-hw - 0.02, upperY + upperH / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[depth - 0.1, upperH - 0.1]} />
            <NightMaterial map={side.map} emissiveMap={side.emissiveMap} k={1.2} emissive="#ffffff" />
          </mesh>
          <mesh position={[hw + 0.02, upperY + upperH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[depth - 0.1, upperH - 0.1]} />
            <NightMaterial map={side.map} emissiveMap={side.emissiveMap} k={1.2} emissive="#ffffff" />
          </mesh>
          {far && (
            <mesh position={[0, upperY + upperH / 2, -hz - 0.02]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[width - 0.1, upperH - 0.1]} />
              <NightMaterial map={front.map} emissiveMap={front.emissiveMap} k={1.4} emissive="#ffffff" />
            </mesh>
          )}
        </>
      )}

      {/* ground-floor shop front (non-enterable) */}
      {shop && !interior && (
        <group position={[0, 0, hz]}>
          <mesh position={[0, 1.45, -0.6]}>
            <planeGeometry args={[width - 0.8, 2.7]} />
            <NightMaterial color={shop.interior ?? "#5a4634"} emissive={glow} k={1.1} />
          </mesh>
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * (width / 4), 0, -0.35]}>
              <mesh position={[0, 0.72, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.05, 12]} />
                <meshStandardMaterial color="#3b2a1e" />
              </mesh>
              <mesh position={[0, 0.36, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
                <meshStandardMaterial color="#222" />
              </mesh>
            </group>
          ))}
          {display && <group position={[0, 0, -0.3]}>{display}</group>}
          <mesh position={[0, 1.45, 0.03]}>
            <planeGeometry args={[width - 0.8, 2.7]} />
            <meshStandardMaterial color="#bfe4f7" transparent opacity={0.28} roughness={0.05} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1.45, 0.02]}>
            <planeGeometry args={[width - 0.5, 2.9]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 1.1, 0.06]}>
            <planeGeometry args={[1.1, 2.2]} />
            <meshStandardMaterial color="#1e272e" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 1.1, 0.07]}>
            <planeGeometry args={[1.0, 2.1]} />
            <NightMaterial color="#9fd3f0" emissive={glow} k={0.8} transparent opacity={0.5} />
          </mesh>
          <mesh position={[0, 0.06, 0.25]}>
            <boxGeometry args={[width - 0.6, 0.12, 0.5]} />
            <meshStandardMaterial color="#9e9a94" />
          </mesh>
        </group>
      )}
      {/* main signboard */}
      {shop && (
        <group position={[0, interior ? 3.0 : 3.0, hz + 0.1]}>
          <mesh>
            <boxGeometry args={[width - 0.2, 1.0, 0.18]} />
            <meshStandardMaterial color="#1e272e" />
          </mesh>
          <TextPlane lines={shop.kr ? [shop.name, shop.kr] : [shop.name]} width={width - 0.4} height={0.86} bg={shop.bg} color={shop.color} lit neon={shop.neon} position={[0, 0, 0.1]} />
          <NightLight position={[0, -0.4, 1.2]} intensity={shop.neon ? 5 : 3} distance={7} color={shop.neon ? shop.color : glow} />
        </group>
      )}

      {sideDoor && (
        <group position={[hw - 0.75, 0, hz + 0.02]}>
          <mesh position={[0, 1.1, 0]}>
            <planeGeometry args={[0.9, 2.2]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 1.1, 0.01]}>
            <planeGeometry args={[0.7, 2.0]} />
            <NightMaterial color="#4a5560" emissive="#ffd9a0" k={0.5} />
          </mesh>
          <mesh position={[0, 1.5, 0.03]}>
            <boxGeometry args={[0.12, 0.3, 0.04]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <TextPlane lines={[sideDoor]} width={0.9} height={0.3} bg="#1e272e" color="#f9ca24" lit position={[0, 2.4, 0.02]} />
          <mesh position={[0, 2.62, 0.08]}>
            <boxGeometry args={[0.3, 0.06, 0.16]} />
            <NightMaterial color="#fff6d6" emissive="#ffe3a0" k={2} />
          </mesh>
        </group>
      )}
      {marquee && (
        <group position={[0, 3.9, hz + 0.9]}>
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[Math.min(width - 0.4, 11), 1.3, 1.8]} />
            <meshStandardMaterial color="#1e272e" />
          </mesh>
          <TextPlane lines={marquee.lines} width={Math.min(width - 0.6, 10.6)} height={1.1} bg={marquee.bg} color={marquee.color} lit position={[0, 0, 0.81]} />
          {Array.from({ length: Math.round(width / 0.8) }).map((_, i) => (
            <mesh key={i} position={[-width / 2 + 0.6 + i * 0.8, -0.7, 0.3]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <NightMaterial color="#fff6d6" emissive={i % 2 ? "#ffd166" : "#ef476f"} k={3} />
            </mesh>
          ))}
          <NightLight position={[0, -1.2, 0.5]} intensity={8} distance={8} color="#ffd166" />
        </group>
      )}
      {balconies > 0 && !far && <Balconies width={width} floors={floors} seed={seed} hz={hz} count={balconies} startFloor={interior ? interior.floors + 1 : 2} />}
      {roofLife && (
        <group position={[0, H + 0.4, 0]}>
          <group position={[-hw + 3.2, 0, hz - 2.2]}>
            <mesh position={[0, 1.0, 0]}>
              <boxGeometry args={[0.05, 2.0, 0.05]} />
              <meshStandardMaterial color="#636e72" />
            </mesh>
            <mesh position={[2.4, 1.0, 0]}>
              <boxGeometry args={[0.05, 2.0, 0.05]} />
              <meshStandardMaterial color="#636e72" />
            </mesh>
            <mesh position={[1.2, 1.9, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 2.4, 5]} />
              <meshStandardMaterial color="#555" />
            </mesh>
            {[0.3, 0.8, 1.3, 1.8].map((x, j) => (
              <mesh key={j} position={[x, 1.55, 0]}>
                <boxGeometry args={[0.32, 0.6, 0.03]} />
                <meshStandardMaterial color={["#f5f6fa", "#fd79a8", "#dfe6e9", "#0984e3"][j]} />
              </mesh>
            ))}
            <group position={[0.9, 0, 0.6]} rotation={[0, Math.PI, 0]}>
              <PersonLow colors={{ shirt: "#f5f6fa", pants: "#636e72", skin: "#f1c27d", hair: "#2b1b17" }} />
            </group>
          </group>
          <group position={[hw - 3.5, 0, -hz + 2.5]}>
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[1.2, 0.8, 0.8]} />
              <meshStandardMaterial color="#8d6e63" />
            </mesh>
            {[-0.35, 0, 0.35].map((x) => (
              <mesh key={x} position={[x, 0.95, 0]}>
                <sphereGeometry args={[0.2, 7, 6]} />
                <meshStandardMaterial color="#3e9a4b" />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* stacked signboards */}
      {signs.map((sg, i) => {
        const y = sg.floor * FLOOR_H - 0.5;
        const w = sg.side === "full" ? width - 0.4 : width / 2 - 0.4;
        const x = sg.side === "left" ? -width / 4 : sg.side === "right" ? width / 4 : 0;
        return (
          <group key={i} position={[x, y, hz + 0.1]}>
            <mesh position={[0, 0, -0.04]}>
              <boxGeometry args={[w + 0.1, 0.9, 0.14]} />
              <meshStandardMaterial color="#1e272e" />
            </mesh>
            <TextPlane lines={[sg.text]} width={w} height={0.78} bg={sg.bg} color={sg.color} lit neon={sg.neon} position={[0, 0, 0.04]} />
          </group>
        );
      })}

      {/* protruding vertical sign */}
      {verticalSign && (
        <group position={[hw + 0.32, Math.min(H * 0.55, 9), hz - 0.6]}>
          <mesh>
            <boxGeometry args={[0.6, 2.6, 0.12]} />
            <meshStandardMaterial color="#1e272e" />
          </mesh>
          <TextPlane lines={verticalSign.text.split("")} width={0.52} height={2.5} bg={verticalSign.bg} color={verticalSign.color} lit neon={verticalSign.neon} position={[0, 0, 0.07]} />
          <TextPlane lines={verticalSign.text.split("")} width={0.52} height={2.5} bg={verticalSign.bg} color={verticalSign.color} lit neon={verticalSign.neon} position={[0, 0, -0.07]} rotation={[0, Math.PI, 0]} />
          <mesh position={[-0.35, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
        </group>
      )}

      {/* rooftop billboard */}
      {billboard && (
        <group position={[0, H + 2.2, hz - 1.2]}>
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[Math.min(width - 0.5, 10) + 0.3, 3.2, 0.15]} />
            <meshStandardMaterial color="#1e272e" />
          </mesh>
          <TextPlane lines={billboard.lines} width={Math.min(width - 0.5, 10)} height={3.0} bg={billboard.bg} color={billboard.color} lit neon={billboard.neon} position={[0, 0, 0]} />
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (Math.min(width - 0.5, 10) / 2 - 0.4), -1.9, -0.3]}>
              <boxGeometry args={[0.15, 1.2, 0.15]} />
              <meshStandardMaterial color="#636e72" />
            </mesh>
          ))}
          <NightLight position={[0, 0, 1.5]} intensity={8} distance={9} color={billboard.color} />
        </group>
      )}

      {/* wall-mounted LED screen */}
      {led && (
        <group position={[0, FLOOR_H * 2.6, hz + 0.3]}>
          <mesh position={[0, 0, -0.15]}>
            <boxGeometry args={[Math.min(width - 1, 7) + 0.3, 4.3, 0.3]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <LedScreen w={Math.min(width - 1, 7)} h={4} />
        </group>
      )}

      {/* AC units */}
      {!far &&
        Array.from({ length: acUnits }).map((_, i) => (
          <group key={i} position={[hw + 0.25, FLOOR_H * (1.5 + i) - 0.3, -hz + 1 + i * 1.6]}>
            <mesh>
              <boxGeometry args={[0.4, 0.6, 0.8]} />
              <meshStandardMaterial color="#d8dde3" roughness={0.6} metalness={0.2} />
            </mesh>
            <mesh position={[0.21, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <circleGeometry args={[0.22, 12]} />
              <meshStandardMaterial color="#636e72" />
            </mesh>
          </group>
        ))}

      {/* rooftop */}
      <mesh position={[0, H + 0.2, 0]}>
        <boxGeometry args={[width + 0.1, 0.4, depth + 0.1]} />
        <meshStandardMaterial color="#8d8680" />
      </mesh>
      {!far && (
        <group position={[-hw + 1.2, H + 0.4, -hz + 1.3]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 1.2, 14]} />
            <meshStandardMaterial color="#e0cf6c" roughness={0.6} />
          </mesh>
        </group>
      )}
      <mesh position={[hw - 1.3, H + 1.2, 0]}>
        <boxGeometry args={[2.0, 2.0, 2.2]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
    </group>
  );
}

/** Animated colourful LED billboard. */
function LedScreen({ w, h }: { w: number; h: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { c, ctx, t };
  }, []);
  useEffect(() => {
    let frame = 0;
    const { c, ctx, t } = texture;
    const draw = () => {
      frame++;
      const hue = (frame * 2) % 360;
      const g = ctx.createLinearGradient(0, 0, c.width, c.height);
      g.addColorStop(0, `hsl(${hue},90%,55%)`);
      g.addColorStop(1, `hsl(${(hue + 90) % 360},90%,45%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 34px 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const msgs = ["HONGDAE", "홍대 걷고싶은 거리", "NEW ALBUM OUT NOW", "1+1 EVENT", "K-POP LIVE"];
      ctx.fillText(msgs[Math.floor(frame / 60) % msgs.length], c.width / 2, c.height / 2);
      t.needsUpdate = true;
    };
    const id = window.setInterval(draw, 300);
    draw();
    return () => window.clearInterval(id);
  }, [texture]);
  useEffect(() => {
    const m = mat.current;
    if (!m) return;
    m.toneMapped = false;
  }, []);
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial ref={mat} map={texture.t} />
    </mesh>
  );
}
