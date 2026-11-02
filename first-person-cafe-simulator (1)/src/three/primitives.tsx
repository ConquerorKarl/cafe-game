import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import "@react-three/fiber";
import { addCollider, addOccluder, addRoof, registerNightLight, registerNightMaterial } from "@/game/registry";
import type { CustomerColors, Outfit } from "@/game/types";

type V3 = [number, number, number];

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

/** World-space, yaw-aware AABB for an object with a local footprint of w × d and height h (centred on the object). */
export function worldFootprint(o: THREE.Object3D, w: number, d: number, h = 0) {
  o.updateWorldMatrix(true, false);
  o.getWorldPosition(tmpV);
  o.getWorldQuaternion(tmpQ);
  tmpE.setFromQuaternion(tmpQ, "YXZ");
  const c = Math.abs(Math.cos(tmpE.y));
  const s = Math.abs(Math.sin(tmpE.y));
  const ex = (c * w + s * d) / 2;
  const ez = (s * w + c * d) / 2;
  const minY = h > 0 ? tmpV.y - h / 2 : -100;
  const maxY = h > 0 ? tmpV.y + h / 2 : 100;
  return { minX: tmpV.x - ex, maxX: tmpV.x + ex, minZ: tmpV.z - ez, maxZ: tmpV.z + ez, minY, maxY };
}

export const KR_FONT = "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Nanum Gothic', 'Trebuchet MS', 'Segoe UI', sans-serif";

/** A box mesh that also blocks the player and the interaction raycast. */
export function SolidBox({
  position,
  size,
  color = "#ffffff",
  map,
  collide = true,
  occlude = true,
  roof = false,
  castShadow = true,
  receiveShadow = true,
  roughness = 0.9,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  transparent,
  opacity,
}: {
  position: V3;
  size: V3;
  color?: string;
  map?: THREE.Texture;
  collide?: boolean;
  occlude?: boolean;
  roof?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [w, h, d] = size;
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const cleanups: (() => void)[] = [];
    if (collide || roof) {
      const fp = worldFootprint(mesh, w, d, h);
      if (collide) cleanups.push(addCollider(fp));
      if (roof) cleanups.push(addRoof(fp));
    }
    if (occlude) cleanups.push(addOccluder(mesh));
    return () => cleanups.forEach((f) => f());
  }, [collide, occlude, roof, w, h, d]);
  return (
    <mesh ref={ref} position={position} castShadow={castShadow} receiveShadow={receiveShadow}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        map={map ?? null}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissiveIntensity}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

