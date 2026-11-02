import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { LUNCH_END, LUNCH_START } from "@/game/reputation";
import { isWeekend } from "@/game/calendar";
import { addCollider, addPlatform, addRoof, addStairs, useInteractable } from "@/game/registry";
import { useGame } from "@/game/store";
import type { CustomerColors } from "@/game/types";
import { NightLight, NightMaterial, Person, PersonLow, SolidBox, TextPlane } from "./primitives";
import { facade, tex } from "./textures";

/**
 * HANWOO Group HQ — a chaebol office tower on the plaza. Three fitted floors you can walk:
 *  1F lobby (reception, turnstiles, waiting area, brand wall), 2F open-plan desks, 3F boardroom + chairman's office.
 * Staff sit at their desks all day; on weekdays a chunk of them leave for lunch at noon and come back ~13:30.
 */
const W = 16;
const D = 14;
const FH = 3.6;
const FLOORS_TOTAL = 14;
const GLASS = "#9fd3f0";
const MARBLE = "#e9e4dc";
const WALNUT = "#4b3222";
const NAVY = "#1e2a44";
const GOLD = "#c9a24d";

const SUIT_COLORS: CustomerColors[] = [
  { shirt: "#1e2a44", pants: "#1e2a44", skin: "#f6d7b0", hair: "#1c1c1c" },
  { shirt: "#2d3436", pants: "#2d3436", skin: "#f1c27d", hair: "#2b1b17" },
  { shirt: "#f5f6fa", pants: "#1e2a44", skin: "#ffdbac", hair: "#4a2c2a" },
  { shirt: "#3d4a63", pants: "#3d4a63", skin: "#e8b98a", hair: "#1c1c1c" },
  { shirt: "#b2bec3", pants: "#2d3436", skin: "#f6d7b0", hair: "#6b6b6b" },
  { shirt: "#f5f6fa", pants: "#2d3436", skin: "#e0ac69", hair: "#1c1c1c" },
];

/** Deterministic per-worker: do they leave for lunch today? ~65% do on weekdays. */
function leavesForLunch(i: number, day: number) {
  const h = Math.sin(i * 12.9898 + day * 78.233) * 43758.5453;
  return h - Math.floor(h) < 0.65;
}

function Desk({ position, yaw = 0, worker, seated, monitorColor = "#74b9ff" }: { position: [number, number, number]; yaw?: number; worker: CustomerColors; seated: boolean; monitorColor?: string }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.4, 0.05, 0.7]} />
        <meshStandardMaterial color="#f5f6fa" roughness={0.6} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.36, 0]}>
          <boxGeometry args={[0.06, 0.72, 0.6]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
      ))}
      <mesh position={[0, 1.0, -0.2]}>
        <boxGeometry args={[0.6, 0.36, 0.03]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh position={[0, 1.0, -0.183]}>
        <planeGeometry args={[0.55, 0.31]} />
        <NightMaterial color={seated ? monitorColor : "#1e272e"} emissive={seated ? monitorColor : "#000"} k={0.8} />
      </mesh>
      <mesh position={[0, 0.8, -0.2]}>
        <boxGeometry args={[0.08, 0.12, 0.08]} />
        <meshStandardMaterial color="#636e72" />
      </mesh>
      <mesh position={[0, 0.76, 0.1]}>
        <boxGeometry args={[0.4, 0.02, 0.14]} />
        <meshStandardMaterial color="#dfe6e9" />
      </mesh>
      <mesh position={[0.5, 0.78, 0.1]}>
        <cylinderGeometry args={[0.04, 0.03, 0.1, 10]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* chair */}
      <group position={[0, 0, 0.75]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.46, 0.06, 0.46]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
        <mesh position={[0, 0.78, -0.22]}>
          <boxGeometry args={[0.46, 0.6, 0.06]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.03, 5]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
        {seated && <Person colors={worker} sitting />}
      </group>
    </group>
  );
}

