import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Detailed } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { isWeekend } from "@/game/calendar";
import { LUNCH_END, LUNCH_START, SCHOOL_END, SCHOOL_START } from "@/game/reputation";
import { useGame } from "@/game/store";
import type { CustomerColors } from "@/game/types";
import { PED_GRAPH } from "./Pedestrians";
import { NightLight, NightMaterial, Person, PersonLow, SolidBox, TextPlane } from "./primitives";

// ---------------------------------------------------------------------------
// Crowd waves: office workers out of HANWOO at 12:00, students out of Exit 9 at 16:00.
// Each wave member walks graph→shop door, stays inside, then walks back to its origin and vanishes.
// ---------------------------------------------------------------------------
const OFFICE_DOOR: [number, number] = [34, -1.4];
const METRO_DOOR: [number, number] = [-41.5, 1.0];
const SUITS: CustomerColors[] = [
  { shirt: "#1e2a44", pants: "#1e2a44", skin: "#f6d7b0", hair: "#1c1c1c" },
  { shirt: "#2d3436", pants: "#2d3436", skin: "#f1c27d", hair: "#2b1b17" },
  { shirt: "#f5f6fa", pants: "#1e2a44", skin: "#ffdbac", hair: "#4a2c2a" },
  { shirt: "#3d4a63", pants: "#3d4a63", skin: "#e8b98a", hair: "#1c1c1c" },
  { shirt: "#b2bec3", pants: "#2d3436", skin: "#f6d7b0", hair: "#6b6b6b" },
];
const UNIFORMS: CustomerColors[] = [
  { shirt: "#f5f6fa", pants: "#2b3a55", skin: "#ffdbac", hair: "#1c1c1c" },
  { shirt: "#f5f6fa", pants: "#2b3a55", skin: "#f6d7b0", hair: "#2b1b17" },
  { shirt: "#dfe6e9", pants: "#4a2c2a", skin: "#f1c27d", hair: "#1c1c1c" },
  { shirt: "#f5f6fa", pants: "#1e1e1e", skin: "#e8b98a", hair: "#5b3a8a" },
];

type Stage = "out" | "inside" | "back" | "done";
interface Mover {
  pos: THREE.Vector3;
  yaw: number;
  phase: number;
  speed: number;
  colors: CustomerColors;
  path: THREE.Vector3[];
  stage: Stage;
  timer: number;
  door: THREE.Vector3;
  origin: THREE.Vector3;
  backpack: boolean;
  delay: number;
  nodeHome: number;
  lastSet?: { x: number; z: number; yaw: number };
}

