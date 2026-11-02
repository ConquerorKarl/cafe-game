import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getSeason } from "@/game/calendar";
import { SEASON_INFO } from "@/game/calendar";
import { useGame } from "@/game/store";
import { Collider, NightLight, NightMaterial, SolidBox, TextPlane } from "./primitives";

type V3 = [number, number, number];

export const useSeason = () => useGame((s) => getSeason(s.day));
export const useSnowCover = () => useGame((s) => getSeason(s.day) === "winter" && (s.weather === "snow" || s.weather === "blizzard" || s.weather === "icy"));

// ---------------------------------------------------------------------------
// Street trees that change with the seasons
// ---------------------------------------------------------------------------
export function StreetTree({ position, kind = "ginkgo", scale = 1 }: { position: V3; kind?: "ginkgo" | "cherry" | "maple"; scale?: number }) {
  const season = useSeason();
  const snow = useSnowCover();
  const info = SEASON_INFO[season];
  const color = info.foliage[kind];
  const bare = info.foliage.bare;
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 2.2, 7]} />
        <meshStandardMaterial color="#5e4630" roughness={1} />
      </mesh>
      {bare ? (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.cos(i * 1.3) * 0.5, 2.6 + (i % 2) * 0.4, Math.sin(i * 1.3) * 0.5]} rotation={[Math.cos(i) * 0.6, 0, Math.sin(i) * 0.6]} castShadow>
              <cylinderGeometry args={[0.03, 0.06, 1.6, 5]} />
              <meshStandardMaterial color="#5e4630" />
            </mesh>
          ))}
          <mesh position={[0, 2.9, 0]}>
            <sphereGeometry args={[1.0, 8, 6]} />
            <meshStandardMaterial color={color} transparent opacity={0.35} depthWrite={false} />
          </mesh>
          {snow && (
            <mesh position={[0, 3.6, 0]}>
              <sphereGeometry args={[0.7, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#f4f7fb" />
            </mesh>
          )}
        </>
      ) : (
        <>
          <mesh position={[0, 2.9, 0]} castShadow>
            <sphereGeometry args={[1.25, 10, 8]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[0.6, 2.4, 0.4]} castShadow>
            <sphereGeometry args={[0.85, 10, 8]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[-0.6, 2.5, -0.3]} castShadow>
            <sphereGeometry args={[0.8, 10, 8]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </>
      )}
      {/* tree pit grate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial color="#3d3d3d" />
      </mesh>
      <Collider size={[0.5, 0.5]} />
    </group>
  );
}

export function Pine({ position, scale = 1 }: { position: V3; scale?: number }) {
  const snow = useSnowCover();
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.8, 7]} />
        <meshStandardMaterial color="#5e4630" />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[1.3, 2.2, 8]} />
        <meshStandardMaterial color={snow ? "#cfe0d6" : "#2f6f3b"} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <coneGeometry args={[0.95, 1.8, 8]} />
        <meshStandardMaterial color={snow ? "#dfeae6" : "#357a42"} />
      </mesh>
      <Collider size={[0.7, 0.7]} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Street furniture
// ---------------------------------------------------------------------------
export function LampPost({ position, light = true }: { position: V3; light?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 4.4, 8]} />
        <meshStandardMaterial color="#3a3f46" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.5, 4.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
        <meshStandardMaterial color="#3a3f46" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[1.0, 4.3, 0]}>
        <boxGeometry args={[0.6, 0.14, 0.3]} />
        <meshStandardMaterial color="#3a3f46" />
      </mesh>
      <mesh position={[1.0, 4.22, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.22]} />
        <NightMaterial color="#fff6d6" emissive="#ffe3a0" k={3} />
      </mesh>
      {light && <NightLight position={[1.0, 4.0, 0]} intensity={30} distance={14} color="#ffe0a8" />}
      <Collider size={[0.3, 0.3]} />
    </group>
  );
}

export function UtilityPole({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 4.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.17, 9, 8]} />
        <meshStandardMaterial color="#8a8073" roughness={1} />
      </mesh>
      {[8.2, 7.4].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.12, 1.6, 0.12]} />
          <meshStandardMaterial color="#6b6358" />
        </mesh>
      ))}
      <mesh position={[0, 6.4, 0.2]}>
        <boxGeometry args={[0.5, 0.8, 0.4]} />
        <meshStandardMaterial color="#4a4f55" />
      </mesh>
      <Collider size={[0.35, 0.35]} />
    </group>
  );
}

/** A sagging wire between two points. */
export function Wire({ from, to, sag = 0.6 }: { from: V3; to: V3; sag?: number }) {
  const geom = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    return new THREE.TubeGeometry(curve, 10, 0.018, 5, false);
  }, [from, to, sag]);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#1b1b1b" />
    </mesh>
  );
}

