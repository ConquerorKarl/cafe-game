import * as THREE from "three";
import { ITEMS, type ItemDef } from "./constants";
import type { FloorId, InstallationId, PlacedItem, Rot, Seat } from "./types";

// ---------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------
export const STOREY = 3.6;
export const FLOOR_Y: Record<FloorId, number> = { [-1]: -STOREY, 0: 0, 1: STOREY, 2: STOREY * 2 };
export const CEIL_H = 3.3;
export const WALL_T = 0.3;

export type Installed = Partial<Record<InstallationId, boolean>>;

export interface Room {
  id: string;
  name: string;
  floor: FloorId;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  requires?: InstallationId;
  placeable: boolean;
  outdoor?: boolean;
}

/** Building footprint: rooms span x -6..11, z -10..4 (walls sit outside these extents). */
export const ROOMS: Room[] = [
  { id: "main", name: "Main room", floor: 0, x0: -6, x1: 6, z0: -6, z1: 4, placeable: true },
  { id: "ext", name: "Front extension", floor: 0, x0: 6, x1: 11, z0: -10, z1: 4, requires: "ext_front", placeable: true },
  { id: "kitchen", name: "Kitchen", floor: 0, x0: 1.5, x1: 6, z0: -10, z1: -6, requires: "kitchen", placeable: true },
  { id: "freezer", name: "Walk-in freezer", floor: 0, x0: 4.6, x1: 6, z0: -10, z1: -8.2, requires: "kitchen2", placeable: true },
  { id: "terrace", name: "Terrace", floor: 0, x0: -6, x1: 6, z0: 4.45, z1: 6.6, placeable: true, outdoor: true },
  { id: "bedroom", name: "Bedroom", floor: 0, x0: -6, x1: -2, z0: -10, z1: -6, placeable: false },
  { id: "utility", name: "Utility room", floor: 0, x0: -2, x1: 1.5, z0: -10, z1: -6, placeable: true },
  { id: "toilet", name: "Toilet", floor: 0, x0: 6, x1: 11, z0: -10, z1: -7, requires: "toilet", placeable: false },
  { id: "floor2", name: "Second floor", floor: 1, x0: -6, x1: 6, z0: -6, z1: 4, requires: "floor2", placeable: true },
  { id: "balcony", name: "Balcony", floor: 1, x0: -4.2, x1: 4.2, z0: 4.3, z1: 6.4, requires: "balcony", placeable: true, outdoor: true },
  { id: "floor3", name: "Third floor", floor: 2, x0: -6, x1: 6, z0: -6, z1: 4, requires: "floor3", placeable: true },
  { id: "basement", name: "Basement", floor: -1, x0: -6, x1: 6, z0: -6, z1: 4, requires: "basement", placeable: true },
];

export const roomOpen = (r: Room, inst: Installed) => !r.requires || !!inst[r.requires];
/** Rooms currently owned; the extension gives up its rear 3 m once the toilet is built. */
export const openRooms = (inst: Installed): Room[] =>
  ROOMS.filter((r) => roomOpen(r, inst)).map((r) => (r.id === "ext" && inst.toilet ? { ...r, z0: -7 } : r));
/** Kitchen: the old storage room behind the main room. Door from the corridor; pass-through window onto the main room. */
export const KITCHEN = { x0: 1.5, x1: 6, z0: -10, z1: -6, doorFrom: -8.6, doorTo: -7.6, passFrom: 2.3, passTo: 5.3 };
/** Walk-in freezer inside the kitchen (full kitchen upgrade). */
export const FREEZER = { x0: 4.6, x1: 6, z0: -10, z1: -8.2, doorFrom: 4.9, doorTo: 5.7 };
/** Prebuilt appliance slots. Half kitchen: 1. Full kitchen: 4. */
export const kitchenSlots = (inst: Installed): [number, number][] =>
  inst.kitchen2 ? [[2.3, -9.45], [3.4, -9.45], [4.5, -9.45], [5.9, -6.55]] : inst.kitchen ? [[2.3, -9.45]] : [];
