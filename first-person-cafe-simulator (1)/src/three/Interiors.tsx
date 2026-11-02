import { useMemo, useRef } from "react";
import * as THREE from "three";
import "@react-three/fiber";
import { useInteractable } from "@/game/registry";
import type { CustomerColors, InteractTarget } from "@/game/types";
import { FLOOR_H } from "./KBuilding";
import { ItemModel } from "./Items";
import { Person, SolidBox, TextPlane } from "./primitives";
import { tex } from "./textures";

type V3 = [number, number, number];

const SKINS = ["#f6d7b0", "#f1c27d", "#e8b98a", "#ffdbac", "#e0ac69"];
const HAIRS = ["#1c1c1c", "#2b1b17", "#4a2c2a", "#8b5a2b", "#5b3a8a"];
const SHIRTS = ["#e06c75", "#61afef", "#98c379", "#e5c07b", "#c678dd", "#56b6c2", "#f5f6fa", "#2d3436"];

function npcColors(seed: number): CustomerColors {
  const r = (n: number) => Math.abs(Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1;
  return { shirt: SHIRTS[Math.floor(r(1) * SHIRTS.length)], pants: ["#2f3542", "#3d4a63", "#4b3832"][Math.floor(r(2) * 3)], skin: SKINS[Math.floor(r(3) * SKINS.length)], hair: HAIRS[Math.floor(r(4) * HAIRS.length)] };
}

export function Shopkeeper({ position, colors, apron, target, yaw = 0 }: { position: V3; colors: CustomerColors; apron: string; target: InteractTarget; yaw?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useMemo(() => target, [target]);
  useInteractable(ref, t);
  return (
    <group ref={ref} position={position} rotation={[0, yaw, 0]}>
      <Person colors={colors} apron={apron} />
    </group>
  );
}

function Shelf({ position, rotation = 0, colors, round = false }: { position: V3; rotation?: number; colors: string[]; round?: boolean }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SolidBox position={[0, 0.5, 0]} size={[2.4, 1.0, 0.6]} color="#8b5e3c" />
      <SolidBox position={[0, 1.4, -0.2]} size={[2.4, 0.06, 0.4]} color="#8b5e3c" collide={false} occlude={false} />
      {colors.map((c, i) => (
        <group key={i}>
          <mesh position={[-0.9 + (i % 4) * 0.6, 1.12, 0.05]} castShadow>
            {round ? <sphereGeometry args={[0.16, 10, 8]} /> : <boxGeometry args={[0.4, 0.24, 0.4]} />}
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[-0.9 + ((i + 2) % 4) * 0.6, 1.55, -0.2]} castShadow>
            {round ? <sphereGeometry args={[0.14, 10, 8]} /> : <boxGeometry args={[0.34, 0.24, 0.3]} />}
            <meshStandardMaterial color={colors[(i + 1) % colors.length]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SeatedNpc({ position, yaw, seed, y = 0 }: { position: V3; yaw: number; seed: number; y?: number }) {
  return (
    <group position={[position[0], y, position[2]]} rotation={[0, yaw, 0]}>
      <Person colors={npcColors(seed)} sitting>
        <mesh position={[0.2, 1.0, 0.32]}>
          <cylinderGeometry args={[0.04, 0.03, 0.09, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </Person>
    </group>
  );
}

function CafeTable({ position, seats = 2, seed, y = 0 }: { position: V3; seats?: number; seed: number; y?: number }) {
  return (
    <group position={[position[0], y, position[2]]}>
      <ItemModel id={seats === 4 ? "table4" : "table2"} />
      <SolidBox position={[0, 0.4, 0]} size={[0.9, 0.8, 0.9]} color="#000" transparent opacity={0} occlude={false} />
      {seed % 3 !== 0 && <SeatedNpc position={[0, 0, seats === 4 ? -0.95 : -0.75]} yaw={0} seed={seed} />}
      {seed % 2 === 0 && <SeatedNpc position={[0, 0, seats === 4 ? 0.95 : 0.75]} yaw={Math.PI} seed={seed + 7} />}
    </group>
  );
}

function CafeCounter({ z, color, barista, logo }: { z: number; color: string; barista: InteractTarget | null; logo: string }) {
  return (
    <group position={[0, 0, z]}>
      <SolidBox position={[0, 0.5, 0]} size={[4.6, 1.0, 1.0]} color={color} />
      <SolidBox position={[0, 1.03, 0]} size={[4.8, 0.06, 1.2]} color="#dfe6e9" collide={false} occlude={false} />
      <group position={[-1.6, 1.06, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.4, 0.24, 0.4]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
      </group>
      <group position={[1.2, 0, -1.5]}>
        <ItemModel id="espresso2" />
      </group>
      <group position={[-0.6, 0, -1.5]}>
        <ItemModel id="displaySmall" />
      </group>
      <TextPlane lines={[logo]} width={2.2} height={0.5} bg={color} color="#ffffff" position={[0, 0.5, 0.51]} />
      {barista && <Shopkeeper position={[0, 0, -0.9]} colors={{ shirt: "#1e272e", pants: "#2d3436", skin: "#f1c27d", hair: "#1c1c1c" }} apron={color} target={barista} />}
      <group position={[0, 0, 1.0]}>
        <Person colors={npcColors(31)} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Competitor cafés (local coords inside a KBuilding; front at +z)
// ---------------------------------------------------------------------------
export function GigaInterior({ depth }: { depth: number }) {
  const hz = depth / 2;
  return (
    <group>
      <CafeCounter z={-hz + 1.6} color="#f9ca24" barista={{ kind: "competitor", id: "giga" }} logo="GIGA COFFEE 기가커피" />
      <CafeTable position={[-3, 0, 0.5]} seed={3} />
      <CafeTable position={[3, 0, 0.5]} seed={4} />
      <CafeTable position={[-3, 0, 3]} seed={5} />
      <TextPlane lines={["아이스 아메리카노 ₩2,000", "라떼 ₩2,900 · 1+1 EVENT"]} width={3.6} height={1.0} bg="#2d3436" color="#f9ca24" lit position={[0, 2.3, -hz + 0.32]} />
      <TextPlane lines={["GIGA", "COFFEE"]} width={1.6} height={1.6} bg="#f9ca24" color="#2d2d2d" position={[-4.6, 1.8, 0]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

export function StarbeansInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      <CafeCounter z={-hz + 1.6} color="#1e8449" barista={{ kind: "competitor", id: "starbeans" }} logo="★ STARBEANS 스타빈스" />
      <CafeTable position={[2, 0, 1.5]} seed={6} />
      <CafeTable position={[5, 0, 1.5]} seed={8} />
      <TextPlane lines={["2F LOUNGE ↑", "소파 · 콘센트 · WiFi"]} width={1.4} height={0.7} bg="#0e3b22" color="#d4af37" lit position={[-hw + 1.7, 2.0, -hz + 4.6]} />
      {/* second floor lounge */}
      <group position={[0, FLOOR_H, 0]}>
        <group position={[1.5, 0, -1]}>
          <ItemModel id="sofaSet" />
          <SeatedNpc position={[-0.6, 0, -0.65]} yaw={0} seed={11} />
          <SeatedNpc position={[0.6, 0, 0.65]} yaw={Math.PI} seed={12} />
        </group>
        <group position={[4.5, 0, 1.5]}>
          <ItemModel id="table2" />
          <SeatedNpc position={[0, 0, -0.75]} yaw={0} seed={13} />
        </group>
        <group position={[4.5, 0, -2]}>
          <ItemModel id="table4" />
          <SeatedNpc position={[0, 0, 0.95]} yaw={Math.PI} seed={14} />
          <SeatedNpc position={[-0.95, 0, 0]} yaw={Math.PI / 2} seed={15} />
        </group>
        <group position={[-1.5, 0, 2.5]}>
          <ItemModel id="plantBig" />
        </group>
        <group position={[0, 0, -hz + 0.8]}>
          <ItemModel id="bookshelf" />
        </group>
        <TextPlane lines={["STARBEANS RESERVE", "조용히 해주세요 · Quiet zone"]} width={3.2} height={0.8} bg="#0e3b22" color="#d4af37" lit position={[2, 2.2, -hz + 0.32]} />
        <mesh position={[0, 1.6, hz - 0.32]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[width - 1, 2.0]} />
          <meshStandardMaterial color="#bfe4f7" transparent opacity={0.3} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

export function HaruInterior({ depth }: { depth: number }) {
  const hz = depth / 2;
  return (
    <group>
      <CafeCounter z={-hz + 1.6} color="#f8a5c2" barista={{ kind: "competitor", id: "haru" }} logo="하루 디저트 HARU" />
      <group position={[1.8, 0, -hz + 1.6 + 1.3]}>
        <ItemModel id="displayDeluxe" />
      </group>
      <CafeTable position={[-3, 0, 1.5]} seed={21} />
      <CafeTable position={[3, 0, 2.5]} seed={22} />
      <TextPlane lines={["🍓 딸기 생크림 케이크 ₩9,500", "오늘의 디저트 · Today's dessert"]} width={3.6} height={1.0} bg="#fff0f5" color="#c2185b" lit position={[0, 2.3, -hz + 0.32]} />
      <group position={[-4.2, 0, 3]}>
        <ItemModel id="plant" />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Our suppliers
// ---------------------------------------------------------------------------
export function MartInterior({ depth }: { depth: number }) {
  const hz = depth / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[4, 1, 0.9]} color="#8b5e3c" />
      <SolidBox position={[0, 1.03, -hz + 1.4]} size={[4.2, 0.06, 1.1]} color="#d9b382" collide={false} occlude={false} />
      <Shelf position={[-3.2, 0, 0.6]} rotation={Math.PI / 2} colors={["#e74c3c", "#f39c12", "#27ae60", "#f1c40f"]} round />
      <Shelf position={[3.2, 0, 0.6]} rotation={-Math.PI / 2} colors={["#6b4a2f", "#ecf0f1", "#d35400", "#c0392b"]} />
      <Shelf position={[0, 0, 2.2]} colors={["#f5f6fa", "#dfe6e9", "#74b9ff", "#ffeaa7"]} />
      {/* fridge wall */}
      <group position={[-1.6, 0, -hz + 0.7]}>
        <ItemModel id="fridgeLarge" />
      </group>
      <SolidBox position={[1.9, 0.45, -hz + 2.9]} size={[1.2, 0.9, 0.8]} color="#74b9ff" />
      <TextPlane lines={["얼음 ICE"]} width={1.0} height={0.3} bg="#0984e3" color="#ffffff" position={[1.9, 0.6, -hz + 3.31]} />
      {[-1.2, -0.6].map((x) => (
        <mesh key={x} position={[x + 2.6, 0.35, -hz + 2.4]} castShadow>
          <cylinderGeometry args={[0.3, 0.35, 0.7, 10]} />
          <meshStandardMaterial color="#c8a97e" />
        </mesh>
      ))}
      <TextPlane lines={["원두 · 우유 · 얼음 · 컵 · 봉투", "박스 1개 = 12팩 · 배달 ₩3,000"]} width={3.6} height={0.9} bg="#2f5d2e" color="#f7f4d8" lit position={[0, 2.3, -hz + 0.32]} />
      <Shopkeeper position={[0, 0, -hz + 0.7]} colors={{ shirt: "#f5f6fa", pants: "#2d3436", skin: "#f1c27d", hair: "#2b1b17" }} apron="#27ae60" target={{ kind: "mart" }} />
    </group>
  );
}

export function HardwareInterior({ depth }: { depth: number }) {
  const hz = depth / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[4, 1, 0.9]} color="#636e72" />
      <SolidBox position={[0, 1.03, -hz + 1.4]} size={[4.2, 0.06, 1.1]} color="#b2bec3" collide={false} occlude={false} />
      <Shelf position={[-3.2, 0, -1]} rotation={Math.PI / 2} colors={["#e17055", "#636e72", "#fdcb6e", "#0984e3"]} />
      {/* showroom samples */}
      <group position={[-2.6, 0, 2.2]}>
        <ItemModel id="table2" />
      </group>
      <group position={[0.2, 0, 2.6]}>
        <ItemModel id="fan" active />
      </group>
      <group position={[1.4, 0, 2.6]}>
        <ItemModel id="ac" active />
      </group>
      <group position={[2.6, 0, 2.6]}>
        <ItemModel id="heater" active />
      </group>
      <group position={[3.2, 0, 0]}>
        <ItemModel id="bookshelf" />
      </group>
      <group position={[2.2, 0, -0.6]}>
        <ItemModel id="plantBig" />
      </group>
      <group position={[-1.2, 0, 0.4]}>
        <ItemModel id="floorLamp" />
      </group>
      <TextPlane lines={["가구 · 인테리어 · 냉난방기", "모든 상품 골목 배송 · Alley delivery"]} width={3.6} height={0.9} bg="#5a3a26" color="#ffe9c7" lit position={[0, 2.3, -hz + 0.32]} />
      <Shopkeeper position={[0, 0, -hz + 0.7]} colors={{ shirt: "#dfe6e9", pants: "#3d4a63", skin: "#e8b98a", hair: "#6b6b6b" }} apron="#e17055" target={{ kind: "hardware" }} />
    </group>
  );
}

export function ApplianceInterior({ depth }: { depth: number }) {
  const hz = depth / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[4, 1, 0.9]} color="#2d3436" />
      <SolidBox position={[0, 1.03, -hz + 1.4]} size={[4.2, 0.06, 1.1]} color="#b2bec3" collide={false} occlude={false} />
      <group position={[-3.6, 0, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <ItemModel id="espresso3" />
      </group>
      <group position={[-3.6, 0, 2.2]} rotation={[0, Math.PI / 2, 0]}>
        <ItemModel id="espresso2" />
      </group>
      <group position={[3.6, 0, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <ItemModel id="fridgeLarge" />
      </group>
      <group position={[3.6, 0, 2.4]} rotation={[0, -Math.PI / 2, 0]}>
        <ItemModel id="iceMaker" />
      </group>
      <group position={[-1.2, 0, 2.8]}>
        <ItemModel id="bingsuMachine" />
      </group>
      <group position={[0.2, 0, 2.8]}>
        <ItemModel id="blender" />
      </group>
      <group position={[1.4, 0, 2.8]}>
        <ItemModel id="grinder" />
      </group>
      <TextPlane lines={["커피머신 · 냉장고 · 쇼케이스 · 빙수기", "Café Appliance Center 카페기기 전문"]} width={3.8} height={0.9} bg="#0a3d62" color="#48dbfb" lit position={[0, 2.3, -hz + 0.32]} />
      <Shopkeeper position={[0, 0, -hz + 0.7]} colors={{ shirt: "#0984e3", pants: "#2d3436", skin: "#f6d7b0", hair: "#1c1c1c" }} apron="#2d3436" target={{ kind: "appliance" }} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Neighbourhood venues (enterable; staffed by talkable NPCs — quest hooks later)
// ---------------------------------------------------------------------------
import { BarDisplay, CinemaDisplay, GamesDisplay, GymDisplay, LaundryDisplay, PoliceDisplay } from "./Vignettes";
import { NightLight, NightMaterial } from "./primitives";

function Npc({ position, yaw = 0, colors, apron, line, seed }: { position: V3; yaw?: number; colors?: CustomerColors; apron?: string; line: string; seed?: number }) {
  return <Shopkeeper position={position} yaw={yaw} colors={colors ?? npcColors(seed ?? 1)} apron={apron ?? "#2d3436"} target={{ kind: "npc", id: line }} />;
}

function Bench2({ position, yaw = 0 }: { position: V3; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <SolidBox position={[0, 0.42, 0]} size={[1.8, 0.1, 0.5]} color="#8b5e3c" />
      <mesh position={[0, 0.75, -0.22]}>
        <boxGeometry args={[1.8, 0.5, 0.06]} />
        <meshStandardMaterial color="#8b5e3c" />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.46]} />
          <meshStandardMaterial color="#2f3640" />
        </mesh>
      ))}
    </group>
  );
}

export function CinemaInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      {/* lobby: ticket counter + concession on the back wall, posters down the sides */}
      <group position={[0, 0, -hz + 1.6]}>
        <CinemaDisplay width={width} />
      </group>
      <group position={[-3.6, 0, -hz + 1.8]}>
        <SolidBox position={[0, 0.5, 0]} size={[2.6, 1.0, 0.8]} color="#c0392b" />
        <mesh position={[-0.8, 1.25, 0]}>
          <boxGeometry args={[0.6, 0.5, 0.5]} />
          <NightMaterial color="#ffeaa7" emissive="#ffd166" k={1.2} />
        </mesh>
        <TextPlane lines={["POPCORN 팝콘", "L ₩6,000 · 콜라 ₩3,000"]} width={2.2} height={0.6} bg="#ffeaa7" color="#2d3436" position={[0, 0.5, 0.41]} />
        <Npc position={[0.3, 0, -0.9]} colors={{ shirt: "#c0392b", pants: "#2d3436", skin: "#f1c27d", hair: "#1c1c1c" }} apron="#ffd166" line="Popcorn girl: 'Large popcorn set? The 7pm 4DX is nearly sold out!'" />
      </group>
      {/* screen doors */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 - 0.3), 0, 1.0]} rotation={[0, (-side * Math.PI) / 2, 0]}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[1.4, 2.2, 0.08]} />
            <meshStandardMaterial color="#1e272e" />
          </mesh>
          <TextPlane lines={[side < 0 ? "SCREEN 1 · 상영관 1" : "SCREEN 2 · 4DX"]} width={1.3} height={0.3} bg="#111" color="#ffd166" lit position={[0, 2.4, 0.02]} />
        </group>
      ))}
      <Bench2 position={[0, 0, 2.2]} yaw={Math.PI} />
      <SeatedNpc position={[-0.5, 0, 2.2]} yaw={Math.PI} seed={41} />
      <SeatedNpc position={[0.5, 0, 2.2]} yaw={Math.PI} seed={42} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial color="#6d1f2b" roughness={1} />
      </mesh>
      <NightLight position={[0, 2.9, 0]} intensity={6} distance={9} color="#ffd166" />
      <Npc position={[2.6, 0, 3.4]} yaw={Math.PI + 0.5} seed={43} line="Teenager: 'Have you seen LOVE IN HONGDAE? They filmed the café scene right on this street.'" />
    </group>
  );
}

export function GymInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <group position={[0, 0, -hz + 2.2]}>
        <GymDisplay width={width} />
      </group>
      <SolidBox position={[width / 2 - 1.6, 0.5, hz - 1.6]} size={[2.4, 1.0, 0.8]} color="#2d3436" />
      <TextPlane lines={["MUSCLE FACTORY", "1개월 ₩89,000 · PT 10회 ₩550,000"]} width={2.2} height={0.6} bg="#111" color="#ffeaa7" lit position={[width / 2 - 1.6, 0.5, hz - 1.19]} />
      <Npc position={[width / 2 - 1.6, 0, hz - 2.4]} colors={{ shirt: "#111", pants: "#2d3436", skin: "#e0ac69", hair: "#1c1c1c" }} apron="#ffeaa7" line="Trainer Min-ho: 'First month half price if you sign up today. Cafés don't build glutes, you know.'" />
      {/* squat rack + bench */}
      <group position={[-width / 2 + 1.8, 0, 1.5]}>
        {[-0.6, 0.6].map((x) => (
          <mesh key={x} position={[x, 1.1, 0]}>
            <boxGeometry args={[0.1, 2.2, 0.1]} />
            <meshStandardMaterial color="#636e72" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 2.0, 8]} />
          <meshStandardMaterial color="#b2bec3" metalness={0.8} roughness={0.2} />
        </mesh>
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} position={[x, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 14]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))}
        <SolidBox position={[0, 0.25, 1.2]} size={[0.4, 0.5, 1.2]} color="#c0392b" />
      </group>
      <mesh position={[-width / 2 + 0.32, 1.5, -1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6, 2.2]} />
        <meshStandardMaterial color="#9fd3f0" metalness={0.8} roughness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial color="#2d3436" roughness={1} />
      </mesh>
      <Npc position={[0.5, 0, 2.6]} yaw={Math.PI} colors={{ shirt: "#e84393", pants: "#2d3436", skin: "#f6d7b0", hair: "#5b3a8a" }} line="Gym-goer: 'An iced americano after leg day is the only thing that keeps me alive.'" />
    </group>
  );
}

