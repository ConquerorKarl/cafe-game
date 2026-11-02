import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { getSeason } from "@/game/calendar";
import { INGREDIENTS, ITEMS, PRODUCTS, decorOf } from "@/game/constants";
import { DecorModel } from "./Decor";
import { CEIL_H, FLOOR_Y, footprint, rotYaw, rotate } from "@/game/layout";
import { addCollider, addOccluder, useInteractable } from "@/game/registry";
import { useGame } from "@/game/store";
import type { Box, IngredientId, ItemId, PlacedItem, ProductId } from "@/game/types";
import { NightMaterial, TextPlane } from "./primitives";

// ---------------------------------------------------------------------------
// Visual models (local space, centred, front = +z, resting on y = 0)
// ---------------------------------------------------------------------------
const WOOD = "#8b5e3c";
const WOOD_TOP = "#d9b382";
const DARK = "#2d3436";
const STEEL = "#b2bec3";

function Cabinet({ w, d, h = 0.9, color = WOOD, top = WOOD_TOP }: { w: number; d: number; h?: number; color?: string; top?: string }) {
  return (
    <>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, h + 0.03, 0]}>
        <boxGeometry args={[w + 0.06, 0.06, d + 0.06]} />
        <meshStandardMaterial color={top} roughness={0.6} />
      </mesh>
    </>
  );
}

function Chair({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.44, 0.06, 0.44]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 0.72, -0.2]}>
        <boxGeometry args={[0.44, 0.5, 0.05]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {[-0.18, 0.18].flatMap((x) =>
        [-0.18, 0.18].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.21, z]}>
            <boxGeometry args={[0.05, 0.42, 0.05]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
        ))
      )}
    </group>
  );
}

function RoundTable({ r }: { r: number }) {
  return (
    <>
      <mesh position={[0, 0.74, 0]} castShadow>
        <cylinderGeometry args={[r, r, 0.06, 20]} />
        <meshStandardMaterial color="#c9a070" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 16]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
    </>
  );
}

function Machine({ tier }: { tier: 1 | 2 | 3 }) {
  const look = { 1: { w: 0.55, h: 0.45, d: 0.4, body: "#8d99ae", top: "#596275" }, 2: { w: 0.7, h: 0.5, d: 0.45, body: "#c0392b", top: "#dfe6e9" }, 3: { w: 0.9, h: 0.56, d: 0.5, body: DARK, top: "#f1c40f" } }[tier];
  return (
    <group position={[0, 0.96, -0.05]}>
      <mesh position={[0, look.h / 2 + 0.05, 0]} castShadow>
        <boxGeometry args={[look.w, look.h, look.d]} />
        <meshStandardMaterial color={look.body} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, look.h + 0.1, 0]}>
        <boxGeometry args={[look.w + 0.04, 0.1, look.d + 0.04]} />
        <meshStandardMaterial color={look.top} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.03, 0.12]}>
        <boxGeometry args={[look.w, 0.06, look.d / 2 + 0.1]} />
        <meshStandardMaterial color="#636e72" metalness={0.6} roughness={0.4} />
      </mesh>
      {(tier === 3 ? [-0.2, 0.2] : [0]).map((x) => (
        <group key={x} position={[x, 0.22, look.d / 2]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.06, 10]} />
            <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.02, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.18, 8]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
        </group>
      ))}
      <mesh position={[-look.w / 2 - 0.03, 0.25, 0.1]} rotation={[0.4, 0, 0.3]}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

const PASTRY_SHAPES: Record<string, { color: string; kind: "box" | "sphere" | "cone" | "disc" }> = {
  soboro: { color: "#d9a05b", kind: "sphere" },
  croissant: { color: "#e3a95a", kind: "cone" },
  eggtart: { color: "#f2c45a", kind: "disc" },
  macaron: { color: "#f8a5c2", kind: "disc" },
  honeybread: { color: "#e8b86d", kind: "box" },
};