function Lobby({ hz, hw }: { hz: number; hw: number }) {
  const desk = useRef<THREE.Group>(null!);
  useInteractable(desk, useMemo(() => ({ kind: "npc" as const, id: "HANWOO reception: 'Deliveries go to B1. Visitors need a badge. …Oh, you're the café? The 11th floor orders 40 americanos every Monday — talk to procurement.'" }), []));
  return (
    <group>
      {/* marble floor + brand wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[W - 0.6, D - 0.6]} />
        <meshStandardMaterial map={tex.terrazzo(6, 6)} color={MARBLE} roughness={0.2} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.8, -hz + 0.32]}>
        <planeGeometry args={[W - 1, 3.4]} />
        <meshStandardMaterial color={WALNUT} roughness={0.6} />
      </mesh>
      <TextPlane lines={["HANWOO GROUP", "한우그룹 · Building the next century"]} width={6} height={1.3} bg={WALNUT} color={GOLD} lit position={[0, 2.4, -hz + 0.34]} />
      {/* reception desk */}
      <group ref={desk} position={[0, 0, -hz + 2.6]}>
        <SolidBox position={[0, 0.55, 0]} size={[5.0, 1.1, 1.0]} color={WALNUT} roughness={0.5} />
        <mesh position={[0, 1.13, 0]}>
          <boxGeometry args={[5.2, 0.06, 1.2]} />
          <meshStandardMaterial color={MARBLE} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.6, 0.51]}>
          <planeGeometry args={[4.6, 0.5]} />
          <NightMaterial color={GOLD} emissive={GOLD} k={1.2} />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <group key={x} position={[x, 0, -0.9]}>
            <Person colors={{ shirt: "#f5f6fa", pants: NAVY, skin: "#ffdbac", hair: "#1c1c1c" }} />
          </group>
        ))}
        {[-1.6, 1.6].map((x) => (
          <mesh key={x} position={[x, 1.3, 0]}>
            <boxGeometry args={[0.5, 0.32, 0.03]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
        ))}
      </group>
      {/* turnstiles to the lifts */}
      {[-3.6, -2.0, 2.0, 3.6].map((x) => (
        <group key={x} position={[x, 0, -hz + 5.0]}>
          <SolidBox position={[0, 0.5, 0]} size={[0.3, 1.0, 1.4]} color="#dfe6e9" metalness={0.5} roughness={0.3} />
          <mesh position={[0, 1.02, -0.6]}>
            <boxGeometry args={[0.2, 0.04, 0.1]} />
            <NightMaterial color="#2ecc71" emissive="#2ecc71" k={2} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.9, -hz + 5.0]}>
        <boxGeometry args={[1.6, 0.04, 0.06]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      <TextPlane lines={["임직원 전용 · STAFF ONLY", "방문객은 안내데스크로"]} width={2.4} height={0.5} bg="#1e272e" color="#ffffff" position={[0, 1.6, -hz + 5.0]} />
      {/* lifts */}
      {[-5.8, -4.4, 4.4, 5.8].map((x) => (
        <group key={x} position={[x, 0, -hz + 0.5]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[1.2, 2.4, 0.2]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.2, 0.11]}>
            <boxGeometry args={[0.03, 2.3, 0.02]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 2.6, 0.11]}>
            <planeGeometry args={[0.3, 0.12]} />
            <NightMaterial color="#111" emissive="#e74c3c" k={2} />
          </mesh>
        </group>
      ))}
      {/* waiting lounge */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 4.2, 0, 1.6]}>
          <SolidBox position={[0, 0.25, 0]} size={[2.4, 0.5, 0.9]} color="#1e2a44" roughness={1} />
          <mesh position={[0, 0.7, -0.35]}>
            <boxGeometry args={[2.4, 0.5, 0.2]} />
            <meshStandardMaterial color="#1e2a44" roughness={1} />
          </mesh>
          <group position={[-0.6, 0, 0.05]} rotation={[0, Math.PI, 0]}>
            <Person colors={SUIT_COLORS[(side + 1) % SUIT_COLORS.length]} sitting />
          </group>
        </group>
      ))}
      <SolidBox position={[0, 0.22, 1.6]} size={[1.4, 0.44, 0.7]} color={MARBLE} roughness={0.2} />
      {/* ficus trees in gold planters */}
      {[-6.4, 6.4].map((x) =>
        [-2.5, 3.5].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <SolidBox position={[0, 0.35, 0]} size={[0.7, 0.7, 0.7]} color={GOLD} metalness={0.6} roughness={0.35} />
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 1.2, 6]} />
              <meshStandardMaterial color="#6b4a35" />
            </mesh>
            <mesh position={[0, 2.1, 0]}>
              <sphereGeometry args={[0.6, 10, 8]} />
              <meshStandardMaterial color="#2f8a3d" />
            </mesh>
          </group>
        ))
      )}
      {/* security guard + a lanyard-wearer rushing */}
      <group position={[2.8, 0, -hz + 6.2]} rotation={[0, Math.PI, 0]}>
        <Person colors={{ shirt: "#2d3436", pants: "#2d3436", skin: "#e8b98a", hair: "#1c1c1c" }} apron="#1e2a44" />
      </group>
      <TextPlane lines={["1F LOBBY · 로비", "2F 사무실 · 3F 임원실 · 회의실"]} width={2.4} height={0.5} bg="#1e272e" color={GOLD} lit position={[hw - 0.34, 2.3, 1.0]} rotation={[0, -Math.PI / 2, 0]} />
      {/* stock ticker */}
      <group position={[-hw + 0.34, 2.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[8, 0.5, 0.06]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <TextPlane lines={["HANWOO ▲ 1.8%   KOSPI ▲ 0.4%   KRW/USD 1,342   HANWOO BIO ▼ 2.1%"]} width={7.8} height={0.4} bg="#111" color="#2ecc71" lit position={[0, 0, 0.035]} />
      </group>
      <pointLight position={[0, 3.2, 0]} intensity={24} distance={16} decay={2} color="#fff6e0" />
      <NightLight position={[0, 3.0, -hz + 3]} intensity={10} distance={10} color={GOLD} />
    </group>
  );
}