export function LaundryInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <group position={[0, 0, -hz + 1.0]}>
        <LaundryDisplay width={width} />
      </group>
      {/* folding table, chairs, vending machine */}
      <SolidBox position={[0, 0.45, 1.8]} size={[2.4, 0.9, 0.9]} color="#dfe6e9" />
      <mesh position={[0.5, 0.95, 1.8]}>
        <boxGeometry args={[0.5, 0.1, 0.4]} />
        <meshStandardMaterial color="#74b9ff" />
      </mesh>
      <Bench2 position={[-width / 2 + 1.3, 0, 2.5]} yaw={Math.PI / 2} />
      <SeatedNpc position={[-width / 2 + 1.3, 0, 2.0]} yaw={Math.PI / 2} seed={51} />
      <group position={[width / 2 - 0.8, 0, 2.4]}>
        <SolidBox position={[0, 0.9, 0]} size={[0.9, 1.8, 0.7]} color="#e74c3c" />
        <mesh position={[0, 1.1, 0.36]}>
          <planeGeometry args={[0.6, 1.0]} />
          <NightMaterial color="#ffeaa7" emissive="#ffeaa7" k={1.2} />
        </mesh>
      </group>
      <TextPlane lines={["세제 자판기 · 이용안내", "1. 동전 투입  2. 세제  3. 시작"]} width={1.8} height={0.6} bg="#ffffff" color="#0984e3" position={[width / 2 - 0.32, 1.9, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.tiles(6, 6, "#e9eef2")} roughness={0.5} />
      </mesh>
      <Npc position={[1.6, 0, 0.6]} yaw={Math.PI - 0.4} colors={{ shirt: "#a29bfe", pants: "#636e72", skin: "#ffdbac", hair: "#2b1b17" }} line="Student: 'Thirty-eight minutes left on the dryer. Is your café open? I need somewhere warm.'" />
    </group>
  );
}

