import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { WEATHERS } from "@/game/calendar";
import { envState, simState, underRoof } from "@/game/registry";
import { sfx } from "@/game/sfx";
import { useGame } from "@/game/store";

const RANGE = 20;
const STRIDE = 6; // x, y, z, speed, phase, hidden
const dummy = new THREE.Object3D();

/**
 * Instanced precipitation. Hot path notes:
 *  - matrices are written straight into the instance buffer (no Object3D compose) for
 *    rain / snow / hail, which have a fixed orientation;
 *  - the roof test (is this drop inside a building?) runs for a third of the drops each
 *    frame and goes through the spatial roof grid, instead of all drops × all roofs.
 */
function Precipitation({ kind, intensity, quality }: { kind: "rain" | "snow" | "hail" | "petals"; intensity: number; quality: "high" | "low" }) {
  const base = kind === "rain" ? 1500 : kind === "snow" ? 950 : kind === "hail" ? 600 : 260;
  const count = Math.round(base * Math.max(0.45, intensity) * (quality === "low" ? 0.55 : 1));
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(() => {
    const arr = new Float32Array(count * STRIDE);
    for (let i = 0; i < count; i++) {
      const o = i * STRIDE;
      arr[o] = (Math.random() - 0.5) * RANGE * 2;
      arr[o + 1] = Math.random() * 18;
      arr[o + 2] = (Math.random() - 0.5) * RANGE * 2;
      arr[o + 3] = kind === "rain" ? 14 + Math.random() * 8 : kind === "hail" ? 11 + Math.random() * 5 : kind === "snow" ? 0.9 + Math.random() * 0.9 : 0.5 + Math.random() * 0.5;
      arr[o + 4] = Math.random() * Math.PI * 2;
      arr[o + 5] = 0;
    }
    return arr;
  }, [count, kind]);
  const wind = kind === "snow" ? 1.2 * intensity : kind === "rain" ? 2.0 * intensity : 0.6;
  const tumble = kind === "petals";

  // fixed orientation matrix (3×3 part) for the non-tumbling kinds
  const baseMat = useMemo(() => {
    const m = new THREE.Matrix4();
    if (kind === "rain") m.makeRotationZ(-wind * 0.06);
    return m.elements;
  }, [kind, wind]);

  useEffect(() => {
    const m = mesh.current;
    if (!m || tumble) return;
    const arr = m.instanceMatrix.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const b = i * 16;
      for (let k = 0; k < 16; k++) arr[b + k] = baseMat[k];
    }
    m.instanceMatrix.needsUpdate = true;
  }, [count, baseMat, tumble]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const m = mesh.current;
    if (!m) return;
    const px = simState.playerX;
    const pz = simState.playerZ;
    const t = state.clock.elapsedTime;
    const arr = m.instanceMatrix.array as Float32Array;
    const phase = simState.frame % 3;
    for (let i = 0; i < count; i++) {
      const o = i * STRIDE;
      data[o + 1] -= data[o + 3] * dt;
      data[o] += wind * dt + (kind === "snow" || tumble ? Math.sin(t * 1.3 + data[o + 4]) * dt * 0.8 : 0);
      if (tumble) data[o + 2] += Math.cos(t * 0.9 + data[o + 4]) * dt * 0.6;
      let wx = px + data[o];
      let wz = pz + data[o + 2];
      if (data[o + 1] < 0 || Math.abs(data[o]) > RANGE || Math.abs(data[o + 2]) > RANGE) {
        for (let tries = 0; tries < 3; tries++) {
          data[o] = (Math.random() - 0.5) * RANGE * 2;
          data[o + 2] = (Math.random() - 0.5) * RANGE * 2;
          wx = px + data[o];
          wz = pz + data[o + 2];
          if (!underRoof(wx, wz)) break;
        }
        data[o + 1] = 10 + Math.random() * 10;
        data[o + 5] = underRoof(wx, wz, data[o + 1]) ? 1 : 0;
      } else if (i % 3 === phase) {
        data[o + 5] = underRoof(wx, wz, data[o + 1]) ? 1 : 0;
      }
      const hidden = data[o + 5] > 0.5;
      const b = i * 16;
      if (tumble) {
        dummy.position.set(wx, data[o + 1], wz);
        dummy.rotation.set(t * 2 + data[o + 4], t * 1.5, data[o + 4]);
        const sc = hidden ? 0 : 1;
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        dummy.matrix.toArray(arr, b);
      } else {
        if (hidden) {
          arr[b] = 0;
          arr[b + 5] = 0;
          arr[b + 10] = 0;
        } else {
          arr[b] = baseMat[0];
          arr[b + 1] = baseMat[1];
          arr[b + 4] = baseMat[4];
          arr[b + 5] = baseMat[5];
          arr[b + 10] = 1;
        }
        arr[b + 12] = wx;
        arr[b + 13] = data[o + 1];
        arr[b + 14] = wz;
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      {kind === "rain" ? <boxGeometry args={[0.012, 0.5, 0.012]} /> : kind === "snow" ? <sphereGeometry args={[0.045, 5, 4]} /> : kind === "hail" ? <sphereGeometry args={[0.055, 6, 5]} /> : <planeGeometry args={[0.09, 0.07]} />}
      {kind === "rain" ? <meshBasicMaterial color="#cfe3f5" transparent opacity={0.45} /> : kind === "snow" ? <meshBasicMaterial color="#ffffff" transparent opacity={0.9} /> : kind === "hail" ? <meshStandardMaterial color="#eaf6ff" roughness={0.2} /> : <meshBasicMaterial color="#f9c5d9" side={THREE.DoubleSide} />}
    </instancedMesh>
  );
}

/**
 * Lightning: a flash factor in envState that the lighting code reads (exposure + sky
 * light boost), thunder with distance delay, and customers flinching. No React state,
 * no DOM overlay — the strike costs nothing beyond the audio node.
 */
function Lightning() {
  const timer = useRef(5 + Math.random() * 10);
  useFrame((_, dt) => {
    const s = useGame.getState();
    const running = s.phase === "playing" && s.modal === "none" && s.locked && s.pause === "none";
    if (running) {
      timer.current -= dt;
      if (timer.current <= 0) {
        timer.current = 7 + Math.random() * 16;
        envState.flash = 1;
        s.lightning();
        sfx.thunder(0.4 + Math.random() * 2);
      }
    }
    if (envState.flash > 0) envState.flash = Math.max(0, envState.flash - dt * 3.5);
  });
  return null;
}

/** Puffy cumulus for fair / partly cloudy days. */
function Clouds({ dark, count }: { dark: boolean; count: number }) {
  const group = useRef<THREE.Group>(null!);
  const clouds = useMemo(() => Array.from({ length: count }).map((_, i) => ({ x: ((i * 37) % 160) - 80, z: ((i * 53) % 160) - 80, y: 38 + (i % 4) * 4, s: 1 + (i % 3) * 0.5, speed: 0.6 + (i % 3) * 0.3 })), [count]);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.children.forEach((c, i) => {
      c.position.x += clouds[i].speed * dt;
      if (c.position.x > 110) c.position.x = -110;
    });
  });
  const color = dark ? "#6b7480" : "#ffffff";
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          <mesh>
            <sphereGeometry args={[6, 8, 6]} />
            <meshStandardMaterial color={color} transparent opacity={dark ? 0.9 : 0.85} flatShading />
          </mesh>
          <mesh position={[5, -1, 1]}>
            <sphereGeometry args={[4.5, 8, 6]} />
            <meshStandardMaterial color={color} transparent opacity={dark ? 0.9 : 0.85} flatShading />
          </mesh>
          <mesh position={[-5, -1.5, -1]}>
            <sphereGeometry args={[4, 8, 6]} />
            <meshStandardMaterial color={color} transparent opacity={dark ? 0.9 : 0.85} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function makeCloudTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#888";
  ctx.fillRect(0, 0, S, S);
  // layered soft blobs → cheap value-noise look
  for (let layer = 0; layer < 3; layer++) {
    const n = 40 + layer * 30;
    const r = 60 / (layer + 1);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const v = Math.random() < 0.5 ? 255 : 0;
      g.addColorStop(0, `rgba(${v},${v},${v},${0.18 / (layer + 1)})`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      // draw with wrap-around so the texture tiles
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

/** A low, solid, drifting overcast deck that hides the sun on grey days. */
function CloudDeck({ color, opacity, speed }: { color: string; opacity: number; speed: number }) {
  const tex = useMemo(() => makeCloudTexture(), []);
  const tex2 = useMemo(() => {
    const t = tex.clone();
    t.repeat.set(3.3, 3.3);
    t.needsUpdate = true;
    return t;
  }, [tex]);
  useEffect(() => () => {
    tex.dispose();
    tex2.dispose();
  }, [tex, tex2]);
  useFrame((_, dt) => {
    tex.offset.x += dt * 0.004 * speed;
    tex.offset.y += dt * 0.0015 * speed;
    tex2.offset.x -= dt * 0.0025 * speed;
  });
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 46, 0]} frustumCulled={false}>
        <planeGeometry args={[700, 700]} />
        <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} fog={false} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 60, 0]} frustumCulled={false}>
        <planeGeometry args={[700, 700]} />
        <meshBasicMaterial map={tex2} color={color} transparent opacity={opacity * 0.8} fog={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function WeatherFX() {
  const weather = useGame((s) => s.weather);
  const quality = useGame((s) => s.quality);
  const wd = WEATHERS[weather];
  useEffect(() => {
    envState.wet = wd.wet ? 1 : 0;
  }, [wd]);
  const overcast = wd.cover >= 0.8;
  const puffy = overcast ? 0 : Math.round(4 + wd.cover * 10);
  const deckColor = weather === "thunderstorm" ? "#3f454c" : weather === "monsoon" ? "#555c63" : weather === "blizzard" ? "#b8c0c8" : weather === "snow" ? "#c3cad2" : weather === "fog" ? "#c9ced3" : weather === "dust" ? "#b7a37c" : weather === "cloudy" ? "#9aa3ab" : "#6f777e";
  return (
    <>
      {wd.particles && <Precipitation kind={wd.particles} intensity={wd.intensity} quality={quality} />}
      {wd.lightning && <Lightning />}
      {puffy > 0 && <Clouds dark={false} count={puffy} />}
      {overcast && <CloudDeck color={deckColor} opacity={weather === "fog" ? 0.75 : 0.96} speed={wd.severe ? 2.5 : 1} />}
    </>
  );
}
