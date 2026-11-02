import { useEffect, useMemo } from "react";
import "@react-three/fiber";
import { WEATHERS } from "@/game/calendar";
import { COMPETITOR_MAP } from "@/game/constants";
import { addCollider } from "@/game/registry";
import { useGame } from "@/game/store";
import { CafeBuilding } from "./CafeBuilding";
import { ApplianceInterior, BarInterior, BeautyInterior, BunsikInterior, ChickenInterior, CinemaInterior, ConvenienceInterior, GamesInterior, GigaInterior, GymInterior, HardwareInterior, HaruInterior, HostelInterior, LaundryInterior, LivingInterior, MallInterior, MartInterior, NoraebangInterior, PhotoInterior, PoliceInterior, RecordInterior, StarbeansInterior, SubwayInterior } from "./Interiors";
import { KBuilding } from "./KBuilding";
import { OfficeTower } from "./Office";
import { StreetLife } from "./StreetLife";
import { Pedestrians } from "./Pedestrians";
import { Bench, Bollard, FoodCart, LampPost, Planter, Scooter, StreetTree, TrashCan, UtilityPole, Wire, useSeason, useSnowCover } from "./Props";
import { NightLight, NightMaterial, SolidBox, TextPlane } from "./primitives";
import { tex } from "./textures";
import { BeerCrates, Lanterns, PatrolCar, StandingNpc } from "./Vignettes";

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------
function GroundPlane({ position, size, kind, rx, ry }: { position: [number, number, number]; size: [number, number]; kind: "asphalt" | "paving" | "tiles" | "plaza"; rx: number; ry: number }) {
  const snow = useSnowCover();
  const wet = useGame((s) => !!WEATHERS[s.weather].wet);
  const map = snow ? tex.snow(rx, ry) : kind === "asphalt" ? tex.asphalt(rx, ry) : kind === "paving" ? tex.paving(rx, ry) : kind === "plaza" ? tex.tiles(rx, ry, "#cfc5b8") : tex.tiles(rx, ry, "#d8cfc0");
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} color={wet && !snow ? "#8a8f96" : "#ffffff"} roughness={wet && !snow ? 0.3 : 1} metalness={wet && !snow ? 0.15 : 0} />
    </mesh>
  );
}