export function GamesInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <group position={[0, 0, -hz + 1.2]}>
        <GamesDisplay width={width} />
      </group>
      <Shelf position={[-width / 2 + 0.9, 0, 1.2]} rotation={Math.PI / 2} colors={["#e84393", "#00cec9", "#fdcb6e", "#6c5ce7"]} />
      <Shelf position={[width / 2 - 0.9, 0, 1.2]} rotation={-Math.PI / 2} colors={["#e17055", "#55efc4", "#74b9ff", "#2d3436"]} />
      <SolidBox position={[1.4, 0.5, hz - 1.8]} size={[2.4, 1.0, 0.8]} color="#2d3436" />
      <TextPlane lines={["중고 매입 · 교환 · 수리", "닌텐도 ₩320,000~"]} width={2.2} height={0.6} bg="#2d3436" color="#55efc4" lit position={[1.4, 0.5, hz - 1.39]} />
      <Npc position={[1.4, 0, hz - 2.6]} colors={{ shirt: "#2d3436", pants: "#2d3436", skin: "#f1c27d", hair: "#1c1c1c" }} apron="#55efc4" line="Owner Ji-ho: 'Retro cartridges, half price on rainy days. Speaking of — your café needs a GameCube in the corner.'" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial color="#3d3d4a" roughness={1} />
      </mesh>
      <NightLight position={[0, 2.9, 0]} intensity={6} distance={9} color="#55efc4" />
    </group>
  );
}