function OpenPlan({ y, hz, hw, atDesk }: { y: number; hz: number; hw: number; atDesk: (i: number) => boolean }) {
  const desks = useMemo(() => {
    const out: { x: number; z: number; yaw: number; i: number }[] = [];
    let i = 0;
    for (const row of [-3.0, -0.2, 2.6]) {
      for (const x of [-5.2, -3.6, -2.0, 2.0, 3.6, 5.2]) {
        out.push({ x, z: row, yaw: 0, i: i++ });
      }
    }
    return out;
  }, []);
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[W - 0.6, D - 0.6]} />
        <meshStandardMaterial color="#8d99ae" roughness={1} />
      </mesh>
      {desks.map((d) => (
        <Desk key={d.i} position={[d.x, 0, d.z]} yaw={d.yaw} worker={SUIT_COLORS[d.i % SUIT_COLORS.length]} seated={atDesk(d.i)} monitorColor={["#74b9ff", "#dfe6e9", "#a3f7bf"][d.i % 3]} />
      ))}
      {/* partitions between desk rows */}
      {[-1.6, 1.2].map((z) => (
        <mesh key={z} position={[0, 0.9, z]}>
          <boxGeometry args={[W - 2, 0.9, 0.04]} />
          <meshStandardMaterial color="#b2bec3" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* printer corner, water cooler, whiteboard */}
      <SolidBox position={[-hw + 0.9, 0.5, hz - 1.0]} size={[1.0, 1.0, 0.7]} color="#dfe6e9" />
      <mesh position={[-hw + 0.9, 1.15, hz - 1.0]}>
        <boxGeometry args={[0.6, 0.3, 0.5]} />
        <meshStandardMaterial color="#636e72" />
      </mesh>
      <group position={[hw - 0.9, 0, hz - 1.0]}>
        <SolidBox position={[0, 0.5, 0]} size={[0.4, 1.0, 0.4]} color="#f5f6fa" />
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.5, 12]} />
          <meshStandardMaterial color="#74b9ff" transparent opacity={0.6} />
        </mesh>
      </group>
      <mesh position={[0, 1.6, -hz + 0.34]}>
        <planeGeometry args={[4, 1.6]} />
        <meshStandardMaterial color="#f7f7f4" />
      </mesh>
      <TextPlane lines={["Q3 KPI · 분기 목표", "매출 ▲ 12% · 신규 고객 2,400 · 야근 금지(?)"]} width={3.8} height={1.4} bg="#f7f7f4" color="#1e2a44" position={[0, 1.6, -hz + 0.35]} />
      <TextPlane lines={["2F · 영업1팀 · 마케팅팀"]} width={2.2} height={0.4} bg="#1e272e" color={GOLD} lit position={[hw - 0.34, 2.6, -2]} rotation={[0, -Math.PI / 2, 0]} />
      <pointLight position={[-3, 3.2, 0]} intensity={18} distance={12} decay={2} color="#ffffff" />
      <pointLight position={[3, 3.2, 0]} intensity={18} distance={12} decay={2} color="#ffffff" />
    </group>
  );
}

