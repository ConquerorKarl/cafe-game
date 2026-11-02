import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EYE_HEIGHT, ITEMS, PLAYER_RADIUS, PRODUCTS } from "@/game/constants";
import { POINTS, validatePlacement } from "@/game/layout";
import { FALLBACK_EVENT, floorMeshes, groundAt, hitsCollider, interactables, keys, lockState, occluders, onLockFailure, sameTarget, setLockElement, simState, underRoof } from "@/game/registry";
import { sfx } from "@/game/sfx";
import { setIndoor } from "@/game/sfx";
import { useGame, type GameStore } from "@/game/store";
import type { FloorId, InteractTarget, ProductId } from "@/game/types";
import { BoxModel } from "./Items";

const CENTER = new THREE.Vector2(0, 0);
const WALK_SPEED = 3.8;
const RUN_SPEED = 6.5;
const GRAVITY = 14;
const JUMP_V = 5.0;

function blocked(x: number, z: number, y: number, fromX: number, fromZ: number, s: GameStore): boolean {
  if (hitsCollider(x, z, PLAYER_RADIUS, y + 0.25, y + 1.6)) return true;
  for (const c of s.customers) {
    if (Math.abs(c.pos.y - y) > 1.2) continue;
    const dx = c.pos.x - x;
    const dz = c.pos.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 0.6 * 0.6) {
      const ox = c.pos.x - fromX;
      const oz = c.pos.z - fromZ;
      if (d2 < ox * ox + oz * oz) return true;
    }
  }
  return false;
}