export function PoliceInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <group position={[0, 0, -hz + 1.6]}>
        <PoliceDisplay width={width} />
      </group>
      <Npc position={[-0.6, 0, -hz + 1.0]} colors={{ shirt: "#1e3a5f", pants: "#1e3a5f", skin: "#f1c27d", hair: "#1c1c1c" }} apron="#1e3a5f" line="Officer Park: 'Lost property is in the box by the door. And tell your delivery riders to slow down on the walking street.'" />
      <Bench2 position={[width / 2 - 1.2, 0, 1.0]} yaw={-Math.PI / 2} />
      <Bench2 position={[width / 2 - 1.2, 0, 3.0]} yaw={-Math.PI / 2} />
      <SeatedNpc position={[width / 2 - 1.2, 0, 3.0]} yaw={-Math.PI / 2} seed={61} />
      {/* notice board & lost property box */}
      <mesh position={[-width / 2 + 0.32, 1.6, 1.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 1.4]} />
        <meshStandardMaterial color="#6b4a35" />
      </mesh>
      {[-0.9, -0.3, 0.3, 0.9].map((z, i) => (
        <mesh key={i} position={[-width / 2 + 0.34, 1.6 + (i % 2) * 0.3 - 0.15, 1.5 + z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.45, 0.6]} />
          <meshStandardMaterial color={["#f5f6fa", "#ffeaa7", "#f5f6fa", "#74b9ff"][i]} />
        </mesh>
      ))}
      <TextPlane lines={["분실물 LOST & FOUND"]} width={1.0} height={0.25} bg="#1e3a8a" color="#ffffff" position={[-width / 2 + 1.2, 1.2, hz - 1.2]} />
      <SolidBox position={[-width / 2 + 1.2, 0.4, hz - 1.2]} size={[0.9, 0.8, 0.7]} color="#c89b63" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.tiles(6, 6, "#d8dde3")} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function BarInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <group position={[0, 0, -hz + 1.6]}>
        <BarDisplay width={width} />
      </group>
      <Npc position={[0.2, 0, -hz + 0.9]} colors={{ shirt: "#111", pants: "#2d3436", skin: "#e8b98a", hair: "#2b1b17" }} apron="#ff7675" line="Bartender Soo: 'Soju and beer, that's a somaek. Come back after you close — first round's on the house for neighbours.'" />
      {/* stools */}
      {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => (
        <group key={x} position={[x, 0, -hz + 2.6]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.06, 12]} />
            <meshStandardMaterial color="#c0392b" />
          </mesh>
        </group>
      ))}
      <CafeTable position={[-2.8, 0, 1.8]} seats={4} seed={71} />
      <CafeTable position={[2.8, 0, 1.8]} seats={4} seed={72} />
      {/* string lights & lanterns */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-width / 2 + 1 + i * ((width - 2) / 7), 2.6 + (i % 2) * 0.15, 0.5]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <NightMaterial color="#fff6d6" emissive="#ffd166" k={3} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.wood(5, 5)} roughness={0.8} />
      </mesh>
      <TextPlane lines={["소맥 ₩9,000 · 안주 ₩15,000~", "노래주점은 2층입니다 ↑"]} width={2.6} height={0.6} bg="#111" color="#ff7675" lit position={[width / 2 - 0.32, 1.9, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <NightLight position={[0, 2.5, 0]} intensity={8} distance={10} color="#ff8f8f" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// More storefronts (all enterable)
// ---------------------------------------------------------------------------
import { DecorModel } from "./Decor";
import { DECOR_MAP } from "@/game/catalog";

function Showpiece({ id, position, yaw = 0 }: { id: string; position: V3; yaw?: number }) {
  const d = DECOR_MAP[id];
  if (!d) return null;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <DecorModel def={d} />
      {!d.noCollide && <SolidBox position={[0, 0.4, 0]} size={[d.size[0], 0.8, d.size[1]]} color="#000" transparent opacity={0} occlude={false} />}
    </group>
  );
}

export function LivingInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      {/* till at the back */}
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[3.4, 1.0, 0.8]} color="#e6ddcf" />
      <SolidBox position={[0, 1.03, -hz + 1.4]} size={[3.6, 0.06, 1.0]} color="#c9a070" collide={false} occlude={false} />
      <Shopkeeper position={[0, 0, -hz + 0.7]} colors={{ shirt: "#f1ebe1", pants: "#4b3832", skin: "#ffdbac", hair: "#5b3a8a" }} apron="#e8a7a0" target={{ kind: "living" }} />
      <TextPlane lines={["DALGONA LIVING", "소파 · 조명 · 러그 · 식물 · 오브제"]} width={3.6} height={0.9} bg="#f1ebe1" color="#8a4b1e" lit position={[0, 2.3, -hz + 0.32]} />
      {/* room sets */}
      <Showpiece id="sofaGreen" position={[-hw + 2.2, 0, -1.5]} yaw={Math.PI / 2} />
      <Showpiece id="coffeeTableMarble" position={[-hw + 3.4, 0, -1.5]} />
      <Showpiece id="rugPersian" position={[-hw + 3.2, 0, -1.4]} />
      <Showpiece id="floorLampArc" position={[-hw + 2.2, 0, -3.0]} />
      <Showpiece id="sofaMustard" position={[hw - 2.2, 0, -1.5]} yaw={-Math.PI / 2} />
      <Showpiece id="sideTableBrass" position={[hw - 2.2, 0, -3.0]} />
      <Showpiece id="tableLampCeramic" position={[hw - 2.2, 0.56, -3.0]} />
      <Showpiece id="rugGeo" position={[hw - 3.2, 0, -1.4]} />
      <Showpiece id="armchairRattan" position={[-1.2, 0, 1.4]} yaw={Math.PI} />
      <Showpiece id="armchairVelvet" position={[1.2, 0, 1.4]} yaw={Math.PI} />
      <Showpiece id="swingChair" position={[hw - 1.6, 0, 2.6]} yaw={-Math.PI / 2 - 0.5} />
      <Showpiece id="daybed" position={[-hw + 2.0, 0, 2.6]} yaw={Math.PI / 2} />
      <Showpiece id="statueHaetae" position={[-0.9, 0, -hz + 3.2]} />
      <Showpiece id="statueMoonJar" position={[0.9, 0, -hz + 3.2]} />
      <Showpiece id="fiddleFig" position={[-hw + 0.9, 0, 0.4]} />
      <Showpiece id="oliveTree" position={[hw - 0.9, 0, 0.4]} />
      <Showpiece id="chandelier" position={[0, 0, -0.5]} />
      <Showpiece id="pendantBrass" position={[-hw + 3, 0, 3.4]} />
      <Showpiece id="catTower" position={[0, 0, 3.6]} />
      <Showpiece id="shelfLadder" position={[-hw + 0.7, 0, 3.6]} yaw={Math.PI / 2} />
      <Showpiece id="printTiger" position={[-hw + 0.3, 0, -3.8]} yaw={Math.PI / 2} />
      <Showpiece id="printHan" position={[hw - 0.3, 0, -3.8]} yaw={-Math.PI / 2} />
      <Showpiece id="mirrorArch" position={[hw - 0.3, 0, 1.2]} yaw={-Math.PI / 2} />
      <Showpiece id="neonCoffee" position={[0, 0, -hz + 0.35]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.herringbone(5, 5)} roughness={0.7} />
      </mesh>
      <NightLight position={[0, 2.9, 1]} intensity={6} distance={9} color="#ffd9a0" />
      <Npc position={[2.6, 0, -0.6]} yaw={Math.PI + 0.6} seed={81} line="Shopper: 'I came in for a candle and now I'm measuring sofas. This place is dangerous.'" />
    </group>
  );
}

