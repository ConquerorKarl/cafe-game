import { useGame } from "@/game/store";
import { Scene } from "@/three/Scene";
import { HUD } from "@/ui/HUD";
import { ApplianceModal, BedModal, ComputerModal, HardwareModal, LivingModal, MartModal, PosModal } from "@/ui/Modals";
import { DaySummaryScreen, PauseOverlay, SeasonScreen, StartScreen } from "@/ui/Screens";
import { VirtualCursor } from "@/ui/VirtualCursor";

export default function App() {
  const phase = useGame((s) => s.phase);
  const modal = useGame((s) => s.modal);
  const pause = useGame((s) => s.pause);
  const locked = useGame((s) => s.locked);

  const showPause = phase === "playing" && modal === "none" && (pause !== "none" || !locked);

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 font-sans">
      <div className="absolute inset-0">
        <Scene />
      </div>

      {phase === "playing" && <HUD />}

      {phase === "playing" && modal === "computer" && <ComputerModal />}
      {phase === "playing" && modal === "mart" && <MartModal />}
      {phase === "playing" && modal === "hardware" && <HardwareModal />}
      {phase === "playing" && modal === "appliance" && <ApplianceModal />}
      {phase === "playing" && modal === "living" && <LivingModal />}
      {phase === "playing" && modal === "pos" && <PosModal />}
      {phase === "playing" && modal === "bed" && <BedModal />}

      {phase === "menu" && <StartScreen />}
      {phase === "summary" && <DaySummaryScreen />}
      {phase === "season" && <SeasonScreen />}
      {showPause && <PauseOverlay />}
      <VirtualCursor />
    </div>
  );
}
