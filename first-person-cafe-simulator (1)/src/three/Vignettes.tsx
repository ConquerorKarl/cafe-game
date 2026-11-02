import "@react-three/fiber";
import type { CustomerColors } from "@/game/types";
import { NightLight, NightMaterial, Person, SolidBox, TextPlane } from "./primitives";

type V3 = [number, number, number];
const NO_OUTFIT = { umbrella: null, scarf: null, beanie: false, mask: false, shortSleeves: false, coat: false };

// ---------------------------------------------------------------------------
// Window displays (local to a KBuilding shop front, behind the glass)
// ---------------------------------------------------------------------------
export function GymDisplay({ width }: { width: number }) {
  const xs = [-width / 2 + 1.6, -width / 2 + 3.4, width / 2 - 1.8];
  return (
    <group>
      {xs.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* treadmill */}
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.8, 0.14, 1.6]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 0.85, -0.7]}>
            <boxGeometry args={[0.8, 1.2, 0.08]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
          <mesh position={[0, 1.35, -0.66]}>
            <planeGeometry args={[0.5, 0.3]} />
            <NightMaterial color="#74b9ff" emissive="#74b9ff" k={1.5} />
          </mesh>
          {i < 2 && (
            <group position={[0, 0.22, 0.1]}>
              <Person colors={{ shirt: i ? "#e84393" : "#00cec9", pants: "#2d3436", skin: "#f1c27d", hair: "#1c1c1c" }} outfit={{ ...NO_OUTFIT, shortSleeves: true }} />
            </group>
          )}
        </group>
      ))}
      {/* dumbbell rack */}
      <group position={[0, 0, -0.1]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.4, 1.0, 0.4]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
        {[-0.45, -0.15, 0.15, 0.45].map((x) => (
          <mesh key={x} position={[x, 1.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.3, 8]} />
            <meshStandardMaterial color="#636e72" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <TextPlane lines={["24H 헬스 · PT 상담"]} width={2.2} height={0.4} bg="#111" color="#ffeaa7" lit position={[0, 2.3, -0.2]} />
    </group>
  );
}

export function LaundryDisplay({ width }: { width: number }) {
  const n = Math.max(3, Math.floor((width - 1.6) / 1.1));
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const x = -width / 2 + 1.1 + i * 1.1;
        return (
          <group key={i} position={[x, 0, -0.1]}>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.9, 1.0, 0.7]} />
              <meshStandardMaterial color="#f5f6fa" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.5, 0.36]}>
              <circleGeometry args={[0.3, 16]} />
              <meshStandardMaterial color="#2d3436" />
            </mesh>
            <mesh position={[0, 0.5, 0.37]}>
              <circleGeometry args={[0.24, 16]} />
              <NightMaterial color="#74b9ff" emissive="#74b9ff" k={1.2} transparent opacity={0.8} />
            </mesh>
            <mesh position={[0.3, 0.9, 0.36]}>
              <circleGeometry args={[0.03, 6]} />
              <meshStandardMaterial color={i % 2 ? "#2ecc71" : "#e74c3c"} emissive={i % 2 ? "#2ecc71" : "#e74c3c"} emissiveIntensity={2} />
            </mesh>
            {i % 2 === 1 && (
              <mesh position={[0, 1.6, 0]}>
                <boxGeometry args={[0.9, 1.0, 0.7]} />
                <meshStandardMaterial color="#f5f6fa" roughness={0.4} />
              </mesh>
            )}
          </group>
        );
      })}
      <group position={[width / 2 - 1.4, 0, 0.3]} rotation={[0, Math.PI, 0]}>
        <Person colors={{ shirt: "#a29bfe", pants: "#2d3436", skin: "#ffdbac", hair: "#2b1b17" }} outfit={NO_OUTFIT} />
      </group>
      <mesh position={[width / 2 - 1.4, 0.3, 0.9]}>
        <boxGeometry args={[0.6, 0.6, 0.5]} />
        <meshStandardMaterial color="#fdcb6e" />
      </mesh>
      <TextPlane lines={["세탁 ₩4,000 · 건조 ₩3,000"]} width={2.4} height={0.36} bg="#0984e3" color="#ffffff" lit position={[0, 2.3, -0.2]} />
    </group>
  );
}

