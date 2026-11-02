import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getSeason } from "@/game/calendar";
import type { DecorDef } from "@/game/catalog";
import { CEIL_H } from "@/game/layout";
import { useGame } from "@/game/store";
import { TextPlane } from "./primitives";

const DARK = "#2d3436";
const BRASS = "#c9a24d";

function Legs({ w, d, h = 0.16, color = BRASS, inset = 0.1 }: { w: number; d: number; h?: number; color?: string; inset?: number }) {
  return (
    <>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset)]}>
            <cylinderGeometry args={[0.025, 0.02, h, 8]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
          </mesh>
        ))
      )}
    </>
  );
}

function Cushion({ x, z, color, w = 0.4, d = 0.4 }: { x: number; z: number; color: string; w?: number; d?: number }) {
  return (
    <mesh position={[x, 0.5, z]} castShadow>
      <boxGeometry args={[w, 0.1, d]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Shade({ y, r = 0.22, h = 0.25, color = "#f5e6c8", light = true, intensity = 2.5 }: { y: number; r?: number; h?: number; color?: string; light?: boolean; intensity?: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <cylinderGeometry args={[r * 0.85, r, h, 16, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} emissive="#ffd9a0" emissiveIntensity={0.5} roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#fff6d6" emissive="#ffd9a0" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {light && <pointLight intensity={intensity} distance={5} decay={2} color="#ffd9a0" />}
    </group>
  );
}

function Pot({ r = 0.2, h = 0.4, color = "#b5593a", y = 0 }: { r?: number; h?: number; color?: string; y?: number }) {
  return (
    <mesh position={[0, y + h / 2, 0]} castShadow>
      <cylinderGeometry args={[r, r * 0.82, h, 12]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Foliage({ y, r, color, n = 3 }: { y: number; r: number; color: string; n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <mesh key={i} position={[Math.cos(i * 2.1) * r * 0.45, y + (i % 2) * r * 0.4, Math.sin(i * 2.1) * r * 0.45]} castShadow>
          <sphereGeometry args={[r * (0.7 + (i % 2) * 0.2), 8, 7]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ))}
    </>
  );
}

/** Renders one catalogue item in local space (front = +z, resting on y = 0). */
export function DecorModel({ def }: { def: DecorDef }) {
  const c = def.colors;
  const [w, d] = def.size;
  const spin = useRef<THREE.Mesh>(null!);
  const sway = useRef<THREE.Group>(null!);
  const wave = useRef<THREE.Mesh>(null!);
  const season = useGame((s) => getSeason(s.day));
  useFrame((state, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 3.5;
    if (sway.current) sway.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
    if (wave.current) wave.current.rotation.x = -0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
  });

  switch (def.template) {
    // ------------------------------------------------------------ seating
    case "sofa":
    case "chesterfield":
    case "loveseat": {
      const tufted = def.template === "chesterfield";
      const round = def.template === "loveseat";
      return (
        <group>
          <mesh position={[0, 0.25, 0.05]} castShadow>
            {round ? <capsuleGeometry args={[0.38, w - 0.76, 4, 10]} /> : <boxGeometry args={[w, 0.5, d - 0.1]} />}
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[0, 0.7, -d / 2 + 0.12]}>
            <boxGeometry args={[w, 0.5, 0.22]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (w / 2 - 0.06), 0.5, 0.05]}>
              <boxGeometry args={[0.12, 0.32, d - 0.1]} />
              <meshStandardMaterial color={c[0]} roughness={1} />
            </mesh>
          ))}
          {(def.seats ?? []).map(([sx], i) => (
            <mesh key={i} position={[sx, 0.55, 0.0]}>
              <boxGeometry args={[(w - 0.4) / Math.max(1, def.seats!.length) - 0.06, 0.1, d - 0.35]} />
              <meshStandardMaterial color={c[1]} roughness={1} />
            </mesh>
          ))}
          {tufted &&
            Array.from({ length: 6 }).map((_, i) => (
              <mesh key={i} position={[-w / 2 + 0.3 + i * ((w - 0.6) / 5), 0.7 + (i % 2) * 0.15, -d / 2 + 0.24]}>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshStandardMaterial color={c[2]} />
              </mesh>
            ))}
          <mesh position={[w / 2 - 0.45, 0.72, -0.05]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.32, 0.32, 0.1]} />
            <meshStandardMaterial color={c[2]} roughness={1} />
          </mesh>
          <Legs w={w} d={d} color={c[2]} />
        </group>
      );
    }
    case "armchair":
      return (
        <group>
          <mesh position={[0, 0.3, 0.05]} castShadow>
            <boxGeometry args={[0.8, 0.5, 0.7]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[0, 0.8, -0.28]}>
            <boxGeometry args={[0.8, 0.6, 0.16]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.36, 0.62, 0.05]}>
              <boxGeometry args={[0.1, 0.24, 0.7]} />
              <meshStandardMaterial color={c[0]} roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, 0.58, 0.05]}>
            <boxGeometry args={[0.58, 0.1, 0.55]} />
            <meshStandardMaterial color={c[1]} roughness={1} />
          </mesh>
          <Legs w={0.8} d={0.7} color={c[2]} />
        </group>
      );
    case "beanbag":
      return (
        <mesh position={[0, 0.3, 0]} scale={[1, 0.7, 1]} castShadow>
          <sphereGeometry args={[0.45, 12, 10]} />
          <meshStandardMaterial color={c[0]} roughness={1} />
        </mesh>
      );
    case "bench":
      return (
        <group>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[w, 0.44, 0.6]} />
            <meshStandardMaterial color={c[0]} roughness={0.7} />
          </mesh>
          {[-0.8, 0, 0.8].map((x, i) => (
            <Cushion key={x} x={x} z={-0.02} color={c[1 + i]} w={0.7} d={0.5} />
          ))}
          <mesh position={[0, 0.75, -0.32]}>
            <boxGeometry args={[w, 0.5, 0.06]} />
            <meshStandardMaterial color={c[0]} roughness={0.7} />
          </mesh>
        </group>
      );
    case "stool":
      return (
        <group>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.06, 14]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 2 + 0.78) * 0.13, 0.34, Math.sin((i * Math.PI) / 2 + 0.78) * 0.13]} rotation={[Math.sin((i * Math.PI) / 2 + 0.78) * 0.12, 0, -Math.cos((i * Math.PI) / 2 + 0.78) * 0.12]}>
              <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
              <meshStandardMaterial color={c[1]} />
            </mesh>
          ))}
          <mesh position={[0, 0.25, 0]}>
            <torusGeometry args={[0.14, 0.012, 6, 16]} />
            <meshStandardMaterial color={c[1]} />
          </mesh>
        </group>
      );
    case "pouf":
      return (
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.28, 0.4, 16]} />
          <meshStandardMaterial color={c[0]} roughness={1} />
        </mesh>
      );
    case "daybed":
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[w, 0.16, d]} />
            <meshStandardMaterial color={c[1]} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[w - 0.1, 0.16, d - 0.1]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[-w / 2 + 0.25, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.12, d - 0.5, 4, 10]} />
            <meshStandardMaterial color={c[2]} roughness={1} />
          </mesh>
          <Legs w={w} d={d} color={c[1]} h={0.12} />
        </group>
      );
    case "eggchair":
      return (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.06, 16]} />
            <meshStandardMaterial color={c[2]} />
          </mesh>
          <mesh position={[0, 1.1, -0.2]} rotation={[0.35, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2.2, 8]} />
            <meshStandardMaterial color={c[2]} />
          </mesh>
          <mesh position={[0, 0.95, 0.05]} rotation={[0.15, 0, 0]}>
            <sphereGeometry args={[0.52, 14, 12, Math.PI * 0.75, Math.PI * 1.5, 0.3, Math.PI * 0.7]} />
            <meshStandardMaterial color={c[0]} side={THREE.DoubleSide} roughness={1} />
          </mesh>
          <mesh position={[0, 0.5, 0.05]}>
            <boxGeometry args={[0.5, 0.1, 0.45]} />
            <meshStandardMaterial color={c[1]} roughness={1} />
          </mesh>
        </group>
      );
    // ------------------------------------------------------------ tables
    case "coffeeTable":
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[w, 0.05, d]} />
            <meshStandardMaterial color={c[0]} roughness={0.5} metalness={c[0] === "#bfe4f7" ? 0.3 : 0} transparent={c[0] === "#bfe4f7"} opacity={c[0] === "#bfe4f7" ? 0.55 : 1} />
          </mesh>
          <Legs w={w} d={d} h={0.38} color={c[1]} />
        </group>
      );
    case "sideTable":
      return (
        <group>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
            <meshStandardMaterial color={c[0]} roughness={0.5} metalness={c[0] === BRASS ? 0.7 : 0} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.54, 8]} />
            <meshStandardMaterial color={c[0]} metalness={c[0] === BRASS ? 0.7 : 0} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.03, 16]} />
            <meshStandardMaterial color={c[0]} metalness={c[0] === BRASS ? 0.7 : 0} />
          </mesh>
        </group>
      );
    case "console":
      return (
        <group>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[w, 0.05, d]} />
            <meshStandardMaterial color={c[0]} roughness={0.6} />
          </mesh>
          <Legs w={w} d={d} h={0.78} color={c[1]} inset={0.06} />
          <mesh position={[-0.4, 0.95, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.26, 10]} />
            <meshStandardMaterial color="#dfe6e9" />
          </mesh>
          <mesh position={[0.3, 0.88, 0]}>
            <boxGeometry args={[0.3, 0.12, 0.2]} />
            <meshStandardMaterial color="#c0392b" />
          </mesh>
        </group>
      );
    case "communal":
      return (
        <group>
          <mesh position={[0, 0.74, 0]} castShadow>
            <boxGeometry args={[w, 0.07, 0.9]} />
            <meshStandardMaterial color={c[0]} roughness={0.6} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (w / 2 - 0.3), 0.37, 0]}>
              <boxGeometry args={[0.08, 0.72, 0.8]} />
              <meshStandardMaterial color={c[1]} />
            </mesh>
          ))}
          {(def.seats ?? []).map(([sx, sz], i) => (
            <group key={i} position={[sx, 0, sz]}>
              <mesh position={[0, 0.45, 0]}>
                <cylinderGeometry args={[0.17, 0.17, 0.05, 12]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
              <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.44, 6]} />
                <meshStandardMaterial color={c[1]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "ledge":
      return (
        <group>
          <mesh position={[0, 1.0, -0.15]} castShadow>
            <boxGeometry args={[w, 0.06, 0.35]} />
            <meshStandardMaterial color={c[0]} roughness={0.6} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (w / 2 - 0.1), 0.5, -0.15]}>
              <boxGeometry args={[0.05, 1.0, 0.3]} />
              <meshStandardMaterial color={c[1]} />
            </mesh>
          ))}
          {(def.seats ?? []).map(([sx, sz], i) => (
            <group key={i} position={[sx, 0, sz]}>
              <mesh position={[0, 0.72, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.05, 12]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
              <mesh position={[0, 0.36, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.72, 6]} />
                <meshStandardMaterial color={c[1]} />
              </mesh>
              <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.14, 0.14, 0.03, 12]} />
                <meshStandardMaterial color={c[1]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "bistro":
      return (
        <group>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.03, 20]} />
            <meshStandardMaterial color={c[0]} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.72, 8]} />
            <meshStandardMaterial color={c[1]} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.03, 16]} />
            <meshStandardMaterial color={c[1]} />
          </mesh>
          {[-0.7, 0.7].map((z) => (
            <group key={z} position={[0, 0, z]} rotation={[0, z < 0 ? 0 : Math.PI, 0]}>
              <mesh position={[0, 0.45, 0]}>
                <boxGeometry args={[0.4, 0.03, 0.4]} />
                <meshStandardMaterial color={c[0]} metalness={0.4} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.7, -0.18]}>
                <boxGeometry args={[0.4, 0.44, 0.03]} />
                <meshStandardMaterial color={c[0]} metalness={0.4} roughness={0.5} />
              </mesh>
              {[-0.17, 0.17].flatMap((lx) =>
                [-0.17, 0.17].map((lz) => (
                  <mesh key={`${lx}${lz}`} position={[lx, 0.22, lz]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.44, 6]} />
                    <meshStandardMaterial color={c[1]} />
                  </mesh>
                ))
              )}
            </group>
          ))}
        </group>
      );
    // ------------------------------------------------------------ lighting
    case "arcLamp":
      return (
        <group>
          <mesh position={[0, 0.04, -0.2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.08, 16]} />
            <meshStandardMaterial color="#eef0f2" />
          </mesh>
          <mesh position={[0, 1.0, -0.2]}>
            <cylinderGeometry args={[0.02, 0.02, 2.0, 8]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 2.0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.42, 0.02, 8, 20, Math.PI]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />
          </mesh>
          <group position={[0, 0, 0.62]}>
            <Shade y={1.7} r={0.3} h={0.3} color={c[1]} intensity={3} />
          </group>
        </group>
      );
    case "tripodLamp":
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.2, 0.7, Math.sin((i * Math.PI * 2) / 3) * 0.2]} rotation={[Math.sin((i * Math.PI * 2) / 3) * 0.28, 0, -Math.cos((i * Math.PI * 2) / 3) * 0.28]}>
              <cylinderGeometry args={[0.015, 0.02, 1.45, 6]} />
              <meshStandardMaterial color={c[0]} />
            </mesh>
          ))}
          <Shade y={1.55} r={0.26} h={0.3} color={c[1]} intensity={3} />
        </group>
      );
    case "tableLamp":
    case "mushroomLamp":
      return (
        <group>
          <mesh position={[0, 0.2, 0]}>
            {def.template === "mushroomLamp" ? <cylinderGeometry args={[0.05, 0.1, 0.4, 12]} /> : <sphereGeometry args={[0.13, 12, 10]} />}
            <meshStandardMaterial color={c[0]} roughness={0.4} />
          </mesh>
          {def.template === "mushroomLamp" ? (
            <mesh position={[0, 0.48, 0]}>
              <sphereGeometry args={[0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color={c[0]} emissive={c[0]} emissiveIntensity={0.4} />
            </mesh>
          ) : (
            <Shade y={0.5} r={0.16} h={0.2} color={c[1]} intensity={1.8} />
          )}
          {def.template === "mushroomLamp" && <pointLight position={[0, 0.4, 0]} intensity={1.8} distance={4} color="#ffb366" />}
        </group>
      );
    case "pendantTrio":
      return (
        <group position={[0, CEIL_H, 0]}>
          {[-0.45, 0, 0.45].map((x, i) => (
            <group key={x} position={[x, -(0.8 + i * 0.15), 0]}>
              <mesh position={[0, (0.8 + i * 0.15) / 2, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.8 + i * 0.15, 4]} />
                <meshStandardMaterial color="#222" />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.16, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
                <meshStandardMaterial color={c[0]} metalness={0.8} roughness={0.25} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, -0.05, 0]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#fff6d6" emissive="#ffd9a0" emissiveIntensity={2} toneMapped={false} />
              </mesh>
            </group>
          ))}
          <pointLight position={[0, -1.1, 0]} intensity={4} distance={6} decay={2} color="#ffd9a0" />
        </group>
      );
    case "globePendant":
    case "hanji":
      return (
        <group position={[0, CEIL_H, 0]}>
          <mesh position={[0, -0.35, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.7, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, -1.0, 0]}>
            <sphereGeometry args={[def.template === "hanji" ? 0.32 : 0.22, 14, 12]} />
            <meshStandardMaterial color={c[0]} emissive="#ffd9a0" emissiveIntensity={0.9} transparent opacity={0.92} roughness={1} />
          </mesh>
          {def.template === "hanji" &&
            [0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0, -1.0, 0]} rotation={[0, (i * Math.PI) / 4, 0]}>
                <torusGeometry args={[0.32, 0.008, 6, 24]} />
                <meshStandardMaterial color="#6b4a35" />
              </mesh>
            ))}
          <pointLight position={[0, -1.1, 0]} intensity={4} distance={6} decay={2} color="#ffd9a0" />
        </group>
      );
    case "rattanPendant":
      return (
        <group position={[0, CEIL_H, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.6, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, -0.85, 0]}>
            <cylinderGeometry args={[0.18, 0.4, 0.5, 14, 1, true]} />
            <meshStandardMaterial color={c[0]} side={THREE.DoubleSide} roughness={1} />
          </mesh>
          <mesh position={[0, -0.9, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#fff6d6" emissive="#ffd9a0" emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <pointLight position={[0, -1.1, 0]} intensity={3.5} distance={6} decay={2} color="#ffd9a0" />
        </group>
      );
    case "chandelier":
      return (
        <group position={[0, CEIL_H, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.6, 6]} />
            <meshStandardMaterial color={c[0]} metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.45, 0.025, 8, 24]} />
            <meshStandardMaterial color={c[0]} metalness={0.8} roughness={0.25} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => (
            <group key={i} position={[Math.cos((i * Math.PI) / 4) * 0.45, -0.75, Math.sin((i * Math.PI) / 4) * 0.45]}>
              <mesh position={[0, 0.12, 0]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial color="#fff6d6" emissive="#ffe3a0" emissiveIntensity={2.5} toneMapped={false} />
              </mesh>
              <mesh position={[0, -0.12, 0]}>
                <octahedronGeometry args={[0.05]} />
                <meshStandardMaterial color={c[1]} transparent opacity={0.8} roughness={0.05} metalness={0.3} />
              </mesh>
            </group>
          ))}
          <pointLight position={[0, -0.9, 0]} intensity={7} distance={8} decay={2} color="#ffe3a0" />
        </group>
      );
    case "festoon":
      return (
        <group position={[0, 2.4, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, w, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + 0.25 + i * ((w - 0.5) / 8), -0.08 - Math.sin((i / 8) * Math.PI) * 0.12, 0]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#fff6d6" emissive={c[0]} emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}
          <pointLight position={[0, -0.2, 0.3]} intensity={2} distance={5} color={c[0]} />
        </group>
      );
    case "neon":
      return (
        <group position={[0, 1.45, 0]} rotation={[-0.08, 0, 0]}>
          <mesh>
            <boxGeometry args={[w, 0.6, 0.04]} />
            <meshStandardMaterial color="#1a1030" />
          </mesh>
          <TextPlane lines={[c[1]]} width={w - 0.1} height={0.5} bg="#1a1030" color={c[0]} neon position={[0, 0, 0.03]} />
          <pointLight position={[0, 0, 0.5]} intensity={3} distance={4} color={c[0]} />
        </group>
      );
    case "candles":
      return (
        <group>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
            <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
          </mesh>
          {[[-0.06, 0.02, 0.16], [0.06, -0.03, 0.11], [0, 0.07, 0.08]].map(([x, z, h], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, h / 2 + 0.02, 0]}>
                <cylinderGeometry args={[0.03, 0.03, h, 10]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
              <mesh position={[0, h + 0.04, 0]}>
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshStandardMaterial color="#ffb347" emissive="#ff9f1c" emissiveIntensity={3} toneMapped={false} />
              </mesh>
            </group>
          ))}
          <pointLight position={[0, 0.25, 0]} intensity={0.8} distance={2} color="#ff9f1c" />
        </group>
      );
    case "saltLamp":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
            <meshStandardMaterial color="#5a3b26" />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <dodecahedronGeometry args={[0.13]} />
            <meshStandardMaterial color={c[0]} emissive={c[0]} emissiveIntensity={0.9} roughness={1} />
          </mesh>
          <pointLight position={[0, 0.2, 0]} intensity={1} distance={2.5} color={c[0]} />
        </group>
      );
    case "moonMirror":
      return (
        <group position={[0, 1.6, 0]} rotation={[-0.06, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.04, 32]} />
            <meshStandardMaterial color="#fff6d6" emissive={c[0]} emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.01, 32]} />
            <meshStandardMaterial color="#bfe4f7" metalness={0.9} roughness={0.05} />
          </mesh>
          <pointLight position={[0, 0, 0.4]} intensity={2} distance={3} color={c[0]} />
        </group>
      );
    // ------------------------------------------------------------ plants
    case "plantBig":
      return (
        <group>
          <Pot r={0.24} h={0.45} color={c[1]} />
          <Foliage y={0.75} r={0.38} color={c[0]} n={4} />
        </group>
      );
    case "tree":
      return (
        <group>
          <Pot r={0.26} h={0.4} color={c[1]} />
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 1.0, 6]} />
            <meshStandardMaterial color="#6b4a35" />
          </mesh>
          <Foliage y={1.5} r={0.4} color={c[0]} n={4} />
        </group>
      );
    case "plant":
      return (
        <group>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <Pot r={0.15} h={0.25} color={c[1]} y={0.6} />
          <Foliage y={1.0} r={0.26} color={c[0]} n={4} />
        </group>
      );
    case "snake":
      return (
        <group>
          <Pot r={0.14} h={0.3} color={c[1]} />
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.cos(i * 1.3) * 0.06, 0.6, Math.sin(i * 1.3) * 0.06]} rotation={[Math.sin(i) * 0.12, 0, Math.cos(i) * 0.12]}>
              <boxGeometry args={[0.07, 0.6 + (i % 2) * 0.2, 0.02]} />
              <meshStandardMaterial color={c[0]} />
            </mesh>
          ))}
        </group>
      );
    case "cactus":
      return (
        <group>
          <Pot r={0.18} h={0.3} color={c[1]} />
          <mesh position={[0, 0.85, 0]}>
            <capsuleGeometry args={[0.1, 0.9, 4, 10]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[0.18, 0.8, 0]} rotation={[0, 0, -0.3]}>
            <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
        </group>
      );
    case "bamboo":
      return (
        <group>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.1, 0.08, 0.24, 12]} />
            <meshStandardMaterial color={c[1]} transparent opacity={0.6} roughness={0.1} />
          </mesh>
          {[-0.04, 0.02, 0.05].map((x, i) => (
            <mesh key={i} position={[x, 0.55, (i - 1) * 0.03]}>
              <cylinderGeometry args={[0.012, 0.012, 0.9 + i * 0.1, 6]} />
              <meshStandardMaterial color={c[0]} />
            </mesh>
          ))}
        </group>
      );
    case "hanging":
      return (
        <group position={[0, CEIL_H, 0]}>
          <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, w, 6]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          {[-0.7, -0.25, 0.25, 0.7].map((x, i) => (
            <group key={x} position={[x, -0.4, 0]}>
              <mesh position={[0, -0.3, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.6, 4]} />
                <meshStandardMaterial color="#8d6e63" />
              </mesh>
              <mesh position={[0, -0.65, 0]}>
                <cylinderGeometry args={[0.12, 0.09, 0.14, 10]} />
                <meshStandardMaterial color={i % 2 ? "#b5593a" : "#dfe6e9"} />
              </mesh>
              <mesh position={[0, -0.6, 0]}>
                <sphereGeometry args={[0.18, 8, 7]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
              <mesh position={[0.08, -0.95, 0.05]}>
                <capsuleGeometry args={[0.04, 0.4, 3, 6]} />
                <meshStandardMaterial color="#4fb35b" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "flowers": {
      const petals = c[0] === "season" ? (season === "spring" ? ["#f7b7d2", "#ffdfe8", "#f48fb1"] : season === "summer" ? ["#fdcb6e", "#ff7675", "#ffeaa7"] : season === "autumn" ? ["#e17055", "#d35400", "#fdcb6e"] : ["#f5f6fa", "#c0392b", "#dfe6e9"]) : c;
      return (
        <group ref={sway}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 0.9, 10]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.4, 12]} />
            <meshStandardMaterial color="#dfe6e9" transparent opacity={0.7} roughness={0.1} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <group key={i} rotation={[0, (i * Math.PI) / 3, 0.35]}>
              <mesh position={[0, 1.45, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.5, 5]} />
                <meshStandardMaterial color="#2e8b57" />
              </mesh>
              <mesh position={[0, 1.72, 0]}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshStandardMaterial color={petals[i % petals.length]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    }
    case "wreath":
      return (
        <group position={[0, 1.5, 0]}>
          <mesh>
            <torusGeometry args={[0.26, 0.06, 8, 24]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[0, -0.26, 0.03]}>
            <boxGeometry args={[0.12, 0.08, 0.02]} />
            <meshStandardMaterial color="#c0392b" />
          </mesh>
        </group>
      );
    case "terrarium":
      return (
        <group>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial color="#dfe6e9" transparent opacity={0.35} roughness={0.05} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
        </group>
      );
    // ------------------------------------------------------------ rugs
    case "rug":
    case "rugGeo":
      return (
        <group>
          <mesh position={[0, 0.035, 0]} receiveShadow>
            <boxGeometry args={[w, 0.03, d]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[0, 0.052, 0]}>
            <boxGeometry args={[w - 0.5, 0.005, d - 0.5]} />
            <meshStandardMaterial color={c[1]} roughness={1} />
          </mesh>
          {def.template === "rugGeo" &&
            Array.from({ length: 6 }).map((_, i) => (
              <mesh key={i} position={[-w / 2 + 0.5 + i * ((w - 1) / 5), 0.056, (i % 2 ? 1 : -1) * 0.25]} rotation={[-Math.PI / 2, 0, (i % 2) * Math.PI]}>
                <coneGeometry args={[0.18, 0.3, 3]} />
                <meshStandardMaterial color={c[2]} roughness={1} />
              </mesh>
            ))}
          {def.template === "rug" && (
            <mesh position={[0, 0.056, 0]}>
              <boxGeometry args={[w - 1.2, 0.004, d - 1.0]} />
              <meshStandardMaterial color={c[2]} roughness={1} />
            </mesh>
          )}
        </group>
      );
    case "rugRound":
      return (
        <group>
          <mesh position={[0, 0.035, 0]} receiveShadow>
            <cylinderGeometry args={[w / 2, w / 2, 0.03, 32]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[0, 0.052, 0]}>
            <cylinderGeometry args={[w / 2 - 0.3, w / 2 - 0.3, 0.005, 32]} />
            <meshStandardMaterial color={c[1]} roughness={1} />
          </mesh>
        </group>
      );
    case "rugHide":
      return (
        <group>
          {[[0, 0, 0.9, 0.7], [-0.6, 0.4, 0.5, 0.4], [0.7, -0.3, 0.45, 0.4], [0.5, 0.5, 0.4, 0.35], [-0.7, -0.5, 0.4, 0.35]].map(([x, z, rx, rz], i) => (
            <mesh key={i} position={[x, 0.035, z]} scale={[rx, 1, rz]}>
              <cylinderGeometry args={[1, 1, 0.03, 20]} />
              <meshStandardMaterial color={c[0]} roughness={1} />
            </mesh>
          ))}
          {[[-0.2, 0.1], [0.3, -0.2], [0.1, 0.35]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.052, z]} scale={[0.25, 1, 0.2]}>
              <cylinderGeometry args={[1, 1, 0.005, 14]} />
              <meshStandardMaterial color={c[1]} roughness={1} />
            </mesh>
          ))}
        </group>
      );
    case "mat":
      return (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[w, 0.03, d]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <TextPlane lines={[c[1]]} width={w - 0.1} height={d - 0.1} bg={c[0]} color="#f3e7c9" position={[0, 0.047, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      );
    // ------------------------------------------------------------ art
    case "print":
      return (
        <group position={[0, 0.65, 0]} rotation={[-0.12, 0, 0]}>
          <mesh>
            <boxGeometry args={[w, 1.1, 0.06]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <TextPlane lines={[c[2], c[3]]} width={w - 0.14} height={0.96} bg={c[0]} color={c[1]} position={[0, 0, 0.035]} />
        </group>
      );
    case "triptych":
      return (
        <group position={[0, 0.6, 0]} rotation={[-0.12, 0, 0]}>
          {[-0.6, 0, 0.6].map((x, i) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.5, 0.7, 0.05]} />
                <meshStandardMaterial color="#c9a070" />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[0.42, 0.62]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
              <mesh position={[0, 0.02, 0.035]} rotation={[0, 0, i * 0.5]}>
                <capsuleGeometry args={[0.05, 0.25, 3, 6]} />
                <meshStandardMaterial color={c[1]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "polaroids":
      return (
        <group position={[0, 1.5, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.004, 0.004, w, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + 0.15 + i * ((w - 0.3) / 6), -0.14, 0.01]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.08]}>
              <boxGeometry args={[0.14, 0.18, 0.01]} />
              <meshStandardMaterial color={c[0]} />
            </mesh>
          ))}
        </group>
      );
    case "mirror":
      return (
        <group position={[0, 0.9, 0]} rotation={[-0.08, 0, 0]}>
          <mesh>
            <boxGeometry args={[w, 1.8, 0.05]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[w / 2, w / 2, 0.05, 24, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[w - 0.1, 1.7]} />
            <meshStandardMaterial color="#bfe4f7" metalness={0.9} roughness={0.05} />
          </mesh>
        </group>
      );
    case "clock":
      return (
        <group position={[0, 1.9, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 24]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.005, 24]} />
            <meshStandardMaterial color={c[1]} />
          </mesh>
          <mesh position={[0, 0.08, 0.04]}>
            <boxGeometry args={[0.02, 0.18, 0.005]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0.06, 0.02, 0.04]} rotation={[0, 0, -1.2]}>
            <boxGeometry args={[0.02, 0.14, 0.005]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
        </group>
      );
    case "chalkboard":
      return (
        <group>
          {[-0.2, 0.2].map((z) => (
            <mesh key={z} position={[0, 0.55, z]} rotation={[z * 0.9, 0, 0]}>
              <boxGeometry args={[w, 1.1, 0.03]} />
              <meshStandardMaterial color="#6b4a35" />
            </mesh>
          ))}
          <TextPlane lines={[c[2], c[3]]} width={w - 0.1} height={0.9} bg={c[0]} color={c[1]} position={[0, 0.58, 0.22]} rotation={[0.18, 0, 0]} />
        </group>
      );
    case "vinylWall":
      return (
        <group position={[0, 1.5, 0]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[-0.42 + (i % 3) * 0.42, 0.22 - Math.floor(i / 3) * 0.44, 0]}>
              <boxGeometry args={[0.36, 0.36, 0.02]} />
              <meshStandardMaterial color={c[i % c.length]} />
            </mesh>
          ))}
        </group>
      );
    case "macrame":
      return (
        <group position={[0, 1.6, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, w, 6]} />
            <meshStandardMaterial color="#6b4a35" />
          </mesh>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + 0.1 + i * ((w - 0.2) / 8), -0.35 - Math.abs(4 - i) * 0.06, 0]}>
              <boxGeometry args={[0.05, 0.7 - Math.abs(4 - i) * 0.1, 0.02]} />
              <meshStandardMaterial color={c[0]} roughness={1} />
            </mesh>
          ))}
        </group>
      );
    // ------------------------------------------------------------ statues & objects
    case "statue": {
      const kind = c[1];
      return (
        <group>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[w, 0.3, d]} />
            <meshStandardMaterial color="#8d8680" />
          </mesh>
          {kind === "buddha" && (
            <group position={[0, 0.3, 0]}>
              <mesh position={[0, 0.25, 0]}>
                <sphereGeometry args={[0.26, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.13, 12, 10]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
            </group>
          )}
          {kind === "haetae" && (
            <group position={[0, 0.3, 0]}>
              <mesh position={[0, 0.3, -0.1]}>
                <boxGeometry args={[0.4, 0.5, 0.6]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
              <mesh position={[0, 0.65, 0.2]}>
                <sphereGeometry args={[0.22, 10, 8]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
              <mesh position={[0, 0.75, 0.12]}>
                <torusGeometry args={[0.22, 0.05, 6, 12]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
            </group>
          )}
          {kind === "hareubang" && (
            <group position={[0, 0.3, 0]}>
              <mesh position={[0, 0.35, 0]}>
                <capsuleGeometry args={[0.18, 0.4, 4, 10]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
              <mesh position={[0, 0.72, 0]}>
                <sphereGeometry args={[0.17, 10, 8]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
              <mesh position={[0, 0.9, 0]}>
                <cylinderGeometry args={[0.14, 0.16, 0.12, 10]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
            </group>
          )}
          {kind === "bust" && (
            <group position={[0, 0.3, 0]}>
              <mesh position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.12, 0.16, 0.8, 12]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
              <mesh position={[0, 0.95, 0]}>
                <boxGeometry args={[0.36, 0.3, 0.2]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
              <mesh position={[0, 1.25, 0]}>
                <sphereGeometry args={[0.15, 12, 10]} />
                <meshStandardMaterial color={c[0]} roughness={1} />
              </mesh>
            </group>
          )}
        </group>
      );
    }
    case "vaseBig":
      return (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
            <meshStandardMaterial color="#6b4a35" />
          </mesh>
          <mesh position={[0, 0.38, 0]} scale={[1, 1.1, 1]}>
            <sphereGeometry args={[0.3, 16, 12]} />
            <meshStandardMaterial color={c[0]} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.12, 14]} />
            <meshStandardMaterial color={c[0]} roughness={0.35} />
          </mesh>
        </group>
      );
    case "cat":
      return (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.06, 16]} />
            <meshStandardMaterial color="#8d6e63" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 1.0, 10]} />
            <meshStandardMaterial color="#c9a070" roughness={1} />
          </mesh>
          <mesh position={[0, 1.02, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.06, 16]} />
            <meshStandardMaterial color="#8d6e63" />
          </mesh>
          <mesh position={[0.15, 0.55, 0.15]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#a1887f" />
          </mesh>
          <group position={[0, 1.08, 0]}>
            <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.1, 0.22, 4, 8]} />
              <meshStandardMaterial color={c[0]} roughness={1} />
            </mesh>
            <mesh position={[0.2, 0.16, 0.04]}>
              <sphereGeometry args={[0.09, 10, 8]} />
              <meshStandardMaterial color={c[0]} roughness={1} />
            </mesh>
            {[-0.04, 0.04].map((x) => (
              <mesh key={x} position={[0.22 + x, 0.25, 0.04 + x * 0.5]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]}>
                <coneGeometry args={[0.03, 0.06, 4]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
            ))}
            <mesh ref={spin as unknown as React.RefObject<THREE.Mesh>} position={[-0.2, 0.08, 0]} visible={false} />
            <group ref={sway}>
              <mesh position={[-0.32, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.025, 0.24, 4, 6]} />
                <meshStandardMaterial color={c[0] === "#1e1e1e" ? "#2c2c2c" : "#d35400"} roughness={1} />
              </mesh>
            </group>
          </group>
        </group>
      );
    case "aquarium":
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[w, 0.8, d]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[w - 0.05, 0.6, d - 0.05]} />
            <meshStandardMaterial color={c[0]} transparent opacity={0.4} roughness={0.05} emissive={c[0]} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 1.42, 0]}>
            <boxGeometry args={[w, 0.05, d]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          {[-0.35, -0.05, 0.3].map((x, i) => (
            <mesh key={x} position={[x, 1.0 + (i % 2) * 0.2, (i - 1) * 0.1]} rotation={[0, 0, 0]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color={["#f39c12", "#e74c3c", "#f1c40f"][i]} />
            </mesh>
          ))}
          <mesh position={[0.3, 0.9, 0]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshStandardMaterial color="#2e8b57" />
          </mesh>
          <pointLight position={[0, 1.3, 0.4]} intensity={2} distance={3} color={c[0]} />
        </group>
      );
    case "globe":
      return (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.14, 0.16, 0.06, 14]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.4]}>
            <torusGeometry args={[0.25, 0.012, 6, 24, Math.PI]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh ref={spin} position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.2, 14, 12]} />
            <meshStandardMaterial color={c[1]} roughness={0.6} />
          </mesh>
        </group>
      );
    case "gramophone":
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <meshStandardMaterial color={c[1]} />
          </mesh>
          <mesh position={[0, 0.7, -0.05]} rotation={[-0.6, 0, 0]}>
            <coneGeometry args={[0.28, 0.6, 16, 1, true]} />
            <meshStandardMaterial color={c[0]} metalness={0.8} roughness={0.25} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={spin} position={[0, 0.42, 0.1]}>
            <cylinderGeometry args={[0.15, 0.15, 0.01, 20]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      );
    case "typewriter":
      return (
        <group>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.38, 0.16, 0.3]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.2, -0.06]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.36, 10]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
          <mesh position={[0, 0.23, -0.06]}>
            <planeGeometry args={[0.2, 0.18]} />
            <meshStandardMaterial color="#f7f7f4" side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    // ------------------------------------------------------------ shelving
    case "ladderShelf":
      return (
        <group rotation={[0.1, 0, 0]}>
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} position={[x, 0.9, 0]}>
              <boxGeometry args={[0.04, 1.8, 0.04]} />
              <meshStandardMaterial color={c[0]} />
            </mesh>
          ))}
          {[0.4, 0.85, 1.3].map((y, i) => (
            <group key={y}>
              <mesh position={[0, y, 0.02]}>
                <boxGeometry args={[0.64, 0.03, 0.3 - i * 0.06]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
              <mesh position={[-0.15, y + 0.1, 0]}>
                <boxGeometry args={[0.2, 0.16, 0.12]} />
                <meshStandardMaterial color={["#c0392b", "#2980b9", "#27ae60"][i]} />
              </mesh>
              <mesh position={[0.18, y + 0.08, 0]}>
                <cylinderGeometry args={[0.05, 0.04, 0.12, 8]} />
                <meshStandardMaterial color="#dfe6e9" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "cubeShelf":
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[w, 0.8, d]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + 0.19 + (i % 4) * 0.375, 0.2 + Math.floor(i / 4) * 0.4, d / 2 + 0.001]}>
              <planeGeometry args={[0.32, 0.32]} />
              <meshStandardMaterial color={i % 3 === 0 ? "#c9a070" : i % 3 === 1 ? "#dfe6e9" : "#2d3436"} />
            </mesh>
          ))}
        </group>
      );
    case "bookshelf": {
      const books = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#16a085", "#d35400"];
      return (
        <group>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[1.4, 2.0, 0.35]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
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
          <mesh position={[0.5, 2.1, 0]}>
            <sphereGeometry args={[0.14, 8, 7]} />
            <meshStandardMaterial color="#3e9a4b" />
          </mesh>
        </group>
      );
    }
    case "turntable":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.2, 0.9, 0.5]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          {Array.from({ length: 14 }).map((_, i) => (
            <mesh key={i} position={[-0.5 + i * 0.075, 0.5, 0.05]}>
              <boxGeometry args={[0.03, 0.32, 0.32]} />
              <meshStandardMaterial color={["#c0392b", "#2980b9", "#f1c40f", "#2d3436", "#8e44ad", "#16a085", "#e67e22"][i % 7]} />
            </mesh>
          ))}
          <mesh position={[0, 0.94, 0]}>
            <boxGeometry args={[0.6, 0.08, 0.42]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh ref={spin} position={[-0.05, 0.99, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.01, 24]} />
            <meshStandardMaterial color="#111" roughness={0.3} />
          </mesh>
          <mesh position={[0.22, 1.02, -0.1]} rotation={[0, 0.5, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.3]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      );
    case "magRack":
      return (
        <group>
          {[-0.08, 0.08].map((z) => (
            <mesh key={z} position={[0, 0.35, z]} rotation={[z * 2.5, 0, 0]}>
              <boxGeometry args={[0.4, 0.7, 0.01]} />
              <meshStandardMaterial color={c[0]} />
            </mesh>
          ))}
          {[-0.1, 0, 0.1].map((x, i) => (
            <mesh key={x} position={[x, 0.4, 0.1 + i * 0.03]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.22, 0.3, 0.01]} />
              <meshStandardMaterial color={["#e84393", "#0984e3", "#f9ca24"][i]} />
            </mesh>
          ))}
        </group>
      );
    case "coatStand":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 12]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.12, 1.7, Math.sin((i * Math.PI * 2) / 3) * 0.12]} rotation={[0, (-i * Math.PI * 2) / 3, 0.6]}>
              <cylinderGeometry args={[0.012, 0.012, 0.25, 6]} />
              <meshStandardMaterial color={c[0]} />
            </mesh>
          ))}
          <mesh position={[0.12, 1.3, 0.05]}>
            <boxGeometry args={[0.3, 0.7, 0.14]} />
            <meshStandardMaterial color="#2b3a55" roughness={1} />
          </mesh>
        </group>
      );
    case "umbrellaStand":
      return (
        <group>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.13, 0.11, 0.5, 12]} />
            <meshStandardMaterial color={c[0]} metalness={0.5} roughness={0.5} />
          </mesh>
          {[-0.05, 0.05].map((x, i) => (
            <mesh key={x} position={[x, 0.55, (i - 0.5) * 0.08]} rotation={[0.1, 0, x * 3]}>
              <cylinderGeometry args={[0.02, 0.02, 0.8, 6]} />
              <meshStandardMaterial color={i ? "#2d3436" : "#0984e3"} />
            </mesh>
          ))}
        </group>
      );
    case "screen":
      return (
        <group>
          {[-0.6, 0, 0.6].map((x, i) => (
            <group key={x} position={[x, 0, (i % 2) * 0.12]} rotation={[0, (i - 1) * 0.25, 0]}>
              <mesh position={[0, 0.9, 0]}>
                <boxGeometry args={[0.58, 1.8, 0.04]} />
                <meshStandardMaterial color={c[0]} />
              </mesh>
              <mesh position={[0, 0.9, 0.021]}>
                <planeGeometry args={[0.46, 1.6]} />
                <meshStandardMaterial color={c[1]} />
              </mesh>
              {[0.4, 0.8, 1.2, 1.6].map((y) => (
                <mesh key={y} position={[0, y, 0.025]}>
                  <boxGeometry args={[0.46, 0.02, 0.01]} />
                  <meshStandardMaterial color={c[0]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    // ------------------------------------------------------------ accents
    case "cushions":
      return (
        <group>
          {c.map((col, i) => (
            <mesh key={i} position={[(i % 2) * 0.22 - 0.11, 0.06 + Math.floor(i / 2) * 0.11, (i % 3) * 0.1 - 0.1]} rotation={[0, i * 0.4, 0]}>
              <boxGeometry args={[0.36, 0.11, 0.36]} />
              <meshStandardMaterial color={col} roughness={1} />
            </mesh>
          ))}
        </group>
      );
    case "basket":
      return (
        <group>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.22, 0.18, 0.36, 12]} />
            <meshStandardMaterial color={c[0]} roughness={1} />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <boxGeometry args={[0.3, 0.1, 0.3]} />
            <meshStandardMaterial color={c[1]} roughness={1} />
          </mesh>
        </group>
      );
    case "games":
      return (
        <group>
          {c.map((col, i) => (
            <mesh key={i} position={[0, 0.03 + i * 0.07, 0]} rotation={[0, i * 0.2, 0]}>
              <boxGeometry args={[0.3, 0.06, 0.3]} />
              <meshStandardMaterial color={col} />
            </mesh>
          ))}
        </group>
      );
    case "books":
      return (
        <group>
          {c.map((col, i) => (
            <mesh key={i} position={[0, 0.02 + i * 0.045, 0]} rotation={[0, i * 0.3, 0]}>
              <boxGeometry args={[0.2, 0.04, 0.26]} />
              <meshStandardMaterial color={col} />
            </mesh>
          ))}
        </group>
      );
    case "jar":
      return (
        <group>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.24, 12]} />
            <meshStandardMaterial color={c[0]} transparent opacity={0.6} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.13, 12]} />
            <meshStandardMaterial color="#2ecc71" />
          </mesh>
          <TextPlane lines={["TIPS 팁"]} width={0.14} height={0.06} bg="#f3e7c9" color="#2d3436" position={[0, 0.18, 0.091]} />
        </group>
      );
    case "menuStand":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 12]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1.1, 6]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 1.2, 0]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.36, 0.5, 0.02]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <TextPlane lines={["MENU · 메뉴", "☕ 🧋 🥐 🍰"]} width={0.32} height={0.44} bg={c[1]} color="#2d3436" position={[0, 1.2, 0.012]} rotation={[-0.5, 0, 0]} />
        </group>
      );
    case "luckyCat":
      return (
        <group>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.17, 0.06]}>
            <torusGeometry args={[0.04, 0.012, 6, 12]} />
            <meshStandardMaterial color={c[1]} />
          </mesh>
          <mesh ref={wave} position={[0.09, 0.22, 0.03]}>
            <capsuleGeometry args={[0.02, 0.08, 3, 6]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.08, 0.1]}>
            <boxGeometry args={[0.08, 0.06, 0.01]} />
            <meshStandardMaterial color="#f9ca24" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      );
    case "dome":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.04, 16]} />
            <meshStandardMaterial color="#f5f6fa" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color="#dfe6e9" transparent opacity={0.3} roughness={0.05} />
          </mesh>
        </group>
      );
    case "arrow":
      return (
        <group position={[0, 1.6, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 0.3, 0.05]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0.38, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.2, 0.2, 3]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[-0.22 + i * 0.09, (i % 2 ? 0.08 : -0.08), 0.03]}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshStandardMaterial color="#fff6d6" emissive={c[0]} emissiveIntensity={2.5} toneMapped={false} />
            </mesh>
          ))}
          <pointLight position={[0, 0, 0.4]} intensity={1.5} distance={3} color={c[0]} />
        </group>
      );
    case "deskFan":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
            <meshStandardMaterial color="#b2bec3" />
          </mesh>
          <mesh position={[0, 0.25, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.01, 6, 20]} />
            <meshStandardMaterial color="#b2bec3" />
          </mesh>
          <mesh ref={spin} position={[0, 0.25, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.01, 3]} />
            <meshStandardMaterial color={c[0]} transparent opacity={0.8} />
          </mesh>
        </group>
      );
    case "radio":
      return (
        <group>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.34, 0.22, 0.14]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          <mesh position={[-0.07, 0.12, 0.071]}>
            <circleGeometry args={[0.07, 14]} />
            <meshStandardMaterial color={c[1]} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0.08, 0.14, 0.071]}>
            <planeGeometry args={[0.1, 0.06]} />
            <meshStandardMaterial color="#ffeaa7" emissive="#ffeaa7" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.12, 0.3, -0.04]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry args={[0.005, 0.005, 0.25, 4]} />
            <meshStandardMaterial color="#b2bec3" />
          </mesh>
        </group>
      );
    case "suitcases":
      return (
        <group>
          {c.map((col, i) => (
            <mesh key={i} position={[0, 0.1 + i * 0.2, 0]} rotation={[0, i * 0.15, 0]}>
              <boxGeometry args={[0.7 - i * 0.1, 0.2, 0.45 - i * 0.05]} />
              <meshStandardMaterial color={col} roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    case "birdcage":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 14]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 4) * 0.16, 0.3, Math.sin((i * Math.PI) / 4) * 0.16]}>
              <cylinderGeometry args={[0.005, 0.005, 0.56, 4]} />
              <meshStandardMaterial color={c[0]} metalness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, 0.58, 0]}>
            <sphereGeometry args={[0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={c[0]} metalness={0.7} roughness={0.3} wireframe />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.1, 8, 7]} />
            <meshStandardMaterial color="#4fb35b" />
          </mesh>
        </group>
      );
    case "parasol":
      return (
        <group>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.08, 14]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 2.4, 8]} />
            <meshStandardMaterial color="#dcdde1" />
          </mesh>
          <mesh position={[0, 2.3, 0]} castShadow>
            <coneGeometry args={[1.3, 0.5, 8, 1, true]} />
            <meshStandardMaterial color={c[0]} side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    case "planter":
      return (
        <group position={[0, 0.15, 0]}>
          <mesh castShadow>
            <boxGeometry args={[w, 0.3, d]} />
            <meshStandardMaterial color={c[0]} />
          </mesh>
          {["#ff7675", "#fdcb6e", "#a29bfe", "#55efc4", "#fd79a8"].map((col, i) => (
            <mesh key={i} position={[-0.6 + i * 0.3, 0.3, 0]}>
              <sphereGeometry args={[0.13, 8, 8]} />
              <meshStandardMaterial color={col} />
            </mesh>
          ))}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[w - 0.1, 0.12, d - 0.1]} />
            <meshStandardMaterial color="#2ecc71" />
          </mesh>
        </group>
      );
    case "patioHeater":
      return (
        <group>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.28, 0.3, 0.2, 14]} />
            <meshStandardMaterial color={c[0]} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 1.8, 10]} />
            <meshStandardMaterial color={c[0]} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 2.05, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.3, 12]} />
            <meshStandardMaterial color="#ff7a3d" emissive="#ff5a1f" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh position={[0, 2.28, 0]}>
            <coneGeometry args={[0.45, 0.18, 14]} />
            <meshStandardMaterial color={c[0]} metalness={0.6} roughness={0.4} />
          </mesh>
          <pointLight position={[0, 1.9, 0]} intensity={4} distance={5} color="#ff7a3d" />
        </group>
      );
    default:
      return (
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[w, 0.6, d]} />
          <meshStandardMaterial color={c[0] ?? "#aaa"} />
        </mesh>
      );
  }
}