function Executive({ y, hz, hw, atDesk }: { y: number; hz: number; hw: number; atDesk: (i: number) => boolean }) {
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[W - 0.6, D - 0.6]} />
        <meshStandardMaterial map={tex.walnut(5, 5)} roughness={0.5} />
      </mesh>
      {/* glass boardroom on the left */}
      <SolidBox position={[-1.8, 1.6, 0]} size={[0.06, 3.2, D - 0.8]} color={GLASS} transparent opacity={0.3} roughness={0.05} />
      <group position={[-4.6, 0, 0]}>
        <SolidBox position={[0, 0.74, 0]} size={[4.6, 0.08, 1.6]} color={WALNUT} roughness={0.4} />
        {[-1.8, 1.8].map((x) => (
          <mesh key={x} position={[x, 0.35, 0]}>
            <boxGeometry args={[0.3, 0.7, 1.2]} />
            <meshStandardMaterial color={WALNUT} />
          </mesh>
        ))}
        {[-1.6, -0.5, 0.6, 1.7].flatMap((x) =>
          [-1.15, 1.15].map((z, side) => (
            <group key={`${x}${z}`} position={[x, 0, z]} rotation={[0, side === 0 ? 0 : Math.PI, 0]}>
              <mesh position={[0, 0.45, 0]}>
                <boxGeometry args={[0.5, 0.06, 0.5]} />
                <meshStandardMaterial color="#2d3436" />
              </mesh>
              <mesh position={[0, 0.8, -0.24]}>
                <boxGeometry args={[0.5, 0.64, 0.06]} />
                <meshStandardMaterial color="#2d3436" />
              </mesh>
              {atDesk(20 + Math.round(x * 2) + side) && <Person colors={SUIT_COLORS[(Math.round(x * 3) + side + 7) % SUIT_COLORS.length]} sitting />}
            </group>
          ))
        )}
        <mesh position={[0, 1.2, -hz + 0.9]}>
          <boxGeometry args={[3.2, 1.8, 0.06]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <TextPlane lines={["FY2026 전략 · HANWOO VISION", "📊 ▲ ▲ ▼ ▲"]} width={3.0} height={1.6} bg="#1e2a44" color="#ffffff" lit position={[0, 1.2, -hz + 0.94]} />
        <TextPlane lines={["대회의실 BOARDROOM"]} width={1.6} height={0.3} bg="#1e272e" color={GOLD} lit position={[2.75, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} />
      </group>
      {/* chairman's office on the right */}
      <SolidBox position={[1.8, 1.6, 0]} size={[0.06, 3.2, D - 0.8]} color={WALNUT} />
      <group position={[4.8, 0, 0]}>
        <group position={[0, 0, -2.6]}>
          <SolidBox position={[0, 0.38, 0]} size={[2.6, 0.76, 1.1]} color={WALNUT} roughness={0.4} />
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[2.7, 0.04, 1.2]} />
            <meshStandardMaterial color="#2d1b12" roughness={0.3} />
          </mesh>
          <mesh position={[0.6, 0.9, -0.2]}>
            <boxGeometry args={[0.6, 0.36, 0.03]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[-0.7, 0.9, 0]}>
            <boxGeometry args={[0.3, 0.14, 0.2]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.2} />
          </mesh>
          <TextPlane lines={["회장 · CHAIRMAN"]} width={0.8} height={0.14} bg={GOLD} color="#2d1b12" position={[-0.7, 0.9, 0.11]} />
          <group position={[0, 0, -0.95]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.7, 0.08, 0.7]} />
              <meshStandardMaterial color="#5a2a1a" />
            </mesh>
            <mesh position={[0, 1.0, -0.3]}>
              <boxGeometry args={[0.7, 1.1, 0.12]} />
              <meshStandardMaterial color="#5a2a1a" />
            </mesh>
            <Person colors={{ shirt: "#1e1e1e", pants: "#1e1e1e", skin: "#e8b98a", hair: "#6b6b6b" }} sitting />
          </group>
        </group>
        {/* trophy cabinet, flags, portrait, ridiculous leather sofa */}
        <SolidBox position={[-2.4, 1.0, 1.5]} size={[0.5, 2.0, 2.4]} color={WALNUT} />
        {[0.8, 1.3, 1.8].map((yy) =>
          [0.6, 1.3, 2.0, 2.6].map((z, i) => (
            <mesh key={`${yy}${z}`} position={[-2.1, yy, z - 0.1]}>
              <cylinderGeometry args={[0.04, 0.06, 0.2 + (i % 2) * 0.1, 8]} />
              <meshStandardMaterial color={i % 2 ? GOLD : "#c0c0c0"} metalness={0.9} roughness={0.2} />
            </mesh>
          ))
        )}
        <mesh position={[0, 1.9, -hz + 0.9]}>
          <boxGeometry args={[1.4, 1.8, 0.06]} />
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.3} />
        </mesh>
        <TextPlane lines={["창업주", "故 한우석 회장"]} width={1.2} height={1.6} bg="#2d1b12" color={GOLD} position={[0, 1.9, -hz + 0.94]} />
        {[-1, 1].map((sx) => (
          <group key={sx} position={[sx * 1.2, 0, -hz + 1.2]}>
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 2.8, 6]} />
              <meshStandardMaterial color={GOLD} metalness={0.8} />
            </mesh>
            <mesh position={[0.25, 2.3, 0]}>
              <planeGeometry args={[0.5, 0.8]} />
              <meshStandardMaterial color={sx < 0 ? "#ffffff" : NAVY} side={THREE.DoubleSide} />
            </mesh>
            {sx < 0 && (
              <mesh position={[0.25, 2.3, 0.01]}>
                <circleGeometry args={[0.12, 16]} />
                <meshStandardMaterial color="#cd2e3a" side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        ))}
        <group position={[0.4, 0, 2.6]}>
          <SolidBox position={[0, 0.28, 0]} size={[2.6, 0.56, 0.9]} color="#5a2a1a" roughness={0.6} />
          <mesh position={[0, 0.75, -0.35]}>
            <boxGeometry args={[2.6, 0.5, 0.2]} />
            <meshStandardMaterial color="#5a2a1a" roughness={0.6} />
          </mesh>
          <group position={[-0.7, 0, 0.05]} rotation={[0, Math.PI, 0]}>
            <Person colors={SUIT_COLORS[3]} sitting />
          </group>
        </group>
        <mesh position={[0.4, 0.4, 1.3]}>
          <boxGeometry args={[1.2, 0.05, 0.6]} />
          <meshStandardMaterial color="#dfe6e9" roughness={0.1} metalness={0.2} transparent opacity={0.7} />
        </mesh>
        {/* secretary just outside the door */}
        <group position={[-1.1, 0, 4.8]} rotation={[0, Math.PI, 0]}>
          <Person colors={{ shirt: "#f5f6fa", pants: NAVY, skin: "#ffdbac", hair: "#2b1b17" }} />
        </group>
        <TextPlane lines={["회장실 · CHAIRMAN'S OFFICE", "비서실 통해 방문"]} width={1.8} height={0.5} bg={WALNUT} color={GOLD} lit position={[-2.95, 2.4, 4.0]} rotation={[0, -Math.PI / 2, 0]} />
      </group>
      <TextPlane lines={["3F · 임원실 · 회의실"]} width={2.2} height={0.4} bg="#1e272e" color={GOLD} lit position={[hw - 0.34, 2.8, -5.0]} rotation={[0, -Math.PI / 2, 0]} />
      <pointLight position={[-4.6, 3.2, 0]} intensity={14} distance={10} decay={2} color="#ffffff" />
      <pointLight position={[4.8, 3.2, 0]} intensity={14} distance={10} decay={2} color="#ffe3b0" />
    </group>
  );
}

