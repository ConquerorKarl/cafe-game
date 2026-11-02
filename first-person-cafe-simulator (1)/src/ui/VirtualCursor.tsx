import { useEffect, useRef, useState } from "react";
import { simState } from "@/game/registry";
import { useGame } from "@/game/store";

/**
 * While the pointer stays locked (so closing a menu never needs a re-grab click),
 * menus are driven by a virtual cursor: we track mouse deltas ourselves and
 * re-dispatch clicks / wheel to whatever is under the drawn cursor.
 */
let dispatching = false;

export function VirtualCursor() {
  const modal = useGame((s) => s.modal);
  const locked = useGame((s) => s.locked);
  const dragLook = useGame((s) => s.dragLook);
  const active = modal !== "none" && locked && !dragLook && !!document.pointerLockElement;
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [hover, setHover] = useState(false);
  const ref = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    if (!active) return;
    ref.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    setPos({ ...ref.current });
    const under = () => document.elementFromPoint(ref.current.x, ref.current.y) as HTMLElement | null;
    const onMove = (e: MouseEvent) => {
      ref.current.x = Math.max(0, Math.min(window.innerWidth - 1, ref.current.x + e.movementX));
      ref.current.y = Math.max(0, Math.min(window.innerHeight - 1, ref.current.y + e.movementY));
      simState.cursorX = ref.current.x;
      simState.cursorY = ref.current.y;
      setPos({ ...ref.current });
      const el = under();
      setHover(!!el?.closest("button, a, input, [role=button]"));
    };
    const onDown = (e: MouseEvent) => {
      if (dispatching) return;
      e.preventDefault();
      e.stopPropagation();
      const el = under();
      if (!el) return;
      dispatching = true;
      try {
        const init = { bubbles: true, cancelable: true, clientX: ref.current.x, clientY: ref.current.y, button: 0 } as MouseEventInit;
        el.dispatchEvent(new MouseEvent("mousedown", init));
        el.dispatchEvent(new MouseEvent("mouseup", init));
        el.dispatchEvent(new MouseEvent("click", init));
        if (el instanceof HTMLInputElement) el.focus();
      } finally {
        dispatching = false;
      }
    };
    const swallow = (e: MouseEvent) => {
      if (dispatching) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onWheel = (e: WheelEvent) => {
      let el: HTMLElement | null = under();
      while (el) {
        const style = getComputedStyle(el);
        if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
          el.scrollTop += e.deltaY;
          break;
        }
        el = el.parentElement;
      }
    };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("mouseup", swallow, true);
    document.addEventListener("click", swallow, true);
    document.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("mouseup", swallow, true);
      document.removeEventListener("click", swallow, true);
      document.removeEventListener("wheel", onWheel);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed z-[100]" style={{ left: pos.x, top: pos.y }}>
      <svg width="26" height="30" viewBox="0 0 26 30" className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]" style={{ transform: hover ? "scale(1.1)" : "scale(1)" }}>
        <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill={hover ? "#fbbf24" : "#ffffff"} stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