function Ground() {
  return (
    <group>
      <GroundPlane position={[0, -0.02, 10]} size={[160, 120]} kind="asphalt" rx={50} ry={40} />
      {/* north sidewalk, pedestrian street, south sidewalk */}
      <GroundPlane position={[-14, 0.012, 6.5]} size={[52, 4]} kind="paving" rx={26} ry={2} />
      <GroundPlane position={[-14, 0.01, 11.25]} size={[52, 5.5]} kind="tiles" rx={26} ry={2.75} />
      <GroundPlane position={[-14, 0.012, 16.2]} size={[52, 4.4]} kind="paving" rx={26} ry={2.2} />
      {/* plaza */}
      <GroundPlane position={[28, 0.011, 14]} size={[32, 32]} kind="plaza" rx={16} ry={16} />
      {/* plaza centre medallion */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[28, 0.02, 14]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#b9a89a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[28, 0.025, 14]}>
        <ringGeometry args={[3.6, 4.0, 32]} />
        <meshStandardMaterial color="#e8dcc8" />
      </mesh>
      {/* crossings */}
      {[-30, -14, 2].map((x) =>
        Array.from({ length: 7 }).map((_, i) => (
          <mesh key={`${x}${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x - 1.5 + i * 0.5, 0.013, 11.25]}>
            <planeGeometry args={[0.3, 5.4]} />
            <meshStandardMaterial color="#e8e2c8" />
          </mesh>
        ))
      )}
      {/* curbs */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14, 0.014, 8.5]}>
        <planeGeometry args={[52, 0.15]} />
        <meshStandardMaterial color="#b8b2a8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14, 0.014, 14]}>
        <planeGeometry args={[52, 0.15]} />
        <meshStandardMaterial color="#b8b2a8" />
      </mesh>
    </group>
  );
}

function Boundary() {
  useEffect(() => {
    const cleanups = [
      addCollider({ minX: -60, maxX: 60, minZ: 46, maxZ: 80, minY: -10, maxY: 50 }),
      addCollider({ minX: -60, maxX: 60, minZ: -40, maxZ: -16, minY: -10, maxY: 50 }),
      addCollider({ minX: 50, maxX: 80, minZ: -40, maxZ: 80, minY: -10, maxY: 50 }),
      addCollider({ minX: -80, maxX: -42, minZ: -40, maxZ: 80, minY: -10, maxY: 50 }),
    ];
    return () => cleanups.forEach((f) => f());
  }, []);
  return null;
}

// ---------------------------------------------------------------------------
// Plaza decorations
// ---------------------------------------------------------------------------
function Plaza() {
  const season = useSeason();
  return (
    <group>
      {/* sculpture */}
      <group position={[28, 0, 14]}>
        <SolidBox position={[0, 0.4, 0]} size={[2.2, 0.8, 2.2]} color="#9e978f" />
        <mesh position={[0, 2.4, 0]} rotation={[0, 0.6, 0.3]} castShadow>
          <torusKnotGeometry args={[0.9, 0.28, 80, 12]} />
          <meshStandardMaterial color="#e84393" metalness={0.6} roughness={0.3} />
        </mesh>
        <TextPlane lines={["HONGDAE 홍대"]} width={2.0} height={0.5} bg="#9e978f" color="#2d2d2d" position={[0, 0.4, 1.11]} />
        <NightLight position={[0, 3.5, 0]} intensity={12} distance={10} color="#ff9bd0" />
      </group>
      {/* benches & bins */}
      <Bench position={[20, 0, 10]} rotation={Math.PI / 2} />
      <Bench position={[36, 0, 10]} rotation={-Math.PI / 2} />
      <Bench position={[20, 0, 20]} rotation={Math.PI / 2} />
      <Bench position={[36, 0, 20]} rotation={-Math.PI / 2} />
      <TrashCan position={[21, 0, 8.4]} />
      <TrashCan position={[35, 0, 21.6]} />
      {/* trees around the plaza */}
      {[[18, 4], [38, 4], [18, 24], [38, 24], [24, 6], [32, 6], [24, 22], [32, 22]].map(([x, z], i) => (
        <StreetTree key={i} position={[x, 0, z]} kind={i % 2 ? "cherry" : "ginkgo"} scale={1.1} />
      ))}
      <Planter position={[22, 0, 14]} season={season} />
      <Planter position={[34, 0, 14]} season={season} />
      {season === "winter" && <FoodCart position={[16.5, 0, 24]} />}
      {/* festival banner */}
      <group position={[28, 0, 2.2]}>
        {[-6, 6].map((x) => (
          <mesh key={x} position={[x, 2.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 4.4, 6]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
        ))}
        <TextPlane
          lines={[season === "spring" ? "🌸 홍대 벚꽃 축제 Cherry Blossom Festival 🌸" : season === "summer" ? "☀️ 홍대 여름 버스킹 페스티벌 ☀️" : season === "autumn" ? "🍂 홍대 프리마켓 Free Market 🍂" : "❄️ 홍대 크리스마스 마켓 ❄️"]}
          width={11.6}
          height={1.0}
          bg={season === "spring" ? "#ff8fab" : season === "summer" ? "#00b894" : season === "autumn" ? "#e17055" : "#c0392b"}
          color="#ffffff"
          lit
          position={[0, 3.6, 0]}
        />
      </group>
      {/* busker */}
      <group position={[31, 0, 18]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.5, 1.2, 0.4]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0.8, 0.21]}>
          <circleGeometry args={[0.16, 12]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0.6, 0.9, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.8, 6]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <NightLight position={[0, 2.5, 0]} intensity={8} distance={6} color="#ffd9a0" />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// The street
// ---------------------------------------------------------------------------
export function World() {
  const season = useSeason();
  const snow = useSnowCover();
  const giga = COMPETITOR_MAP.giga;
  const star = COMPETITOR_MAP.starbeans;
  const haru = COMPETITOR_MAP.haru;
  const poleXs = useMemo(() => [-36, -24, -12, 0, 10], []);

  return (
    <group>
      <Ground />
      <Boundary />

      {/* ---------------- north row (our side), fronts at z = 4.5 ---------------- */}
      <KBuilding position={haru.position} width={haru.width} depth={12} floors={4} wall="tiles" wallColor="#f6e4ea" seed={5} competitorId={haru.id}
        shop={{ name: haru.name, kr: haru.kr, bg: haru.color, color: haru.textColor, glow: "#ffd1e3" }}
        signs={[{ text: "딸기 케이크 맛집 🍓", bg: "#fff0f5", color: "#c2185b", floor: 2, side: "full" }, { text: "네일아트 NAIL", bg: "#ff7eb3", color: "#ffffff", floor: 3, side: "left" }, { text: "타로 · 사주", bg: "#f5f6fa", color: "#2d3436", floor: 3, side: "right" }]}
        verticalSign={{ text: "하루", bg: haru.color, color: haru.textColor }} acUnits={1}
        interior={{ floors: 1, floor: "tiles", wallColor: "#fff0f5", children: <HaruInterior depth={12} /> }} />
      <KBuilding position={[-28, -1.5]} width={7} depth={12} floors={6} wall="concrete" wallColor="#8d8781" seed={3}
        shop={{ name: "Hongdae Noraebang", kr: "홍대 노래방 24시", bg: "#6c2bd9", color: "#ffd6ff", neon: true, glow: "#c77dff" }}
        interior={{ floors: 1, floor: "concrete", wallColor: "#2b1a4a", children: <NoraebangInterior depth={12} width={7} /> }}
        signs={[{ text: "헬스 FITNESS 24H", bg: "#1e272e", color: "#f9ca24", floor: 2, side: "full" }, { text: "피부과 Derma", bg: "#f5f6fa", color: "#1e8449", floor: 3, side: "left" }, { text: "보드게임카페", bg: "#f39c12", color: "#2d2d2d", floor: 3, side: "right" }, { text: "스터디카페 STUDY", bg: "#2980b9", color: "#ffffff", floor: 4, side: "full" }, { text: "영어학원 ENGLISH", bg: "#ffffff", color: "#c0392b", floor: 5, side: "full" }]}
        verticalSign={{ text: "노래방", bg: "#6c2bd9", color: "#ffffff", neon: true }} led balconies={3} roofLife />
      <KBuilding position={[-21, -1.5]} width={7} depth={12} floors={4} wall="tiles" wallColor="#dfe9d8" seed={6}
        shop={{ name: "Minji's Mart", kr: "민지네 마트", bg: "#2f5d2e", color: "#f7f4d8", glow: "#ffffff" }}
        signs={[{ text: "코인노래방 ₩500", bg: "#e84393", color: "#ffffff", floor: 2, side: "full", neon: true }, { text: "치과 DENTAL", bg: "#ffffff", color: "#0984e3", floor: 3, side: "full" }]}
        verticalSign={{ text: "마트", bg: "#2f5d2e", color: "#f7f4d8" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#eef3ea", children: <MartInterior depth={12} /> }} />
      <KBuilding position={[-14, -1.5]} width={7} depth={12} floors={5} wall="brickRed" wallColor="#9c4a3a" seed={4}
        shop={{ name: "Hongdae Chicken & Beer", kr: "홍대 치킨 & 맥주", bg: "#c0392b", color: "#fff3b0", glow: "#ffb366" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#5a2a1a", children: <ChickenInterior depth={12} width={7} /> }}
        signs={[{ text: "당구장 BILLIARDS", bg: "#27ae60", color: "#ffffff", floor: 2, side: "full" }, { text: "안경 OPTICAL", bg: "#1e272e", color: "#ffffff", floor: 3, side: "left" }, { text: "미용실 HAIR", bg: "#f5f6fa", color: "#2d3436", floor: 3, side: "right" }, { text: "게스트하우스", bg: "#0984e3", color: "#ffffff", floor: 4, side: "full" }]}
        verticalSign={{ text: "치킨", bg: "#c0392b", color: "#fff3b0" }} sideDoor="입구 2F↑" balconies={2} />
      <CafeBuilding />

      {/* ---------------- plaza north row, fronts at z = -2 ---------------- */}
      <KBuilding position={[18, -8]} width={12} depth={12} floors={5} wall="glass" seed={7}
        shop={{ name: "Café Appliance Center", kr: "카페기기 전문점", bg: "#0a3d62", color: "#48dbfb", glow: "#48dbfb" }}
        signs={[{ text: "부동산 REALTY", bg: "#ffffff", color: "#27ae60", floor: 2, side: "left" }, { text: "회계사무소", bg: "#dfe6e9", color: "#2d3436", floor: 2, side: "right" }, { text: "성형외과 CLINIC", bg: "#ffffff", color: "#6c5ce7", floor: 3, side: "full" }]}
        verticalSign={{ text: "카페기기", bg: "#0a3d62", color: "#48dbfb" }}
        interior={{ floors: 1, floor: "concrete", wallColor: "#e9eef2", children: <ApplianceInterior depth={12} /> }} />
      <OfficeTower position={[34, -9]} />

      {/* ---------------- plaza east (fronts at x = 44) ---------------- */}
      <KBuilding position={[50, -20]} facing="W" width={12} depth={12} floors={9} wall="concrete" wallColor="#cfd6dd" seed={8}
        shop={{ name: "Joy Games", kr: "조이게임 · 레트로 게임샵", bg: "#2d3436", color: "#55efc4", neon: true, glow: "#55efc4" }}
        interior={{ floors: 1, floor: "concrete", wallColor: "#2b2f3a", children: <GamesInterior depth={12} width={12} /> }}
        signs={[{ text: "PC방 기가 24H", bg: "#0a3d62", color: "#48dbfb", floor: 2, side: "full", neon: true }, { text: "요가 YOGA", bg: "#55efc4", color: "#2d3436", floor: 3, side: "left" }, { text: "댄스 DANCE", bg: "#e84393", color: "#ffffff", floor: 3, side: "right", neon: true }]}
        verticalSign={{ text: "게임", bg: "#2d3436", color: "#55efc4", neon: true }} led balconies={3} roofLife />
      <KBuilding position={[50, -8]} facing="W" width={12} depth={12} floors={6} wall="glass" seed={23}
        shop={{ name: "Muscle Factory Gym 24H", kr: "머슬팩토리 헬스클럽", bg: "#111", color: "#ffeaa7", glow: "#ffeaa7", interior: "#1e272e" }}
        interior={{ floors: 1, floor: "concrete", wallColor: "#23272e", children: <GymInterior depth={12} width={12} /> }}
        signs={[{ text: "필라테스 PILATES", bg: "#fd79a8", color: "#ffffff", floor: 2, side: "left" }, { text: "복싱 BOXING", bg: "#c0392b", color: "#ffffff", floor: 2, side: "right" }, { text: "물리치료 CLINIC", bg: "#ffffff", color: "#0984e3", floor: 3, side: "full" }]}
        verticalSign={{ text: "헬스", bg: "#111", color: "#ffeaa7", neon: true }} balconies={2} />
      <KBuilding position={[50, 4]} facing="W" width={12} depth={12} floors={7} wall="concrete" wallColor="#e8e4dc" seed={12}
        shop={{ name: "QU 24h Convenience", kr: "큐유 편의점", bg: "#8e44ad", color: "#ffffff", glow: "#ffffff" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#eef0f2", children: <ConvenienceInterior depth={12} width={12} /> }}
        signs={[{ text: "오피스텔 임대", bg: "#f39c12", color: "#2d2d2d", floor: 2, side: "full" }, { text: "피아노학원", bg: "#ffffff", color: "#2d3436", floor: 3, side: "full" }]}
        billboard={{ lines: ["KAKAO FRIENDS", "홍대점 OPEN"], bg: "#fee500", color: "#2d2d2d" }} sideDoor="오피스텔 입구" balconies={3} />
      <KBuilding position={[50, 16]} facing="W" width={12} depth={12} floors={5} wall="brickGrey" wallColor="#8a8580" seed={13}
        shop={{ name: "Vinyl & Coffee Records", kr: "바이닐 레코드", bg: "#2d3436", color: "#f9ca24", glow: "#ffe3a0" }}
        interior={{ floors: 1, floor: "wood", wallColor: "#3d3d3d", children: <RecordInterior depth={12} width={12} /> }}
        signs={[{ text: "라이브클럽 LIVE CLUB", bg: "#111", color: "#ff4d6d", floor: 2, side: "full", neon: true }, { text: "실용음악학원", bg: "#0984e3", color: "#ffffff", floor: 3, side: "full" }]}
        verticalSign={{ text: "LIVE", bg: "#111", color: "#ff4d6d", neon: true }} led />
      <KBuilding position={[50, 28]} facing="W" width={12} depth={12} floors={8} wall="glass" seed={14}
        shop={{ name: "Hongdae Hostel", kr: "홍대 호스텔", bg: "#0984e3", color: "#ffffff", glow: "#dfe6e9" }}
        interior={{ floors: 1, floor: "concrete", wallColor: "#e8e4dc", children: <HostelInterior depth={12} width={12} /> }}
        signs={[{ text: "루프탑바 ROOFTOP", bg: "#111", color: "#f9ca24", floor: 2, side: "full", neon: true }, { text: "사진관 PHOTO", bg: "#ffffff", color: "#e84393", floor: 3, side: "full" }]}
        billboard={{ lines: ["🍺 CASS FRESH", "오늘 밤, 홍대에서"], bg: "#0b3d91", color: "#ffffff" }} balconies={3} roofLife />
      <KBuilding position={[50, 40]} facing="W" width={12} depth={12} floors={4} wall="brickRed" wallColor="#9c4a3a" seed={24}
        shop={{ name: "Hongdae Pocha", kr: "홍대 포차 · 소주 · 생맥주", bg: "#111", color: "#ff7675", neon: true, glow: "#ff6b6b", interior: "#3a1a1a" }}
        interior={{ floors: 1, floor: "wood", wallColor: "#3a1a1a", children: <BarInterior depth={12} width={12} /> }}
        signs={[{ text: "노래주점 2F", bg: "#6c2bd9", color: "#ffd6ff", floor: 2, side: "full", neon: true }, { text: "당구장 BILLIARDS", bg: "#27ae60", color: "#ffffff", floor: 3, side: "full" }]}
        verticalSign={{ text: "포차", bg: "#111", color: "#ff7675", neon: true }} balconies={2} />

      {/* ---------------- plaza south row, fronts at z = 30 ---------------- */}
      <KBuilding position={[-2, 36]} facing="N" width={10} depth={12} floors={3} wall="tiles" wallColor="#e8eef5" seed={11}
        shop={{ name: "Hongdae Police Substation", kr: "마포경찰서 홍대지구대", bg: "#1e3a8a", color: "#ffffff", glow: "#dfe6e9" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#e4e9f0", children: <PoliceInterior depth={12} width={10} /> }}
        signs={[{ text: "POLICE · 경찰 · 112", bg: "#f5f6fa", color: "#1e3a8a", floor: 2, side: "full" }, { text: "국민과 함께하는 안전한 홍대", bg: "#1e3a8a", color: "#ffffff", floor: 3, side: "full" }]}
        verticalSign={{ text: "경찰", bg: "#1e3a8a", color: "#ffffff" }} acUnits={1} />
      <KBuilding position={[8, 36]} facing="N" width={10} depth={12} floors={3} wall="tiles" wallColor="#f1ebe1" seed={25}
        shop={{ name: "Dalgona Living", kr: "달고나 리빙 · 홈데코", bg: "#f1ebe1", color: "#8a4b1e", glow: "#ffe3c4" }}
        signs={[{ text: "인테리어 소품 · 조명 · 가구", bg: "#e8a7a0", color: "#4a2030", floor: 2, side: "full" }, { text: "플라워 클래스 3F", bg: "#b7c4a8", color: "#2d3436", floor: 3, side: "full" }]}
        verticalSign={{ text: "리빙", bg: "#f1ebe1", color: "#8a4b1e" }} acUnits={1} balconies={1}
        interior={{ floors: 1, floor: "wood", wallColor: "#f7f1e8", children: <LivingInterior depth={12} width={10} /> }} />
      <KBuilding position={star.position} facing="N" width={star.width} depth={12} floors={4} wall="brickGrey" wallColor="#7d7a76" seed={10} competitorId={star.id}
        shop={{ name: star.name, kr: star.kr, bg: star.color, color: star.textColor, glow: "#d5f5e3" }}
        signs={[{ text: "★ STARBEANS RESERVE · 2F LOUNGE", bg: "#0e3b22", color: "#d4af37", floor: 3, side: "full" }]}
        verticalSign={{ text: "스타빈스", bg: star.color, color: star.textColor }} acUnits={3}
        interior={{ floors: 2, floor: "wood", wallColor: "#e7e2d6", children: <StarbeansInterior depth={12} width={star.width} /> }} />
      <KBuilding position={[31, 36]} facing="N" width={10} depth={12} floors={4} wall="concrete" wallColor="#f7f1e3" seed={15}
        shop={{ name: "Life 4 Cuts Photo", kr: "셀프 사진관 인생네컷", bg: "#ffffff", color: "#e84393", glow: "#ffffff" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#fff0f5", children: <PhotoInterior depth={12} width={10} /> }}
        signs={[{ text: "옷가게 CLOTHING", bg: "#2d3436", color: "#ffffff", floor: 2, side: "full" }, { text: "네컷 PHOTO", bg: "#ff7eb3", color: "#ffffff", floor: 3, side: "full" }]} acUnits={1} />
      <KBuilding position={[40, 36]} facing="N" width={8} depth={12} floors={7} wall="concrete" wallColor="#d9d4c8" seed={16}
        shop={{ name: "Bunsik Alley", kr: "분식골목 떡볶이 · 김밥", bg: "#e74c3c", color: "#fff5d6", glow: "#ffb366" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#fff5d6", children: <BunsikInterior depth={12} width={8} /> }}
        signs={[{ text: "순대국 24시", bg: "#f5f6fa", color: "#c0392b", floor: 2, side: "full" }, { text: "노래연습장", bg: "#6c2bd9", color: "#ffd6ff", floor: 3, side: "full", neon: true }]}
        verticalSign={{ text: "분식", bg: "#e74c3c", color: "#fff5d6" }} sideDoor="입구" balconies={3} roofLife />

      {/* ---------------- street south row, fronts at z = 18 ---------------- */}
      <KBuilding position={[-36, 24]} facing="N" width={8} depth={12} floors={4} wall="brickGrey" wallColor="#8a8580" seed={17}
        shop={{ name: "Hongdae Hardware", kr: "홍대 철물점 · 가구", bg: "#5a3a26", color: "#ffe9c7", glow: "#ffe3a0" }}
        signs={[{ text: "인테리어 INTERIOR", bg: "#e17055", color: "#ffffff", floor: 2, side: "full" }, { text: "열쇠 · 도장", bg: "#f9ca24", color: "#2d2d2d", floor: 3, side: "full" }]}
        verticalSign={{ text: "철물점", bg: "#5a3a26", color: "#ffe9c7" }} balconies={2}
        interior={{ floors: 1, floor: "concrete", wallColor: "#ece6da", children: <HardwareInterior depth={12} /> }} />
      <KBuilding position={giga.position} facing="N" width={giga.width} depth={12} floors={5} wall="concrete" wallColor="#efe9df" seed={9} competitorId={giga.id}
        shop={{ name: giga.name, kr: giga.kr, bg: giga.color, color: giga.textColor, glow: "#fff1a8" }}
        signs={[{ text: "아이스 아메리카노 ₩2,000", bg: "#2d3436", color: "#f9ca24", floor: 2, side: "full" }, { text: "학원 ACADEMY", bg: "#0984e3", color: "#ffffff", floor: 3, side: "full" }, { text: "사무실 OFFICE", bg: "#dfe6e9", color: "#2d3436", floor: 4, side: "full" }]}
        verticalSign={{ text: "기가", bg: giga.color, color: giga.textColor }} balconies={2} roofLife
        interior={{ floors: 1, floor: "tiles", wallColor: "#fff8dc", children: <GigaInterior depth={12} /> }} />
      <KBuilding position={[-17, 24]} facing="N" width={10} depth={12} floors={6} wall="tiles" wallColor="#dfe9f3" seed={18}
        shop={{ name: "Clean Topia Coin Laundry 24H", kr: "크린토피아 코인빨래방", bg: "#0984e3", color: "#ffffff", glow: "#ffffff", interior: "#e8f1fa" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#e8f1fa", children: <LaundryInterior depth={12} width={10} /> }}
        signs={[{ text: "김밥천국 2F", bg: "#f39c12", color: "#2d2d2d", floor: 2, side: "full" }, { text: "수학학원 MATH", bg: "#ffffff", color: "#c0392b", floor: 3, side: "left" }, { text: "법무사", bg: "#dfe6e9", color: "#2d3436", floor: 3, side: "right" }]}
        verticalSign={{ text: "빨래방", bg: "#0984e3", color: "#ffffff" }} led sideDoor="원룸 입구" balconies={3} />
      <KBuilding position={[-6, 24]} facing="N" width={12} depth={12} floors={8} wall="glass" seed={19}
        shop={{ name: "Olive Young", kr: "올리브영 홍대점", bg: "#9bc53d", color: "#ffffff", glow: "#ffffff" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#f7f7f4", children: <BeautyInterior depth={12} width={12} /> }}
        signs={[{ text: "성형외과 PLASTIC", bg: "#ffffff", color: "#6c5ce7", floor: 2, side: "full" }, { text: "치과 DENTAL", bg: "#ffffff", color: "#0984e3", floor: 3, side: "full" }]}
        billboard={{ lines: ["HONGDAE", "걷고싶은 거리"], bg: "#e84393", color: "#ffffff", neon: true }} sideDoor="입구 2F↑" balconies={3} />
      <KBuilding position={[6, 24]} facing="N" width={12} depth={12} floors={6} wall="concrete" wallColor="#2d3436" seed={20}
        shop={{ name: "HONGBOX CINEMA", kr: "홍박스 영화관 · 4DX", bg: "#111", color: "#ffd166", neon: true, glow: "#ffd166", interior: "#1a1416" }}
        interior={{ floors: 1, floor: "concrete", wallColor: "#2a1f22", children: <CinemaInterior depth={12} width={12} /> }}
        marquee={{ lines: ["NOW SHOWING · 상영중", "기생충 2 · 서울의 밤 · LOVE IN HONGDAE"], bg: "#111", color: "#ffd166" }}
        signs={[{ text: "만화카페 COMICS", bg: "#fdcb6e", color: "#2d2d2d", floor: 3, side: "full" }]} led balconies={2} roofLife />

      {/* ---------------- west end block (subway exit) ---------------- */}
      <KBuilding position={[-46, 1]} facing="E" width={18} depth={12} floors={10} wall="glass" seed={21}
        shop={{ name: "Hongik Univ. Station Exit 9", kr: "홍대입구역 9번 출구", bg: "#00a84d", color: "#ffffff", glow: "#ffffff" }}
        interior={{ floors: 1, floor: "tiles", wallColor: "#d8dde3", children: <SubwayInterior depth={12} width={18} /> }}
        billboard={{ lines: ["SEOUL", "MY SOUL"], bg: "#1428a0", color: "#ffffff" }} />
      <KBuilding position={[-46, 21]} facing="E" width={22} depth={12} floors={12} wall="concrete" wallColor="#c7c2b6" seed={22}
        shop={{ name: "AK& Hongdae", kr: "AK& 홍대 쇼핑몰", bg: "#111", color: "#ffffff", glow: "#ffffff" }} led
        interior={{ floors: 1, floor: "tiles", wallColor: "#f0f0f0", children: <MallInterior depth={12} width={22} /> }}
        billboard={{ lines: ["MUSINSA", "무신사 스탠다드"], bg: "#111", color: "#ffffff" }} />

      {/* back blocks (skyline fill) */}
      {[-34, -14, 6, 26, 46].map((x, i) => (
        <KBuilding key={`b${x}`} position={[x, -22]} width={16} depth={14} floors={9 + (i % 3) * 3} wall="concrete" wallColor={["#d9d4c8", "#c9cfd6", "#e2d8c8", "#cfcfcf", "#bfc5cc"][i]} seed={30 + i} acUnits={0} lit={0.5} far />
      ))}
      {[-30, -6, 18, 42].map((x, i) => (
        <KBuilding key={`s${x}`} position={[x, 50]} width={18} depth={14} floors={10 + (i % 2) * 4} wall="concrete" wallColor={["#cfd6dd", "#d9d4c8", "#c9cfd6", "#e2d8c8"][i]} seed={40 + i} acUnits={0} lit={0.5} far />
      ))}
      {[-4, 16, 36].map((x, i) => (
        <KBuilding key={`e${x}`} position={[64, x]} width={14} depth={16} floors={12 + i * 2} wall="glass" seed={50 + i} acUnits={0} lit={0.5} far />
      ))}

      {/* ---------------- street furniture ---------------- */}
      {[-34, -26, -18, -10, -2, 6].map((x) => (
        <Planter key={`m${x}`} position={[x, 0, 11.25]} season={season} />
      ))}
      {[-30, -14, 2].map((x) => (
        <StreetTree key={`mt${x}`} position={[x + 4, 0, 11.25]} kind="ginkgo" scale={0.9} />
      ))}
      {[-38, -22, -6, 8].map((x) => (
        <StreetTree key={`n${x}`} position={[x, 0, 7.6]} kind="ginkgo" />
      ))}
      {[-34, -20, -2, 10].map((x) => (
        <StreetTree key={`s${x}`} position={[x, 0, 15]} kind={Math.abs(x) < 10 ? "cherry" : "maple"} />
      ))}
      {[-36, -24, -12, 0, 10].map((x) => (
        <LampPost key={`l${x}`} position={[x, 0, 8.3]} light={x > -30} />
      ))}
      {[-30, -18, -6, 6].map((x) => (
        <group key={`ls${x}`} position={[x, 0, 14.2]} rotation={[0, Math.PI, 0]}>
          <LampPost position={[0, 0, 0]} light={x > -20} />
        </group>
      ))}
      {[16, 40].flatMap((x) => [4, 24].map((z) => <LampPost key={`pl${x}${z}`} position={[x, 0, z]} light />))}
      {poleXs.map((x) => (
        <UtilityPole key={`u${x}`} position={[x, 0, 14.6]} />
      ))}
      {poleXs.slice(0, -1).map((x, i) => {
        const nx = poleXs[i + 1];
        return (
          <group key={`w${x}`}>
            <Wire from={[x - 0.7, 8.2, 14.6]} to={[nx - 0.7, 8.2, 14.6]} sag={0.7} />
            <Wire from={[x + 0.7, 8.2, 14.6]} to={[nx + 0.7, 8.2, 14.6]} sag={0.9} />
            <Wire from={[x - 0.7, 7.4, 14.6]} to={[nx - 0.7, 7.4, 14.6]} sag={0.6} />
          </group>
        );
      })}
      <Wire from={[-12, 8.2, 14.6]} to={[-10, 5.6, 4.8]} sag={0.4} />
      <Wire from={[0, 8.2, 14.6]} to={[2, 4.2, 4.8]} sag={0.4} />
      <Wire from={[-24, 8.2, 14.6]} to={[-26, 6.0, 4.8]} sag={0.4} />
      {Array.from({ length: 12 }).map((_, i) => (
        <Bollard key={`b${i}`} position={[-38 + i * 4.2, 0, 8.9]} />
      ))}
      <Scooter position={[13.5, 0, 6.0]} rotation={0.2} color="#e74c3c" />
      <Scooter position={[14.6, 0, 6.0]} rotation={0.1} color="#2d98da" />
      <Scooter position={[-15.5, 0, 16.4]} rotation={Math.PI + 0.2} color="#f1c40f" />
      <TrashCan position={[-16, 0, 5.9]} />
      <TrashCan position={[-20, 0, 16.6]} />
      {/* A-board outside Giga */}
      <group position={[-29.5, 0, 17.0]} rotation={[0, Math.PI + 0.3, 0]}>
        <mesh position={[0, 0.5, 0]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.6, 1.0, 0.03]} />
          <meshStandardMaterial color="#2d3436" />
        </mesh>
        <TextPlane lines={["아아 ₩2,000", "라떼 ₩2,900"]} width={0.56} height={0.9} bg="#f9ca24" color="#2d2d2d" position={[0, 0.5, 0.02]} rotation={[0.25, 0, 0]} />
      </group>
      {/* banners strung across the street */}
      <group position={[-20, 4.6, 11.25]}>
        <TextPlane lines={["홍대 걷고싶은 거리 · HONGDAE WALKING STREET"]} width={8} height={0.9} bg="#e84393" color="#ffffff" lit position={[0, 0, 0]} />
        <TextPlane lines={["홍대 걷고싶은 거리 · HONGDAE WALKING STREET"]} width={8} height={0.9} bg="#e84393" color="#ffffff" lit position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]} />
      </group>
      {snow &&
        [-30, -14, 2, 18, 34].map((x) => (
          <mesh key={`sp${x}`} position={[x, 0.1, 8.7]}>
            <sphereGeometry args={[0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color="#f4f7fb" />
          </mesh>
        ))}
      {/* subway exit canopy */}
      <group position={[-37, 0, 11.25]}>
        <SolidBox position={[0, 0.5, 0]} size={[2.2, 1.0, 4]} color="#8d8680" />
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[2.8, 0.15, 4.6]} />
          <meshStandardMaterial color="#00a84d" />
        </mesh>
        {[-1.2, 1.2].flatMap((x) => [-2, 2].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.8, z]}>
            <cylinderGeometry args={[0.05, 0.05, 1.6, 6]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
        )))}
        <TextPlane lines={["홍대입구 9"]} width={1.4} height={0.5} bg="#00a84d" color="#ffffff" lit position={[0, 2.2, 2.31]} />
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[1.8, 0.02, 3.6]} />
          <NightMaterial color="#555" emissive="#ffd9a0" k={1.5} />
        </mesh>
      </group>

      {/* ---------------- life outside the venues ---------------- */}
      <PatrolCar position={[-6.4, 0, 29.0]} rotation={Math.PI / 2 + 0.08} />
      <StandingNpc position={[-3.6, 0, 29.4]} yaw={0} colors={{ shirt: "#1e3a5f", pants: "#1e3a5f", skin: "#f1c27d", hair: "#1c1c1c" }} prop="phone" />
      <StandingNpc position={[45.2, 0, 39.2]} yaw={-Math.PI / 2 + 0.4} colors={{ shirt: "#2d3436", pants: "#2d3436", skin: "#e8b98a", hair: "#2b1b17" }} prop="cigarette" />
      <StandingNpc position={[45.0, 0, 42.6]} yaw={-Math.PI / 2 - 0.3} colors={{ shirt: "#e84393", pants: "#2d3436", skin: "#ffdbac", hair: "#5b3a8a" }} prop="phone" />
      <BeerCrates position={[44.9, 0, 35.6]} />
      <Lanterns from={[44.6, 34.6]} to={[44.6, 45.4]} y={3.4} count={6} />
      <StandingNpc position={[-13.2, 0, 17.4]} yaw={Math.PI} colors={{ shirt: "#a29bfe", pants: "#636e72", skin: "#ffdbac", hair: "#2b1b17" }} prop="laundry" />
      <StandingNpc position={[2.2, 0, 17.2]} yaw={Math.PI} colors={{ shirt: "#dfe6e9", pants: "#2d3436", skin: "#f6d7b0", hair: "#1c1c1c" }} prop="coffee" />
      <StandingNpc position={[3.0, 0, 17.3]} yaw={Math.PI + 0.2} colors={{ shirt: "#fdcb6e", pants: "#1e3a5f", skin: "#f1c27d", hair: "#4a2c2a" }} prop="bag" />
      <StandingNpc position={[43.4, 0, -21.4]} yaw={-Math.PI / 2} colors={{ shirt: "#00cec9", pants: "#2d3436", skin: "#f1c27d", hair: "#1c1c1c" }} scale={0.7} />
      <StandingNpc position={[43.3, 0, -20.2]} yaw={-Math.PI / 2 - 0.3} colors={{ shirt: "#6c5ce7", pants: "#2d3436", skin: "#ffdbac", hair: "#2b1b17" }} scale={0.68} />
      <StandingNpc position={[45.3, 0, -6.0]} yaw={-Math.PI / 2} colors={{ shirt: "#00cec9", pants: "#2d3436", skin: "#e0ac69", hair: "#1c1c1c" }} prop="bag" />
      {/* cinema queue barrier */}
      {[-1.2, 0.0, 1.2].map((x) => (
        <group key={x} position={[x + 2.5, 0, 16.6]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 1.0, 8]} />
            <meshStandardMaterial color="#b2bec3" metalness={0.6} roughness={0.3} />
          </mesh>
          {x < 1 && (
            <mesh position={[0.6, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
              <meshStandardMaterial color="#c0392b" />
            </mesh>
          )}
        </group>
      ))}

      <Plaza />
      <Pedestrians />
      <StreetLife />
    </group>
  );
}