function DisplayContents({ w }: { w: number }) {
  const inventory = useGame((s) => s.inventory);
  const pastries: IngredientId[] = ["soboro", "croissant", "eggtart", "macaron", "honeybread"];
  return (
    <>
      {pastries.map((p, col) => {
        const count = Math.min(3, inventory[p]);
        const shape = PASTRY_SHAPES[p];
        if (!count) return null;
        return Array.from({ length: count }).map((_, i) => {
          const x = -w / 2 + 0.18 + col * (w / 5) + (i % 2) * 0.12;
          const y = 1.05 + (i < 2 ? 0.1 : 0.37);
          const z = i % 2 === 0 ? -0.18 : 0.14;
          return (
            <mesh key={`${p}${i}`} position={[x, y, z]} rotation={shape.kind === "cone" ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
              {shape.kind === "box" ? <boxGeometry args={[0.12, 0.1, 0.12]} /> : shape.kind === "sphere" ? <sphereGeometry args={[0.07, 10, 8]} /> : shape.kind === "disc" ? <cylinderGeometry args={[0.06, 0.05, 0.04, 12]} /> : <coneGeometry args={[0.06, 0.16, 8]} />}
              <meshStandardMaterial color={shape.color} />
            </mesh>
          );
        });
      })}
    </>
  );
}

function WarmerContents({ w }: { w: number }) {
  const warmer = useGame((s) => s.warmer);
  const items = (Object.keys(warmer) as ProductId[]).filter((k) => (warmer[k] ?? 0) > 0);
  let i = 0;
  return (
    <>
      {items.flatMap((k) => {
        const p = PRODUCTS[k];
        const n = Math.min(4, warmer[k] ?? 0);
        return Array.from({ length: n }).map((_, j) => {
          const idx = i++;
          const x = -w / 2 + 0.18 + (idx % 6) * ((w - 0.3) / 5);
          const z = idx < 6 ? -0.14 : 0.14;
          return (
            <mesh key={`${k}${j}`} position={[x, 1.1, z]}>
              {p.station === "range" ? <boxGeometry args={[0.14, 0.07, 0.12]} /> : <cylinderGeometry args={[0.06, 0.05, 0.05, 10]} />}
              <meshStandardMaterial color={p.color} />
            </mesh>
          );
        });
      })}
    </>
  );
}

export function ItemModel({ id, active = false }: { id: ItemId; active?: boolean }) {
  const decor = decorOf(id);
  if (decor) return <DecorModel def={decor} />;
  return <CoreItemModel id={id} active={active} />;
}

function CoreItemModel({ id, active = false }: { id: ItemId; active?: boolean }) {
  const def = ITEMS[id];
  const [w, d] = def.size;
  const fanBlades = useRef<THREE.Group>(null!);
  const spin = useRef<THREE.Mesh>(null!);
  useFrame((state, dt) => {
    if (fanBlades.current && active) fanBlades.current.rotation.z += dt * 18;
    if (spin.current) spin.current.rotation.y += dt * 6;
    void state;
  });

  switch (id) {
    case "counter":
      return (
        <group>
          <Cabinet w={w} d={d} h={1.0} />
          <group position={[-1.4, 1.06, 0]}>
            <mesh position={[0, 0.12, 0]} castShadow>
              <boxGeometry args={[0.4, 0.24, 0.4]} />
              <meshStandardMaterial color={DARK} />
            </mesh>
            <mesh position={[0, 0.3, 0.05]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[0.3, 0.2, 0.02]} />
              <meshStandardMaterial color="#55efc4" emissive="#55efc4" emissiveIntensity={0.6} />
            </mesh>
          </group>
          <mesh position={[0.6, 1.14, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.16, 10]} />
            <meshStandardMaterial color="#dff9fb" transparent opacity={0.6} />
          </mesh>
          <TextPlane lines={["ORDER HERE · 주문"]} width={1.2} height={0.22} bg="#1f2a24" color="#f3e7c9" position={[0.9, 0.75, d / 2 + 0.01]} />
        </group>
      );
    case "pantry":
      return (
        <group>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[w, 1.8, d]} />
            <meshStandardMaterial color="#6b4a35" />
          </mesh>
          {[0.5, 1.0, 1.5].map((y) => (
            <group key={y}>
              {[-0.4, -0.1, 0.2, 0.45].map((x, i) => (
                <mesh key={i} position={[x, y + 0.12, d / 2 + 0.02]}>
                  <boxGeometry args={[0.2, 0.24, 0.02]} />
                  <meshStandardMaterial color={["#c8a97e", "#e17055", "#fdcb6e", "#dfe6e9"][i]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case "trash":
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.2, 0.7, 14]} />
            <meshStandardMaterial color="#576574" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 14]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
        </group>
      );
    case "table2":
      return (
        <group>
          <RoundTable r={0.5} />
          <Chair position={[0, 0, -0.75]} yaw={0} />
          <Chair position={[0, 0, 0.75]} yaw={Math.PI} />
        </group>
      );
    case "table4":
      return (
        <group>
          <mesh position={[0, 0.74, 0]} castShadow>
            <boxGeometry args={[1.1, 0.06, 1.1]} />
            <meshStandardMaterial color="#c9a070" roughness={0.6} />
          </mesh>
          {[-0.45, 0.45].flatMap((x) =>
            [-0.45, 0.45].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.36, z]}>
                <boxGeometry args={[0.06, 0.72, 0.06]} />
                <meshStandardMaterial color={DARK} />
              </mesh>
            ))
          )}
          <Chair position={[0, 0, -0.95]} yaw={0} />
          <Chair position={[0, 0, 0.95]} yaw={Math.PI} />
          <Chair position={[-0.95, 0, 0]} yaw={Math.PI / 2} />
          <Chair position={[0.95, 0, 0]} yaw={-Math.PI / 2} />
        </group>
      );
    case "sofaSet":
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[1.0, 0.06, 0.6]} />
            <meshStandardMaterial color="#c9a070" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.9, 0.34, 0.5]} />
            <meshStandardMaterial color="#6b4a35" />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[0, 0, side * 0.75]}>
              <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[2.2, 0.5, 0.55]} />
                <meshStandardMaterial color="#6d5a4c" roughness={1} />
              </mesh>
              <mesh position={[0, 0.65, side * 0.2]}>
                <boxGeometry args={[2.2, 0.4, 0.14]} />
                <meshStandardMaterial color="#6d5a4c" roughness={1} />
              </mesh>
              {[-0.6, 0.6].map((x) => (
                <mesh key={x} position={[x, 0.55, 0]}>
                  <boxGeometry args={[0.45, 0.14, 0.4]} />
                  <meshStandardMaterial color={x < 0 ? "#f39c12" : "#16a085"} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case "plant":
    case "plantBig": {
      const s = id === "plantBig" ? 1.4 : 1;
      return (
        <group scale={s}>
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
        </group>
      );
    }
    case "art1":
    case "art2": {
      const colors = id === "art1" ? ["#ff6b6b", "#feca57", "#48dbfb"] : ["#1dd1a1", "#2c3e50", "#f368e0"];
      return (
        <group position={[0, 0.6, 0]} rotation={[-0.12, 0, 0]}>
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
    case "rug":
      return (
        <group>
          <mesh position={[0, 0.035, 0]} receiveShadow>
            <boxGeometry args={[3, 0.03, 2]} />
            <meshStandardMaterial color="#b23a48" roughness={1} />
          </mesh>
          <mesh position={[0, 0.052, 0]}>
            <boxGeometry args={[2.4, 0.005, 1.4]} />
            <meshStandardMaterial color="#e3c08d" roughness={1} />
          </mesh>
        </group>
      );
    case "bookshelf": {
      const books = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#16a085", "#d35400"];
      return (
        <group>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[1.4, 2.0, 0.35]} />
            <meshStandardMaterial color="#6b4a35" />
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
        </group>
      );
    }
    case "speaker":
      return (
        <group>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.12, 1.0, 0.12]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.35, 0.22, 0.18]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0.12, 1.16, 0.095]}>
            <circleGeometry args={[0.015, 8]} />
            <meshStandardMaterial color="#55efc4" emissive="#55efc4" emissiveIntensity={2} />
          </mesh>
        </group>
      );
    case "pendantLamp":
      return (
        <group position={[0, CEIL_H, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.8, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, -0.9, 0]}>
            <coneGeometry args={[0.28, 0.3, 14, 1, true]} />
            <meshStandardMaterial color="#c47a2c" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -1.0, 0]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color="#fff1c2" emissive="#ffd36b" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          <pointLight position={[0, -1.1, 0]} intensity={5} distance={6} decay={2} color="#ffd9a0" />
        </group>
      );
    case "floorLamp":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 14]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1.6, 6]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 0.3, 14, 1, true]} />
            <meshStandardMaterial color="#f5e6c8" side={THREE.DoubleSide} emissive="#ffd9a0" emissiveIntensity={0.6} />
          </mesh>
          <pointLight position={[0, 1.5, 0]} intensity={3} distance={4} decay={2} color="#ffd9a0" />
        </group>
      );
    case "patioSet":
      return (
        <group>
          <RoundTable r={0.5} />
          <Chair position={[-0.75, 0, 0]} yaw={Math.PI / 2} />
          <Chair position={[0.75, 0, 0]} yaw={-Math.PI / 2} />
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
    case "flowerBox":
      return (
        <group position={[0, 0.15, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.6, 0.3, 0.32]} />
            <meshStandardMaterial color="#6b4a35" />
          </mesh>
          {["#ff7675", "#fdcb6e", "#a29bfe", "#55efc4", "#fd79a8"].map((c, i) => (
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
    case "fan":
      return (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.06, 16]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.4} />
          </mesh>
          <group position={[0, 1.3, 0.1]}>
            <mesh>
              <torusGeometry args={[0.32, 0.02, 8, 24]} />
              <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.4} />
            </mesh>
            <group ref={fanBlades}>
              {[0, 1, 2].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[Math.cos((i * Math.PI * 2) / 3) * 0.15, Math.sin((i * Math.PI * 2) / 3) * 0.15, 0]}>
                  <boxGeometry args={[0.28, 0.1, 0.01]} />
                  <meshStandardMaterial color="#74b9ff" transparent opacity={0.85} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      );
    case "ac":
      return (
        <group>
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[0.5, 1.9, 0.42]} />
            <meshStandardMaterial color="#f5f6fa" roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.55, 0.215]}>
            <planeGeometry args={[0.4, 0.5]} />
            <meshStandardMaterial color={active ? "#74b9ff" : "#dfe6e9"} emissive={active ? "#74b9ff" : "#000"} emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0.15, 0.9, 0.215]}>
            <circleGeometry args={[0.02, 8]} />
            <meshStandardMaterial color={active ? "#2ecc71" : "#636e72"} emissive={active ? "#2ecc71" : "#000"} emissiveIntensity={2} />
          </mesh>
        </group>
      );
    case "heater":
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.5, 0.7, 0.22]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          {[0.2, 0.35, 0.5].map((y) => (
            <mesh key={y} position={[0, y, 0.115]}>
              <boxGeometry args={[0.4, 0.06, 0.01]} />
              <meshStandardMaterial color={active ? "#ff6b35" : "#555"} emissive={active ? "#ff4d1a" : "#000"} emissiveIntensity={active ? 2.5 : 0} toneMapped={false} />
            </mesh>
          ))}
          {active && <pointLight position={[0, 0.4, 0.4]} intensity={3} distance={4} color="#ff7a3d" />}
        </group>
      );
    case "hvac":
      return (
        <group position={[0, CEIL_H - 0.05, 0]}>
          <mesh>
            <boxGeometry args={[0.9, 0.08, 0.9]} />
            <meshStandardMaterial color="#f5f6fa" />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.32, -0.045, Math.sin((i * Math.PI) / 2) * 0.32]} rotation={[0, (i * Math.PI) / 2, 0]}>
              <boxGeometry args={[0.08, 0.02, 0.6]} />
              <meshStandardMaterial color={STEEL} />
            </mesh>
          ))}
          <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.02, 8]} />
            <meshStandardMaterial color={active ? "#74b9ff" : "#636e72"} emissive={active ? "#74b9ff" : "#000"} emissiveIntensity={2} />
          </mesh>
        </group>
      );
    case "espresso1":
    case "espresso2":
    case "espresso3":
      return (
        <group>
          <Cabinet w={w} d={d} color="#6b4a35" top={STEEL} />
          <Machine tier={(def.tier ?? 1) as 1 | 2 | 3} />
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-w / 2 + 0.12 + i * 0.1, 1.0, 0.15]}>
              <cylinderGeometry args={[0.04, 0.032, 0.09, 10]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      );
    case "grinder":
      return (
        <group>
          <Cabinet w={w} d={d} color="#6b4a35" top={STEEL} />
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.18, 0.3, 0.22]} />
            <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.2, 10]} />
            <meshStandardMaterial color="#4a2c2a" />
          </mesh>
        </group>
      );
    case "blender":
      return (
        <group>
          <Cabinet w={w} d={d} color="#6b4a35" top={STEEL} />
          <mesh position={[0, 1.06, 0]} castShadow>
            <boxGeometry args={[0.18, 0.2, 0.18]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0, 1.36, 0]}>
            <cylinderGeometry args={[0.09, 0.06, 0.4, 10]} />
            <meshStandardMaterial color="#dfe6e9" transparent opacity={0.6} />
          </mesh>
        </group>
      );
    case "bingsuMachine":
      return (
        <group>
          <Cabinet w={w} d={d} color="#dfe6e9" top={STEEL} />
          <mesh position={[0, 1.24, 0]} castShadow>
            <boxGeometry args={[0.4, 0.56, 0.4]} />
            <meshStandardMaterial color="#f5f6fa" roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.58, 0]}>
            <cylinderGeometry args={[0.16, 0.12, 0.16, 12]} />
            <meshStandardMaterial color="#74b9ff" transparent opacity={0.7} />
          </mesh>
          <TextPlane lines={["빙수 BINGSU"]} width={0.4} height={0.14} bg="#0984e3" color="#ffffff" position={[0, 1.24, 0.205]} />
        </group>
      );
    case "oven":
    case "ovenLarge":
    case "ovenConveyor": {
      const trays = def.trays ?? 2;
      const doors = Math.min(3, Math.max(1, Math.round(trays / 2)));
      return (
        <group>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[w, 1.8, d]} />
            <meshStandardMaterial color="#c8ccd1" metalness={0.6} roughness={0.35} />
          </mesh>
          {Array.from({ length: doors }).map((_, r) => {
            const y = 0.55 + r * 0.62;
            return (
              <group key={r}>
                <mesh position={[0, y, d / 2 + 0.005]}>
                  <planeGeometry args={[w - 0.2, 0.46]} />
                  <meshStandardMaterial color="#1e272e" />
                </mesh>
                <mesh position={[0, y, d / 2 + 0.01]}>
                  <planeGeometry args={[w - 0.3, 0.34]} />
                  <meshStandardMaterial color={active ? "#ff9f43" : "#3a2a1a"} emissive={active ? "#ff7a1a" : "#000"} emissiveIntensity={active ? 1.2 : 0} transparent opacity={0.85} />
                </mesh>
                <mesh position={[0, y - 0.27, d / 2 + 0.04]}>
                  <boxGeometry args={[w - 0.3, 0.04, 0.06]} />
                  <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
                </mesh>
              </group>
            );
          })}
          <mesh position={[0, 1.72, d / 2 + 0.005]}>
            <planeGeometry args={[w - 0.2, 0.12]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[w / 2 - 0.12, 1.72, d / 2 + 0.012]}>
            <circleGeometry args={[0.025, 8]} />
            <meshStandardMaterial color={active ? "#ff7a1a" : "#2ecc71"} emissive={active ? "#ff7a1a" : "#2ecc71"} emissiveIntensity={2} />
          </mesh>
          <TextPlane lines={[`${trays} TRAYS`]} width={0.5} height={0.15} bg="#c0392b" color="#ffffff" position={[0, 1.72, d / 2 + 0.01]} />
        </group>
      );
    }
    case "range":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[w, 0.9, d]} />
            <meshStandardMaterial color="#c8ccd1" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[w + 0.02, 0.04, d + 0.02]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          {[-0.35, 0.35].flatMap((x) =>
            [-0.2, 0.2].map((z) => (
              <group key={`${x}${z}`} position={[x * (w / 1.2), 0.95, z]}>
                <mesh>
                  <cylinderGeometry args={[0.13, 0.13, 0.02, 12]} />
                  <meshStandardMaterial color="#111" />
                </mesh>
                <mesh position={[0, 0.012, 0]}>
                  <torusGeometry args={[0.07, 0.015, 6, 14]} />
                  <meshStandardMaterial color={active ? "#4aa3ff" : "#333"} emissive={active ? "#4aa3ff" : "#000"} emissiveIntensity={active ? 2 : 0} />
                </mesh>
              </group>
            ))
          )}
          <mesh position={[0, 1.4, -d / 2 + 0.05]}>
            <boxGeometry args={[w, 0.9, 0.1]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0.2, 1.0, 0.05]}>
            <cylinderGeometry args={[0.16, 0.16, 0.05, 14]} />
            <meshStandardMaterial color="#1e272e" />
          </mesh>
          <mesh position={[-0.3, 1.0, 0.1]}>
            <cylinderGeometry args={[0.11, 0.09, 0.08, 12]} />
            <meshStandardMaterial color="#636e72" metalness={0.7} roughness={0.3} />
          </mesh>
          {[-0.4, -0.2, 0, 0.2, 0.4].map((x) => (
            <mesh key={x} position={[x * (w / 1.2), 0.62, d / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
              <meshStandardMaterial color="#1e272e" />
            </mesh>
          ))}
        </group>
      );
    case "warmer":
      return (
        <group>
          <Cabinet w={w} d={d} h={1.0} color={DARK} top={STEEL} />
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[w, 0.5, d]} />
            <meshStandardMaterial color="#ffd9a0" transparent opacity={0.28} roughness={0.05} metalness={0.2} />
          </mesh>
          <mesh position={[0, 1.06, 0]}>
            <boxGeometry args={[w - 0.04, 0.02, d - 0.04]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 1.54, 0]}>
            <boxGeometry args={[w, 0.04, d]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          {[-w / 3, 0, w / 3].map((x) => (
            <mesh key={x} position={[x, 1.5, 0]}>
              <boxGeometry args={[0.3, 0.03, 0.08]} />
              <meshStandardMaterial color="#ffb366" emissive="#ff8c42" emissiveIntensity={2.2} toneMapped={false} />
            </mesh>
          ))}
          <pointLight position={[0, 1.4, 0]} intensity={1.8} distance={1.8} color="#ff9f66" />
          <TextPlane lines={["HOT FOOD · 온장고"]} width={0.9} height={0.18} bg="#c0392b" color="#ffffff" position={[0, 0.7, d / 2 + 0.01]} />
          <WarmerContents w={w} />
        </group>
      );
    case "sink":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[w, 0.9, d]} />
            <meshStandardMaterial color="#dfe6e9" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.93, 0.02]}>
            <boxGeometry args={[w - 0.16, 0.1, d - 0.16]} />
            <meshStandardMaterial color="#9aa5ad" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.97, 0.02]}>
            <boxGeometry args={[w - 0.34, 0.06, d - 0.34]} />
            <meshStandardMaterial color="#5f6b73" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 1.35, -d / 2 + 0.05]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.62, -d / 2 + 0.22]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.09, 0.014, 6, 14, Math.PI]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.9} roughness={0.2} />
          </mesh>
          <TextPlane lines={["싱크 SINK · 설거지"]} width={0.7} height={0.18} bg="#0984e3" color="#ffffff" position={[0, 0.5, d / 2 + 0.01]} />
        </group>
      );
    case "dishRack": {
      const inv = useGame((s) => s.inventory);
      const mugs = Math.min(6, inv.mug ?? 0);
      const plates = Math.min(5, inv.plate ?? 0);
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[w, 0.8, d]} />
            <meshStandardMaterial color="#8b5e3c" roughness={0.8} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.82 + i * 0.03, 0]}>
              <boxGeometry args={[w - 0.1, 0.02, d - 0.1]} />
              <meshStandardMaterial color="#a5713f" />
            </mesh>
          ))}
          {Array.from({ length: mugs }).map((_, i) => (
            <mesh key={`m${i}`} position={[-w / 2 + 0.12 + i * 0.14, 0.9, -0.1]}>
              <cylinderGeometry args={[0.045, 0.035, 0.11, 10]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
          {Array.from({ length: plates }).map((_, i) => (
            <mesh key={`p${i}`} position={[-w / 2 + 0.1 + i * 0.16, 0.92, 0.12]}>
              <cylinderGeometry args={[0.09, 0.09, 0.015, 14]} />
              <meshStandardMaterial color="#f5f6fa" />
            </mesh>
          ))}
          <TextPlane lines={["식기대 DISH RACK"]} width={0.8} height={0.16} bg="#6b4a35" color="#f3e7c9" position={[0, 0.4, d / 2 + 0.01]} />
        </group>
      );
    }
    case "cupboard":
      return (
        <group>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[w, 2.0, d]} />
            <meshStandardMaterial color="#a5713f" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.0, d / 2 + 0.005]}>
            <planeGeometry args={[w - 0.1, 1.9]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
          <mesh position={[-0.12, 1.0, d / 2 + 0.02]}>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0.12, 1.0, d / 2 + 0.02]}>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          {/* cups visible through the open top shelf */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[-0.4 + i * 0.27, 1.62, d / 2 - 0.02]}>
              <cylinderGeometry args={[0.045, 0.035, 0.11, 10]} />
              <meshStandardMaterial color="#f5f6fa" />
            </mesh>
          ))}
          <TextPlane lines={["컵장 CUPBOARD"]} width={0.9} height={0.2} bg="#6b4a35" color="#f3e7c9" position={[0, 1.1, d / 2 + 0.02]} />
        </group>
      );
    case "dryCupboard":
      return (
        <group>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[w, 1.8, d]} />
            <meshStandardMaterial color="#e6ddcf" roughness={0.9} />
          </mesh>
          {[0.45, 0.95, 1.4].map((y, i) => (
            <group key={y}>
              <mesh position={[0, y, d / 2 + 0.005]}>
                <planeGeometry args={[w - 0.08, 0.4]} />
                <meshStandardMaterial color="#d9cfc0" />
              </mesh>
              {[-0.35, 0, 0.35].map((x, j) => (
                <mesh key={j} position={[x, y + 0.26, d / 2 + 0.02]}>
                  <cylinderGeometry args={[0.07, 0.07, 0.22, 10]} />
                  <meshStandardMaterial color={["#f5e6c8", "#dfe6e9", "#f9ca24"][(i + j) % 3]} />
                </mesh>
              ))}
            </group>
          ))}
          <TextPlane lines={["식재료 찬장 PANTRY"]} width={0.9} height={0.18} bg="#8b5e3c" color="#f3e7c9" position={[0, 0.2, d / 2 + 0.01]} />
        </group>
      );
    case "worktop":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[w, 0.9, d]} />
            <meshStandardMaterial color="#8b5e3c" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.93, 0]}>
            <boxGeometry args={[w + 0.04, 0.06, d + 0.04]} />
            <meshStandardMaterial color="#c8ccd1" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[-w / 2 + 0.3, 0.98, 0]}>
            <boxGeometry args={[0.4, 0.04, 0.3]} />
            <meshStandardMaterial color="#c9a070" />
          </mesh>
          <TextPlane lines={["작업대 WORKTOP"]} width={1.0} height={0.2} bg="#2d3436" color="#ffffff" position={[0, 0.45, d / 2 + 0.01]} />
        </group>
      );
    case "toastie":
      return (
        <group>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[w, 0.12, d]} />
            <meshStandardMaterial color="#2d3436" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.14, -0.03]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[w - 0.08, 0.03, d - 0.06]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[w / 2 - 0.06, 0.1, 0]}>
            <circleGeometry args={[0.02, 8]} />
            <meshStandardMaterial color={active ? "#e74c3c" : "#2ecc71"} emissive={active ? "#e74c3c" : "#2ecc71"} emissiveIntensity={2} />
          </mesh>
        </group>
      );
    case "doughSheeter":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[w, 1.0, d]} />
            <meshStandardMaterial color="#c8ccd1" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.02, 0]}>
            <boxGeometry args={[w - 0.1, 0.05, d - 0.1]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, w - 0.2, 12]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, w - 0.24, 12]} />
            <meshStandardMaterial color="#8a9096" metalness={0.8} roughness={0.3} />
          </mesh>
          <TextPlane lines={["반죽기 SHEETER"]} width={0.7} height={0.16} bg="#0984e3" color="#ffffff" position={[0, 0.5, d / 2 + 0.01]} />
        </group>
      );
    case "foodProcessor":
      return (
        <group>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.22, 0.24, 0.3, 14]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 0.42, 14]} />
            <meshStandardMaterial color="#dfe6e9" transparent opacity={0.75} roughness={0.1} />
          </mesh>
          <mesh position={[0.14, 0.2, 0]}>
            <boxGeometry args={[0.08, 0.14, 0.08]} />
            <meshStandardMaterial color="#e74c3c" emissive="#e74c3c" emissiveIntensity={active ? 2.5 : 0.6} />
          </mesh>
        </group>
      );
    case "dishwasher":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[w, 0.9, d]} />
            <meshStandardMaterial color="#f5f6fa" roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.92, d / 2 + 0.005]}>
            <planeGeometry args={[w - 0.12, 0.5]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 0.92, d / 2 + 0.02]}>
            <planeGeometry args={[w - 0.2, 0.3]} />
            <NightMaterial color="#74b9ff" emissive="#74b9ff" k={1.2} />
          </mesh>
          <mesh position={[w / 2 - 0.08, 0.7, d / 2 + 0.01]}>
            <circleGeometry args={[0.02, 8]} />
            <meshStandardMaterial color={active ? "#2ecc71" : "#636e72"} emissive={active ? "#2ecc71" : "#000"} emissiveIntensity={2} />
          </mesh>
          <TextPlane lines={["식기세척기 DISHWASHER"]} width={0.65} height={0.14} bg="#1e8449" color="#ffffff" position={[0, 0.45, d / 2 + 0.01]} />
        </group>
      );
    case "mixer":
      return (
        <group>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.26, 0.28, 0.2, 14]} />
            <meshStandardMaterial color="#e17055" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.42, -0.06]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.16, 0.5, 0.1]} />
            <meshStandardMaterial color="#e17055" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh ref={spin} position={[0.05, 0.62, 0.02]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.34, 6]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.55, 0.12]}>
            <cylinderGeometry args={[0.2, 0.16, 0.22, 14]} />
            <meshStandardMaterial color="#dfe6e9" metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      );
    case "industrialBlender":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[w, 1.0, d]} />
            <meshStandardMaterial color="#2d3436" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.24, 0.3, 0.55, 14]} />
            <meshStandardMaterial color="#dfe6e9" transparent opacity={0.65} roughness={0.1} />
          </mesh>
          <mesh position={[0, 1.2, 0.01]}>
            <cylinderGeometry args={[0.2, 0.24, 0.2, 14]} />
            <meshStandardMaterial color="#8e44ad" />
          </mesh>
          <mesh position={[w / 2 - 0.1, 0.8, d / 2 + 0.01]}>
            <circleGeometry args={[0.03, 8]} />
            <meshStandardMaterial color={active ? "#2ecc71" : "#636e72"} emissive={active ? "#2ecc71" : "#000"} emissiveIntensity={2} />
          </mesh>
          <TextPlane lines={["대형 블렌더 BLENDER"]} width={0.75} height={0.16} bg="#6c5ce7" color="#ffffff" position={[0, 0.5, d / 2 + 0.01]} />
        </group>
      );
    case "freezerShelf":
      return (
        <group>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[w, 2.0, d]} />
            <meshStandardMaterial color="#dfe9f5" metalness={0.5} roughness={0.3} />
          </mesh>
          {[0.5, 1.0, 1.5].map((y) => (
            <mesh key={y} position={[0, y, d / 2 + 0.005]}>
              <planeGeometry args={[w - 0.08, 0.42]} />
              <meshStandardMaterial color="#bcd6ea" />
            </mesh>
          ))}
          {[-0.3, 0.1, 0.4].map((x, i) => (
            <mesh key={i} position={[x, 0.72, d / 2 + 0.02]}>
              <boxGeometry args={[0.22, 0.2, 0.24]} />
              <meshStandardMaterial color={["#e8a0a0", "#f7f7f4", "#bfe4f7"][i]} />
            </mesh>
          ))}
          <TextPlane lines={["냉동고 FREEZER"]} width={0.8} height={0.2} bg="#0984e3" color="#ffffff" position={[0, 1.75, d / 2 + 0.02]} />
        </group>
      );
    case "tv":
      return (
        <group position={[0, 1.9, 0]}>
          <mesh>
            <boxGeometry args={[w, w * 0.56, 0.05]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[w - 0.08, w * 0.56 - 0.08]} />
            <NightMaterial color="#0a2a4a" emissive={useGame.getState().music === "off" ? "#000" : "#1e5f9e"} k={1.6} />
          </mesh>
          <TextPlane lines={["📺 " + (useGame.getState().music === "off" ? "OFF" : useGame.getState().music.toUpperCase())]} width={0.5} height={0.14} bg="#111" color="#55efc4" lit position={[w / 2 - 0.3, -w * 0.28 - 0.1, 0.03]} />
        </group>
      );
    case "prepTable":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[w, 0.9, d]} />
            <meshStandardMaterial color="#8b5e3c" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.93, 0]}>
            <boxGeometry args={[w + 0.05, 0.06, d + 0.05]} />
            <meshStandardMaterial color="#c8ccd1" metalness={0.6} roughness={0.3} />
          </mesh>
          <TextPlane lines={["조리대 PREP"]} width={1.2} height={0.22} bg="#2d3436" color="#ffffff" position={[0, 0.45, d / 2 + 0.01]} />
        </group>
      );
    case "servingCart":
      return (
        <group>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[w, 0.05, d]} />
            <meshStandardMaterial color="#c9a070" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.68, 0]}>
            <boxGeometry args={[w - 0.1, 0.03, d - 0.1]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
          {[-0.35, 0.35].flatMap((x) =>
            [-0.22, 0.22].map((z) => (
              <group key={`${x}${z}`}>
                <mesh position={[x, 0.36, z]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.72, 6]} />
                  <meshStandardMaterial color="#2f3640" />
                </mesh>
                <mesh position={[x, 0.06, z]} rotation={[0, 0, Math.PI / 2]}>
                  <torusGeometry args={[0.06, 0.02, 8, 12]} />
                  <meshStandardMaterial color="#111" />
                </mesh>
              </group>
            ))
          )}
          <TextPlane lines={["카트 CART"]} width={0.5} height={0.14} bg="#636e72" color="#ffffff" position={[0, 0.78, d / 2 + 0.01]} />
        </group>
      );
    case "wallShelf":
      return (
        <group position={[0, 1.0, 0]} rotation={[-0.1, 0, 0]}>
          <mesh>
            <boxGeometry args={[w, 0.05, d]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
          <mesh position={[-0.4, 0.08, 0]}>
            <boxGeometry args={[0.14, 0.16, 0.12]} />
            <meshStandardMaterial color="#e17055" />
          </mesh>
          <mesh position={[0.3, 0.09, 0]}>
            <cylinderGeometry args={[0.05, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#dfe6e9" />
          </mesh>
        </group>
      );
    case "eftpos":
      return (
        <group>
          <mesh position={[0, 0.08, 0]} castShadow>
            <boxGeometry args={[0.34, 0.16, 0.26]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 0.3, -0.06]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.3, 0.2, 0.03]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 0.3, -0.045]} rotation={[-0.5, 0, 0]}>
            <planeGeometry args={[0.26, 0.16]} />
            <NightMaterial color="#55efc4" emissive="#55efc4" k={1.2} />
          </mesh>
          <mesh position={[0, 0.02, 0.16]}>
            <boxGeometry args={[0.3, 0.02, 0.06]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <TextPlane lines={["💳 EFTPOS"]} width={0.3} height={0.09} bg="#1e272e" color="#ffffff" lit position={[0, 0.09, 0.132]} />
        </group>
      );
    case "kiosk":
      return (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.3, 0.34, 0.06, 16]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.08, 1.4, 0.08]} />
            <meshStandardMaterial color="#636e72" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.55, 0]} rotation={[-0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.7, 0.5, 0.05]} />
            <meshStandardMaterial color="#1e272e" />
          </mesh>
          <mesh position={[0, 1.55, 0.03]} rotation={[-0.25, 0, 0]}>
            <planeGeometry args={[0.64, 0.44]} />
            <NightMaterial color="#0984e3" emissive="#74b9ff" k={1.4} />
          </mesh>
          <TextPlane lines={["SELF ORDER", "터치해서 주문"]} width={0.6} height={0.22} bg="#0984e3" color="#ffffff" lit position={[0, 1.28, 0.03]} rotation={[-0.25, 0, 0]} />
        </group>
      );
    case "iceMaker":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[w, 1.0, d]} />
            <meshStandardMaterial color="#dfe6e9" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.35, d / 2 + 0.005]}>
            <planeGeometry args={[w - 0.1, 0.4]} />
            <meshStandardMaterial color="#74b9ff" transparent opacity={0.5} />
          </mesh>
          <mesh position={[w / 2 - 0.08, 0.9, d / 2 + 0.01]}>
            <circleGeometry args={[0.015, 8]} />
            <meshStandardMaterial color="#74b9ff" emissive="#74b9ff" emissiveIntensity={2} />
          </mesh>
        </group>
      );
    case "fridgeSmall":
    case "fridgeLarge": {
      const doors = id === "fridgeLarge" ? [-w / 4, w / 4] : [0];
      return (
        <group>
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[w, 1.9, d]} />
            <meshStandardMaterial color="#dfe6e9" metalness={0.3} roughness={0.4} />
          </mesh>
          {doors.map((x) => (
            <group key={x}>
              <mesh position={[x + 0.02, 1.0, d / 2 + 0.005]}>
                <planeGeometry args={[(w / doors.length) * 0.9, 1.7]} />
                <meshStandardMaterial color="#cfd6dc" metalness={0.4} roughness={0.3} />
              </mesh>
              <mesh position={[x + (w / doors.length) * 0.35, 1.1, d / 2 + 0.03]}>
                <boxGeometry args={[0.04, 0.5, 0.03]} />
                <meshStandardMaterial color="#636e72" />
              </mesh>
            </group>
          ))}
          <mesh position={[-w / 2 + 0.1, 1.8, d / 2 + 0.01]}>
            <circleGeometry args={[0.015, 8]} />
            <meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={2} />
          </mesh>
        </group>
      );
    }
    case "displaySmall":
    case "displayDeluxe": {
      const deluxe = id === "displayDeluxe";
      return (
        <group>
          <Cabinet w={w} d={d} h={1.0} color={deluxe ? DARK : WOOD} top={deluxe ? STEEL : WOOD_TOP} />
          <mesh position={[0, 1.33, 0]}>
            <boxGeometry args={[w, 0.56, d]} />
            <meshStandardMaterial color={deluxe ? "#a3dcff" : "#d6f0ff"} transparent opacity={0.3} roughness={0.05} metalness={0.2} />
          </mesh>
          <mesh position={[0, 1.33, 0]}>
            <boxGeometry args={[w - 0.04, 0.02, d - 0.04]} />
            <meshStandardMaterial color="#dfe6e9" />
          </mesh>
          {deluxe && <pointLight position={[0, 1.5, 0]} intensity={1.5} distance={1.5} color="#cfeeff" />}
          <DisplayContents w={w} />
        </group>
      );
    }
    default:
      return (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[w, 1, d]} />
          <meshStandardMaterial color="#aaa" />
        </mesh>
      );
  }
}