/** Stairwell inside the tower: two straight flights at the back-right, with landings. */
function Stairs({ hz, hw }: { hz: number; hw: number }) {
  const x0 = hw - 3.4;
  const x1 = hw - 2.2;
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    // flight 0→1 runs along +z from z=-hz+1 (bottom) to z=-hz+5.8 (top)
    const zA = -hz + 1.0;
    const zB = -hz + 5.8;
    cleanups.push(addStairs({ x0: x0 + 0.0, x1: x1 + 0.0, z0: zA, z1: zB, axis: "z", yAt0: 0, yAt1: FH }));
    cleanups.push(addPlatform({ x0: x0 - 0.3, x1: hw - 0.3, z0: zB - 0.2, z1: zB + 1.6, y: FH }));
    // flight 1→2 runs along -z from z=-hz+5.8 back to z=-hz+1
    cleanups.push(addStairs({ x0: x1 + 0.3, x1: hw - 0.7, z0: zA, z1: zB, axis: "z", yAt0: FH * 2, yAt1: FH }));
    cleanups.push(addPlatform({ x0: x0 - 0.3, x1: hw - 0.3, z0: zA - 1.6, z1: zA + 0.2, y: FH * 2 }));
    cleanups.push(addPlatform({ x0: -hw + 0.3, x1: hw - 0.3, z0: -hz + 0.3, z1: hz - 0.3, y: FH }));
    cleanups.push(addPlatform({ x0: -hw + 0.3, x1: hw - 0.3, z0: -hz + 0.3, z1: hz - 0.3, y: FH * 2 }));
    // balustrade between the two flights and guard at the open edges
    cleanups.push(addCollider({ minX: x1 + 0.12, maxX: x1 + 0.18, minZ: zA, maxZ: zB, minY: -1, maxY: FH * 2 + 2 }));
    return () => cleanups.forEach((f) => f());
  }, [hz, hw, x0, x1]);
  const len = 4.8;
  const steps = 12;
  const flight = (yBase: number, dir: 1 | -1, xMid: number) => (
    <>
      {Array.from({ length: steps }).map((_, i) => {
        const t = (i + 0.5) / steps;
        const z = dir === 1 ? -hz + 1.0 + t * len : -hz + 5.8 - t * len;
        const y = yBase + t * FH;
        return (
          <mesh key={i} position={[xMid, y - FH / steps / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[1.2, FH / steps, len / steps]} />
            <meshStandardMaterial color={i % 2 ? "#cfc8bd" : "#c0b9ad"} roughness={0.8} />
          </mesh>
        );
      })}
    </>
  );
  return (
    <group>
      {flight(0, 1, (x0 + x1) / 2)}
      {flight(FH, -1, (x1 + 0.3 + hw - 0.7) / 2)}
      <mesh position={[x1 + 0.15, FH + 0.6, -hz + 3.4]}>
        <boxGeometry args={[0.06, FH * 2 + 1.2, 4.8]} />
        <meshStandardMaterial color="#e9e2d6" />
      </mesh>
      {/* landing slabs */}
      <mesh position={[(x0 - 0.3 + hw - 0.3) / 2, FH - 0.1, -hz + 5.8 + 0.7]}>
        <boxGeometry args={[hw - 0.3 - (x0 - 0.3), 0.2, 1.8]} />
        <meshStandardMaterial color="#cfc8bd" />
      </mesh>
      <mesh position={[(x0 - 0.3 + hw - 0.3) / 2, FH * 2 - 0.1, -hz + 1.0 - 0.7]}>
        <boxGeometry args={[hw - 0.3 - (x0 - 0.3), 0.2, 1.8]} />
        <meshStandardMaterial color="#cfc8bd" />
      </mesh>
      <TextPlane lines={["계단 STAIRS → 2F · 3F"]} width={1.4} height={0.3} bg="#1e272e" color="#ffffff" lit position={[x0 - 0.5, 2.2, -hz + 0.5]} />
    </group>
  );
}