/** Pass counter under the kitchen window: cooks set finished food here, front-of-house picks it up. */
export const PASS = { x0: 2.3, x1: 5.3, z: -6, kitchenSide: [3.8, 0, -6.75] as [number, number, number], frontSide: [3.8, 0, -5.25] as [number, number, number] };
export const TOILET = { x0: 6, x1: 11, z0: -10, z1: -7, doorFrom: 7.2, doorTo: 8.2 };

// ---------------------------------------------------------------------------
// Key points
// ---------------------------------------------------------------------------
export const DOOR_X = 1.5;
export const DOOR_W = 1.7;
export const BALCONY_DOOR_X = 1.5;
export const BACK_DOOR_X = -0.3;
export const POINTS = {
  doorInside: [DOOR_X, 0, 3.2] as [number, number, number],
  doorOutside: [DOOR_X, 0, 6.9] as [number, number, number],
  sidewalkZ: 7.0,
  browseSpot: [3.2, 0, 7.4] as [number, number, number],
  spawnLeft: [-38, 0, 7.0] as [number, number, number],
  spawnRight: [26, 0, 7.0] as [number, number, number],
  backDoor: [BACK_DOOR_X, 0, -10] as [number, number, number],
  delivery: [2.6, 0, -12.4] as [number, number, number],
  bed: [-5.3, 0, -8.5] as [number, number, number],
  desk: [-3.1, 0, -9.5] as [number, number, number],
  playerStart: [1.5, 0, 1.6] as [number, number, number],
  backRoomDoorIn: [-0.3, 0, -5.4] as [number, number, number],
  backRoomDoorOut: [-0.3, 0, -6.6] as [number, number, number],
  backDoorIn: [-0.3, 0, -9.3] as [number, number, number],
  backDoorOut: [-0.3, 0, -10.8] as [number, number, number],
  alleyWork: [2.6, 0, -11.6] as [number, number, number],
  kitchenDoorOut: [0.9, 0, -8.1] as [number, number, number],
  kitchenDoorIn: [2.2, 0, -8.1] as [number, number, number],
  staffIdle: [[-4.5, 0, -4.6], [3.8, 0, -4.6], [-0.5, 0, -4.2], [5.0, 0, -4.6]] as [number, number, number][],
};

/** Route from anywhere on the ground floor to the alley delivery spot (and back). */
export function routeToAlley(from: THREE.Vector3): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  if (from.z < -6) pts.push(v3(POINTS.backDoorIn));
  else pts.push(v3(POINTS.backRoomDoorIn), v3(POINTS.backRoomDoorOut), v3(POINTS.backDoorIn));
  pts.push(v3(POINTS.backDoorOut), v3(POINTS.alleyWork));
  return pts;
}
export function routeFromAlley(to: THREE.Vector3): THREE.Vector3[] {
  return [v3(POINTS.backDoorOut), v3(POINTS.backDoorIn), v3(POINTS.backRoomDoorOut), v3(POINTS.backRoomDoorIn), to.clone()];
}
/** Route between two ground-floor points, detouring through doors when crossing room boundaries. */
export function routeGround(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const inKitchen = (p: THREE.Vector3) => p.x > KITCHEN.x0 && p.x < KITCHEN.x1 + 0.2 && p.z < KITCHEN.z1 + 0.1;
  const inCorridor = (p: THREE.Vector3) => p.z < -6 && p.x >= -2 && p.x <= 1.5; // utility room
  const inFront = (p: THREE.Vector3) => p.z >= -6 || p.x > 6;
  const pts: THREE.Vector3[] = [];
  const zone = (p: THREE.Vector3) => (inKitchen(p) ? "kitchen" : inCorridor(p) ? "corridor" : inFront(p) ? "front" : "back");
  const a = zone(from);
  const b = zone(to);
  if (a !== b) {
    // leave the current zone into the corridor
    if (a === "kitchen") pts.push(v3(POINTS.kitchenDoorIn), v3(POINTS.kitchenDoorOut));
    else if (a === "front") pts.push(v3(POINTS.backRoomDoorIn), v3(POINTS.backRoomDoorOut));
    // enter the target zone from the corridor
    if (b === "kitchen") pts.push(v3(POINTS.kitchenDoorOut), v3(POINTS.kitchenDoorIn));
    else if (b === "front") pts.push(v3(POINTS.backRoomDoorOut), v3(POINTS.backRoomDoorIn));
  }
  pts.push(to.clone());
  return pts;
}
/** Route between arbitrary floors/points via the stairwell. */
export function routeStaff(from: THREE.Vector3, to: THREE.Vector3, inst: Installed): THREE.Vector3[] {
  const f0 = floorFromY(from.y);
  const f1 = floorFromY(to.y);
  if (f0 === f1) return f0 === 0 ? routeGround(from, to) : [to.clone()];
  const pts = [...routeFromFloor(f0, inst), ...routeToFloor(f1, inst)];
  if (f1 === 0) pts.push(...routeGround(v3(WELL_ENTRY_3), to));
  else pts.push(to.clone());
  return pts;
}
const WELL_ENTRY_3: [number, number, number] = [-5.3, 0, 0.6];