export function Bench({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.08, 0.5]} />
        <meshStandardMaterial color="#8b5e3c" />
      </mesh>
      <mesh position={[0, 0.8, -0.22]} castShadow>
        <boxGeometry args={[1.8, 0.5, 0.06]} />
        <meshStandardMaterial color="#8b5e3c" />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.44, 0.46]} />
          <meshStandardMaterial color="#2f3640" />
        </mesh>
      ))}
      <Collider size={[1.8, 0.6]} />
    </group>
  );
}

export function Bollard({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.8, 10]} />
        <meshStandardMaterial color="#6d7378" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.095, 0.095, 0.06, 10]} />
        <meshStandardMaterial color="#f1c40f" />
      </mesh>
      <Collider size={[0.25, 0.25]} />
    </group>
  );
}

export function Planter({ position, season }: { position: V3; season: string }) {
  const petals = season === "winter" ? ["#8a7f70"] : season === "autumn" ? ["#e67e22", "#c0392b", "#f1c40f"] : ["#ff7675", "#fdcb6e", "#a29bfe", "#55efc4", "#fd79a8"];
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#7a6a5a" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.5, 0.06, 0.5]} />
        <meshStandardMaterial color={season === "winter" ? "#5b4f45" : "#2e8b57"} />
      </mesh>
      {petals.map((c, i) => (
        <mesh key={i} position={[-0.55 + i * (1.1 / Math.max(1, petals.length - 1)), 0.78, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <Collider size={[1.6, 0.6]} />
    </group>
  );
}

export function Scooter({ position, rotation = 0, color = "#e74c3c" }: { position: V3; rotation?: number; color?: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[0, 0.25, z]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.2, 0.07, 8, 14]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0.05]} castShadow>
        <boxGeometry args={[0.35, 0.3, 1.0]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.78, -0.1]}>
        <boxGeometry args={[0.4, 0.12, 0.5]} />
        <meshStandardMaterial color="#1e272e" />
      </mesh>
      <mesh position={[0, 0.95, -0.45]}>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial color="#2d98da" />
      </mesh>
      <mesh position={[0, 0.9, 0.55]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
        <meshStandardMaterial color="#636e72" />
      </mesh>
      <Collider size={[0.5, 1.3]} />
    </group>
  );
}

export function TrashCan({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.9, 0.5]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[0.54, 0.06, 0.54]} />
        <meshStandardMaterial color="#1b5e20" />
      </mesh>
      <Collider size={[0.5, 0.5]} />
    </group>
  );
}

/** Busking stage with speakers — Hongdae playground staple. */
export function Stage({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <SolidBox position={[0, 0.25, 0]} size={[6, 0.5, 3]} color="#4a4a4a" />
      <SolidBox position={[0, 0.52, 0]} size={[6, 0.04, 3]} color="#2b2b2b" collide={false} occlude={false} />
      {[-2.6, 2.6].map((x) => (
        <group key={x} position={[x, 0.5, -0.8]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.6, 1.2, 0.5]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, 0.8, 0.26]}>
            <circleGeometry args={[0.2, 14]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, 0.3, 0.26]}>
            <circleGeometry args={[0.14, 14]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      ))}
      {/* truss with lights */}
      {[-2.8, 2.8].map((x) => (
        <mesh key={x} position={[x, 2.2, -1.3]}>
          <boxGeometry args={[0.12, 3.4, 0.12]} />
          <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 3.9, -1.3]}>
        <boxGeometry args={[6, 0.12, 0.12]} />
        <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-2, -0.7, 0.7, 2].map((x, i) => (
        <mesh key={x} position={[x, 3.7, -1.2]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <NightMaterial color="#222" emissive={["#ff4d6d", "#4dd0ff", "#ffd54d", "#9b59ff"][i]} k={3} />
        </mesh>
      ))}
      <NightLight position={[0, 3.5, 0]} intensity={20} distance={12} color="#ff9bd0" />
      <TextPlane lines={["HONGDAE PLAYGROUND", "홍대 놀이터 버스킹"]} width={5.6} height={1.0} bg="#111" color="#feca57" lit position={[0, 2.9, -1.36]} />
    </group>
  );
}