export function GamesDisplay({ width }: { width: number }) {
  const colors = ["#e84393", "#00cec9", "#fdcb6e", "#6c5ce7", "#e17055"];
  return (
    <group>
      {[-width / 2 + 1.2, -width / 2 + 2.3].map((x, i) => (
        <group key={i} position={[x, 0, -0.2]}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.8, 1.8, 0.8]} />
            <meshStandardMaterial color={i ? "#2d3436" : "#1e272e"} />
          </mesh>
          <mesh position={[0, 1.25, 0.41]} rotation={[-0.2, 0, 0]}>
            <planeGeometry args={[0.6, 0.5]} />
            <NightMaterial color={colors[i]} emissive={colors[i]} k={1.6} />
          </mesh>
          <mesh position={[0, 0.85, 0.5]}>
            <boxGeometry args={[0.7, 0.1, 0.3]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
        </group>
      ))}
      <group position={[-width / 2 + 1.75, 0, 0.5]} rotation={[0, Math.PI, 0]}>
        <Person colors={{ shirt: "#00cec9", pants: "#2d3436", skin: "#f1c27d", hair: "#1c1c1c" }} outfit={NO_OUTFIT} scale={0.72} />
      </group>
      {/* shelves of game boxes */}
      <group position={[1.2, 0, -0.1]}>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[3.2, 1.8, 0.4]} />
          <meshStandardMaterial color="#6b4a35" />
        </mesh>
        {Array.from({ length: 24 }).map((_, i) => (
          <mesh key={i} position={[-1.4 + (i % 12) * 0.25, 0.55 + Math.floor(i / 12) * 0.7, 0.21]}>
            <boxGeometry args={[0.2, 0.3, 0.03]} />
            <meshStandardMaterial color={colors[i % colors.length]} />
          </mesh>
        ))}
      </group>
      <TextPlane lines={["닌텐도 · 플스 · 레트로 게임 · 중고 매입"]} width={3.4} height={0.36} bg="#2d3436" color="#55efc4" lit position={[0, 2.3, -0.2]} />
    </group>
  );
}

export function BarDisplay({ width }: { width: number }) {
  return (
    <group>
      {/* bar counter with bottles */}
      <mesh position={[0, 0.5, -0.1]}>
        <boxGeometry args={[width - 2.4, 1.0, 0.7]} />
        <meshStandardMaterial color="#3b2a1e" />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[-(width - 2.4) / 2 + 0.4 + i * ((width - 3.2) / 9), 1.2, -0.1]}>
          <cylinderGeometry args={[0.05, 0.06, 0.32, 8]} />
          <meshStandardMaterial color={["#2ecc71", "#e67e22", "#e74c3c", "#3498db"][i % 4]} transparent opacity={0.85} />
        </mesh>
      ))}
      {[-1.2, 0.4].map((x, i) => (
        <group key={i} position={[x, 0, 0.6]} rotation={[0, Math.PI, 0]}>
          <Person colors={{ shirt: i ? "#e17055" : "#dfe6e9", pants: "#2d3436", skin: "#e8b98a", hair: "#2b1b17" }} outfit={NO_OUTFIT} />
        </group>
      ))}
      {/* red lanterns */}
      {[-2, -0.7, 0.7, 2].map((x) => (
        <mesh key={x} position={[x, 2.3, 0.2]}>
          <sphereGeometry args={[0.18, 10, 8]} />
          <NightMaterial color="#c0392b" emissive="#ff4d4d" k={2} />
        </mesh>
      ))}
      <TextPlane lines={["소주 ₩5,000 · 생맥주 ₩4,500 · 안주"]} width={3.2} height={0.36} bg="#111" color="#ff7675" lit position={[0, 1.95, -0.3]} />
    </group>
  );
}

export function PoliceDisplay({ width }: { width: number }) {
  return (
    <group>
      <mesh position={[0, 0.5, -0.1]}>
        <boxGeometry args={[width - 3, 1.0, 0.7]} />
        <meshStandardMaterial color="#dfe6e9" />
      </mesh>
      <group position={[-0.6, 0, -0.5]}>
        <Person colors={{ shirt: "#1e3a5f", pants: "#1e3a5f", skin: "#f1c27d", hair: "#1c1c1c" }} outfit={NO_OUTFIT} />
      </group>
      <TextPlane lines={["마포경찰서 홍대지구대", "112 · 분실물 · 민원"]} width={2.8} height={0.7} bg="#1e3a8a" color="#ffffff" lit position={[0, 2.1, -0.3]} />
    </group>
  );
}