/** Grid positions for delivered boxes in the alley. */
export function deliverySlot(i: number): [number, number] {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return [POINTS.delivery[0] - 1.35 + col * 0.9, POINTS.delivery[2] + 0.6 - (row % 3) * 0.9];
}

// ---------------------------------------------------------------------------
// The stairwell tower — a squared spiral around a central core, bolted onto the
// west side of the building. Four L-turn flights (0.9 m each) per storey.
// ---------------------------------------------------------------------------
export const WELL = { x0: -10.3, x1: -6.3, z0: 0, z1: 4 };
export const WELL_CORE = { x0: -9.1, x1: -7.5, z0: 1.2, z1: 2.8 };
export const STRIP = 1.2;
export const RISE = 0.9;
export const WELL_DOOR: [number, number] = [0, 1.2]; // z-range of the doors from the rooms into the well
export const WELL_ENTRY: [number, number] = [-5.3, 0.6]; // inside the room, in front of the stair door

type CornerId = "A" | "B" | "C" | "D";
export const CORNER_CENTRE: Record<CornerId, [number, number]> = { A: [-6.9, 0.6], B: [-9.7, 0.6], C: [-9.7, 3.4], D: [-6.9, 3.4] };
export const CORNER_RECT: Record<CornerId, Rect> = {
  A: { x0: -7.5, x1: -6.3, z0: 0, z1: 1.2 },
  B: { x0: -10.3, x1: -9.1, z0: 0, z1: 1.2 },
  C: { x0: -10.3, x1: -9.1, z0: 2.8, z1: 4 },
  D: { x0: -7.5, x1: -6.3, z0: 2.8, z1: 4 },
};

export const hasWell = (inst: Installed) => !!(inst.floor2 || inst.basement);

export function wellLevels(inst: Installed): { exists: boolean; ks: number[]; kmin: number; kmax: number } {
  const ks: number[] = [];
  if (inst.basement) ks.push(-1);
  if (inst.floor2) ks.push(0);
  if (inst.floor2 && inst.floor3) ks.push(1);
  if (!ks.length) return { exists: false, ks, kmin: 0, kmax: -1 };
  return { exists: true, ks, kmin: Math.min(...ks), kmax: Math.max(...ks) };
}

export interface Flight {
  k: number;
  i: 1 | 2 | 3 | 4;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  axis: "x" | "z";
  /** height at the min-coordinate end / max-coordinate end along `axis` */
  yAt0: number;
  yAt1: number;
  lowY: number;
  highY: number;
  /** +1 when the flight rises toward the max coordinate */
  dir: 1 | -1;
  /** which side the core is on, as a world-space offset for the handrail */
  railSide: "minX" | "maxX" | "minZ" | "maxZ";
}