export function ChickenInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.6]} size={[4.6, 1.0, 1.0]} color="#c0392b" />
      <SolidBox position={[0, 1.03, -hz + 1.6]} size={[4.8, 0.06, 1.2]} color="#dfe6e9" collide={false} occlude={false} />
      {/* fryers & beer taps */}
      {[-1.2, 0].map((x) => (
        <group key={x} position={[x, 0, -hz + 0.6]}>
          <SolidBox position={[0, 0.5, 0]} size={[0.9, 1.0, 0.7]} color="#c8ccd1" metalness={0.6} roughness={0.35} />
          <mesh position={[0, 1.02, 0]}>
            <boxGeometry args={[0.7, 0.04, 0.5]} />
            <meshStandardMaterial color="#8a9096" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.08, 0]}>
            <boxGeometry args={[0.6, 0.06, 0.4]} />
            <meshStandardMaterial color="#d4a017" emissive="#e8b23a" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
      <group position={[1.5, 0, -hz + 0.6]}>
        <SolidBox position={[0, 0.5, 0]} size={[1.0, 1.0, 0.6]} color="#5a3b26" />
        {[-0.3, 0, 0.3].map((x) => (
          <mesh key={x} position={[x, 1.25, 0.1]}>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
            <meshStandardMaterial color="#c9a24d" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
      <TextPlane lines={["후라이드 ₩19,000 · 양념 ₩20,000", "생맥주 500cc ₩4,500 · 치맥 세트"]} width={4.2} height={1.0} bg="#c0392b" color="#fff3b0" lit position={[0, 2.3, -hz + 0.32]} />
      <Npc position={[0.6, 0, -hz + 2.4]} colors={{ shirt: "#f5f6fa", pants: "#2d3436", skin: "#e8b98a", hair: "#2b1b17" }} apron="#c0392b" line="Chicken ajusshi: 'Half fried, half yangnyeom. You run the café? Send your customers after 6 — chimaek is a food group.'" />
      <CafeTable position={[-2.6, 0, 1.0]} seats={4} seed={91} />
      <CafeTable position={[2.6, 0, 1.0]} seats={4} seed={92} />
      <CafeTable position={[0, 0, 3.2]} seats={4} seed={93} />
      {/* TV on the wall showing baseball */}
      <mesh position={[-width / 2 + 0.32, 2.2, 2.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.6, 0.9]} />
        <NightMaterial color="#111" emissive="#4a8a3a" k={1.2} />
      </mesh>
      <TextPlane lines={["⚾ LG 3 : 2 두산  7회말"]} width={1.5} height={0.3} bg="#1e272e" color="#ffffff" lit position={[-width / 2 + 0.34, 2.2, 2.0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.tiles(5, 5, "#e8d8c3")} roughness={0.6} />
      </mesh>
      <NightLight position={[0, 2.8, 1]} intensity={7} distance={9} color="#ffb366" />
    </group>
  );
}

export function NoraebangInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[3.0, 1.0, 0.8]} color="#2b1a4a" />
      <SolidBox position={[0, 1.03, -hz + 1.4]} size={[3.2, 0.06, 1.0]} color="#c77dff" collide={false} occlude={false} />
      <Npc position={[0, 0, -hz + 0.7]} colors={{ shirt: "#6c2bd9", pants: "#2d3436", skin: "#f6d7b0", hair: "#1c1c1c" }} apron="#2b1a4a" line="Noraebang counter: 'Room 3 is free. One hour, free tambourines, no Gangnam Style after 1 am.'" />
      <TextPlane lines={["노래방 1시간 ₩15,000", "코인 1곡 ₩500 · 서비스 30분"]} width={3.6} height={0.9} bg="#6c2bd9" color="#ffd6ff" lit position={[0, 2.3, -hz + 0.32]} />
      {/* numbered room doors down both sides with coloured glow */}
      {[-3.2, -1.2, 0.8, 2.8].map((z, i) => (
        <group key={z}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * (width / 2 - 0.35), 0, z]} rotation={[0, (-side * Math.PI) / 2, 0]}>
              <mesh position={[0, 1.05, 0]}>
                <boxGeometry args={[1.0, 2.1, 0.06]} />
                <meshStandardMaterial color="#1e272e" />
              </mesh>
              <mesh position={[0, 1.3, 0.035]}>
                <planeGeometry args={[0.4, 0.5]} />
                <NightMaterial color="#2b1a4a" emissive={["#ff4d6d", "#4dd0ff", "#ffd54d", "#9b59ff"][(i + (side > 0 ? 1 : 0)) % 4]} k={1.6} />
              </mesh>
              <TextPlane lines={[`${i * 2 + (side > 0 ? 2 : 1)}`]} width={0.3} height={0.3} bg="#111" color="#ffd6ff" lit position={[0, 2.3, 0.04]} />
            </group>
          ))}
        </group>
      ))}
      {/* disco ball */}
      <mesh position={[0, 2.8, 0.5]}>
        <sphereGeometry args={[0.25, 12, 10]} />
        <meshStandardMaterial color="#dfe6e9" metalness={0.9} roughness={0.15} />
      </mesh>
      <NightLight position={[0, 2.5, 0.5]} intensity={8} distance={8} color="#c77dff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial color="#3a2a5a" roughness={1} />
      </mesh>
    </group>
  );
}