const nearestNode = (x: number, z: number) => {
  let best = 0;
  let bd = Infinity;
  PED_GRAPH.forEach((n, i) => {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
};

/** BFS over the pedestrian graph → waypoints. */
function graphRoute(from: number, to: number): THREE.Vector3[] {
  if (from === to) return [new THREE.Vector3(PED_GRAPH[to].x, 0, PED_GRAPH[to].z)];
  const prev = new Map<number, number>();
  const q = [from];
  prev.set(from, -1);
  while (q.length) {
    const cur = q.shift()!;
    if (cur === to) break;
    for (const a of PED_GRAPH[cur].adj) if (!prev.has(a)) {
      prev.set(a, cur);
      q.push(a);
    }
  }
  if (!prev.has(to)) return [new THREE.Vector3(PED_GRAPH[to].x, 0, PED_GRAPH[to].z)];
  const out: number[] = [];
  for (let c = to; c !== -1; c = prev.get(c)!) out.push(c);
  out.reverse();
  return out.map((i) => new THREE.Vector3(PED_GRAPH[i].x + (Math.random() - 0.5) * 0.8, 0, PED_GRAPH[i].z + (Math.random() - 0.5) * 0.8));
}

const shopNodes = () => PED_GRAPH.map((n, i) => ({ n, i })).filter(({ n }) => n.shop && !n.shop.id.startsWith("apt") && n.shop.id !== "office" && n.shop.id !== "exit9");

function CrowdWave({ kind }: { kind: "office" | "student" }) {
  const day = useGame((s) => s.day);
  const clock = useGame((s) => s.clock);
  const weekday = !isWeekend(day);
  const start = kind === "office" ? LUNCH_START : SCHOOL_START;
  const end = kind === "office" ? LUNCH_END : SCHOOL_END;
  const active = weekday && clock >= start - 1 && clock < end + 40;
  const count = kind === "office" ? 26 : 48;
  const origin = kind === "office" ? OFFICE_DOOR : METRO_DOOR;
  const movers = useMemo<Mover[]>(() => {
    const shops = shopNodes();
    const home = nearestNode(origin[0], origin[1]);
    return Array.from({ length: count }).map((_, i) => {
      const target = shops[(i * 7 + day) % shops.length];
      const path = graphRoute(home, target.i);
      path.push(new THREE.Vector3(target.n.shop!.door[0], 0, target.n.shop!.door[1]));
      return {
        pos: new THREE.Vector3(origin[0] + (Math.random() - 0.5) * 1.5, 0, origin[1] + (Math.random() - 0.5) * 1.5),
        yaw: 0,
        phase: Math.random() * 6,
        speed: (kind === "office" ? 1.5 : 1.3) + Math.random() * 0.5,
        colors: kind === "office" ? SUITS[i % SUITS.length] : UNIFORMS[i % UNIFORMS.length],
        path,
        stage: "out" as Stage,
        timer: 0,
        door: path[path.length - 1].clone(),
        origin: new THREE.Vector3(origin[0], 0, origin[1]),
        backpack: kind === "student",
        delay: (i % 12) * 0.9 + Math.random() * 3,
        nodeHome: home,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, kind]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const elapsed = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    for (const m of movers) {
      m.stage = "out";
      m.pos.set(m.origin.x + (Math.random() - 0.5) * 1.5, 0, m.origin.z + (Math.random() - 0.5) * 1.5);
    }
  }, [movers, active]);

  useFrame((_, dt) => {
    if (!active) return;
    const s = useGame.getState();
    if (s.phase !== "playing" || s.pause !== "none" || s.modal !== "none") return;
    const d = Math.min(dt, 0.05);
    elapsed.current += d;
    const returning = clock >= end - 10;
    movers.forEach((m, i) => {
      const g = refs.current[i];
      if (!g) return;
      if (elapsed.current < m.delay || m.stage === "done" || m.stage === "inside") {
        g.visible = false;
        if (m.stage === "inside") {
          m.timer -= d;
          if (m.timer <= 0 || returning) {
            m.stage = "back";
            const back = graphRoute(nearestNode(m.door.x, m.door.z), m.nodeHome);
            m.path = [m.door.clone(), ...back, m.origin.clone()];
            m.pos.copy(m.door);
          }
        }
        return;
      }
      g.visible = true;
      const target = m.path[0];
      if (!target) {
        if (m.stage === "out") {
          m.stage = "inside";
          m.timer = 60 + Math.random() * 120;
        } else m.stage = "done";
        return;
      }
      tmp.subVectors(target, m.pos);
      const dist = tmp.length();
      if (dist < 0.15) {
        m.path.shift();
      } else {
        tmp.multiplyScalar(Math.min(1, (m.speed * d) / dist));
        m.pos.add(tmp);
        m.yaw = Math.atan2(tmp.x, tmp.z);
        m.phase += d * 9;
      }
      if (!m.lastSet || Math.hypot(m.pos.x - m.lastSet.x, m.pos.z - m.lastSet.z) > 0.001 || Math.abs(m.yaw - m.lastSet.yaw) > 0.01) {
        g.position.set(m.pos.x, Math.abs(Math.sin(m.phase)) * 0.04, m.pos.z);
        g.rotation.y = m.yaw;
        m.lastSet = { x: m.pos.x, z: m.pos.z, yaw: m.yaw };
      }
    });
  });

  if (!active) return null;
  return (
    <>
      {movers.map((m, i) => (
        <group key={`${day}-${kind}-${i}`} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <Detailed distances={[0, 13]} hysteresis={0.1}>
            <Person colors={m.colors} scale={kind === "student" ? 0.9 : 1}>
              {m.backpack && (
                <mesh position={[0, 1.05, -0.24]}>
                  <boxGeometry args={[0.34, 0.42, 0.2]} />
                  <meshStandardMaterial color={["#1e2a44", "#c0392b", "#2d3436", "#6c5ce7"][i % 4]} />
                </mesh>
              )}
              {!m.backpack && i % 3 === 0 && (
                <mesh position={[0.34, 0.7, 0.05]}>
                  <boxGeometry args={[0.1, 0.3, 0.38]} />
                  <meshStandardMaterial color="#2d1b12" />
                </mesh>
              )}
            </Person>
            <PersonLow colors={m.colors} scale={kind === "student" ? 0.9 : 1} />
          </Detailed>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Evening busking on the plaza: a performer, lights, and an audience that gathers.
// ---------------------------------------------------------------------------
function Busker() {
  const buskingAt = useGame((s) => s.buskingAt);
  const clock = useGame((s) => s.clock);
  const active = buskingAt !== null && clock < buskingAt + 90;
  const guitar = useRef<THREE.Group>(null!);
  const crowd = useMemo(() => Array.from({ length: 14 }).map((_, i) => ({ a: -0.9 + (i / 13) * 1.8, r: 2.6 + (i % 3) * 0.8, colors: { shirt: ["#e06c75", "#61afef", "#98c379", "#e5c07b", "#c678dd", "#56b6c2"][i % 6], pants: "#2f3542", skin: "#f1c27d", hair: "#1c1c1c" } as CustomerColors, delay: i * 0.7 })), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const t0 = useRef(0);
  useEffect(() => {
    t0.current = 0;
  }, [buskingAt]);
  useFrame((state, dt) => {
    if (!active) return;
    t0.current += dt;
    if (guitar.current) guitar.current.rotation.z = -0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.08;
    crowd.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      const show = t0.current > c.delay;
      g.visible = show;
      if (!show) return;
      const bob = Math.sin(state.clock.elapsedTime * 3 + i) * 0.02;
      // local to the busker group (which sits at 28, 0, 20.5)
      const lx = Math.sin(c.a) * c.r;
      const lz = -Math.cos(c.a) * c.r;
      g.position.set(lx, bob, lz);
      g.rotation.y = Math.atan2(-lx, -lz);
    });
  });
  if (!active) return null;
  return (
    <group position={[28, 0, 20.5]}>
      {/* performer on a little mat with amp */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.1, 20]} />
        <meshStandardMaterial color="#8e2a2a" />
      </mesh>
      <group rotation={[0, Math.PI, 0]}>
        <Person colors={{ shirt: "#111", pants: "#2d3436", skin: "#f1c27d", hair: "#c0392b" }}>
          <group ref={guitar} position={[0.1, 1.0, 0.25]}>
            <mesh rotation={[0, 0, -0.5]}>
              <boxGeometry args={[0.55, 0.2, 0.08]} />
              <meshStandardMaterial color="#c0392b" />
            </mesh>
            <mesh position={[-0.35, 0.18, 0]} rotation={[0, 0, -0.5]}>
              <boxGeometry args={[0.5, 0.05, 0.04]} />
              <meshStandardMaterial color="#5a3b26" />
            </mesh>
          </group>
          <mesh position={[0, 1.55, 0.3]}>
            <cylinderGeometry args={[0.02, 0.02, 1.5, 6]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[0, 1.6, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.035, 0.08, 3, 6]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
        </Person>
      </group>
      <SolidBox position={[-1.0, 0.3, -0.5]} size={[0.5, 0.6, 0.4]} color="#111" />
      <mesh position={[-1.0, 0.35, -0.29]}>
        <circleGeometry args={[0.14, 12]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.9, 0.12, -0.6]}>
        <boxGeometry args={[0.5, 0.24, 0.4]} />
        <meshStandardMaterial color="#5a3b26" />
      </mesh>
      <TextPlane lines={["팁은 여기 🎸 TIPS"]} width={0.5} height={0.14} bg="#5a3b26" color="#f3e7c9" position={[0.9, 0.12, -0.39]} />
      {[-1.4, 1.4].map((x) => (
        <group key={x} position={[x, 0, -1.2]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 2.4, 6]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[0, 2.4, 0.1]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <NightMaterial color="#222" emissive={x < 0 ? "#ff4d6d" : "#4dd0ff"} k={3} />
          </mesh>
        </group>
      ))}
      <NightLight position={[0, 2.6, 0.5]} intensity={16} distance={10} color="#ff9bd0" />
      {crowd.map((c, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <PersonLow colors={c.colors} />
        </group>
      ))}
    </group>
  );
}

export function StreetLife() {
  return (
    <>
      <CrowdWave kind="office" />
      <CrowdWave kind="student" />
      <Busker />
    </>
  );
}
