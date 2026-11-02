import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { PRODUCTS } from "@/game/constants";
import { useInteractable } from "@/game/registry";
import { useGame } from "@/game/store";
import type { Customer } from "@/game/types";
import { Person } from "./primitives";

function CustomerMesh({ customer }: { customer: Customer }) {
  const group = useRef<THREE.Group>(null!);
  const sitting = useGame((s) => s.customers.find((c) => c.id === customer.id)?.state === "sitting");
  const umbrella = useRef<THREE.Group>(null!);
  const bar = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const sayEl = useRef<HTMLDivElement>(null);
  const orderEl = useRef<HTMLDivElement>(null);
  const target = useMemo(() => ({ kind: "customer" as const, id: customer.id }), [customer.id]);
  useInteractable(group, target);

  const frame = useRef(0);
  useFrame(() => {
    frame.current++;
    const g = group.current;
    if (!g) return;
    const c = customer;
    const uiTick = frame.current % 3 === 0; // DOM writes at ~20 Hz
    const bob = c.moving ? Math.abs(Math.sin(c.walkPhase)) * 0.05 : 0;
    g.position.set(c.pos.x, c.pos.y + bob, c.pos.z);
    g.rotation.y = c.yaw;
    // umbrellas only outside
    if (umbrella.current) umbrella.current.visible = c.pos.z > 5.3;
    if (uiTick) {
      if (bar.current) {
        const pct = Math.max(0, Math.min(1, c.patience / c.maxPatience));
        bar.current.style.width = `${pct * 100}%`;
        bar.current.style.background = pct > 0.5 ? "#2ecc71" : pct > 0.25 ? "#f39c12" : "#e74c3c";
      }
      const saying = c.sayTimer > 0 && !!c.say;
      if (sayEl.current) {
        sayEl.current.style.display = saying ? "block" : "none";
        if (saying && sayEl.current.textContent !== c.say) sayEl.current.textContent = c.say;
      }
      if (orderEl.current) orderEl.current.style.display = saying ? "none" : "block";
      if (bubble.current) {
        const hide = c.state === "entering" || ((c.state === "leaving" || c.state === "defecting" || (c.state === "toSeat" && !c.awaiting)) && !saying);
        bubble.current.style.opacity = hide ? "0" : "1";
      }
    }
  });

  const order = customer.order ? PRODUCTS[customer.order] : null;
  const showOrder = (customer.state === "queueing" || customer.state === "ordering" || customer.state === "waiting" || (customer.awaiting && (customer.state === "sitting" || customer.state === "toSeat"))) && order;
  const isFront = customer.state === "ordering" || customer.awaiting;

  return (
    <group ref={group} position={[customer.pos.x, 0, customer.pos.z]}>
      <Person colors={customer.colors} outfit={customer.outfit} scale={customer.kid ? 0.62 : 1} helmet={customer.rider ? "#2bb3c0" : undefined} sitting={sitting}>
        {customer.vip && (
          <group position={[0, sitting ? -0.33 : 0, 0]}>
            {customer.vip.look.glasses && (
              <mesh position={[0, 1.6, 0.17]}>
                <boxGeometry args={[0.26, 0.07, 0.04]} />
                <meshStandardMaterial color="#111" />
              </mesh>
            )}
            {customer.vip.look.hat === "cap" && (
              <>
                <mesh position={[0, 1.76, 0]}>
                  <sphereGeometry args={[0.21, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                  <meshStandardMaterial color="#1e1e1e" />
                </mesh>
                <mesh position={[0, 1.74, 0.22]}>
                  <boxGeometry args={[0.3, 0.02, 0.22]} />
                  <meshStandardMaterial color="#1e1e1e" />
                </mesh>
              </>
            )}
            {customer.vip.look.hat === "bucket" && (
              <mesh position={[0, 1.78, 0]}>
                <cylinderGeometry args={[0.3, 0.22, 0.2, 12]} />
                <meshStandardMaterial color="#f5f6fa" />
              </mesh>
            )}
            {customer.vip.look.hat === "beret" && (
              <mesh position={[0.05, 1.8, -0.02]} rotation={[0, 0, -0.25]}>
                <cylinderGeometry args={[0.24, 0.2, 0.08, 12]} />
                <meshStandardMaterial color="#c0392b" />
              </mesh>
            )}
          </group>
        )}
        {customer.name === "Camera" && (
          <mesh position={[0.1, 1.45, 0.3]}>
            <boxGeometry args={[0.2, 0.16, 0.3]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        )}
        {customer.hasItem && order && (
          <group position={sitting ? [0.28, 1.0, 0.32] : [0.28, 0.78, 0.12]}>
            {order.station === "display" ? (
              <mesh>
                <boxGeometry args={[0.14, 0.18, 0.08]} />
                <meshStandardMaterial color="#c89b63" />
              </mesh>
            ) : (
              <mesh>
                <cylinderGeometry args={[0.04, 0.032, 0.11, 10]} />
                <meshStandardMaterial color={customer.mode === "togo" ? "#f5f6fa" : "#ffffff"} />
              </mesh>
            )}
          </group>
        )}
        {customer.outfit.umbrella && (
          <group ref={umbrella} position={[0.3, 1.0, 0.1]}>
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 1.3, 6]} />
              <meshStandardMaterial color="#2d3436" />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <coneGeometry args={[0.55, 0.28, 10, 1, true]} />
              <meshStandardMaterial
                color={customer.outfit.umbrella}
                side={THREE.DoubleSide}
                transparent={customer.outfit.umbrella === "#f5f6fa"}
                opacity={customer.outfit.umbrella === "#f5f6fa" ? 0.55 : 1}
              />
            </mesh>
          </group>
        )}
      </Person>
      <Html position={[0, 2.15, 0]} center zIndexRange={[5, 0]} distanceFactor={3.2} style={{ pointerEvents: "none" }}>
        <div ref={bubble} style={{ transition: "opacity 0.3s" }}>
          <div ref={sayEl} className="rounded-xl bg-white/95 px-2.5 py-1 text-[12px] font-bold text-slate-800 shadow-lg whitespace-nowrap" style={{ display: "none" }}>
            {customer.say}
          </div>
          <div ref={orderEl}>
            {showOrder ? (
              <div className={`relative rounded-xl border-2 bg-white/95 px-2.5 py-1.5 text-center shadow-lg ${customer.vip ? "border-pink-500 ring-2 ring-pink-300" : isFront ? "border-amber-400" : "border-white/60"}`} style={{ minWidth: 92 }}>
                {customer.vip && <div className="text-[10px] font-black text-pink-600">🌟 {customer.vip.name}</div>}
                <div className="text-2xl leading-none">{order.icon}</div>
                <div className="mt-0.5 text-[11px] font-bold text-slate-800">{order.name}</div>
                <div className="text-[9px] font-semibold text-slate-500">{customer.vip ? "🌟 VIP · " : customer.crowd === "office" ? "🏢 office · " : customer.crowd === "student" ? "🎒 student · " : ""}{customer.awaiting ? "🧾 ordered · " : ""}{customer.rider ? "🛵 delivery" : customer.mode === "togo" ? "to-go" : "dine-in"}{customer.partySize >= 2 ? ` · party of ${customer.partySize}` : ""}{customer.kid ? " · kid" : ""}</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-200">
                  <div ref={bar} className="h-full" style={{ width: "100%", background: "#2ecc71" }} />
                </div>
                <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white/95" />
              </div>
            ) : customer.state === "sitting" ? (
              <div className="rounded-full bg-white/90 px-2 py-1 text-base shadow">{order?.icon ?? "☕"} {customer.partySize >= 2 ? "👥" : "😌"}</div>
            ) : customer.state === "browsing" ? (
              <div className="rounded-full bg-white/90 px-2 py-1 text-base shadow">🤔</div>
            ) : null}
          </div>
        </div>
      </Html>
    </group>
  );
}

export function Customers() {
  const customers = useGame((s) => s.customers);
  return (
    <>
      {customers.map((c) => (
        <CustomerMesh key={c.id} customer={c} />
      ))}
    </>
  );
}
