import { useEffect, type RefObject } from "react";
import type * as THREE from "three";
import type { InteractTarget } from "./types";

// ---------------------------------------------------------------------------
// Collision boxes (world-space, axis aligned, with a vertical range)
// ---------------------------------------------------------------------------
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface Roof extends AABB {
  /** true for enclosed interiors (muffles weather audio); false for awnings/balconies */
  indoor: boolean;
}

export const colliders: AABB[] = [];
export const roofs: Roof[] = [];

export function addCollider(box: AABB): () => void {
  colliders.push(box);
  return () => {
    const i = colliders.indexOf(box);
    if (i >= 0) colliders.splice(i, 1);
  };
}

// Roofs are queried thousands of times per frame by the precipitation system,
// so they live in a coarse spatial grid that is rebuilt lazily when roofs change.
const ROOF_CELL = 12;
let roofGrid = new Map<number, Roof[]>();
let roofsDirty = true;
const cellKey = (cx: number, cz: number) => (cx + 512) * 2048 + (cz + 512);

function rebuildRoofGrid() {
  roofGrid = new Map();
  for (const r of roofs) {
    const cx0 = Math.floor(r.minX / ROOF_CELL);
    const cx1 = Math.floor(r.maxX / ROOF_CELL);
    const cz0 = Math.floor(r.minZ / ROOF_CELL);
    const cz1 = Math.floor(r.maxZ / ROOF_CELL);
    for (let cx = cx0; cx <= cx1; cx++)
      for (let cz = cz0; cz <= cz1; cz++) {
        const k = cellKey(cx, cz);
        const list = roofGrid.get(k);
        if (list) list.push(r);
        else roofGrid.set(k, [r]);
      }
  }
  roofsDirty = false;
}

export function addRoof(box: AABB, indoor = true): () => void {
  const roof: Roof = { ...box, indoor };
  roofs.push(roof);
  roofsDirty = true;
  return () => {
    const i = roofs.indexOf(roof);
    if (i >= 0) roofs.splice(i, 1);
    roofsDirty = true;
  };
}

/** Does a capsule-ish body at (x, z) with feet at y hit anything? */
export function hitsCollider(x: number, z: number, radius: number, y0: number, y1: number): boolean {
  for (const b of colliders) {
    if (b.maxY < y0 || b.minY > y1) continue;
    if (x > b.minX - radius && x < b.maxX + radius && z > b.minZ - radius && z < b.maxZ + radius) return true;
  }
  return false;
}