/** Winter street food cart (붕어빵). */
export function FoodCart({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <SolidBox position={[0, 0.5, 0]} size={[2.0, 1.0, 1.0]} color="#c0392b" />
      <mesh position={[0, 1.04, 0]}>
        <boxGeometry args={[2.1, 0.08, 1.1]} />
        <meshStandardMaterial color="#95a5a6" metalness={0.6} roughness={0.3} />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 1.7, 0.4]}>
          <cylinderGeometry args={[0.03, 0.03, 1.3, 6]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 0]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[2.4, 0.06, 1.6]} />
        <meshStandardMaterial color="#e67e22" />
      </mesh>
      <TextPlane lines={["붕어빵 3개 ₩2,000"]} width={1.8} height={0.5} bg="#f39c12" color="#2d2d2d" lit position={[0, 1.4, 0.55]} />
      {/* steam */}
      <mesh position={[0.4, 1.4, -0.1]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
      <NightLight position={[0, 1.6, 0.6]} intensity={6} distance={5} color="#ffb366" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Café furniture / decor
// ---------------------------------------------------------------------------
export function TableSet({ position, chairAxis = "z" }: { position: V3; chairAxis?: "x" | "z" }) {
  const chairs: V3[] = chairAxis === "z" ? [[0, 0, -0.75], [0, 0, 0.75]] : [[-0.75, 0, 0], [0.75, 0, 0]];
  return (
    <group position={position}>
      <mesh position={[0, 0.74, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 20]} />
        <meshStandardMaterial color="#c9a070" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
        <meshStandardMaterial color="#2f3640" />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 16]} />
        <meshStandardMaterial color="#2f3640" />
      </mesh>
      {chairs.map((c, i) => (
        <group key={i} position={c}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.44, 0.06, 0.44]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
          <mesh position={[chairAxis === "x" ? (c[0] < 0 ? -0.2 : 0.2) : 0, 0.72, chairAxis === "z" ? (c[2] < 0 ? -0.2 : 0.2) : 0]}>
            <boxGeometry args={chairAxis === "z" ? [0.44, 0.5, 0.05] : [0.05, 0.5, 0.44]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
          {[-0.18, 0.18].flatMap((x) =>
            [-0.18, 0.18].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.21, z]}>
                <boxGeometry args={[0.05, 0.42, 0.05]} />
                <meshStandardMaterial color="#2f3640" />
              </mesh>
            ))
          )}
        </group>
      ))}
      <Collider size={[1.0, 1.0]} />
    </group>
  );
}

export function Plant({ position, big = false }: { position: V3; big?: boolean }) {
  const s = big ? 1.4 : 1;
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.5, 10]} />
        <meshStandardMaterial color="#b5593a" />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.38, 9, 8]} />
        <meshStandardMaterial color="#3e9a4b" />
      </mesh>
      <mesh position={[0.2, 1.0, 0.1]} castShadow>
        <sphereGeometry args={[0.26, 9, 8]} />
        <meshStandardMaterial color="#4fb35b" />
      </mesh>
      <mesh position={[-0.2, 0.95, -0.1]}>
        <sphereGeometry args={[0.22, 9, 8]} />
        <meshStandardMaterial color="#2f8a3d" />
      </mesh>
      <Collider size={[0.5, 0.5]} />
    </group>
  );
}