// ---------------------------------------------------------------------------
// Placed item (world) with collider, interactable, station label
// ---------------------------------------------------------------------------
function StationLabel({ uid, y }: { uid: number; y: number }) {
  const st = useGame((s) => s.stations[uid]);
  if (!st || (!st.brewing && !st.ready)) return null;
  const ready = st.ready ? PRODUCTS[st.ready] : null;
  const progress = st.brewing ? 1 - st.timeLeft / st.total : 0;
  return (
    <Html position={[0, y, 0]} center zIndexRange={[5, 0]} distanceFactor={1.8} style={{ pointerEvents: "none" }}>
      <div className="w-36 rounded-lg bg-black/70 px-2 py-1.5 text-center text-xs font-semibold text-white shadow-lg">
        {ready ? (
          <span className="text-emerald-300">{ready.icon} {ready.name} ready!</span>
        ) : (
          <>
            <div className="mb-1">Making {PRODUCTS[st.brewing!].name}…</div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-white/20">
              <div className="h-full bg-amber-400" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </>
        )}
      </div>
    </Html>
  );
}

/** Finished orders left on the pickup end of the counter by the kitchen / baristas. */
export function CounterPickups() {
  const tickets = useGame((s) => s.tickets);
  const counter = useGame((s) => s.placed.find((p) => p.item === "counter" && p.floor === 0) ?? null);
  const ready = tickets.filter((t) => t.status === "pickup");
  if (!counter || !ready.length) return null;
  const [rx, rz] = rotate(1, 0, counter.rot);
  const w = ITEMS.counter.size[0];
  return (
    <group>
      {ready.slice(0, 6).map((t, i) => {
        const along = w / 2 - 0.5 - (i % 3) * 0.22;
        const across = (Math.floor(i / 3) - 0.5) * 0.25;
        const [fx, fz] = rotate(0, 1, counter.rot);
        const x = counter.x + rx * along + fx * across;
        const z = counter.z + rz * along + fz * across;
        const p = PRODUCTS[t.product];
        return (
          <group key={t.id} position={[x, 1.06, z]}>
            {p.station === "machine" || p.station === "bingsu" ? (
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.04, 0.032, 0.1, 10]} />
                <meshStandardMaterial color={p.temp === "cold" ? "#dfe6e9" : "#ffffff"} />
              </mesh>
            ) : (
              <mesh position={[0, 0.03, 0]}>
                <boxGeometry args={[0.16, 0.06, 0.12]} />
                <meshStandardMaterial color="#c89b63" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function PlacedItemView({ item }: { item: PlacedItem }) {
  const ref = useRef<THREE.Group>(null!);
  const def = ITEMS[item.item];
  const target = useMemo(() => ({ kind: "placed" as const, uid: item.uid }), [item.uid]);
  useInteractable(ref, target);
  const placed = useGame((s) => s.placed);
  const season = useGame((s) => getSeason(s.day));
  const active = (def.cool && season === "summer") || (def.heat && season === "winter") || false;
  // items with onUid sit ON TOP of their parent's surface, and follow it if it's moved
  const parent = item.onUid ? placed.find((p) => p.uid === item.onUid) : null;
  const parentDef = parent ? ITEMS[parent.item] : null;
  const y = FLOOR_Y[item.floor] + (parentDef?.surface ?? 0);
  const px = parent ? parent.x : item.x;
  const pz = parent ? parent.z : item.z;
  // the child item keeps its local offset relative to the surface centre
  const lx = item.x - (parent?.x ?? 0);
  const lz = item.z - (parent?.z ?? 0);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const cleanups: (() => void)[] = [];
    if (!def.noCollide && !item.onUid) {
      // collide only with the BODY, not the overhanging top — the top is walkable/aimable
      const fp = footprint(def, px, pz, item.rot);
      // collide with the BODY only; the top stays clear for surface placement.
      // Tables/counters: body height only, full footprint. Tall cabinets (fridges etc.): full height.
      const isTableLike = !!def.surface;
      const bodyH = isTableLike ? Math.min(0.85, (def.surface ?? 1) - 0.15) : 1.4;
      const inset = isTableLike ? 0.12 : 0;
      cleanups.push(addCollider({ minX: fp.x0 + inset, maxX: fp.x1 - inset, minZ: fp.z0 + inset, maxZ: fp.z1 - inset, minY: FLOOR_Y[item.floor], maxY: FLOOR_Y[item.floor] + bodyH }));
    }
    cleanups.push(addOccluder(g));
    return () => cleanups.forEach((f) => f());
  }, [def, px, pz, item.rot, item.onUid, item.floor, y]);

  return (
    <group ref={ref} position={[parent ? px + lx : item.x, y, parent ? pz + lz : item.z]} rotation={[0, rotYaw(item.rot) + (parent ? rotYaw(parent.rot) : 0), 0]}>
      <ItemModel id={item.item} active={!!active} />
      {def.station && <StationLabel uid={item.uid} y={1.9} />}
    </group>
  );
}

/** Piles of dirty dishes left at tables / the counter. */
export function DirtyPiles() {
  const piles = useGame((s) => s.dirtyPiles);
  return (
    <>
      {piles.map((p) => (
        <DirtyPileView key={p.id} pile={p} />
      ))}
    </>
  );
}

function DirtyPileView({ pile }: { pile: import("@/game/types").DirtyPile }) {
  const ref = useRef<THREE.Group>(null!);
  const target = useMemo(() => ({ kind: "dishes" as const, id: pile.id }), [pile.id]);
  useInteractable(ref, target);
  const total = Object.values(pile.counts).reduce((a, b) => a + b, 0);
  return (
    <group ref={ref} position={[pile.x, FLOOR_Y[pile.floor], pile.z]}>
      <group position={[0, 0.02, 0]}>
        {Array.from({ length: Math.min(4, Math.ceil(total / 2)) }).map((_, i) => (
          <mesh key={i} position={[0, i * 0.018, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.018, 14]} />
            <meshStandardMaterial color={i % 2 ? "#f5f6fa" : "#dfe6e9"} />
          </mesh>
        ))}
        {pile.counts.mug > 0 && (
          <mesh position={[0.16, 0.1, 0.05]}>
            <cylinderGeometry args={[0.045, 0.035, 0.11, 10]} />
            <meshStandardMaterial color="#dfe6e9" />
          </mesh>
        )}
        <mesh position={[0, Math.min(4, Math.ceil(total / 2)) * 0.018 + 0.02, 0]}>
          <boxGeometry args={[0.3, 0.05, 0.24]} />
          <meshStandardMaterial color="#c9a070" />
        </mesh>
      </group>
      <Html position={[0, 0.55, 0]} center zIndexRange={[5, 0]} distanceFactor={2.6} style={{ pointerEvents: "none" }}>
        <div className="rounded-lg bg-amber-900/85 px-2 py-0.5 text-[11px] font-black text-amber-200 shadow">🍽️ {total} dirty</div>
      </Html>
    </group>
  );
}

export function PlacedItems() {
  const placed = useGame((s) => s.placed);
  return (
    <>
      {placed.map((p) => (
        <PlacedItemView key={p.uid} item={p} />
      ))}
      <DirtyPiles />
    </>
  );
}

// ---------------------------------------------------------------------------
// Boxes
// ---------------------------------------------------------------------------
export function BoxModel({ label, sub }: { label: string; sub?: string }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.7, 0.6, 0.6]} />
        <meshStandardMaterial color="#c89b63" roughness={1} />
      </mesh>
      <mesh position={[0, 0.61, 0]}>
        <boxGeometry args={[0.72, 0.02, 0.2]} />
        <meshStandardMaterial color="#9b7340" />
      </mesh>
      <TextPlane lines={sub ? [label, sub] : [label]} width={0.6} height={0.34} bg="#f5e6c8" color="#3b2a1e" position={[0, 0.3, 0.305]} />
    </group>
  );
}

export function BoxView({ box }: { box: Box }) {
  const ref = useRef<THREE.Group>(null!);
  const target = useMemo(() => ({ kind: "box" as const, uid: box.uid }), [box.uid]);
  useInteractable(ref, target);
  const label = box.kind === "item" ? ITEMS[box.item!].name : "SUPPLIES 식자재";
  const sub = box.kind === "item" ? ITEMS[box.item!].icon : Object.entries(box.contents ?? {}).map(([k, v]) => `${INGREDIENTS[k as IngredientId].icon}${v}`).join(" ");
  return (
    <group ref={ref} position={[box.x, FLOOR_Y[box.floor], box.z]} rotation={[0, (box.uid % 7) * 0.15, 0]}>
      <BoxModel label={label} sub={sub} />
    </group>
  );
}

export function Boxes() {
  const boxes = useGame((s) => s.boxes);
  return (
    <>
      {boxes.map((b) => (
        <BoxView key={b.uid} box={b} />
      ))}
    </>
  );
}

/** Translucent placement preview. */
export function PlacementGhost() {
  const aim = useGame((s) => s.aim);
  const carried = useGame((s) => s.carried);
  const rot = useGame((s) => s.placeRot);
  const placed = useGame((s) => s.placed);
  if (!aim || carried?.kind !== "item") return null;
  const def = ITEMS[carried.item];
  const [w, d] = def.size;
  const parent = aim.onUid ? placed.find((p) => p.uid === aim.onUid) : null;
  const y = FLOOR_Y[aim.floor] + (parent ? ITEMS[parent.item].surface ?? 0 : 0);
  return (
    <group position={[aim.x, y, aim.z]} rotation={[0, rotYaw(rot), 0]}>
      {parent && (
        <mesh position={[0, -(ITEMS[parent.item].surface ?? 0) - 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[ITEMS[parent.item].size[0] + 0.1, ITEMS[parent.item].size[1] + 0.1]} />
          <meshBasicMaterial color={aim.valid ? "#2ecc71" : "#e74c3c"} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[w, 1.0, d]} />
        <meshBasicMaterial color={aim.valid ? "#2ecc71" : "#e74c3c"} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={aim.valid ? "#2ecc71" : "#e74c3c"} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.5, d / 2 + 0.02]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <group scale={0.999}>
        <ItemModel id={carried.item} />
      </group>
    </group>
  );
}
