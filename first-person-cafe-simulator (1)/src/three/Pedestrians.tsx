import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Detailed } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { WEATHERS, getSeason, getTimeFactor } from "@/game/calendar";
import { COMPETITORS } from "@/game/constants";
import { kidColors, makeOutfit, randomColors } from "@/game/names";
import { simState } from "@/game/registry";
import { useGame } from "@/game/store";
import type { CustomerColors, Outfit } from "@/game/types";
import { Person, PersonLow } from "./primitives";

// ---------------------------------------------------------------------------
// Waypoint graph: sidewalks + crossings + plaza ring (no walking down the road centre)
// ---------------------------------------------------------------------------
interface Node {
  x: number;
  z: number;
  adj: number[];
  shop?: { door: [number, number]; id: string };
  bench?: [number, number, number]; // seat position + yaw
  pause?: number; // pause probability
}

function buildGraph(): Node[] {
  const nodes: Node[] = [];
  const add = (x: number, z: number, extra?: Partial<Node>) => {
    nodes.push({ x, z, adj: [], ...extra });
    return nodes.length - 1;
  };
  const link = (a: number, b: number) => {
    if (!nodes[a].adj.includes(b)) nodes[a].adj.push(b);
    if (!nodes[b].adj.includes(a)) nodes[b].adj.push(a);
  };
  const north: number[] = [];
  const south: number[] = [];
  for (let x = -38; x <= 10; x += 4) {
    north.push(add(x, 7.2, { pause: 0.12 }));
    south.push(add(x, 16.2, { pause: 0.12 }));
  }
  for (let i = 1; i < north.length; i++) {
    link(north[i - 1], north[i]);
    link(south[i - 1], south[i]);
  }
  // crossings
  for (const cx of [-30, -14, 2]) {
    const ni = north.findIndex((n) => Math.abs(nodes[n].x - cx) < 0.1);
    const si = south.findIndex((n) => Math.abs(nodes[n].x - cx) < 0.1);
    if (ni >= 0 && si >= 0) link(north[ni], south[si]);
  }
  // plaza ring (x 14..42, z 0..28) + cross
  const ring: number[] = [];
  const ringPts: [number, number][] = [];
  for (let z = 0; z <= 28; z += 7) ringPts.push([14, z]);
  for (let x = 21; x <= 42; x += 7) ringPts.push([x, 28]);
  for (let z = 21; z >= 0; z -= 7) ringPts.push([42, z]);
  for (let x = 35; x >= 21; x -= 7) ringPts.push([x, 0]);
  for (const [x, z] of ringPts) ring.push(add(x, z, { pause: 0.18 }));
  for (let i = 0; i < ring.length; i++) link(ring[i], ring[(i + 1) % ring.length]);
  const center = add(28, 14, { pause: 0.3 });
  const n28_0 = ring.find((n) => nodes[n].x === 28 && nodes[n].z === 0)!;
  const n28_28 = ring.find((n) => nodes[n].x === 28 && nodes[n].z === 28)!;
  const n14_14 = ring.find((n) => nodes[n].x === 14 && nodes[n].z === 14)!;
  const n14_28 = ring.find((n) => nodes[n].x === 14 && nodes[n].z === 28)!;
  // north spur past the office tower to Joy Games
  const n42_0 = ring.find((n) => nodes[n].x === 42 && nodes[n].z === 0)!;
  const northSpur = add(42, -14, { pause: 0.1 });
  link(n42_0, northSpur);
  const n42_14 = ring.find((n) => nodes[n].x === 42 && nodes[n].z === 14)!;
  link(center, n28_0);
  link(center, n28_28);
  link(center, n14_14);
  link(center, n42_14);
  // connect street to plaza
  const n14_7 = ring.find((n) => nodes[n].x === 14 && nodes[n].z === 7)!;
  link(north[north.length - 1], n14_7);
  link(south[south.length - 1], n14_14);
  // spur west along the plaza's south edge toward Dalgona Living
  const living1 = add(8, 28, { pause: 0.15 });
  link(n14_28, living1);
  link(south[south.length - 1], living1);
  // doors people go in and out of: competitors, shops, venues and residents' entrances
  const doors: { x: number; z: number; id: string; near: [number, number] }[] = COMPETITORS.map((c) => ({ x: c.door[0], z: c.door[2], id: c.id, near: [c.door[0], c.door[2] > 10 ? (c.door[2] > 20 ? 28 : 16.2) : 7.2] }));
  const venueDoors: [number, number, string][] = [
    // north row (fronts z = 4.5)
    [-28, 5.0, "noraebang"], [-21, 5.0, "mart"], [-14, 5.0, "chicken"], [-11.2, 5.0, "apt-chicken"],
    // south street row (fronts z = 18)
    [-36, 17.5, "hardware"], [-17, 17.5, "laundry"], [-13.8, 17.5, "apt-laundry"], [-6, 17.5, "olive"], [-2.2, 17.5, "apt-olive"], [6, 17.5, "cinema"],
    // plaza north (fronts z = -2)
    [18, -1.5, "appliance"], [34, -1.5, "office"], [-2, 29.5, "police"],
    // plaza east (fronts x = 44)
    [43.5, -20, "games"], [43.5, -8, "gym"], [43.5, 4, "qu"], [43.5, 7.2, "apt-qu"], [43.5, 16, "vinyl"], [43.5, 28, "hostel"], [43.5, 40, "bar"],
    // plaza south (fronts z = 30)
    [31, 29.5, "photo"], [40, 29.5, "bunsik"], [42.8, 29.5, "apt-bunsik"], [8, 29.5, "living"],
    // west end
    [-41.5, 1, "exit9"], [-41.5, 21, "ak"],
  ];
  for (const [x, z, id] of venueDoors) {
    const near: [number, number] = z < 6 && z > -5 && x < 12 ? [x, 7.2] : z > 14 && z < 20 ? [x, 16.2] : z < 0 ? [x, 0] : x > 40 ? [42, z] : z > 28 ? [x, 28] : [Math.max(-38, x), 7.2];
    doors.push({ x, z, id, near });
  }
  for (const d of doors) {
    let best = -1;
    let bd = Infinity;
    nodes.forEach((n, i) => {
      const dd = (n.x - d.near[0]) ** 2 + (n.z - d.near[1]) ** 2;
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    if (best >= 0) {
      if (nodes[best].shop) {
        // split busy nodes: add a dedicated node next to the existing one
        const extra = add(nodes[best].x + 0.6, nodes[best].z, { pause: 0.1 });
        link(best, extra);
        for (const a of [...nodes[best].adj]) if (a !== extra) link(extra, a);
        nodes[extra].shop = { door: [d.x, d.z], id: d.id };
      } else nodes[best].shop = { door: [d.x, d.z], id: d.id };
    }
  }
  // benches on the plaza
  const benches: [number, number, number][] = [[20, 10, Math.PI / 2], [36, 10, -Math.PI / 2], [20, 20, Math.PI / 2], [36, 20, -Math.PI / 2]];
  for (const b of benches) {
    let best = -1;
    let bd = Infinity;
    nodes.forEach((n, i) => {
      const dd = (n.x - b[0]) ** 2 + (n.z - b[1]) ** 2;
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    if (best >= 0 && !nodes[best].bench) nodes[best].bench = b;
  }
  return nodes;
}

export const PED_GRAPH = buildGraph();

// ---------------------------------------------------------------------------
// Walkers
// ---------------------------------------------------------------------------
type Act = "walk" | "pause" | "enter" | "inside" | "exit" | "toBench" | "sit" | "fromBench";

interface Walker {
  pos: THREE.Vector3;
  yaw: number;
  node: number;
  prev: number;
  target: THREE.Vector3;
  act: Act;
  timer: number;
  speed: number;
  phase: number;
  colors: CustomerColors;
  outfit: Outfit;
  kid: boolean;
  leader: number; // -1 for leaders
  offset: [number, number];
  sitting: boolean;
  benchPos?: [number, number, number];
  returnNode: number;
  moving: boolean;
  lastSet?: { x: number; z: number; yaw: number };
}

const COUNT = 38;

function makeWalker(i: number, season: ReturnType<typeof getSeason>, weather: Parameters<typeof makeOutfit>[0]): Walker {
  const node = (i * 7) % PED_GRAPH.length;
  const n = PED_GRAPH[node];
  const next = n.adj[i % n.adj.length];
  const kid = i % 11 === 3;
  return {
    pos: new THREE.Vector3(n.x, 0, n.z),
    yaw: 0,
    node: next,
    prev: node,
    target: new THREE.Vector3(PED_GRAPH[next].x, 0, PED_GRAPH[next].z),
    act: "walk",
    timer: 0,
    speed: 1.0 + ((i * 13) % 7) * 0.09,
    phase: i * 1.7,
    colors: kid ? kidColors() : randomColors(season),
    outfit: makeOutfit(weather, season),
    kid,
    leader: -1,
    offset: [0, 0],
    sitting: false,
    returnNode: node,
    moving: true,
  };
}

export function Pedestrians() {
  const weather = useGame((s) => s.weather);
  const day = useGame((s) => s.day);
  const season = getSeason(day);
  const walkers = useMemo<Walker[]>(() => {
    const out: Walker[] = [];
    for (let i = 0; i < COUNT; i++) out.push(makeWalker(i, season, weather));
    // groups: every 5th walker leads the following 1-2 walkers (kids follow their parent)
    for (let i = 0; i < COUNT; i++) {
      if (i % 5 === 0 && i + 1 < COUNT) {
        out[i + 1].leader = i;
        out[i + 1].offset = [0.7, -0.3];
        if (i % 10 === 0 && i + 2 < COUNT) {
          out[i + 2].leader = i;
          out[i + 2].offset = [-0.6, -0.6];
          out[i + 2].kid = true;
          out[i + 2].colors = kidColors();
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const w of walkers) {
      w.colors = w.kid ? kidColors() : randomColors(season);
      w.outfit = makeOutfit(weather, season);
    }
  }, [walkers, weather, season]);

  const refs = useRef<(THREE.Group | null)[]>([]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const wd = WEATHERS[weather];

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const s = useGame.getState();
    const paused = s.phase !== "playing" || s.pause !== "none" || s.modal !== "none";
    const active = Math.ceil(COUNT * Math.min(1, 0.35 + wd.traffic * getTimeFactor(s.clock) * 0.75));
    const t = state.clock.elapsedTime;
    walkers.forEach((w, i) => {
      const g = refs.current[i];
      if (!g) return;
      const leader = w.leader >= 0 ? walkers[w.leader] : null;
      const visibleIndex = leader ? w.leader : i;
      const far = Math.abs(w.pos.x - simState.playerX) > 52 || Math.abs(w.pos.z - simState.playerZ) > 52;
      if (visibleIndex >= active || (leader ? leader.act === "inside" : w.act === "inside") || far) {
        g.visible = false;
        return;
      }
      g.visible = true;
      if (paused) return;

      if (leader) {
        // follow the leader with an offset relative to their heading
        const c = Math.cos(leader.yaw);
        const sn = Math.sin(leader.yaw);
        const ox = w.offset[0] * c + w.offset[1] * sn;
        const oz = -w.offset[0] * sn + w.offset[1] * c;
        tmp.set(leader.pos.x + ox, 0, leader.pos.z + oz);
        const dist = tmp.distanceTo(w.pos);
        if (dist > 0.05) {
          const sp = Math.min(dist, (leader.speed * wd.speed * (w.kid ? 1.25 : 1.1) + dist * 0.8) * d);
          tmp.sub(w.pos).normalize().multiplyScalar(sp);
          w.pos.add(tmp);
          w.yaw = leader.act === "walk" ? leader.yaw : Math.atan2(tmp.x, tmp.z);
          w.phase += d * (w.kid ? 11 : 8);
        }
        w.sitting = leader.sitting;
        g.position.set(w.pos.x, Math.abs(Math.sin(w.phase)) * 0.04 * (w.kid ? 0.7 : 1), w.pos.z);
        g.rotation.y = w.yaw;
        syncPose(g, w.sitting);
        return;
      }

      switch (w.act) {
        case "walk": {
          tmp.subVectors(w.target, w.pos);
          const dist = tmp.length();
          if (dist < 0.15) {
            const n = PED_GRAPH[w.node];
            const r = Math.random();
            if (n.shop && r < (n.shop.id.startsWith("apt") ? 0.18 : 0.28)) {
              w.act = "enter";
              w.returnNode = w.node;
              w.target.set(n.shop.door[0], 0, n.shop.door[1]);
            } else if (n.bench && r < 0.45 && wd.traffic > 0.6) {
              w.act = "toBench";
              w.returnNode = w.node;
              w.benchPos = n.bench;
              w.target.set(n.bench[0], 0, n.bench[1]);
            } else if (r < 0.45 + (n.pause ?? 0)) {
              w.act = "pause";
              w.timer = 1.5 + Math.random() * 3.5;
            } else {
              pickNext(w);
            }
          } else {
            const sp = w.speed * wd.speed * d;
            tmp.multiplyScalar(Math.min(1, sp / dist));
            w.pos.add(tmp);
            w.yaw = Math.atan2(tmp.x, tmp.z);
            w.phase += d * 8;
          }
          break;
        }
        case "pause":
          w.timer -= d;
          w.yaw += Math.sin(t * 0.7 + i) * d * 0.4;
          if (w.timer <= 0) {
            pickNext(w);
            w.act = "walk";
          }
          break;
        case "enter": {
          tmp.subVectors(w.target, w.pos);
          const dist = tmp.length();
          if (dist < 0.2) {
            w.act = "inside";
            w.timer = 6 + Math.random() * 14;
          } else {
            tmp.multiplyScalar(Math.min(1, (w.speed * wd.speed * d) / dist));
            w.pos.add(tmp);
            w.yaw = Math.atan2(tmp.x, tmp.z);
            w.phase += d * 8;
          }
          break;
        }
        case "inside":
          w.timer -= d;
          if (w.timer <= 0) {
            w.act = "exit";
            const n = PED_GRAPH[w.returnNode];
            w.target.set(n.x, 0, n.z);
          }
          break;
        case "exit": {
          tmp.subVectors(w.target, w.pos);
          const dist = tmp.length();
          if (dist < 0.2) {
            w.node = w.returnNode;
            pickNext(w);
            w.act = "walk";
          } else {
            tmp.multiplyScalar(Math.min(1, (w.speed * wd.speed * d) / dist));
            w.pos.add(tmp);
            w.yaw = Math.atan2(tmp.x, tmp.z);
            w.phase += d * 8;
          }
          break;
        }
        case "toBench": {
          tmp.subVectors(w.target, w.pos);
          const dist = tmp.length();
          if (dist < 0.15) {
            w.act = "sit";
            w.sitting = true;
            w.yaw = w.benchPos?.[2] ?? 0;
            w.timer = 8 + Math.random() * 14;
          } else {
            tmp.multiplyScalar(Math.min(1, (w.speed * wd.speed * d) / dist));
            w.pos.add(tmp);
            w.yaw = Math.atan2(tmp.x, tmp.z);
            w.phase += d * 8;
          }
          break;
        }
        case "sit":
          w.timer -= d;
          if (w.timer <= 0 || wd.traffic < 0.5) {
            w.sitting = false;
            w.act = "fromBench";
            const n = PED_GRAPH[w.returnNode];
            w.target.set(n.x, 0, n.z);
          }
          break;
        case "fromBench": {
          tmp.subVectors(w.target, w.pos);
          const dist = tmp.length();
          if (dist < 0.2) {
            w.node = w.returnNode;
            pickNext(w);
            w.act = "walk";
          } else {
            tmp.multiplyScalar(Math.min(1, (w.speed * wd.speed * d) / dist));
            w.pos.add(tmp);
            w.yaw = Math.atan2(tmp.x, tmp.z);
            w.phase += d * 8;
          }
          break;
        }
      }
      const moving = Math.abs(Math.sin(w.phase)) > 0.001 || w.moving;
      if (moving || !w.lastSet || Math.hypot(w.pos.x - w.lastSet.x, w.pos.z - w.lastSet.z) > 0.001 || Math.abs(w.yaw - w.lastSet.yaw) > 0.01) {
        g.position.set(w.pos.x, w.sitting ? 0 : Math.abs(Math.sin(w.phase)) * 0.04, w.pos.z);
        g.rotation.y = w.yaw;
        w.lastSet = { x: w.pos.x, z: w.pos.z, yaw: w.yaw };
      }
      syncPose(g, w.sitting);
    });
  });

  return (
    <>
      {walkers.map((w, i) => (
        <group
          key={`${i}-${weather}-${season}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          {/* child 0: standing LOD pair, child 1: seated model (toggled by syncPose) */}
          <Detailed distances={[0, 13]} hysteresis={0.1}>
            <Person colors={w.colors} outfit={w.outfit} umbrellaUp scale={w.kid ? 0.62 : 1} />
            <PersonLow colors={w.colors} outfit={w.outfit} umbrellaUp scale={w.kid ? 0.62 : 1} />
          </Detailed>
          <group visible={false}>
            <Person colors={w.colors} outfit={w.outfit} scale={w.kid ? 0.62 : 1} sitting />
          </group>
        </group>
      ))}
    </>
  );
}

/** Toggle between the walking LOD and the seated model without re-rendering. */
function syncPose(g: THREE.Group, sitting: boolean) {
  const stand = g.children[0];
  const sit = g.children[1];
  if (stand && stand.visible === sitting) stand.visible = !sitting;
  if (sit && sit.visible !== sitting) sit.visible = sitting;
}

function pickNext(w: Walker) {
  const n = PED_GRAPH[w.node];
  const options = n.adj.filter((a) => a !== w.prev);
  const next = options.length ? options[Math.floor(Math.random() * options.length)] : n.adj[0];
  w.prev = w.node;
  w.node = next;
  const nn = PED_GRAPH[next];
  w.target.set(nn.x + (Math.random() - 0.5) * 0.8, 0, nn.z + (Math.random() - 0.5) * 0.8);
}