/** Flights of loop k: A(k) → B → C → D → A(k+1). */
export function helixFlights(ks: number[]): Flight[] {
  const out: Flight[] = [];
  for (const k of ks) {
    const b = STOREY * k;
    out.push({ k, i: 1, x0: -9.1, x1: -7.5, z0: 0, z1: 1.2, axis: "x", yAt0: b + RISE, yAt1: b, lowY: b, highY: b + RISE, dir: -1, railSide: "maxZ" });
    out.push({ k, i: 2, x0: -10.3, x1: -9.1, z0: 1.2, z1: 2.8, axis: "z", yAt0: b + RISE, yAt1: b + 2 * RISE, lowY: b + RISE, highY: b + 2 * RISE, dir: 1, railSide: "maxX" });
    out.push({ k, i: 3, x0: -9.1, x1: -7.5, z0: 2.8, z1: 4, axis: "x", yAt0: b + 2 * RISE, yAt1: b + 3 * RISE, lowY: b + 2 * RISE, highY: b + 3 * RISE, dir: 1, railSide: "minZ" });
    out.push({ k, i: 4, x0: -7.5, x1: -6.3, z0: 1.2, z1: 2.8, axis: "z", yAt0: b + 4 * RISE, yAt1: b + 3 * RISE, lowY: b + 3 * RISE, highY: b + 4 * RISE, dir: -1, railSide: "minX" });
  }
  return out;
}

export interface Landing extends Rect {
  key: string;
  corner: CornerId;
  k: number;
  y: number;
}

export function helixLandings(ks: number[]): Landing[] {
  const out: Landing[] = [];
  for (const k of ks) {
    out.push({ ...CORNER_RECT.A, key: `A${k}`, corner: "A", k, y: STOREY * k });
    out.push({ ...CORNER_RECT.B, key: `B${k}`, corner: "B", k, y: STOREY * k + RISE });
    out.push({ ...CORNER_RECT.C, key: `C${k}`, corner: "C", k, y: STOREY * k + 2 * RISE });
    out.push({ ...CORNER_RECT.D, key: `D${k}`, corner: "D", k, y: STOREY * k + 3 * RISE });
  }
  const top = Math.max(...ks) + 1;
  out.push({ ...CORNER_RECT.A, key: `A${top}`, corner: "A", k: top, y: STOREY * top });
  return out;
}

const cv = (c: [number, number], y: number) => new THREE.Vector3(c[0], y, c[1]);

/** Waypoints from the ground-floor room to a floor, via the stairwell. */
export function routeToFloor(target: FloorId, inst: Installed): THREE.Vector3[] {
  if (target === 0 || !hasWell(inst)) return [];
  const pts = [cv(WELL_ENTRY, 0), cv(CORNER_CENTRE.A, 0)];
  if (target > 0) {
    for (let k = 0; k < target; k++) {
      const b = STOREY * k;
      pts.push(cv(CORNER_CENTRE.B, b + RISE), cv(CORNER_CENTRE.C, b + 2 * RISE), cv(CORNER_CENTRE.D, b + 3 * RISE), cv(CORNER_CENTRE.A, b + STOREY));
    }
  } else {
    pts.push(cv(CORNER_CENTRE.D, -RISE), cv(CORNER_CENTRE.C, -2 * RISE), cv(CORNER_CENTRE.B, -3 * RISE), cv(CORNER_CENTRE.A, -STOREY));
  }
  pts.push(cv(WELL_ENTRY, FLOOR_Y[target]));
  return pts;
}

export function routeFromFloor(from: FloorId, inst: Installed): THREE.Vector3[] {
  return routeToFloor(from, inst).reverse();
}

export function roomAt(x: number, z: number, floor: FloorId, inst: Installed): Room | null {
  const rooms = openRooms(inst);
  // most specific (smallest) room wins: freezer inside the kitchen
  let best: Room | null = null;
  for (const r of rooms) {
    if (r.floor === floor && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
      if (!best || (r.x1 - r.x0) * (r.z1 - r.z0) < (best.x1 - best.x0) * (best.z1 - best.z0)) best = r;
    }
  }
  return best;
}