export function ConvenienceInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      <SolidBox position={[-hw + 2.2, 0.5, -hz + 1.4]} size={[2.6, 1.0, 0.8]} color="#8e44ad" />
      <SolidBox position={[-hw + 2.2, 1.03, -hz + 1.4]} size={[2.8, 0.06, 1.0]} color="#dfe6e9" collide={false} occlude={false} />
      <Npc position={[-hw + 2.2, 0, -hz + 0.7]} colors={{ shirt: "#8e44ad", pants: "#2d3436", skin: "#f1c27d", hair: "#1c1c1c" }} apron="#f5f6fa" line="Part-timer: 'Triangle kimbap is 1+1 today. Microwave's over there. Please don't eat ramyeon by the window again.'" />
      <Shelf position={[0.4, 0, -1.0]} colors={["#e74c3c", "#f1c40f", "#3498db", "#2ecc71"]} />
      <Shelf position={[0.4, 0, 1.0]} rotation={Math.PI} colors={["#e67e22", "#9b59b6", "#1abc9c", "#e84393"]} />
      <Shelf position={[hw - 0.9, 0, 0]} rotation={-Math.PI / 2} colors={["#f5f6fa", "#74b9ff", "#ffeaa7", "#fd79a8"]} />
      {/* fridges along the back */}
      {[0.5, 2.0, 3.5].map((x) => (
        <group key={x} position={[x, 0, -hz + 0.5]}>
          <SolidBox position={[0, 0.95, 0]} size={[1.3, 1.9, 0.7]} color="#dfe6e9" />
          <mesh position={[0, 1.0, 0.36]}>
            <planeGeometry args={[1.1, 1.6]} />
            <NightMaterial color="#9fd3f0" emissive="#bfe4f7" k={1.2} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* ramyeon counter by the window */}
      <SolidBox position={[0, 0.5, hz - 1.0]} size={[3.0, 1.0, 0.5]} color="#f5f6fa" />
      <Showpiece id="stoolWhite" position={[-0.8, 0, hz - 1.6]} />
      <Showpiece id="stoolWhite" position={[0.8, 0, hz - 1.6]} />
      <TextPlane lines={["24시 편의점 · 택배 · ATM", "삼각김밥 1+1 · 컵라면 ₩1,500"]} width={3.6} height={0.9} bg="#8e44ad" color="#ffffff" lit position={[-hw + 2.2, 2.3, -hz + 0.32]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.tiles(6, 6, "#eef0f2")} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 2.9, 0]} intensity={16} distance={10} color="#ffffff" />
    </group>
  );
}

