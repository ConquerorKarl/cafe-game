import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { WEATHERS, getSun, lerp } from "@/game/calendar";
import { EYE_HEIGHT } from "@/game/constants";
import { envState, nightLights, nightMaterials, simState } from "@/game/registry";
import { tick } from "@/game/sim";
import { useGame } from "@/game/store";
import { Customers } from "./Customers";
import { StaffNpcs } from "./Staff";
import { HandItem, Player } from "./Player";
import { WeatherFX } from "./Weather";
import { World } from "./World";

function GameLoop() {
  useFrame((_, dt) => tick(Math.min(dt, 0.1)));
  return null;
}

/**
 * Frame limiter. R3F's "demand" frameloop only renders when asked, so we drive it from
 * requestAnimationFrame and invalidate at most `fps` times a second (capped at 60).
 */
function FrameLimiter() {
  const invalidate = useThree((st) => st.invalidate);
  const fps = useGame((s) => s.fpsCap);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let pending = false;
    const interval = 1000 / Math.min(60, Math.max(24, fps));
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) {
        last = now;
        return;
      }
      if (now - last >= interval - 0.5) {
        last = now;
        if (!pending) {
          pending = true;
          invalidate();
          // R3F renders on the next vsync; clear the flag after it
          requestAnimationFrame(() => (pending = false));
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [invalidate, fps]);
  return null;
}

const DAY_SKY = new THREE.Color();
const NIGHT_FOG = new THREE.Color("#0b1020");
const WHITE = new THREE.Color("#ffffff");
const tmpColor = new THREE.Color();

function DayLight() {
  const high = useGame((s) => s.quality === "high");
  const clock = useGame((s) => s.clock);
  const day = useGame((s) => s.day);
  const weather = useGame((s) => s.weather);
  const { scene, gl } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  const smooth = useRef({ night: 0, sunI: 1, hemiI: 0.6, shadow: 1 });
  const lastShadowPos = useRef(new THREE.Vector3(1e9, 1e9, 1e9));

  const target = useMemo(() => {
    const sun = getSun(day, clock);
    const wd = WEATHERS[weather];
    const sky = wd.sky;
    const overcast = wd.cover >= 0.8;
    const warm = overcast ? 0 : sun.dusk;
    // overcast light is flat and slightly cool; clear light warms toward dusk
    const sunColor = overcast ? new THREE.Color("#c9d1d9") : new THREE.Color().setRGB(1, lerp(0.96, 0.62, warm), lerp(0.88, 0.35, warm));
    const sunI = (0.2 + 2.6 * sun.elev) * sky.light * (overcast ? 0.75 : 1);
    const hemiI = lerp(0.55 + 0.35 * sun.elev, 0.12, sun.night) * (0.5 + 0.5 * sky.light) * (overcast ? 1.35 : 1);
    DAY_SKY.set(sky.fogColor);
    const fog = DAY_SKY.clone().lerp(NIGHT_FOG, sun.night * 0.92);
    // overcast: the sun sits high so what little shadow remains is soft and short
    const pos: [number, number, number] = overcast ? [sun.pos[0] * 0.35, Math.max(60, sun.pos[1]), sun.pos[2] * 0.35] : sun.pos;
    const shadow = overcast ? 0.18 : lerp(1, 0.35, 1 - sky.light);
    return { sun, pos, sunColor, sunI, hemiI, fog, fogNear: sky.fogNear, fogFar: sky.fogFar, turbidity: sky.turbidity, rayleigh: sky.rayleigh, overcast, shadow };
  }, [clock, day, weather]);

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);

  useFrame((_, dt) => {
    simState.frame++;
    const k = Math.min(1, dt * 1.5);
    const s = smooth.current;
    s.night = lerp(s.night, target.sun.night, k);
    s.sunI = lerp(s.sunI, target.sunI, k);
    s.hemiI = lerp(s.hemiI, target.hemiI, k);
    s.shadow = lerp(s.shadow, target.shadow, k);
    envState.night = s.night;
    const flash = envState.flash;
    if (sunRef.current) {
      sunRef.current.intensity = s.sunI + flash * 2.5;
      sunRef.current.color.copy(target.sunColor);
      sunRef.current.position.set(target.pos[0], target.pos[1], target.pos[2]);
      sunRef.current.shadow.intensity = s.shadow;
    }
    if (hemi.current) hemi.current.intensity = s.hemiI + flash * 3;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerp(target.fog, k);
      scene.fog.near = lerp(scene.fog.near, target.fogNear, k);
      scene.fog.far = lerp(scene.fog.far, target.fogFar, k);
      tmpColor.copy(scene.fog.color);
      if (flash > 0) tmpColor.lerp(WHITE, flash * 0.7);
      gl.setClearColor(tmpColor);
    }
    gl.toneMappingExposure = lerp(1.05, 0.9, s.night) * (1 + flash * 0.9);
    // shadows live in world space, so they only need re-rendering when the sun moves.
    // Refresh at most every ~2 s and only while the sun is up — no per-frame hitches.
    if (s.sunI > 0.05) {
      const sp = sunRef.current.position;
      if (simState.frame % 120 === 0 || lastShadowPos.current.distanceToSquared(sp) > 4) {
        lastShadowPos.current.copy(sp);
        gl.shadowMap.needsUpdate = true;
      }
    }
    if (simState.frame % 4 === 0) {
      for (const n of nightMaterials) {
        if (n.mode === "emissive") (n.mat as THREE.MeshStandardMaterial).emissiveIntensity = s.night * n.k;
        else (n.mat as THREE.MeshBasicMaterial).color.setScalar(n.base + s.night * n.k);
      }
      for (const l of nightLights) l.light.intensity = l.intensity * Math.max(0, s.night - 0.1) * 1.1;
    }
  });

  return (
    <>
      {!target.overcast && <Sky sunPosition={target.sun.pos} turbidity={target.turbidity} rayleigh={target.rayleigh} mieCoefficient={0.005} mieDirectionalG={0.8} distance={450} />}
      {!target.overcast && target.sun.night > 0.55 && <Stars radius={200} depth={60} count={2000} factor={4} saturation={0} fade speed={0.5} />}
      <hemisphereLight ref={hemi} color={target.overcast ? "#b9c2cb" : "#dff1ff"} groundColor="#5e5a46" intensity={0.6} />
      <directionalLight
        ref={sunRef}
        position={target.pos}
        intensity={1}
        castShadow
        shadow-mapSize={[high ? 2048 : 1024, high ? 2048 : 1024]}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-camera-near={1}
        shadow-camera-far={320}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
      <fog attach="fog" args={["#cfe3f2", 60, 260]} />
    </>
  );
}

function Effects() {
  return (
    <EffectComposer multisampling={2}>
      <Bloom luminanceThreshold={1.0} luminanceSmoothing={0.25} intensity={0.9} mipmapBlur radius={0.7} />
      <Vignette eskil={false} offset={0.2} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

export function Scene() {
  const quality = useGame((s) => s.quality);
  const high = quality === "high";
  return (
    <Canvas
      key={quality}
      frameloop="demand"
      shadows={high}
      dpr={high ? [1, 1.25] : [1, 1]}
      camera={{ fov: 75, near: 0.08, far: 600, position: [1.5, EYE_HEIGHT, 1.6] }}
      gl={{ antialias: !high, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#bfe3ff")}
    >
      <Suspense fallback={null}>
        <DayLight />
        <World />
        <Customers />
        <StaffNpcs />
        <WeatherFX />
        <Player />
        <HandItem />
        <GameLoop />
        <FrameLimiter />
        {high && <Effects />}
      </Suspense>
    </Canvas>
  );
}