export const v3 = (a: [number, number, number]) => new THREE.Vector3(a[0], a[1], a[2]);

/** Full path from the counter area to a seat (handles terrace / balcony doors and stairs). */
export function routeToSeat(seat: Seat, inst: Installed): THREE.Vector3[] {
  const room = roomAt(seat.pos[0], seat.pos[2], seat.floor, inst);
  const pts = routeToFloor(seat.floor, inst);
  if (room?.id === "terrace") pts.push(v3(POINTS.doorInside), v3([DOOR_X, 0, 5.1]));
  if (room?.id === "balcony") pts.push(v3([BALCONY_DOOR_X, FLOOR_Y[1], 3.3]), v3([BALCONY_DOOR_X, FLOOR_Y[1], 5.0]));
  pts.push(v3(seat.pos));
  return pts;
}

/** Waypoints from a seat (or the counter when null) to just outside the front door. */
export function routeFromSeat(seat: Seat | null, floorHint: FloorId, inst: Installed): THREE.Vector3[] {
  if (!seat) return [...routeFromFloor(floorHint, inst), v3(POINTS.doorInside), v3(POINTS.doorOutside)];
  const room = roomAt(seat.pos[0], seat.pos[2], seat.floor, inst);
  if (room?.id === "terrace") return [v3([DOOR_X, 0, 5.1]), v3(POINTS.doorOutside)];
  const pts: THREE.Vector3[] = [];
  if (room?.id === "balcony") pts.push(v3([BALCONY_DOOR_X, FLOOR_Y[1], 5.0]), v3([BALCONY_DOOR_X, FLOOR_Y[1], 3.3]));
  pts.push(...routeFromFloor(seat.floor, inst), v3(POINTS.doorInside), v3(POINTS.doorOutside));
  return pts;
}