export function Player() {
  const { camera, gl } = useThree();
  const pos = useRef(new THREE.Vector3(POINTS.playerStart[0], 0, POINTS.playerStart[2]));
  const vel = useRef(new THREE.Vector3()); // smoothed horizontal velocity
  const vy = useRef(0);
  const onGround = useRef(true);
  const rot = useRef({ yaw: Math.PI, pitch: 0 });
  const lookSm = useRef({ yaw: 0, pitch: 0 }); // EMA-smoothed look deltas
  const pendingLook = useRef({ yaw: 0, pitch: 0 }); // raw deltas queued by mouse events
  const stepAcc = useRef(0); // fixed-timestep accumulator
  const fovSm = useRef(75);
  const bobT = useRef(0);
  const frame = useRef(0);
  const ray = useMemo(() => {
    const r = new THREE.Raycaster();
    r.far = 3.4;
    return r;
  }, []);
  // world positions of raycast targets, refreshed periodically (buildings don't move)
  const posCache = useMemo(() => new Map<THREE.Object3D, THREE.Vector3>(), []);
  const placedSig = useGame((st) => st.placed.map((p) => `${p.uid}:${p.x},${p.z}`).join("|"));
  const posCacheStale = useRef(true);
  const nearObjs = useMemo(() => [] as THREE.Object3D[], []);
  const floorRay = useMemo(() => {
    const r = new THREE.Raycaster();
    r.far = 7;
    return r;
  }, []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);
  const tmp0 = useMemo(() => new THREE.Vector3(), []);
  const lastAim = useRef({ x: 0, z: 0, valid: false, floor: 0 as FloorId, reason: "", onUid: undefined as number | undefined });

  useEffect(() => {
    const el = gl.domElement;
    setLockElement(el);
    let dragging = false;
    const applyLook = (e: MouseEvent) => {
      // queue raw deltas; they are consumed with smoothing at a fixed step in useFrame
      pendingLook.current.yaw -= e.movementX * 0.0022;
      pendingLook.current.pitch -= e.movementY * 0.0022;
    };
    const onMove = (e: MouseEvent) => {
      const s = useGame.getState();
      if (s.modal !== "none" || s.pause !== "none") return;
      if (document.pointerLockElement === el) applyLook(e);
      else if (lockState.dragLook && dragging && s.locked) applyLook(e);
    };
    const onDown = (e: MouseEvent) => {
      if (lockState.dragLook && e.target === el) dragging = true;
    };
    const onUp = () => {
      dragging = false;
    };
    const onLockChange = () => {
      const locked = document.pointerLockElement === el;
      const s = useGame.getState();
      if (locked) {
        lockState.everLocked = true;
        s.setLocked(true);
        if (s.pause !== "none") s.setPause("none");
      } else if (!lockState.dragLook) {
        s.setLocked(false);
        // Browser Esc: close interfaces first, menu second
        if (s.phase === "playing") {
          if (s.modal !== "none") {
            s.closeModal();
            s.setPause("slim");
          } else if (s.pause === "none") s.setPause("menu");
        }
      }
    };
    const onLockError = () => onLockFailure();
    const onFallback = () => {
      const s = useGame.getState();
      s.setDragLook(true);
      s.setLocked(true);
      s.setPause("none");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useGame.getState();
      const typing = (e.target as HTMLElement | null)?.tagName === "INPUT";
      if (typing) return;
      keys.add(e.code);
      if (e.code === "Escape") {
        // when pointer-locked the browser handles Esc via pointerlockchange; otherwise (drag-look) do it here
        if (lockState.dragLook || !s.locked) s.escape();
        return;
      }
      if (s.phase !== "playing") return;
      if (s.modal !== "none") {
        if (e.code === "Tab" || e.code === "KeyE" || e.code === "KeyQ") {
          e.preventDefault();
          s.closeModal();
        }
        return;
      }
      if (s.pause !== "none") return;
      if (e.code === "KeyE") s.interact();
      if (e.code === "KeyF") s.pickUp();
      if (e.code === "KeyQ") s.dropCarried();
      if (e.code === "KeyR") s.rotatePlacement();
      if (/^Digit[1-9]$/.test(e.code)) s.hotkey(parseInt(e.code.slice(5), 10));
      if (e.code === "Space") {
        e.preventDefault();
        const ws = useGame.getState().washing;
        if (ws && ws.source === "player") {
          useGame.getState().scrub();
          return;
        }
        if (onGround.current) {
          vy.current = JUMP_V;
          onGround.current = false;
        }
      }
      if (e.code === "Tab") e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onBlur = () => {
      keys.clear();
      dragging = false;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    window.addEventListener(FALLBACK_EVENT, onFallback);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      window.removeEventListener(FALLBACK_EVENT, onFallback);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      setLockElement(null);
    };
  }, [gl]);

  useEffect(() => {
    posCacheStale.current = true;
  }, [placedSig]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    const active = s.phase === "playing" && s.modal === "none" && s.locked && s.pause === "none";
    const yaw = rot.current.yaw;
    const p = pos.current;

    // --- fixed-timestep simulation (movement is identical at any render rate) ---
    stepAcc.current = Math.min(stepAcc.current + dt, 0.12); // cap catch-up work after a hitch
    const STEP = 1 / 60;
    const wish = move.set(0, 0, 0);
    const running = keys.has("ShiftLeft") || keys.has("ShiftRight");
    if (active) {
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      if (keys.has("KeyW") || keys.has("ArrowUp")) wish.add(forward);
      if (keys.has("KeyS") || keys.has("ArrowDown")) wish.sub(forward);
      if (keys.has("KeyA") || keys.has("ArrowLeft")) wish.sub(right);
      if (keys.has("KeyD") || keys.has("ArrowRight")) wish.add(right);
    }
    if (wish.lengthSq() > 0) wish.normalize();
    const speed = (running ? RUN_SPEED : WALK_SPEED) * (s.carried?.kind === "item" ? 0.8 : 1);
    const targetVel = tmp0.copy(wish).multiplyScalar(speed);

    while (stepAcc.current >= STEP) {
      stepAcc.current -= STEP;
      // look: consume queued raw deltas with exponential smoothing.
      // NOTE: copy the values first — pendingLook.current is zeroed in place.
      const rawYaw = pendingLook.current.yaw;
      const rawPitch = pendingLook.current.pitch;
      pendingLook.current.yaw = 0;
      pendingLook.current.pitch = 0;
      const alpha = 1 - Math.exp(-STEP * 22);
      lookSm.current.yaw += (rawYaw - lookSm.current.yaw) * alpha;
      lookSm.current.pitch += (rawPitch - lookSm.current.pitch) * alpha;
      rot.current.yaw += lookSm.current.yaw;
      rot.current.pitch = THREE.MathUtils.clamp(rot.current.pitch + lookSm.current.pitch, -1.45, 1.45);

      // velocity: accelerate toward the wish velocity, decelerate fast when idle
      const moving = wish.lengthSq() > 0;
      const blend = 1 - Math.exp(-STEP * (moving ? 14 : 20));
      vel.current.lerp(targetVel, blend);
      if (!moving && vel.current.lengthSq() < 0.02) vel.current.set(0, 0, 0);
      const dx = vel.current.x * STEP;
      const dz = vel.current.z * STEP;
      const nx = p.x + dx;
      if (!blocked(nx, p.z, p.y, p.x, p.z, s)) p.x = nx;
      const nz = p.z + dz;
      if (!blocked(p.x, nz, p.y, p.x, p.z, s)) p.z = nz;

      // vertical
      const ground = groundAt(p.x, p.z, p.y);
      if (active) {
        vy.current -= GRAVITY * STEP;
        p.y += vy.current * STEP;
      }
      if (p.y <= ground + 0.001 && vy.current <= 0) {
        p.y = ground;
        vy.current = 0;
        onGround.current = true;
      } else if (ground > p.y && ground - p.y < 0.6 && vy.current <= 0) {
        p.y = ground;
        vy.current = 0;
        onGround.current = true;
      }

      // head bob + footsteps
      const hSpeed = vel.current.length();
      if (onGround.current && hSpeed > 0.4) {
        const prev = bobT.current;
        bobT.current += STEP * (9 + hSpeed * 0.9);
        if (Math.floor(prev / Math.PI) !== Math.floor(bobT.current / Math.PI)) sfx.step(hSpeed > 5);
      } else {
        bobT.current *= 0.9;
      }
    }

    // --- camera: direct follow (kinematic), FOV kick while running ---
    const bob = Math.sin(bobT.current) * 0.03;
    camera.position.set(p.x, p.y + EYE_HEIGHT + bob, p.z);
    camera.rotation.set(rot.current.pitch, rot.current.yaw, 0, "YXZ");
    const targetFov = active && running && vel.current.lengthSq() > 4 ? 80 : 75;
    const nf = fovSm.current + (targetFov - fovSm.current) * (1 - Math.exp(-dt * 7));
    if (Math.abs(nf - fovSm.current) > 0.01) {
      fovSm.current = nf;
      (camera as THREE.PerspectiveCamera).fov = nf;
      camera.updateProjectionMatrix();
    }
    simState.playerX = p.x;
    simState.playerY = p.y;
    simState.playerZ = p.z;

    // indoor / outdoor → weather audio muffling (smoothed so doorways fade rather than click)
    const inside = underRoof(p.x, p.z, p.y + 1.2, true) ? 1 : 0;
    simState.indoor += (inside - simState.indoor) * Math.min(1, dt * 4);
    if (frame.current % 6 === 0) setIndoor(simState.indoor);

    frame.current++;
    if (frame.current % 3 !== 0) return;

    if (!active) {
      if (s.focused) s.setFocused(null);
      return;
    }

    // placement aim — floor first, then surfaces of placed items (tables, worktops, counter)
    if (s.carried?.kind === "item") {
      const surfaceObjs: THREE.Object3D[] = [];
      for (const [o, t] of interactables) {
        if (t.kind === "placed") {
          const pl = s.placed.find((p) => p.uid === t.uid);
          if (pl && ITEMS[pl.item].surface && !pl.onUid) surfaceObjs.push(o);
        }
      }
      floorRay.setFromCamera(CENTER, camera);
      const hits = floorRay.intersectObjects([...floorMeshes, ...surfaceObjs], true);
      if (hits.length) {
        const h = hits[0];
        // hits land on child meshes — walk up to find the registered interactable group
        let onUid: number | undefined;
        let floor = (h.object.userData.floor ?? 0) as FloorId;
        let o: THREE.Object3D | null = h.object;
        while (o) {
          const t = interactables.get(o);
          if (t && t.kind === "placed") {
            const pl = s.placed.find((p) => p.uid === t.uid);
            if (pl && ITEMS[pl.item].surface && !pl.onUid) {
              onUid = pl.uid;
              floor = pl.floor;
            }
            break;
          }
          o = o.parent;
        }
        const x = Math.round(h.point.x * 10) / 10;
        const z = Math.round(h.point.z * 10) / 10;
        const def = ITEMS[s.carried.item];
        const v = validatePlacement(def, x, z, s.placeRot, floor, s.placed, s.installations, undefined, onUid);
        const la = lastAim.current as typeof lastAim.current & { onUid?: number };
        if (!s.aim || la.x !== x || la.z !== z || la.valid !== v.ok || la.floor !== floor || la.reason !== v.reason || la.onUid !== onUid) {
          lastAim.current = { x, z, valid: v.ok, floor, reason: v.reason, onUid };
          s.setAim({ x, z, floor, valid: v.ok, reason: v.reason, onUid });
        }
      } else if (s.aim) s.setAim(null);
      if (s.focused) s.setFocused(null);
      return;
    }

    // look-at target detection — only test objects within reach of the camera
    ray.setFromCamera(CENTER, camera);
    if (posCacheStale.current || frame.current % 20 === 0 || posCache.size === 0) {
      posCacheStale.current = false;
      posCache.clear();
      const all = [...interactables.keys(), ...occluders];
      for (const o of all) {
        let pp = posCache.get(o);
        if (!pp) {
          pp = new THREE.Vector3();
          posCache.set(o, pp);
        }
        o.getWorldPosition(pp);
      }
    }
    nearObjs.length = 0;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const o of posCache.keys()) {
      const pp = posCache.get(o)!;
      const dx = pp.x - cx;
      const dz = pp.z - cz;
      if (dx * dx + dz * dz < 4.5 * 4.5) nearObjs.push(o);
    }
    const hits = ray.intersectObjects(nearObjs, true);
    let target: InteractTarget | null = null;
    if (hits.length) {
      let o: THREE.Object3D | null = hits[0].object;
      while (o) {
        const t = interactables.get(o);
        if (t) {
          target = t;
          break;
        }
        if (o.userData.occluder) break;
        o = o.parent;
      }
    }
    if (!sameTarget(target, s.focused)) s.setFocused(target);
  });

  return null;
}