/** Office workers crossing the plaza at lunch (a visual wave — the shop's customers spawn separately). */
function LunchWave({ origin }: { origin: [number, number] }) {
  const day = useGame((s) => s.day);
  const clock = useGame((s) => s.clock);
  const n = 14;
  const walkers = useMemo(() => Array.from({ length: n }).map((_, i) => ({ dx: ((i * 37) % 11) - 5, lag: (i * 13) % 9, dir: i % 3 === 0 ? -1 : 1, colors: SUIT_COLORS[i % SUIT_COLORS.length] })), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const weekday = !isWeekend(day);
  const active = weekday && clock >= LUNCH_START - 2 && clock < LUNCH_END + 20;
  useFrame((state) => {
    if (!active) return;
    const t = state.clock.elapsedTime;
    const phase = clock < LUNCH_START + 14 ? 1 : clock > LUNCH_END - 14 ? -1 : 0; // 1 leaving, -1 returning, 0 out
    walkers.forEach((w, i) => {
      const g = refs.current[i];
      if (!g) return;
      if (phase === 0) {
        g.visible = false;
        return;
      }
      g.visible = true;
      const prog = Math.max(0, Math.min(1, ((clock - (phase === 1 ? LUNCH_START - 2 : LUNCH_END - 14)) * 60 + (t % 60)) / 60 - w.lag * 0.08));
      const p = phase === 1 ? prog : 1 - prog;
      const x = origin[0] + w.dx * 0.6 + w.dir * p * 14;
      const z = origin[1] + 3 + p * 6 + Math.sin(i) * 0.6;
      g.position.set(x, Math.abs(Math.sin(t * 8 + i)) * 0.04, z);
      g.rotation.y = Math.atan2(w.dir, 0.4) * (phase === 1 ? 1 : -1);
    });
  });
  if (!active) return null;
  return (
    <>
      {walkers.map((w, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <PersonLow colors={w.colors} />
        </group>
      ))}
    </>
  );
}

export function OfficeTower({ position }: { position: [number, number] }) {
  const hz = D / 2;
  const hw = W / 2;
  const day = useGame((s) => s.day);
  const clock = useGame((s) => s.clock);
  const weekday = !isWeekend(day);
  const outForLunch = weekday && clock >= LUNCH_START && clock < LUNCH_END;
  const atDesk = (i: number) => (!weekday ? i % 4 === 0 : outForLunch ? !leavesForLunch(i, day) : true);
  const upper = useMemo(() => facade(6, FLOORS_TOTAL - 3, 77, "#1e2a44", 0.7), []);
  const side = useMemo(() => facade(5, FLOORS_TOTAL - 3, 78, "#1e2a44", 0.65), []);
  const H = FH * FLOORS_TOTAL;
  useEffect(() => {
    const r = Math.max(hw, hz) + 0.3;
    const cleanups = [addRoof({ minX: position[0] - r, maxX: position[0] + r, minZ: position[1] - r, maxZ: position[1] + r, minY: -100, maxY: 100 })];
    return () => cleanups.forEach((f) => f());
  }, [position, hw, hz]);

  return (
    <group position={[position[0], 0, position[1]]}>
      {/* podium: three fitted floors */}
      {[0, 1, 2].map((f) => (
        <group key={f}>
          <SolidBox position={[0, f * FH + FH / 2, -hz + 0.15]} size={[W, FH, 0.3]} color="#2d3a55" castShadow={false} />
          <SolidBox position={[-hw + 0.15, f * FH + FH / 2, 0]} size={[0.3, FH, D]} color="#2d3a55" castShadow={false} />
          <SolidBox position={[hw - 0.15, f * FH + FH / 2, 0]} size={[0.3, FH, D]} color="#2d3a55" castShadow={false} />
          {/* glass front with a revolving-door opening on the ground floor */}
          {f === 0 ? (
            <>
              <SolidBox position={[-(hw + 1.2) / 2, 1.5, hz - 0.1]} size={[hw - 1.2, 3.0, 0.08]} color={GLASS} transparent opacity={0.3} roughness={0.05} metalness={0.3} />
              <SolidBox position={[(hw + 1.2) / 2, 1.5, hz - 0.1]} size={[hw - 1.2, 3.0, 0.08]} color={GLASS} transparent opacity={0.3} roughness={0.05} metalness={0.3} />
              <SolidBox position={[0, 3.3, hz - 0.15]} size={[W, 0.6, 0.3]} color="#2d3a55" collide={false} />
              <SolidBox position={[-1.2, 1.5, hz - 0.1]} size={[0.1, 3.0, 0.14]} color={GOLD} metalness={0.7} />
              <SolidBox position={[1.2, 1.5, hz - 0.1]} size={[0.1, 3.0, 0.14]} color={GOLD} metalness={0.7} />
            </>
          ) : (
            <>
              <SolidBox position={[0, f * FH + FH / 2, hz - 0.1]} size={[W, FH, 0.08]} color={GLASS} transparent opacity={0.3} roughness={0.05} metalness={0.3} />
            </>
          )}
          {/* floor slab / ceiling */}
          {f > 0 && (
            <mesh position={[0, f * FH - 0.15, 0]}>
              <boxGeometry args={[W - 0.6, 0.3, D - 0.6]} />
              <meshStandardMaterial color="#f3eee4" />
            </mesh>
          )}
        </group>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, FH * 3 - 0.02, 0]}>
        <planeGeometry args={[W - 0.6, D - 0.6]} />
        <meshStandardMaterial color="#f3eee4" />
      </mesh>
      <Lobby hz={hz} hw={hw} />
      <OpenPlan y={FH} hz={hz} hw={hw} atDesk={atDesk} />
      <Executive y={FH * 2} hz={hz} hw={hw} atDesk={atDesk} />
      <Stairs hz={hz} hw={hw} />

      {/* tower above the podium */}
      <mesh position={[0, FH * 3 + (H - FH * 3) / 2, 0]}>
        <boxGeometry args={[W, H - FH * 3, D]} />
        <meshStandardMaterial map={tex.glass(4, 10)} color="#2d3a55" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, FH * 3 + (H - FH * 3) / 2, hz + 0.02]}>
        <planeGeometry args={[W - 0.1, H - FH * 3 - 0.1]} />
        <NightMaterial map={upper.map} emissiveMap={upper.emissiveMap} k={1.5} emissive="#ffffff" />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (hw + 0.02), FH * 3 + (H - FH * 3) / 2, 0]} rotation={[0, (sx * Math.PI) / 2, 0]}>
          <planeGeometry args={[D - 0.1, H - FH * 3 - 0.1]} />
          <NightMaterial map={side.map} emissiveMap={side.emissiveMap} k={1.3} emissive="#ffffff" />
        </mesh>
      ))}
      {/* crown sign + helipad */}
      <group position={[0, H + 1.6, hz - 0.6]}>
        <mesh position={[0, 0, -0.2]}>
          <boxGeometry args={[9, 2.4, 0.3]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <TextPlane lines={["HANWOO 한우"]} width={8.6} height={2.2} bg="#111" color={GOLD} neon position={[0, 0, 0]} />
        <NightLight position={[0, 0, 2]} intensity={14} distance={16} color={GOLD} />
      </group>
      <mesh position={[0, H + 0.25, -1.5]}>
        <cylinderGeometry args={[3.2, 3.2, 0.1, 24]} />
        <meshStandardMaterial color="#636e72" />
      </mesh>
      <TextPlane lines={["H"]} width={2.4} height={2.4} bg="#636e72" color="#f5f6fa" position={[0, H + 0.31, -1.5]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* entrance canopy + plaque + flags */}
      <mesh position={[0, 3.6, hz + 1.6]}>
        <boxGeometry args={[6, 0.2, 3.2]} />
        <meshStandardMaterial color="#1e2a44" />
      </mesh>
      <TextPlane lines={["HANWOO GROUP HQ", "한우그룹 본사"]} width={3.0} height={0.8} bg={WALNUT} color={GOLD} lit position={[-hw + 2.2, 1.5, hz + 0.02]} />
      {[-4.2, 4.2].map((x) => (
        <group key={x} position={[x, 0, hz + 2.4]}>
          <mesh position={[0, 3.0, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 6, 8]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.7} />
          </mesh>
          <mesh position={[0.5, 5.4, 0]}>
            <planeGeometry args={[1.0, 0.65]} />
            <meshStandardMaterial color={x < 0 ? NAVY : "#ffffff"} side={THREE.DoubleSide} />
          </mesh>
          {x < 0 && <TextPlane lines={["H"]} width={0.6} height={0.5} bg={NAVY} color={GOLD} position={[0.5, 5.4, 0.01]} />}
          {x > 0 && (
            <mesh position={[0.5, 5.4, 0.01]}>
              <circleGeometry args={[0.14, 16]} />
              <meshStandardMaterial color="#cd2e3a" side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      {/* black sedan at the kerb */}
      <group position={[6.5, 0, hz + 3.2]} rotation={[0, Math.PI / 2, 0]}>
        <SolidBox position={[0, 0.5, 0]} size={[1.9, 0.5, 4.8]} color="#111" roughness={0.25} metalness={0.5} />
        <mesh position={[0, 0.95, -0.2]}>
          <boxGeometry args={[1.7, 0.5, 2.6]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.95, -0.2]}>
          <boxGeometry args={[1.72, 0.3, 2.4]} />
          <meshStandardMaterial color="#3b4a63" transparent opacity={0.7} />
        </mesh>
        {[-0.95, 0.95].flatMap((x) =>
          [-1.5, 1.5].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.32, 0.32, 0.22, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          ))
        )}
        <group position={[-1.3, 0, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
          <Person colors={{ shirt: "#1e1e1e", pants: "#1e1e1e", skin: "#f1c27d", hair: "#1c1c1c" }} />
        </group>
      </group>
      <LunchWave origin={[position[0] * 0 + 0, hz]} />
    </group>
  );
}