export function floorFromY(y: number): FloorId {
  let best: FloorId = 0;
  let bd = Infinity;
  for (const f of [-1, 0, 1, 2] as FloorId[]) {
    const d = Math.abs(FLOOR_Y[f] - y);
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Keep-clear zones (doors). Some only apply once the matching construction exists.
// ---------------------------------------------------------------------------
interface KeepClear extends Rect {
  floor: FloorId;
  name: string;
  when?: (inst: Installed) => boolean;
}

const stairDoor = (floor: FloorId, when: (i: Installed) => boolean): KeepClear => ({ x0: -6, x1: -4.8, z0: -0.1, z1: 1.3, floor, name: "the stairwell door", when });

const KEEP_CLEAR: KeepClear[] = [
  { x0: 0.3, x1: 2.7, z0: 2.6, z1: 4, floor: 0, name: "the front door" },
  { x0: 0.3, x1: 2.7, z0: 4.45, z1: 6.6, floor: 0, name: "the entrance path" },
  { x0: -1.5, x1: 0.9, z0: -6, z1: -4.9, floor: 0, name: "the back-room door" },
  { x0: -1.0, x1: 0.4, z0: -10.25, z1: -9.2, floor: 0, name: "the alley door" },
  { x0: -2.25, x1: -1.4, z0: -8.7, z1: -7.5, floor: 0, name: "the bedroom door" },
  { x0: -1.0, x1: 0.4, z0: -6.4, z1: -6.0, floor: 0, name: "the café door" },
  stairDoor(0, hasWell),
  stairDoor(1, (i) => !!i.floor2),
  stairDoor(2, (i) => !!i.floor3),
  stairDoor(-1, (i) => !!i.basement),
  { x0: 1.5, x1: 2.6, z0: -8.8, z1: -7.4, floor: 0, name: "the kitchen door", when: (i) => !!i.kitchen },
  { x0: 2.3, x1: 5.3, z0: -6.9, z1: -4.9, floor: 0, name: "the kitchen pass", when: (i) => !!i.kitchen },
  { x0: 6.8, x1: 8.6, z0: -7.2, z1: -5.9, floor: 0, name: "the toilet door", when: (i) => !!i.toilet },
  { x0: 4.9, x1: 5.9, z0: -8.7, z1: -7.9, floor: 0, name: "the freezer door", when: (i) => !!i.kitchen2 },
  { x0: 0.8, x1: 2.2, z0: 2.9, z1: 4, floor: 1, name: "the balcony door", when: (i) => !!i.balcony },
  { x0: 0.8, x1: 2.2, z0: 4.3, z1: 5.4, floor: 1, name: "the balcony door", when: (i) => !!i.balcony },
];

// ---------------------------------------------------------------------------
// Footprints & placement
// ---------------------------------------------------------------------------
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export function footprint(def: ItemDef, x: number, z: number, rot: Rot): Rect {
  const [w, d] = def.size;
  const rw = rot % 2 === 1 ? d : w;
  const rd = rot % 2 === 1 ? w : d;
  return { x0: x - rw / 2, x1: x + rw / 2, z0: z - rd / 2, z1: z + rd / 2 };
}

export const placedRect = (p: PlacedItem) => footprint(ITEMS[p.item], p.x, p.z, p.rot);
const overlaps = (a: Rect, b: Rect, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.z0 < b.z1 + pad && a.z1 > b.z0 - pad;
const inside = (a: Rect, b: Rect, tol = 0.02) => a.x0 >= b.x0 - tol && a.x1 <= b.x1 + tol && a.z0 >= b.z0 - tol && a.z1 <= b.z1 + tol;

export function validatePlacement(def: ItemDef, x: number, z: number, rot: Rot, floor: FloorId, placed: PlacedItem[], inst: Installed, ignoreUid?: number, onUid?: number): { ok: boolean; reason: string } {
  const fp = footprint(def, x, z, rot);
  // --- placing ON TOP of another item's surface ---
  if (onUid !== undefined) {
    const parent = placed.find((p) => p.uid === onUid);
    if (!parent) return { ok: false, reason: "No surface there" };
    if (parent.onUid) return { ok: false, reason: "Only one level of stacking" };
    const pdef = ITEMS[parent.item];
    if (!pdef.surface) return { ok: false, reason: `${pdef.name} has no flat top` };
    if (def.surface) return { ok: false, reason: "Furniture goes on the floor, not on other furniture" };
    if (def.category === "furniture" || def.category === "utility") return { ok: false, reason: `${def.name} is too big for a surface` };
    const pr = placedRect(parent);
    const m = 0.05;
    if (fp.x0 < pr.x0 + m || fp.x1 > pr.x1 - m || fp.z0 < pr.z0 + m || fp.z1 > pr.z1 - m) return { ok: false, reason: "Doesn't fit on the surface" };
    for (const q of placed) {
      if (q.onUid === onUid && q.uid !== ignoreUid && !ITEMS[q.item].noCollide) {
        if (overlaps(fp, placedRect(q), 0.05)) return { ok: false, reason: "Something is already there" };
      }
    }
    return { ok: true, reason: "" };
  }
  let room = roomAt(x, z, floor, inst);
  if (room && !room.placeable) room = null;
  if (!room) {
    const rooms = openRooms(inst).filter((r) => r.floor === floor && r.placeable);
    const main = rooms.find((r) => r.id === "main");
    const ext = rooms.find((r) => r.id === "ext");
    if (main && ext && inside(fp, { x0: main.x0, x1: ext.x1, z0: main.z0, z1: main.z1 })) room = main;
  }
  if (!room) return { ok: false, reason: def.kitchenOnly && !inst.kitchen ? "Needs the kitchen expansion (CaféOS → Property)" : "Must be fully inside a room you own" };
  if (def.kitchenOnly && room.id !== "kitchen" && room.id !== "freezer") return { ok: false, reason: `${def.name} must go in the kitchen` };
  if (room.id === "freezer") {
    if (def.id !== "freezerShelf" && def.id !== "trash") return { ok: false, reason: "Only freezer shelves (and a bin) go in the freezer" };
  } else if (room.id === "kitchen") {
    const okKinds = def.kitchenOnly || def.category === "utility" || def.category === "countertop" || def.storage === "fridge" || def.storage === "pantry" || def.id === "trash";
    if (!okKinds) return { ok: false, reason: "Only kitchen appliances, utility units, fridges, cupboards and bins go in the kitchen" };
  }
  if (room.id === "utility" && !(def.category === "utility" || def.category === "countertop" || def.id === "trash" || def.category === "climate")) return { ok: false, reason: "The utility room is for sinks, racks, cupboards and countertop gear" };
  // appliance slots
  if (def.slot) {
    const slots = kitchenSlots(inst);
    const used = placed.filter((p) => ITEMS[p.item].slot && p.floor === floor && p.uid !== ignoreUid).map((p) => [p.x, p.z] as [number, number]);
    const free = slots.filter((sl) => !used.some(([ux, uz]) => Math.hypot(ux - sl[0], uz - sl[1]) < 0.9));
    if (!free.length) return { ok: false, reason: "No free appliance slots — upgrade the kitchen for more" };
    if (!free.some((sl) => Math.hypot(sl[0] - x, sl[1] - z) < 0.8)) return { ok: false, reason: "Place it on an empty appliance slot (the steel pedestals)" };
  }
  if (def.id === "freezerShelf" && room.id !== "freezer") return { ok: false, reason: "Freezer shelves go inside the walk-in freezer" };
  if (def.category === "countertop" && !(room.id === "main" || room.id === "ext" || room.id === "utility" || room.id === "kitchen")) return { ok: false, reason: `${def.name} goes behind the counter, in the back room or the kitchen` };
  if (def.id === "warmer" && !inst.kitchen) return { ok: false, reason: "The warmer needs the kitchen expansion" };
  if (room.outdoor && !def.outdoor && def.category !== "furniture" && def.category !== "decor") return { ok: false, reason: "That belongs indoors" };
  if (!room.outdoor && def.outdoor) return { ok: false, reason: `${def.name} belongs outside (terrace or balcony)` };
  for (const k of KEEP_CLEAR) {
    if (k.floor !== floor || (k.when && !k.when(inst))) continue;
    if (overlaps(fp, k)) return { ok: false, reason: `Keep ${k.name} clear` };
  }
  if (!def.noCollide) {
    for (const p of placed) {
      if (p.floor !== floor || p.uid === ignoreUid || p.onUid) continue;
      const other = ITEMS[p.item];
      if (other.noCollide) continue;
      if (overlaps(fp, placedRect(p), 0.05)) return { ok: false, reason: `Overlaps the ${other.name}` };
    }
  }
  return { ok: true, reason: "" };
}

// ---------------------------------------------------------------------------
// Derived positions: rotation helpers, seats, queue
// ---------------------------------------------------------------------------
export const rotYaw = (rot: Rot) => (rot * Math.PI) / 2;

export function rotate(lx: number, lz: number, rot: Rot): [number, number] {
  const a = rotYaw(rot);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [lx * c + lz * s, -lx * s + lz * c];
}

export const frontDir = (rot: Rot): [number, number] => rotate(0, 1, rot);

export function getSeats(placed: PlacedItem[], inst: Installed): Seat[] {
  const out: Seat[] = [];
  for (const p of placed) {
    const def = ITEMS[p.item];
    if (!def.seats) continue;
    const room = roomAt(p.x, p.z, p.floor, inst);
    // Tables: seats face the table centre. Sofas / benches / stools (seats in front of the piece): face the item's front.
    const facesCentre = def.seats.some(([lx, lz]) => Math.hypot(lx, lz) > 0.6) && def.seats.some(([, lz]) => lz < -0.1);
    def.seats.forEach(([lx, lz], i) => {
      const [dx, dz] = rotate(lx, lz, p.rot);
      const yaw = facesCentre ? Math.atan2(-dx, -dz) : rotYaw(p.rot);
      out.push({ key: `${p.uid}:${i}`, table: p.uid, pos: [p.x + dx, FLOOR_Y[p.floor], p.z + dz], yaw, floor: p.floor, outdoor: !!room?.outdoor });
    });
  }
  return out;
}

export function getCounter(placed: PlacedItem[]): PlacedItem | null {
  return placed.find((p) => p.item === "counter" && p.floor === 0) ?? null;
}

export function queueSlot(counter: PlacedItem, i: number): [number, number] {
  const [fx, fz] = frontDir(counter.rot);
  const d = ITEMS.counter.size[1];
  const dist = d / 2 + 0.85 + i * 0.85;
  return [counter.x + fx * dist, counter.z + fz * dist];
}

/** Where staff stand to operate a counter device: behind the counter (opposite the queue). */
export function backOfCounter(counter: PlacedItem, i = 0): [number, number] {
  const [fx, fz] = frontDir(counter.rot);
  const d = ITEMS.counter.size[1];
  return [counter.x - fx * (d / 2 + 0.55) + rotate(1, 0, counter.rot)[0] * (i - 0.5) * 1.2, counter.z - fz * (d / 2 + 0.55) + rotate(1, 0, counter.rot)[1] * (i - 0.5) * 1.2];
}

export function counterFacingYaw(counter: PlacedItem): number {
  const [fx, fz] = frontDir(counter.rot);
  return Math.atan2(-fx, -fz);
}

/** Staff behind the counter face the queue. */
export function counterBackYaw(counter: PlacedItem): number {
  const [fx, fz] = frontDir(counter.rot);
  return Math.atan2(fx, fz);
}

/** Where the cashier stands: behind the counter, facing the customers. */
export function cashierSpot(counter: PlacedItem, i = 0): [number, number] {
  const [fx, fz] = frontDir(counter.rot);
  const [rx, rz] = rotate(1, 0, counter.rot);
  const d = ITEMS.counter.size[1];
  return [counter.x - fx * (d / 2 + 0.55) + rx * (-0.6 + i * 1.6), counter.z - fz * (d / 2 + 0.55) + rz * (-0.6 + i * 1.6)];
}
/** Pickup end of the counter (right end from the customers' view) — finished items are left here. */
export function pickupSpot(counter: PlacedItem): { top: [number, number]; staff: [number, number]; customer: [number, number] } {
  const [fx, fz] = frontDir(counter.rot);
  const [rx, rz] = rotate(1, 0, counter.rot);
  const d = ITEMS.counter.size[1];
  const w = ITEMS.counter.size[0];
  const ex = counter.x + rx * (w / 2 - 0.5);
  const ez = counter.z + rz * (w / 2 - 0.5);
  // staff/work side is BEHIND the counter (away from the queue), customers wait in front
  return { top: [ex, ez], staff: [ex - fx * (d / 2 + 0.55), ez - fz * (d / 2 + 0.55)], customer: [ex + fx * (d / 2 + 0.75), ez + fz * (d / 2 + 0.75)] };
}
/** Where customers wait for a taken order: a short row beyond the pickup end. */
export function waitSlot(counter: PlacedItem, i: number): [number, number] {
  const [fx, fz] = frontDir(counter.rot);
  const [rx, rz] = rotate(1, 0, counter.rot);
  const d = ITEMS.counter.size[1];
  const w = ITEMS.counter.size[0];
  const along = w / 2 + 0.9 + (i % 3) * 0.75;
  const out = d / 2 + 0.9 + Math.floor(i / 3) * 0.8;
  return [counter.x + rx * along + fx * out, counter.z + rz * along + fz * out];
}
/** Work spot in front of a station / storage item. */
export function workSpot(p: PlacedItem): [number, number, number] {
  const def = ITEMS[p.item];
  const [fx, fz] = frontDir(p.rot);
  const d = def.size[1];
  return [p.x + fx * (d / 2 + 0.55), FLOOR_Y[p.floor], p.z + fz * (d / 2 + 0.55)];
}