/** Invisible axis-aligned collision footprint (world position derived from parents). */
export function Collider({ position = [0, 0, 0], size, height = 2.4 }: { position?: V3; size: [number, number]; height?: number }) {
  const ref = useRef<THREE.Object3D>(null!);
  useEffect(() => {
    const o = ref.current;
    if (!o) return;
    const fp = worldFootprint(o, size[0], size[1], height);
    // footprint is centred on the object: shift so it starts at the object's y
    return addCollider({ ...fp, minY: fp.minY + height / 2, maxY: fp.maxY + height / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size[0], size[1], height]);
  return <object3D ref={ref} position={position} />;
}

/** Standard material whose emissive intensity follows the day/night cycle. */
export function NightMaterial({
  k = 1.2,
  emissive = "#ffd38a",
  map,
  emissiveMap,
  color = "#ffffff",
  roughness = 0.85,
  metalness = 0,
  transparent,
  opacity,
}: {
  k?: number;
  emissive?: string;
  map?: THREE.Texture;
  emissiveMap?: THREE.Texture;
  color?: string;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null!);
  useEffect(() => registerNightMaterial(ref.current, k, "emissive"), [k]);
  return (
    <meshStandardMaterial
      ref={ref}
      color={color}
      map={map ?? null}
      emissiveMap={emissiveMap ?? null}
      emissive={emissive}
      emissiveIntensity={0}
      roughness={roughness}
      metalness={metalness}
      transparent={transparent}
      opacity={opacity}
    />
  );
}

/** A point light that is only on at night. */
export function NightLight({ position, intensity, distance = 10, color = "#ffd9a0", decay = 2 }: { position: V3; intensity: number; distance?: number; color?: string; decay?: number }) {
  const ref = useRef<THREE.PointLight>(null!);
  useEffect(() => registerNightLight(ref.current, intensity), [intensity]);
  return <pointLight ref={ref} position={position} intensity={0} distance={distance} color={color} decay={decay} />;
}

/** Text rendered onto a canvas texture — works offline, auto-fits Latin and Hangul. */
export function TextPlane({
  lines,
  width = 3,
  height = 0.8,
  bg = "#2b2118",
  color = "#fff4e0",
  weight = "bold",
  position,
  rotation = [0, 0, 0],
  lit = false,
  neon = false,
  align = "center",
  border,
}: {
  lines: string[];
  width?: number;
  height?: number;
  bg?: string;
  color?: string;
  weight?: string;
  position: V3;
  rotation?: V3;
  lit?: boolean;
  neon?: boolean;
  align?: CanvasTextAlign;
  border?: string;
}) {
  const key = lines.join("\n");
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const aspect = width / height;
    const W = aspect >= 1 ? 1024 : Math.max(128, Math.round(1024 / Math.min(8, 1 / aspect)));
    const H = Math.min(2048, Math.max(64, Math.round(W / aspect)));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(4, W / 90);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
    }
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    const pad = W * 0.05;
    const lineH = H / (lines.length + 0.35);
    const x = align === "left" ? pad : align === "right" ? W - pad : W / 2;
    lines.forEach((l, i) => {
      let size = lineH * 0.72;
      ctx.font = `${weight} ${size}px ${KR_FONT}`;
      const m = ctx.measureText(l).width;
      if (m > W - pad * 2) size *= (W - pad * 2) / m;
      ctx.font = `${weight} ${size}px ${KR_FONT}`;
      if (neon) {
        ctx.shadowColor = color;
        ctx.shadowBlur = size * 0.35;
      }
      ctx.fillText(l, x, lineH * (i + 0.7));
    });
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height, bg, color, weight, align, neon, border]);
  useEffect(() => () => texture.dispose(), [texture]);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  useEffect(() => {
    if (!(lit || neon) || !matRef.current) return;
    return registerNightMaterial(matRef.current, neon ? 1.6 : 0.5, "basic", neon ? 1.1 : 0.8);
  }, [lit, neon]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      {lit || neon ? (
        <meshBasicMaterial ref={matRef} map={texture} toneMapped={false} />
      ) : (
        <meshStandardMaterial map={texture} roughness={0.8} />
      )}
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Low-poly person. Faces +Z. ~1.75m tall.
// ---------------------------------------------------------------------------
const DEFAULT_OUTFIT: Outfit = { umbrella: null, scarf: null, beanie: false, mask: false, shortSleeves: false, coat: false };

export function Person({
  colors,
  apron,
  outfit = DEFAULT_OUTFIT,
  umbrellaUp = false,
  scale = 1,
  helmet,
  sitting = false,
  children,
}: {
  colors: CustomerColors;
  apron?: string;
  outfit?: Outfit;
  umbrellaUp?: boolean;
  scale?: number;
  helmet?: string;
  /** Seated pose: hips at chair height, thighs forward, shins down. Place the group at the seat position. */
  sitting?: boolean;
  children?: ReactNode;
}) {
  const sleeve = outfit.shortSleeves ? colors.skin : colors.shirt;
  const torsoW = outfit.coat ? 0.5 : 0.44;
  const torsoD = outfit.coat ? 0.3 : 0.26;
  if (sitting) {
    // seat height 0.45: upper body sits on it, legs fold forward (+z) and down
    const lift = 0.45 - 0.78; // torso origin moves from standing hip height to the seat
    return (
      <group scale={scale}>
        {/* thighs (forward) */}
        {[-0.1, 0.1].map((x) => (
          <mesh key={`t${x}`} position={[x, 0.5, 0.22]}>
            <boxGeometry args={[0.16, 0.18, 0.46]} />
            <meshStandardMaterial color={colors.pants} />
          </mesh>
        ))}
        {/* shins (down) */}
        {[-0.1, 0.1].map((x) => (
          <mesh key={`s${x}`} position={[x, 0.22, 0.4]}>
            <boxGeometry args={[0.15, 0.44, 0.16]} />
            <meshStandardMaterial color={colors.pants} />
          </mesh>
        ))}
        {[-0.1, 0.1].map((x) => (
          <mesh key={`f${x}`} position={[x, 0.04, 0.46]}>
            <boxGeometry args={[0.16, 0.08, 0.26]} />
            <meshStandardMaterial color="#1f2328" />
          </mesh>
        ))}
        <group position={[0, lift, 0]}>
          <mesh position={[0, 1.08, 0]} castShadow>
            <boxGeometry args={[torsoW, outfit.coat ? 0.72 : 0.64, torsoD]} />
            <meshStandardMaterial color={colors.shirt} roughness={outfit.coat ? 0.95 : 0.8} />
          </mesh>
          {apron && (
            <mesh position={[0, 0.9, 0.14]}>
              <boxGeometry args={[0.34, 0.7, 0.02]} />
              <meshStandardMaterial color={apron} />
            </mesh>
          )}
          {/* arms resting forward on the lap / table */}
          {[-0.28, 0.28].map((x) => (
            <group key={x}>
              <mesh position={[x, 1.2, 0]}>
                <boxGeometry args={[0.11, 0.3, 0.13]} />
                <meshStandardMaterial color={colors.shirt} />
              </mesh>
              <mesh position={[x, 1.02, 0.14]} rotation={[-1.2, 0, 0]}>
                <boxGeometry args={[0.11, 0.3, 0.13]} />
                <meshStandardMaterial color={sleeve} />
              </mesh>
              <mesh position={[x, 0.98, 0.3]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color={colors.skin} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 1.58, 0]}>
            <sphereGeometry args={[0.19, 14, 12]} />
            <meshStandardMaterial color={colors.skin} />
          </mesh>
          {outfit.beanie ? (
            <mesh position={[0, 1.68, -0.01]}>
              <sphereGeometry args={[0.205, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color={outfit.scarf ?? "#c0392b"} />
            </mesh>
          ) : (
            <mesh position={[0, 1.66, -0.03]}>
              <sphereGeometry args={[0.2, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={colors.hair} />
            </mesh>
          )}
          <mesh position={[-0.07, 1.6, 0.17]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0.07, 1.6, 0.17]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {outfit.mask && (
            <mesh position={[0, 1.52, 0.15]}>
              <boxGeometry args={[0.24, 0.13, 0.1]} />
              <meshStandardMaterial color="#f5f6fa" />
            </mesh>
          )}
          {outfit.scarf && (
            <mesh position={[0, 1.4, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.17, 0.07, 8, 14]} />
              <meshStandardMaterial color={outfit.scarf} />
            </mesh>
          )}
          {children}
        </group>
      </group>
    );
  }
  return (
    <group scale={scale}>
      {helmet && (
        <>
          <mesh position={[0, 1.62, 0]}>
            <sphereGeometry args={[0.23, 14, 12]} />
            <meshStandardMaterial color={helmet} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, 1.58, 0.12]}>
            <boxGeometry args={[0.3, 0.12, 0.2]} />
            <meshStandardMaterial color="#1c1c1c" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 1.0, -0.26]}>
            <boxGeometry args={[0.46, 0.5, 0.26]} />
            <meshStandardMaterial color="#2bb3c0" />
          </mesh>
        </>
      )}
      {/* shoes */}
      <mesh position={[-0.1, 0.04, 0.03]}>
        <boxGeometry args={[0.16, 0.08, 0.26]} />
        <meshStandardMaterial color="#1f2328" />
      </mesh>
      <mesh position={[0.1, 0.04, 0.03]}>
        <boxGeometry args={[0.16, 0.08, 0.26]} />
        <meshStandardMaterial color="#1f2328" />
      </mesh>
      {/* legs */}
      <mesh position={[-0.1, 0.42, 0]}>
        <boxGeometry args={[0.16, 0.7, 0.2]} />
        <meshStandardMaterial color={colors.pants} />
      </mesh>
      <mesh position={[0.1, 0.42, 0]}>
        <boxGeometry args={[0.16, 0.7, 0.2]} />
        <meshStandardMaterial color={colors.pants} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[torsoW, outfit.coat ? 0.72 : 0.64, torsoD]} />
        <meshStandardMaterial color={colors.shirt} roughness={outfit.coat ? 0.95 : 0.8} />
      </mesh>
      {apron && (
        <mesh position={[0, 0.9, 0.14]}>
          <boxGeometry args={[0.34, 0.7, 0.02]} />
          <meshStandardMaterial color={apron} />
        </mesh>
      )}
      {/* arms */}
      {[-0.28, 0.28].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.2, 0]}>
            <boxGeometry args={[0.11, 0.3, 0.13]} />
            <meshStandardMaterial color={colors.shirt} />
          </mesh>
          <mesh position={[x, 0.92, 0]}>
            <boxGeometry args={[0.11, 0.3, 0.13]} />
            <meshStandardMaterial color={sleeve} />
          </mesh>
          <mesh position={[x, 0.74, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={colors.skin} />
          </mesh>
        </group>
      ))}
      {/* head */}
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.19, 14, 12]} />
        <meshStandardMaterial color={colors.skin} />
      </mesh>
      {/* hair / beanie */}
      {outfit.beanie ? (
        <>
          <mesh position={[0, 1.68, -0.01]}>
            <sphereGeometry args={[0.205, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={outfit.scarf ?? "#c0392b"} />
          </mesh>
          <mesh position={[0, 1.9, -0.01]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#f5f6fa" />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 1.66, -0.03]}>
          <sphereGeometry args={[0.2, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={colors.hair} />
        </mesh>
      )}
      {/* eyes */}
      <mesh position={[-0.07, 1.6, 0.17]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.07, 1.6, 0.17]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* mask */}
      {outfit.mask && (
        <mesh position={[0, 1.52, 0.15]}>
          <boxGeometry args={[0.24, 0.13, 0.1]} />
          <meshStandardMaterial color="#f5f6fa" />
        </mesh>
      )}
      {/* scarf */}
      {outfit.scarf && (
        <mesh position={[0, 1.4, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.07, 8, 14]} />
          <meshStandardMaterial color={outfit.scarf} />
        </mesh>
      )}
      {/* umbrella */}
      {outfit.umbrella && umbrellaUp && (
        <group position={[0.3, 1.0, 0.1]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 1.3, 6]} />
            <meshStandardMaterial color="#2d3436" />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <coneGeometry args={[0.55, 0.28, 10, 1, true]} />
            <meshStandardMaterial
              color={outfit.umbrella}
              side={THREE.DoubleSide}
              transparent={outfit.umbrella === "#f5f6fa"}
              opacity={outfit.umbrella === "#f5f6fa" ? 0.55 : 1}
            />
          </mesh>
        </group>
      )}
      {children}
    </group>
  );
}


/** Four-mesh stand-in for distant people (used by the LOD system). */
export function PersonLow({ colors, outfit = DEFAULT_OUTFIT, umbrellaUp = false, scale = 1 }: { colors: CustomerColors; outfit?: Outfit; umbrellaUp?: boolean; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.36, 0.8, 0.22]} />
        <meshStandardMaterial color={colors.pants} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.26]} />
        <meshStandardMaterial color={outfit.coat ? colors.shirt : colors.shirt} />
      </mesh>
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.19, 8, 7]} />
        <meshStandardMaterial color={colors.skin} />
      </mesh>
      <mesh position={[0, 1.68, -0.03]}>
        <sphereGeometry args={[0.2, 8, 7, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={outfit.beanie ? (outfit.scarf ?? "#c0392b") : colors.hair} />
      </mesh>
      {outfit.umbrella && umbrellaUp && (
        <mesh position={[0.3, 2.2, 0.1]}>
          <coneGeometry args={[0.55, 0.28, 8, 1, true]} />
          <meshStandardMaterial color={outfit.umbrella} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