// ---------------------------------------------------------------------------
// Held things rendered in front of the camera
// ---------------------------------------------------------------------------
function Cup({ color, iced }: { color: string; iced: boolean }) {
  if (iced)
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.042, 0.034, 0.12, 16]} />
          <meshStandardMaterial color={color} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.062, 0]}>
          <cylinderGeometry args={[0.044, 0.044, 0.008, 16]} />
          <meshStandardMaterial color="#dfe6e9" transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.012, 0.1, 0]} rotation={[0, 0, 0.15]}>
          <cylinderGeometry args={[0.005, 0.005, 0.12, 6]} />
          <meshStandardMaterial color="#2ecc71" />
        </mesh>
      </group>
    );
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.045, 0.035, 0.1, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.012, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.05, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.007, 8, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Bowl({ color }: { color: string }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.07, 0.045, 0.06, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.06, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function PastryModel({ id }: { id: ProductId }) {
  const color = PRODUCTS[id].color;
  if (id === "croissant")
    return (
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.03, 0.09, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  if (id === "soboro")
    return (
      <mesh>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    );
  if (id === "eggtart" || id === "macaron")
    return (
      <mesh>
        <cylinderGeometry args={[0.045, 0.035, 0.03, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  return (
    <mesh>
      <boxGeometry args={[0.09, 0.07, 0.09]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function HandItem() {
  const heldItem = useGame((s) => s.heldItem);
  const carried = useGame((s) => s.carried);
  const ref = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    if (carried) {
      g.translateX(0.0);
      g.translateY(-0.42 + Math.sin(state.clock.elapsedTime * 2) * 0.006);
      g.translateZ(-0.75);
      g.rotateY(0.1);
    } else {
      g.translateX(0.3);
      g.translateY(-0.26 + Math.sin(state.clock.elapsedTime * 2) * 0.004);
      g.translateZ(-0.5);
      g.rotateY(-0.35);
    }
  });
  if (carried) {
    const label = carried.kind === "item" ? ITEMS[carried.item].name : "SUPPLIES";
    return (
      <group ref={ref}>
        <group scale={0.55}>
          <BoxModel label={label} sub={carried.kind === "item" ? ITEMS[carried.item].icon : "📦"} />
        </group>
      </group>
    );
  }
  if (!heldItem) return null;
  const p = PRODUCTS[heldItem];
  return (
    <group ref={ref}>
      {p.station === "bingsu" ? <Bowl color={p.color} /> : p.station === "machine" ? <Cup color={p.color} iced={p.temp === "cold"} /> : <PastryModel id={heldItem} />}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.16, 0.012, 0.12]} />
        <meshStandardMaterial color="#d7b48a" />
      </mesh>
    </group>
  );
}