export function RecordInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[3.0, 1.0, 0.8]} color="#2d3436" />
      <Showpiece id="vinylShelf" position={[0, 1.04, -hz + 0.6]} />
      <Npc position={[-1.2, 0, -hz + 0.7]} colors={{ shirt: "#2d3436", pants: "#2d3436", skin: "#e0ac69", hair: "#6b6b6b" }} apron="#f9ca24" line="Record shop owner: 'City pop is back, Korean indie never left. Want a playlist for the café? Everything slow and a bit sad.'" />
      {/* crate rows */}
      {[-1.5, 0.5].map((z) => (
        <group key={z}>
          {[-2.4, -0.8, 0.8, 2.4].map((x, i) => (
            <group key={x} position={[x, 0, z]}>
              <SolidBox position={[0, 0.4, 0]} size={[1.4, 0.8, 0.9]} color="#6b4a35" />
              {Array.from({ length: 12 }).map((_, k) => (
                <mesh key={k} position={[-0.55 + k * 0.1, 0.95, 0]} rotation={[0.15, 0, 0]}>
                  <boxGeometry args={[0.03, 0.3, 0.3]} />
                  <meshStandardMaterial color={["#c0392b", "#2980b9", "#f1c40f", "#2d3436", "#8e44ad", "#16a085"][(k + i) % 6]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
      <Showpiece id="vinylWall" position={[-hw + 0.3, 0, 2.4]} yaw={Math.PI / 2} />
      <Showpiece id="vinylWall" position={[hw - 0.3, 0, 2.4]} yaw={-Math.PI / 2} />
      <Showpiece id="gramophone" position={[hw - 1.0, 0, -3.2]} />
      <Showpiece id="neonHongdae" position={[0, 0, -hz + 0.35]} />
      <TextPlane lines={["LP · CD · 카세트 · 중고 매입", "라이브 클럽은 2층 ↑"]} width={3.6} height={0.9} bg="#2d3436" color="#f9ca24" lit position={[0, 2.3, -hz + 0.32]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.walnut(5, 5)} roughness={0.8} />
      </mesh>
      <NightLight position={[0, 2.8, 0]} intensity={6} distance={9} color="#ffe3a0" />
      <Npc position={[1.6, 0, 2.6]} yaw={Math.PI + 0.3} seed={95} line="Crate digger: 'Shh. I'm looking for the 1988 Kim Hyun-sik pressing. It's here somewhere.'" />
    </group>
  );
}

export function HostelInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[3.4, 1.0, 0.8]} color="#0984e3" />
      <SolidBox position={[0, 1.03, -hz + 1.4]} size={[3.6, 0.06, 1.0]} color="#dfe6e9" collide={false} occlude={false} />
      <Npc position={[0, 0, -hz + 0.7]} colors={{ shirt: "#0984e3", pants: "#2d3436", skin: "#f6d7b0", hair: "#2b1b17" }} apron="#dfe6e9" line="Hostel reception: 'Checkout's 11. Rooftop bar opens at 7. Can I put your café on the recommendations board?'" />
      <TextPlane lines={["HONGDAE HOSTEL · 체크인 15:00", "도미토리 ₩25,000 · 루프탑 바 7F"]} width={3.6} height={0.9} bg="#0984e3" color="#ffffff" lit position={[0, 2.3, -hz + 0.32]} />
      {/* lounge */}
      <Showpiece id="sofaNavy" position={[-hw + 2.4, 0, 0.6]} yaw={Math.PI / 2} />
      <Showpiece id="beanbagYellow" position={[-hw + 1.4, 0, 2.6]} />
      <Showpiece id="beanbagGrey" position={[-hw + 2.6, 0, 3.0]} />
      <Showpiece id="coffeeTableOak" position={[-hw + 3.4, 0, 0.6]} />
      <Showpiece id="rugJute" position={[-hw + 3.2, 0, 1.4]} />
      <Showpiece id="shelfCube" position={[hw - 0.5, 0, 0.5]} yaw={-Math.PI / 2} />
      <Showpiece id="globe" position={[hw - 1.6, 0, -3.0]} />
      <Showpiece id="suitcaseStack" position={[hw - 1.2, 0, 3.4]} />
      {/* world clocks */}
      {["SEOUL", "TOKYO", "LONDON", "NYC"].map((city, i) => (
        <group key={city} position={[-1.8 + i * 1.2, 0, -hz + 0.34]}>
          <Showpiece id="clockStation" position={[0, 0.4, 0]} />
          <TextPlane lines={[city]} width={0.7} height={0.2} bg="#1e272e" color="#ffffff" position={[0, 1.95, 0.05]} />
        </group>
      ))}
      {/* recommendations board */}
      <mesh position={[-hw + 0.32, 1.6, -2.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 1.4]} />
        <meshStandardMaterial color="#6b4a35" />
      </mesh>
      {[-0.8, -0.3, 0.2, 0.7].map((z, i) => (
        <mesh key={i} position={[-hw + 0.34, 1.6 + (i % 2) * 0.3 - 0.15, -2.0 + z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.4, 0.5]} />
          <meshStandardMaterial color={["#ffeaa7", "#fd79a8", "#74b9ff", "#55efc4"][i]} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.concrete(5, 5, "#b9b3a8")} roughness={0.9} />
      </mesh>
      <pointLight position={[0, 2.9, 0]} intensity={14} distance={10} color="#fff1dc" />
      <Npc position={[-hw + 2.4, 0, 0.6]} yaw={Math.PI / 2} seed={97} line="Backpacker: 'Three days in Seoul and I've only had coffee from Giga. Is yours better? Be honest.'" />
    </group>
  );
}

export function PhotoInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      {/* self-service booths */}
      {[-hw + 1.5, -hw + 3.7, hw - 3.7, hw - 1.5].map((x, i) => (
        <group key={x} position={[x, 0, -hz + 1.6]}>
          <SolidBox position={[0, 1.15, 0]} size={[1.8, 2.3, 1.6]} color={["#ffffff", "#ffe3ec", "#e3f0ff", "#ffffff"][i]} />
          <mesh position={[0, 1.2, 0.81]}>
            <planeGeometry args={[1.0, 1.8]} />
            <meshStandardMaterial color="#e84393" transparent opacity={0.85} />
          </mesh>
          <TextPlane lines={["인생네컷", "4 CUTS ₩4,000"]} width={1.4} height={0.5} bg="#ffffff" color="#e84393" lit position={[0, 2.0, 0.82]} />
        </group>
      ))}
      {/* props table & mirrors */}
      <SolidBox position={[0, 0.45, 1.2]} size={[2.4, 0.9, 0.8]} color="#f5f6fa" />
      {["#fd79a8", "#74b9ff", "#ffeaa7", "#55efc4", "#a29bfe"].map((c, i) => (
        <mesh key={i} position={[-0.9 + i * 0.45, 1.0, 1.2]}>
          <torusGeometry args={[0.1, 0.03, 8, 14]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <Showpiece id="mirrorArch" position={[-hw + 0.3, 0, 1.6]} yaw={Math.PI / 2} />
      <Showpiece id="mirrorArch" position={[hw - 0.3, 0, 1.6]} yaw={-Math.PI / 2} />
      <Showpiece id="neonCoffee" position={[0, 0, hz - 0.4]} yaw={Math.PI} />
      <TextPlane lines={["셀프 사진관 · 24시 무인", "소품 무료 · 프레임 12종"]} width={3.4} height={0.8} bg="#ffffff" color="#e84393" lit position={[0, 2.5, -hz + 0.32]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.checker(4, 4)} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 2.9, 0]} intensity={16} distance={10} color="#ffffff" />
      <Npc position={[1.0, 0, 2.6]} yaw={Math.PI + 0.3} seed={99} line="Girl with bunny ears: 'We're doing matching frames — could you take one of us by the neon? Thanks, oppa!'" />
      <Npc position={[1.7, 0, 2.5]} yaw={Math.PI - 0.4} seed={100} line="Her friend: 'Say kimchi!'" />
    </group>
  );
}

export function BunsikInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.6]} size={[4.0, 1.0, 1.0]} color="#e74c3c" />
      <SolidBox position={[0, 1.03, -hz + 1.6]} size={[4.2, 0.06, 1.2]} color="#dfe6e9" collide={false} occlude={false} />
      {/* tteokbokki pan with steam */}
      <mesh position={[-1.0, 1.1, -hz + 1.6]}>
        <cylinderGeometry args={[0.45, 0.4, 0.12, 20]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh position={[-1.0, 1.17, -hz + 1.6]}>
        <cylinderGeometry args={[0.4, 0.4, 0.04, 20]} />
        <meshStandardMaterial color="#c0392b" emissive="#e74c3c" emissiveIntensity={0.3} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-1.0 + (i - 1) * 0.15, 1.5 + i * 0.12, -hz + 1.6]}>
          <sphereGeometry args={[0.1 + i * 0.03, 8, 6]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3 - i * 0.08} />
        </mesh>
      ))}
      {/* fish cake skewers in broth */}
      <mesh position={[0.6, 1.08, -hz + 1.6]}>
        <boxGeometry args={[0.8, 0.1, 0.5]} />
        <meshStandardMaterial color="#8a9096" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-0.25, -0.08, 0.08, 0.25].map((x) => (
        <mesh key={x} position={[0.6 + x, 1.35, -hz + 1.6]} rotation={[0.2, 0, x * 0.5]}>
          <cylinderGeometry args={[0.006, 0.006, 0.5, 4]} />
          <meshStandardMaterial color="#c9a070" />
        </mesh>
      ))}
      <Npc position={[0.2, 0, -hz + 0.7]} colors={{ shirt: "#f5f6fa", pants: "#2d3436", skin: "#e8b98a", hair: "#6b6b6b" }} apron="#e74c3c" line="Bunsik imo: 'Tteokbokki, soondae, kimbap — ₩10,000 and you'll roll out. Sit, sit. Yogurt drink is service.'" />
      <TextPlane lines={["떡볶이 ₩4,000 · 김밥 ₩3,500 · 순대 ₩4,500", "라볶이 · 튀김 · 어묵 · 24시"]} width={4.2} height={0.9} bg="#e74c3c" color="#fff5d6" lit position={[0, 2.3, -hz + 0.32]} />
      {/* long shared tables with stools */}
      <Showpiece id="communalTable" position={[0, 0, 1.0]} />
      <Showpiece id="windowLedge" position={[0, 0, hz - 0.9]} yaw={Math.PI} />
      <SeatedNpc position={[-0.8, 0, 0.2]} yaw={0} seed={101} />
      <SeatedNpc position={[0.8, 0, 1.8]} yaw={Math.PI} seed={102} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.tiles(5, 5, "#f3e7c9")} roughness={0.6} />
      </mesh>
      <pointLight position={[0, 2.9, 0]} intensity={14} distance={10} color="#fff1dc" />
    </group>
  );
}