/** Is (x, z) sheltered? With a height, only roofs spanning that height count. */
export function underRoof(x: number, z: number, y?: number, indoorOnly = false): boolean {
  if (roofsDirty) rebuildRoofGrid();
  const list = roofGrid.get(cellKey(Math.floor(x / ROOF_CELL), Math.floor(z / ROOF_CELL)));
  if (!list) return false;
  for (const b of list) {
    if (indoorOnly && !b.indoor) continue;
    if (x <= b.minX || x >= b.maxX || z <= b.minZ || z >= b.maxZ) continue;
    if (y === undefined || (y <= b.maxY && y >= b.minY)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Walkable platforms & stairs → ground height
// ---------------------------------------------------------------------------
export interface Platform {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}
export interface StairRun {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  axis: "x" | "z";
  /** height at the min-coordinate end / max-coordinate end along `axis` */
  yAt0: number;
  yAt1: number;
}

export const platforms: Platform[] = [];
export const stairRuns: StairRun[] = [];

export function addPlatform(p: Platform): () => void {
  platforms.push(p);
  return () => {
    const i = platforms.indexOf(p);
    if (i >= 0) platforms.splice(i, 1);
  };
}

export function addStairs(s: StairRun): () => void {
  stairRuns.push(s);
  return () => {
    const i = stairRuns.indexOf(s);
    if (i >= 0) stairRuns.splice(i, 1);
  };
}

export function stairHeight(s: StairRun, x: number, z: number): number {
  const t = s.axis === "x" ? (x - s.x0) / (s.x1 - s.x0) : (z - s.z0) / (s.z1 - s.z0);
  const c = Math.max(0, Math.min(1, t));
  return s.yAt0 + (s.yAt1 - s.yAt0) * c;
}

/**
 * Ground height under a body whose feet are at y.
 * The supporting surface is the highest surface not more than `stepUp` above the feet —
 * never a surface overhead (so jumping under a landing can't pull you through it),
 * and never a lower floor while the current one is still under you.
 */
export function groundAt(x: number, z: number, y: number, stepUp = 0.6): number {
  const limit = y + stepUp;
  let best = -Infinity;
  let lowest = Infinity;
  for (const s of stairRuns) {
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    const h = stairHeight(s, x, z);
    if (h <= limit && h > best) best = h;
    if (h < lowest) lowest = h;
  }
  for (const p of platforms) {
    if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
    if (p.y <= limit && p.y > best) best = p.y;
    if (p.y < lowest) lowest = p.y;
  }
  if (best !== -Infinity) return best;
  if (lowest !== Infinity) return lowest;
  return 0;
}

// ---------------------------------------------------------------------------
// Interactables, occluders & placement floors (raycasting)
// ---------------------------------------------------------------------------
export const interactables = new Map<THREE.Object3D, InteractTarget>();
export const occluders: THREE.Object3D[] = [];
export const floorMeshes: THREE.Object3D[] = [];

export function addOccluder(o: THREE.Object3D): () => void {
  o.userData.occluder = true;
  occluders.push(o);
  return () => {
    const i = occluders.indexOf(o);
    if (i >= 0) occluders.splice(i, 1);
  };
}

export function addFloorMesh(o: THREE.Object3D): () => void {
  floorMeshes.push(o);
  return () => {
    const i = floorMeshes.indexOf(o);
    if (i >= 0) floorMeshes.splice(i, 1);
  };
}

export function targetKey(t: InteractTarget | null): string {
  if (!t) return "";
  if (t.kind === "customer") return `customer:${t.id}`;
  if (t.kind === "placed") return `placed:${t.uid}`;
  if (t.kind === "box") return `box:${t.uid}`;
  if (t.kind === "competitor") return `competitor:${t.id}`;
  return t.kind;
}

export function useInteractable(ref: RefObject<THREE.Object3D | null>, target: InteractTarget | null) {
  const key = targetKey(target);
  useEffect(() => {
    const o = ref.current;
    if (!o || !target) return;
    interactables.set(o, target);
    return () => {
      interactables.delete(o);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, key]);
}

export const sameTarget = (a: InteractTarget | null, b: InteractTarget | null) => targetKey(a) === targetKey(b);

// ---------------------------------------------------------------------------
// Day/night driven materials & lights
// ---------------------------------------------------------------------------
export const envState = { night: 0, flash: 0, wet: 0, snow: 0 };

interface NightMat {
  mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
  k: number;
  mode: "emissive" | "basic";
  base: number;
}
export const nightMaterials = new Set<NightMat>();
export function registerNightMaterial(mat: NightMat["mat"], k: number, mode: NightMat["mode"], base = 1): () => void {
  const entry: NightMat = { mat, k, mode, base };
  nightMaterials.add(entry);
  return () => {
    nightMaterials.delete(entry);
  };
}

export const nightLights = new Set<{ light: THREE.Light; intensity: number }>();
export function registerNightLight(light: THREE.Light, intensity: number): () => void {
  const entry = { light, intensity };
  nightLights.add(entry);
  return () => {
    nightLights.delete(entry);
  };
}

// ---------------------------------------------------------------------------
// Keyboard & pointer lock
// ---------------------------------------------------------------------------
export const keys = new Set<string>();

let lockElement: HTMLElement | null = null;
let fallbackTimer: number | null = null;
export const lockState = { everLocked: false, dragLook: false };
export const FALLBACK_EVENT = "cafe-drag-look";

export function setLockElement(el: HTMLElement | null) {
  lockElement = el;
}

export function onLockFailure() {
  if (lockState.everLocked) return;
  lockState.dragLook = true;
  window.dispatchEvent(new Event(FALLBACK_EVENT));
}

export function lockPointer() {
  if (!lockElement) return;
  if (lockState.dragLook) {
    window.dispatchEvent(new Event(FALLBACK_EVENT));
    return;
  }
  if (document.pointerLockElement === lockElement) return;
  try {
    const p = (lockElement.requestPointerLock as () => Promise<void> | void)();
    if (p && typeof (p as Promise<void>).catch === "function") (p as Promise<void>).catch(() => onLockFailure());
  } catch {
    onLockFailure();
    return;
  }
  if (fallbackTimer) window.clearTimeout(fallbackTimer);
  fallbackTimer = window.setTimeout(() => {
    if (document.pointerLockElement !== lockElement) onLockFailure();
  }, 900);
}

export function unlockPointer() {
  try {
    if (document.pointerLockElement) document.exitPointerLock();
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Mutable per-frame data that should not trigger React renders
// ---------------------------------------------------------------------------
export const simState = {
  clock: 0,
  spawnTimer: 0,
  nextSpawn: 6,
  lastSpawnClock: -100,
  stolenToastTimer: 0,
  playerX: 1.5,
  playerY: 0,
  playerZ: 2.5,
  cursorX: 0,
  cursorY: 0,
  /** 0 = outdoors, 1 = inside a building (smoothed) */
  indoor: 0,
  frame: 0,
};
