import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { PRODUCTS, ROLE_MAP } from "@/game/constants";
import { useInteractable } from "@/game/registry";
import { useGame } from "@/game/store";
import type { Staff, StaffNpc } from "@/game/types";
import { Person } from "./primitives";

const NO_OUTFIT = { umbrella: null, scarf: null, beanie: false, mask: false, shortSleeves: false, coat: false };

function StaffMesh({ npc, member }: { npc: StaffNpc; member: Staff }) {
  const group = useRef<THREE.Group>(null!);
  const sayEl = useRef<HTMLDivElement>(null);
  const stateEl = useRef<HTMLDivElement>(null);
  const target = useMemo(() => ({ kind: "staff" as const, id: npc.id }), [npc.id]);
  useInteractable(group, target);
  const role = member.role ? ROLE_MAP[member.role] : null;

  const frame = useRef(0);
  const lastPos = useRef({ x: 0, y: 0, z: 0, yaw: 0 });
  useFrame(() => {
    frame.current++;
    const g = group.current;
    if (!g) return;
    const bob = npc.moving ? Math.abs(Math.sin(npc.walkPhase)) * 0.05 : 0;
    const nx = npc.pos.x;
    const ny = npc.pos.y + bob;
    const nz = npc.pos.z;
    const lp = lastPos.current;
    if (Math.abs(nx - lp.x) > 0.001 || Math.abs(ny - lp.y) > 0.001 || Math.abs(nz - lp.z) > 0.001 || Math.abs(npc.yaw - lp.yaw) > 0.005) {
      g.position.set(nx, ny, nz);
      g.rotation.y = npc.yaw;
      lp.x = nx; lp.y = ny; lp.z = nz; lp.yaw = npc.yaw;
    }
    if (frame.current % 3 !== 0) return; // DOM writes at ~20 Hz
    const saying = npc.sayTimer > 0 && !!npc.say;
    if (sayEl.current) {
      sayEl.current.style.display = saying ? "block" : "none";
      if (saying && sayEl.current.textContent !== npc.say) sayEl.current.textContent = npc.say;
    }
    if (stateEl.current) {
      const txt = npc.state === "working" || npc.state === "washingDishes" ? "working…" : npc.state === "takingOrder" ? "taking order" : npc.carrying ? "delivering" : npc.box ? "restocking" : npc.state.startsWith("toDishes") ? "washing up" : "";
      if (stateEl.current.textContent !== txt) stateEl.current.textContent = txt;
    }
  });

  const carried = npc.carrying ? PRODUCTS[npc.carrying] : null;
  return (
    <group ref={group}>
      <Person colors={member.colors} outfit={NO_OUTFIT} apron={role?.apron ?? "#2d3436"}>
        {member.role === "headChef" && (
          <mesh position={[0, 1.86, 0]}>
            <cylinderGeometry args={[0.16, 0.19, 0.22, 12]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )}
        {(member.role === "cook" || member.role === "baker") && (
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )}
        {carried && (
          <group position={[0.28, 0.8, 0.2]}>
            {carried.station === "machine" || carried.station === "bingsu" ? (
              <mesh>
                <cylinderGeometry args={[0.04, 0.032, 0.11, 10]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ) : (
              <mesh>
                <boxGeometry args={[0.2, 0.05, 0.16]} />
                <meshStandardMaterial color="#f5f6fa" />
              </mesh>
            )}
          </group>
        )}
        {npc.box && (
          <mesh position={[0, 0.95, 0.38]}>
            <boxGeometry args={[0.5, 0.42, 0.42]} />
            <meshStandardMaterial color="#c89b63" />
          </mesh>
        )}
      </Person>
      <Html position={[0, 2.1, 0]} center zIndexRange={[5, 0]} distanceFactor={3.2} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-0.5">
          <div ref={sayEl} className="whitespace-nowrap rounded-xl bg-white/95 px-2.5 py-1 text-[12px] font-bold text-slate-800 shadow-lg" style={{ display: "none" }} />
          <div className="whitespace-nowrap rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            {role?.icon} {member.name} <span ref={stateEl} className="font-normal text-slate-300" />
          </div>
        </div>
      </Html>
    </group>
  );
}

export function StaffNpcs() {
  const npcs = useGame((s) => s.staffNpcs);
  const staff = useGame((s) => s.staff);
  return (
    <>
      {npcs.map((n) => {
        const m = staff.find((x) => x.id === n.id);
        return m ? <StaffMesh key={n.id} npc={n} member={m} /> : null;
      })}
    </>
  );
}