export function BeautyInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      <SolidBox position={[0, 0.5, -hz + 1.4]} size={[3.0, 1.0, 0.8]} color="#9bc53d" />
      <SolidBox position={[0, 1.03, -hz + 1.4]} size={[3.2, 0.06, 1.0]} color="#f5f6fa" collide={false} occlude={false} />
      <Npc position={[0, 0, -hz + 0.7]} colors={{ shirt: "#9bc53d", pants: "#2d3436", skin: "#ffdbac", hair: "#4a2c2a" }} apron="#f5f6fa" line="Staff: 'Sheet masks are 10+10 this week. Your skin looks tired — is it the espresso machine or the rent?'" />
      {[-1.8, -0.6, 0.6, 1.8].map((x, i) => (
        <group key={x}>
          <Shelf position={[x * 1.6 - (i < 2 ? 0.4 : -0.4), 0, -0.6]} colors={["#fd79a8", "#ffeaa7", "#74b9ff", "#a29bfe"]} round />
        </group>
      ))}
      <Shelf position={[0, 0, 2.0]} rotation={Math.PI} colors={["#f5f6fa", "#e84393", "#55efc4", "#fdcb6e"]} round />
      <Shelf position={[-hw + 0.9, 0, 0.6]} rotation={Math.PI / 2} colors={["#ff7675", "#dfe6e9", "#ffeaa7", "#fab1a0"]} />
      <Shelf position={[hw - 0.9, 0, 0.6]} rotation={-Math.PI / 2} colors={["#81ecec", "#dfe6e9", "#fd79a8", "#a29bfe"]} />
      <TextPlane lines={["OLIVE YOUNG 홍대점", "마스크팩 10+10 · 세일 최대 50%"]} width={3.6} height={0.9} bg="#9bc53d" color="#ffffff" lit position={[0, 2.3, -hz + 0.32]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.tiles(6, 6, "#f7f7f4")} roughness={0.35} />
      </mesh>
      <pointLight position={[0, 2.9, 0]} intensity={18} distance={10} color="#ffffff" />
      <Npc position={[1.4, 0, 1.2]} yaw={Math.PI} seed={104} line="Shopper: 'Which cushion matches a 21 shade? Actually, do you know a café with good lighting for selfies?'" />
    </group>
  );
}

export function MallInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      {/* info desk */}
      <SolidBox position={[0, 0.5, -hz + 2.0]} size={[2.6, 1.0, 1.2]} color="#111" />
      <Npc position={[0, 0, -hz + 1.0]} colors={{ shirt: "#111", pants: "#111", skin: "#f1c27d", hair: "#1c1c1c" }} apron="#f5f6fa" line="Information desk: 'Food court B1, MUSINSA 3F, cinema 6F. Parking validation needs a ₩30,000 receipt.'" />
      <TextPlane lines={["AK& 홍대", "INFORMATION · 안내"]} width={2.4} height={0.8} bg="#111" color="#ffffff" lit position={[0, 1.9, -hz + 1.4]} />
      {/* escalators (static) */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (hw - 1.6), 0, -hz + 3.2]}>
          <mesh position={[0, 1.2, 1.8]} rotation={[-0.55, 0, 0]}>
            <boxGeometry args={[1.0, 0.2, 4.4]} />
            <meshStandardMaterial color="#636e72" metalness={0.6} roughness={0.4} />
          </mesh>
          {[-0.55, 0.55].map((x) => (
            <mesh key={x} position={[x, 1.7, 1.8]} rotation={[-0.55, 0, 0]}>
              <boxGeometry args={[0.06, 1.0, 4.4]} />
              <meshStandardMaterial color="#bfe4f7" transparent opacity={0.4} />
            </mesh>
          ))}
          <TextPlane lines={["↑ 2F · MUSINSA"]} width={1.0} height={0.3} bg="#111" color="#ffffff" lit position={[0, 2.9, 0.2]} />
        </group>
      ))}
      {/* brand pop-ups */}
      {[-2.4, 0, 2.4].map((x, i) => (
        <group key={x} position={[x, 0, 1.4]}>
          <SolidBox position={[0, 0.6, 0]} size={[1.6, 1.2, 1.0]} color={["#f5f6fa", "#fee500", "#1428a0"][i]} />
          <TextPlane lines={[["GENTLE MONSTER", "KAKAO FRIENDS", "SAMSONG"][i]]} width={1.4} height={0.3} bg={["#f5f6fa", "#fee500", "#1428a0"][i]} color={i === 2 ? "#ffffff" : "#111"} position={[0, 1.0, 0.51]} />
          {i === 1 && (
            <mesh position={[0, 1.6, 0]}>
              <sphereGeometry args={[0.35, 12, 10]} />
              <meshStandardMaterial color="#a0522d" />
            </mesh>
          )}
        </group>
      ))}
      <Showpiece id="benchBlack" position={[0, 0, 3.6]} yaw={Math.PI} />
      <SeatedNpc position={[-0.8, 0, 3.45]} yaw={Math.PI} seed={106} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.terrazzo(6, 6)} roughness={0.25} />
      </mesh>
      <pointLight position={[0, 2.9, 0]} intensity={20} distance={12} color="#ffffff" />
    </group>
  );
}

export function SubwayInterior({ depth, width }: { depth: number; width: number }) {
  const hz = depth / 2;
  const hw = width / 2;
  return (
    <group>
      {/* turnstiles at the back, stairs down behind them (visual) */}
      {[-2.4, -0.8, 0.8, 2.4].map((x) => (
        <group key={x} position={[x, 0, -hz + 2.4]}>
          <SolidBox position={[0, 0.5, 0]} size={[0.3, 1.0, 1.2]} color="#dfe6e9" />
          <mesh position={[0.25, 0.9, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.4, 0.04, 0.06]} />
            <meshStandardMaterial color="#00a84d" />
          </mesh>
          <mesh position={[0, 1.05, -0.5]}>
            <planeGeometry args={[0.2, 0.12]} />
            <NightMaterial color="#111" emissive="#00a84d" k={2} />
          </mesh>
        </group>
      ))}
      <SolidBox position={[0, 0.5, -hz + 0.8]} size={[width - 1, 1.0, 0.4]} color="#8d8680" />
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -0.2 - i * 0.3, -hz + 0.4 + i * 0.001]}>
          <boxGeometry args={[width - 1.2, 0.3, 0.4]} />
          <meshStandardMaterial color={i % 2 ? "#9e978f" : "#8d8680"} />
        </mesh>
      ))}
      <TextPlane lines={["홍대입구 Hongik Univ. · 2호선", "9번 출구 · 공항철도 · 경의중앙선"]} width={4.4} height={0.9} bg="#00a84d" color="#ffffff" lit position={[0, 2.4, -hz + 0.32]} />
      {/* ticket machines & map */}
      {[-hw + 1.0, -hw + 2.0].map((x) => (
        <group key={x} position={[x, 0, -1.0]}>
          <SolidBox position={[0, 0.9, 0]} size={[0.8, 1.8, 0.6]} color="#dfe6e9" />
          <mesh position={[0, 1.2, 0.31]}>
            <planeGeometry args={[0.5, 0.4]} />
            <NightMaterial color="#74b9ff" emissive="#4aa3ff" k={1.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[hw - 0.32, 1.6, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 1.6]} />
        <meshStandardMaterial color="#f5f6fa" />
      </mesh>
      {["#00a84d", "#0052a4", "#ef7c1c", "#996cac", "#bdb092"].map((c, i) => (
        <mesh key={i} position={[hw - 0.33, 1.2 + i * 0.2, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.2, 0.05]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <Showpiece id="benchBlack" position={[0, 0, 2.0]} />
      <SeatedNpc position={[0.8, 0, 2.15]} yaw={0} seed={108} />
      <Npc position={[-1.0, 0, 0.4]} yaw={Math.PI - 0.2} seed={109} line="Commuter: 'Line 2 is delayed again. Is there a café near Exit 9 that isn't a chain?'" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 1, depth - 1]} />
        <meshStandardMaterial map={tex.tiles(8, 8, "#d8dde3")} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 2.9, 0]} intensity={18} distance={12} color="#ffffff" />
    </group>
  );
}