export function CinemaDisplay({ width }: { width: number }) {
  const posters = [
    { t: "기생충 2", c: "#2d3436", a: "#ffeaa7" },
    { t: "서울의 밤", c: "#1e3a8a", a: "#74b9ff" },
    { t: "LOVE IN HONGDAE", c: "#e84393", a: "#ffffff" },
    { t: "괴물 리턴즈", c: "#2f5d2e", a: "#55efc4" },
  ];
  return (
    <group>
      {posters.map((p, i) => (
        <group key={i} position={[-width / 2 + 1.6 + i * ((width - 3) / 3), 1.5, -0.2]}>
          <mesh>
            <boxGeometry args={[1.3, 1.9, 0.06]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <TextPlane lines={["NOW SHOWING", p.t]} width={1.2} height={1.8} bg={p.c} color={p.a} lit position={[0, 0, 0.04]} />
        </group>
      ))}
      <mesh position={[0, 0.5, 0.2]}>
        <boxGeometry args={[2.4, 1.0, 0.6]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      <TextPlane lines={["TICKETS · 매표소", "팝콘 세트 ₩9,000"]} width={2.2} height={0.5} bg="#ffeaa7" color="#2d3436" position={[0, 0.5, 0.51]} />
      <group position={[0.4, 0, -0.2]}>
        <Person colors={{ shirt: "#c0392b", pants: "#2d3436", skin: "#ffdbac", hair: "#4a2c2a" }} outfit={NO_OUTFIT} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Street vignettes (world space)
// ---------------------------------------------------------------------------
export function PatrolCar({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SolidBox position={[0, 0.55, 0]} size={[1.8, 0.6, 4.2]} color="#f5f6fa" roughness={0.3} metalness={0.3} />
      <mesh position={[0, 1.05, -0.2]} castShadow>
        <boxGeometry args={[1.6, 0.55, 2.2]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, -0.2]}>
        <boxGeometry args={[1.62, 0.3, 2.0]} />
        <meshStandardMaterial color="#1c2a44" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.82, 0.14, 4.0]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <mesh position={[0, 1.4, -0.2]}>
        <boxGeometry args={[1.0, 0.14, 0.3]} />
        <NightMaterial color="#e74c3c" emissive="#ff3b3b" k={3} />
      </mesh>
      <mesh position={[-0.52, 1.4, -0.2]}>
        <boxGeometry args={[0.26, 0.16, 0.32]} />
        <NightMaterial color="#3498db" emissive="#3b8bff" k={3} />
      </mesh>
      {[-0.95, 0.95].flatMap((x) =>
        [-1.3, 1.3].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.22, 12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))
      )}
      <TextPlane lines={["POLICE 경찰"]} width={1.4} height={0.28} bg="#f5f6fa" color="#1e3a8a" position={[0.92, 0.6, 0]} rotation={[0, Math.PI / 2, 0]} />
      <TextPlane lines={["POLICE 경찰"]} width={1.4} height={0.28} bg="#f5f6fa" color="#1e3a8a" position={[-0.92, 0.6, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <NightLight position={[0, 1.5, -0.2]} intensity={4} distance={5} color="#ff6b6b" />
    </group>
  );
}

export function StandingNpc({ position, yaw = 0, colors, prop, scale = 1 }: { position: V3; yaw?: number; colors: CustomerColors; prop?: "cigarette" | "laundry" | "phone" | "coffee" | "bag"; scale?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Person colors={colors} outfit={NO_OUTFIT} scale={scale}>
        {prop === "cigarette" && (
          <mesh position={[0.3, 1.45, 0.2]} rotation={[0.6, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 5]} />
            <meshStandardMaterial color="#f5f6fa" />
          </mesh>
        )}
        {prop === "laundry" && (
          <mesh position={[0.4, 0.8, 0.1]}>
            <boxGeometry args={[0.45, 0.5, 0.4]} />
            <meshStandardMaterial color="#74b9ff" />
          </mesh>
        )}
        {prop === "phone" && (
          <mesh position={[0.22, 1.3, 0.22]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.08, 0.15, 0.01]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        )}
        {prop === "coffee" && (
          <mesh position={[0.3, 1.0, 0.2]}>
            <cylinderGeometry args={[0.04, 0.032, 0.11, 10]} />
            <meshStandardMaterial color="#f5f6fa" />
          </mesh>
        )}
        {prop === "bag" && (
          <mesh position={[0.36, 0.75, 0.05]}>
            <boxGeometry args={[0.3, 0.35, 0.15]} />
            <meshStandardMaterial color="#f9ca24" />
          </mesh>
        )}
      </Person>
    </group>
  );
}

export function BeerCrates({ position }: { position: V3 }) {
  return (
    <group position={position}>
      {[0, 1].map((i) => (
        <group key={i} position={[i * 0.5, 0, 0]}>
          <SolidBox position={[0, 0.18, 0]} size={[0.45, 0.36, 0.45]} color={i ? "#2ecc71" : "#e67e22"} />
          {i === 0 && <SolidBox position={[0, 0.54, 0]} size={[0.45, 0.36, 0.45]} color="#2ecc71" collide={false} occlude={false} />}
        </group>
      ))}
    </group>
  );
}

export function Lanterns({ from, to, y, count = 6 }: { from: [number, number]; to: [number, number]; y: number; count?: number }) {
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const t = (i + 0.5) / count;
        return (
          <mesh key={i} position={[from[0] + (to[0] - from[0]) * t, y - 0.2, from[1] + (to[1] - from[1]) * t]}>
            <sphereGeometry args={[0.2, 10, 8]} />
            <NightMaterial color="#c0392b" emissive="#ff4d4d" k={2.2} />
          </mesh>
        );
      })}
    </group>
  );
}