export function Painting({ position, rotation = 0, colors }: { position: V3; rotation?: number; colors: string[] }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 1.05, 0.06]} />
        <meshStandardMaterial color="#3b2a1e" />
      </mesh>
      {colors.map((c, i) => (
        <mesh key={i} position={[-0.45 + i * 0.45, 0, 0.035]}>
          <planeGeometry args={[0.44, 0.9]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

export function Rug({ position, size = [4, 3], color = "#b23a48" }: { position: V3; size?: [number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <planeGeometry args={[size[0] - 0.6, size[1] - 0.6]} />
        <meshStandardMaterial color="#e3c08d" />
      </mesh>
    </group>
  );
}

export function Bookshelf({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const books = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#16a085", "#d35400"];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SolidBox position={[0, 1.0, 0]} size={[1.4, 2.0, 0.35]} color="#6b4a35" />
      {[0.45, 0.95, 1.45].map((y) => (
        <group key={y}>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[-0.55 + i * 0.22, y + 0.17, 0.19]}>
              <boxGeometry args={[0.16, 0.34, 0.03]} />
              <meshStandardMaterial color={books[(i + Math.round(y * 3)) % books.length]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Speaker({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.22, 0.18]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh position={[0, 0, 0.095]}>
        <circleGeometry args={[0.07, 12]} />
        <meshStandardMaterial color="#636e72" />
      </mesh>
      <mesh position={[0.12, 0.06, 0.095]}>
        <circleGeometry args={[0.015, 8]} />
        <meshStandardMaterial color="#55efc4" emissive="#55efc4" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

export function PendantLamp({ position, light = false }: { position: V3; light?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.0, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <coneGeometry args={[0.28, 0.3, 14, 1, true]} />
        <meshStandardMaterial color="#c47a2c" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#fff1c2" emissive="#ffd36b" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {light && <pointLight position={[0, -0.3, 0]} intensity={6} distance={7} decay={2} color="#ffd9a0" />}
    </group>
  );
}

export function PatioSet({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <TableSet position={[0, 0, 0]} chairAxis="x" />
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
        <meshStandardMaterial color="#dcdde1" />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[1.3, 0.5, 8, 1, true]} />
        <meshStandardMaterial color="#e17055" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Awning({ position, width = 3 }: { position: V3; width?: number }) {
  return (
    <group position={position}>
      <mesh rotation={[0.45, 0, 0]} position={[0, 0, 0.55]} castShadow>
        <boxGeometry args={[width, 0.05, 1.3]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {Array.from({ length: Math.round(width / 0.6) }).map((_, i) => (
        <mesh key={i} rotation={[0.45, 0, 0]} position={[-width / 2 + 0.3 + i * 0.6, 0.015, 0.55]}>
          <boxGeometry args={[0.3, 0.05, 1.3]} />
          <meshStandardMaterial color="#f5f6fa" />
        </mesh>
      ))}
    </group>
  );
}

export function FlowerBox({ position }: { position: V3 }) {
  const petals = ["#ff7675", "#fdcb6e", "#a29bfe", "#55efc4", "#fd79a8"];
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.3, 0.32]} />
        <meshStandardMaterial color="#6b4a35" />
      </mesh>
      {petals.map((c, i) => (
        <mesh key={i} position={[-0.6 + i * 0.3, 0.3, 0]}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.5, 0.12, 0.26]} />
        <meshStandardMaterial color="#2ecc71" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Climate appliances
// ---------------------------------------------------------------------------
export function StandingFan({ position, on }: { position: V3; on: boolean }) {
  const blades = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (blades.current && on) blades.current.rotation.z += dt * 18;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 16]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshStandardMaterial color="#b2bec3" metalness={0.6} roughness={0.4} />
      </mesh>
      <group position={[0, 1.3, 0.1]}>
        <mesh>
          <torusGeometry args={[0.32, 0.02, 8, 24]} />
          <meshStandardMaterial color="#b2bec3" metalness={0.6} roughness={0.4} />
        </mesh>
        <group ref={blades}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[Math.cos((i * Math.PI * 2) / 3) * 0.15, Math.sin((i * Math.PI * 2) / 3) * 0.15, 0]}>
              <boxGeometry args={[0.28, 0.1, 0.01]} />
              <meshStandardMaterial color="#74b9ff" transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 0, -0.08]}>
          <cylinderGeometry args={[0.07, 0.07, 0.16, 10]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
      </group>
      <Collider size={[0.5, 0.5]} />
    </group>
  );
}

export function WallAC({ position, on }: { position: V3; on: boolean }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.1, 0.34, 0.26]} />
        <meshStandardMaterial color="#f5f6fa" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.12, 0.1]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[1.0, 0.04, 0.14]} />
        <meshStandardMaterial color="#dfe6e9" />
      </mesh>
      <mesh position={[0.45, 0.08, 0.135]}>
        <circleGeometry args={[0.015, 8]} />
        <meshStandardMaterial color={on ? "#2ecc71" : "#636e72"} emissive={on ? "#2ecc71" : "#000"} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

export function SpaceHeater({ position, on }: { position: V3; on: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.22]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      {[0.2, 0.35, 0.5].map((y) => (
        <mesh key={y} position={[0, y, 0.115]}>
          <boxGeometry args={[0.4, 0.06, 0.01]} />
          <meshStandardMaterial color={on ? "#ff6b35" : "#555"} emissive={on ? "#ff4d1a" : "#000"} emissiveIntensity={on ? 2.5 : 0} toneMapped={false} />
        </mesh>
      ))}
      {on && <pointLight position={[0, 0.4, 0.4]} intensity={3} distance={4} color="#ff7a3d" />}
      <Collider size={[0.5, 0.3]} />
    </group>
  );
}

export function Thermostat({ position, rotation = 0, on }: { position: V3; rotation?: number; on: boolean }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[0.18, 0.24, 0.03]} />
        <meshStandardMaterial color="#f5f6fa" />
      </mesh>
      <mesh position={[0, 0.03, 0.017]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color={on ? "#ff7675" : "#636e72"} emissive={on ? "#ff7675" : "#000"} emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

export function CeilingCassette({ position, on }: { position: V3; on: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.9, 0.08, 0.9]} />
        <meshStandardMaterial color="#f5f6fa" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.32, -0.045, Math.sin((i * Math.PI) / 2) * 0.32]} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.08, 0.02, 0.6]} />
          <meshStandardMaterial color="#b2bec3" />
        </mesh>
      ))}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.02, 8]} />
        <meshStandardMaterial color={on ? "#74b9ff" : "#636e72"} emissive={on ? "#74b9ff" : "#000"} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
