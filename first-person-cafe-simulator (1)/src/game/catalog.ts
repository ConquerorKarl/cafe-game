/**
 * Dalgona Living — homeware catalogue. Every entry is rendered by a shared template
 * (see three/Decor.tsx) parameterised by colours and sizes, so the catalogue can be
 * large without hand-building each model.
 */
import type { DecorTemplate } from "./types";

export interface DecorDef {
  id: string;
  name: string;
  kr?: string;
  icon: string;
  template: DecorTemplate;
  price: number;
  size: [number, number];
  ambience: number;
  section: "seating" | "tables" | "lighting" | "plants" | "rugs" | "art" | "statues" | "shelving" | "accents";
  colors: string[]; // template-specific palette
  seats?: [number, number][];
  /** height of a usable flat top — small items can be placed on it */
  surface?: number;
  light?: boolean;
  power?: number;
  noCollide?: boolean;
  outdoor?: boolean;
  desc: string;
}

const seat2 = (gap = 0.45): [number, number][] => [[-gap, 0.15], [gap, 0.15]];
const seat3: [number, number][] = [[-0.75, 0.15], [0, 0.15], [0.75, 0.15]];
const seat1: [number, number][] = [[0, 0.1]];

export const DECOR: DecorDef[] = [
  // ------------------------------------------------------------------ seating
  { id: "sofaGreen", name: "Velvet Sofa · Forest", kr: "벨벳 소파", icon: "🛋️", template: "sofa", price: 820000, size: [2.0, 0.9], ambience: 12, section: "seating", colors: ["#1e6b4f", "#2a8a66", "#c9a24d"], seats: seat2(0.5), desc: "Deep green velvet two-seater on brass legs." },
  { id: "sofaMustard", name: "Velvet Sofa · Mustard", kr: "머스타드 소파", icon: "🛋️", template: "sofa", price: 820000, size: [2.0, 0.9], ambience: 12, section: "seating", colors: ["#d4a017", "#e0b43a", "#2d3436"], seats: seat2(0.5), desc: "Sunny mustard velvet, black legs." },
  { id: "sofaBlush", name: "Velvet Sofa · Blush", kr: "블러시 소파", icon: "🛋️", template: "sofa", price: 820000, size: [2.0, 0.9], ambience: 12, section: "seating", colors: ["#e8a7a0", "#f2c1bb", "#c9a24d"], seats: seat2(0.5), desc: "Dusty pink velvet — the selfie corner." },
  { id: "sofaNavy", name: "Velvet Sofa · Navy", kr: "네이비 소파", icon: "🛋️", template: "sofa", price: 820000, size: [2.0, 0.9], ambience: 12, section: "seating", colors: ["#2b3a55", "#3b4d6e", "#c9a24d"], seats: seat2(0.5), desc: "Midnight navy, very grown-up." },
  { id: "sofaLeather", name: "Chesterfield · Tan Leather", kr: "체스터필드 소파", icon: "🛋️", template: "chesterfield", price: 1250000, size: [2.2, 0.95], ambience: 15, section: "seating", colors: ["#8b5a2b", "#a0693a", "#3b2a1e"], seats: seat2(0.55), desc: "Button-tufted tan leather. Smells like a library." },
  { id: "sofaLeatherBlack", name: "Chesterfield · Black", kr: "블랙 체스터필드", icon: "🛋️", template: "chesterfield", price: 1250000, size: [2.2, 0.95], ambience: 15, section: "seating", colors: ["#1e1e1e", "#2c2c2c", "#3b2a1e"], seats: seat2(0.55), desc: "Black leather, chrome studs." },
  { id: "loveseatBoucle", name: "Bouclé Loveseat", kr: "부클레 러브시트", icon: "🛋️", template: "loveseat", price: 690000, size: [1.5, 0.85], ambience: 11, section: "seating", colors: ["#f1ebe1", "#e6ddcf", "#c9a070"], seats: seat2(0.35), desc: "Cream curly-wool loveseat. Round and soft." },
  { id: "loveseatTerracotta", name: "Terracotta Loveseat", kr: "테라코타 러브시트", icon: "🛋️", template: "loveseat", price: 690000, size: [1.5, 0.85], ambience: 11, section: "seating", colors: ["#c8714f", "#d98a6a", "#2d3436"], seats: seat2(0.35), desc: "Warm clay-coloured two-seater." },
  { id: "armchairRattan", name: "Rattan Armchair", kr: "라탄 암체어", icon: "🪑", template: "armchair", price: 380000, size: [0.9, 0.9], ambience: 7, section: "seating", colors: ["#c9a070", "#f1ebe1", "#8b5e3c"], seats: seat1, desc: "Woven rattan with a linen cushion." },
  { id: "armchairVelvet", name: "Velvet Armchair · Teal", kr: "벨벳 암체어", icon: "🪑", template: "armchair", price: 420000, size: [0.9, 0.9], ambience: 8, section: "seating", colors: ["#1b7f79", "#2a9d8f", "#c9a24d"], seats: seat1, desc: "Single teal velvet armchair." },
  { id: "armchairPlum", name: "Velvet Armchair · Plum", kr: "플럼 암체어", icon: "🪑", template: "armchair", price: 420000, size: [0.9, 0.9], ambience: 8, section: "seating", colors: ["#6a2c70", "#8e44ad", "#c9a24d"], seats: seat1, desc: "Plum velvet, gold legs." },
  { id: "beanbagGrey", name: "Bean Bag · Grey", kr: "빈백", icon: "🫘", template: "beanbag", price: 150000, size: [0.9, 0.9], ambience: 4, section: "seating", colors: ["#7f8c8d"], seats: seat1, desc: "Floppy and popular with students." },
  { id: "beanbagYellow", name: "Bean Bag · Yellow", kr: "노랑 빈백", icon: "🫘", template: "beanbag", price: 150000, size: [0.9, 0.9], ambience: 4, section: "seating", colors: ["#f9ca24"], seats: seat1, desc: "A bright blob to sink into." },
  { id: "benchOak", name: "Oak Window Bench", kr: "오크 벤치", icon: "🪵", template: "bench", price: 540000, size: [2.4, 0.7], ambience: 9, section: "seating", colors: ["#c9a070", "#e17055", "#fdcb6e", "#74b9ff"], seats: seat3, desc: "Long oak bench with three cushions.", surface: 0.5 },
  { id: "benchBlack", name: "Black Metal Bench", kr: "철제 벤치", icon: "🪵", template: "bench", price: 480000, size: [2.4, 0.7], ambience: 7, section: "seating", colors: ["#2d3436", "#b2bec3", "#dfe6e9", "#636e72"], seats: seat3, desc: "Industrial bench, grey felt pads.", surface: 0.5 },
  { id: "stoolBar", name: "Bar Stool · Walnut", kr: "바 스툴", icon: "🪑", template: "stool", price: 140000, size: [0.45, 0.45], ambience: 3, section: "seating", colors: ["#5a3b26", "#2d3436"], seats: seat1, desc: "Tall stool for a counter or window ledge." },
  { id: "stoolWhite", name: "Bar Stool · White", kr: "화이트 스툴", icon: "🪑", template: "stool", price: 140000, size: [0.45, 0.45], ambience: 3, section: "seating", colors: ["#f5f6fa", "#b2bec3"], seats: seat1, desc: "Scandi white stool." },
  { id: "poufKnit", name: "Knitted Pouf", kr: "니트 푸프", icon: "🧶", template: "pouf", price: 110000, size: [0.6, 0.6], ambience: 4, section: "seating", colors: ["#e17055"], seats: seat1, desc: "Chunky-knit footstool you can sit on." },
  { id: "poufLeather", name: "Moroccan Pouf", kr: "모로칸 푸프", icon: "🧶", template: "pouf", price: 160000, size: [0.6, 0.6], ambience: 5, section: "seating", colors: ["#a0693a"], seats: seat1, desc: "Stitched leather pouf." },
  { id: "daybed", name: "Daybed · Linen", kr: "데이베드", icon: "🛏️", template: "daybed", price: 980000, size: [2.0, 1.0], ambience: 13, section: "seating", colors: ["#e6ddcf", "#c9a070", "#8b5e3c"], seats: [[-0.5, 0.2], [0.5, 0.2]], desc: "Low linen daybed with a bolster. Lounge mode." },
  { id: "swingChair", name: "Hanging Egg Chair", kr: "해먹 의자", icon: "🥚", template: "eggchair", price: 760000, size: [1.0, 1.0], ambience: 12, section: "seating", colors: ["#c9a070", "#f1ebe1", "#2d3436"], seats: seat1, desc: "Rattan egg chair on a stand. Everyone wants this seat." },

  // ------------------------------------------------------------------ tables
  { id: "coffeeTableOak", name: "Coffee Table · Oak", kr: "오크 커피테이블", icon: "🪵", template: "coffeeTable", price: 230000, size: [1.0, 0.6], ambience: 4, section: "tables", colors: ["#c9a070", "#2d3436"], desc: "Low oak table to go with a sofa.", surface: 0.45 },
  { id: "coffeeTableMarble", name: "Coffee Table · Marble", kr: "마블 커피테이블", icon: "🪨", template: "coffeeTable", price: 390000, size: [1.0, 0.6], ambience: 6, section: "tables", colors: ["#eef0f2", "#c9a24d"], desc: "White marble top, gold frame.", surface: 0.45 },
  { id: "coffeeTableGlass", name: "Coffee Table · Glass", kr: "유리 커피테이블", icon: "🪟", template: "coffeeTable", price: 310000, size: [1.0, 0.6], ambience: 5, section: "tables", colors: ["#bfe4f7", "#2d3436"], desc: "Tempered glass on black steel.", surface: 0.45 },
  { id: "sideTable", name: "Side Table · Walnut", kr: "사이드 테이블", icon: "🪵", template: "sideTable", price: 120000, size: [0.45, 0.45], ambience: 3, section: "tables", colors: ["#5a3b26"], desc: "Little round table for a lamp or a latte.", surface: 0.58 },
  { id: "sideTableBrass", name: "Side Table · Brass", kr: "브라스 사이드 테이블", icon: "✨", template: "sideTable", price: 160000, size: [0.45, 0.45], ambience: 4, section: "tables", colors: ["#c9a24d"], desc: "Brass tray table.", surface: 0.58 },
  { id: "consoleTable", name: "Console Table", kr: "콘솔 테이블", icon: "🪵", template: "console", price: 290000, size: [1.4, 0.4], ambience: 5, section: "tables", colors: ["#c9a070", "#2d3436"], desc: "Narrow table for a wall — vases, menus, flyers.", surface: 0.83 },
  { id: "communalTable", name: "Communal Table (6)", kr: "공용 테이블", icon: "🪑", template: "communal", price: 980000, size: [2.6, 1.0], ambience: 10, section: "tables", colors: ["#c9a070", "#2d3436"], seats: [[-0.8, -0.8], [0, -0.8], [0.8, -0.8], [-0.8, 0.8], [0, 0.8], [0.8, 0.8]], desc: "Long shared table, six stools. Laptop crowd heaven.", surface: 0.78 },
  { id: "windowLedge", name: "Window Counter (3)", kr: "창가 바 테이블", icon: "🪵", template: "ledge", price: 460000, size: [2.4, 0.5], ambience: 7, section: "tables", colors: ["#c9a070", "#2d3436"], seats: [[-0.8, 0.45], [0, 0.45], [0.8, 0.45]], desc: "High counter with three stools, facing out.", surface: 1.03 },
  { id: "bistroSet", name: "Bistro Set · Mint", kr: "비스트로 세트", icon: "☕", template: "bistro", price: 340000, size: [1.4, 1.4], ambience: 8, section: "tables", colors: ["#bfe6dc", "#2d3436"], seats: [[0, -0.7], [0, 0.7]], desc: "Round metal café table, two folding chairs. Indoors or on the terrace.", surface: 0.75 },
  { id: "bistroSetRed", name: "Bistro Set · Red", kr: "레드 비스트로", icon: "☕", template: "bistro", price: 340000, size: [1.4, 1.4], ambience: 8, section: "tables", colors: ["#c0392b", "#2d3436"], seats: [[0, -0.7], [0, 0.7]], desc: "Paris-red bistro set.", surface: 0.75 },
  // ------------------------------------------------------------------ lighting
  { id: "floorLampArc", name: "Arc Floor Lamp", kr: "아치 플로어 램프", icon: "💡", template: "arcLamp", price: 290000, size: [0.6, 0.6], ambience: 7, section: "lighting", colors: ["#c9a24d", "#f5e6c8"], light: true, power: 900, desc: "Brass arc with a big drum shade." },
  { id: "floorLampTripod", name: "Tripod Lamp", kr: "삼각대 램프", icon: "💡", template: "tripodLamp", price: 210000, size: [0.6, 0.6], ambience: 6, section: "lighting", colors: ["#6b4a35", "#f1ebe1"], light: true, power: 800, desc: "Wooden tripod, linen shade." },
  { id: "tableLampCeramic", name: "Ceramic Table Lamp", kr: "도자기 램프", icon: "🏺", template: "tableLamp", price: 130000, size: [0.35, 0.35], ambience: 4, section: "lighting", colors: ["#bfe6dc", "#f5e6c8"], light: true, power: 500, desc: "Celadon base, cream shade. Put it on a table or shelf." },
  { id: "tableLampMushroom", name: "Mushroom Lamp", kr: "버섯 램프", icon: "🍄", template: "mushroomLamp", price: 170000, size: [0.35, 0.35], ambience: 5, section: "lighting", colors: ["#e17055", "#fdf2e9"], light: true, power: 400, desc: "Retro orange mushroom lamp." },
  { id: "pendantBrass", name: "Brass Pendant Trio", kr: "브라스 펜던트", icon: "💡", template: "pendantTrio", price: 420000, size: [1.4, 0.4], ambience: 9, section: "lighting", colors: ["#c9a24d"], light: true, power: 1500, noCollide: true, desc: "Three brass domes on cords." },
  { id: "pendantGlobe", name: "Glass Globe Pendant", kr: "글로브 펜던트", icon: "🔮", template: "globePendant", price: 260000, size: [0.6, 0.6], ambience: 7, section: "lighting", colors: ["#f5e6c8"], light: true, power: 900, noCollide: true, desc: "Opal glass globe." },
  { id: "pendantRattan", name: "Rattan Pendant", kr: "라탄 펜던트", icon: "🧺", template: "rattanPendant", price: 240000, size: [0.8, 0.8], ambience: 8, section: "lighting", colors: ["#c9a070"], light: true, power: 800, noCollide: true, desc: "Woven basket shade, dappled light." },
  { id: "hanjiLantern", name: "Hanji Lantern", kr: "한지 등", icon: "🏮", template: "hanji", price: 190000, size: [0.6, 0.6], ambience: 7, section: "lighting", colors: ["#fff3dd"], light: true, power: 800, noCollide: true, desc: "Mulberry-paper pendant." },
  { id: "chandelier", name: "Crystal Chandelier", kr: "샹들리에", icon: "💎", template: "chandelier", price: 1400000, size: [1.0, 1.0], ambience: 16, section: "lighting", colors: ["#c9a24d", "#ffffff"], light: true, power: 2500, noCollide: true, desc: "Faceted glass. Dramatic over a communal table." },
  { id: "stringLights", name: "Festoon String Lights", kr: "앵두 전구", icon: "✨", template: "festoon", price: 120000, size: [3.0, 0.2], ambience: 7, section: "lighting", colors: ["#ffd9a0"], light: true, power: 300, noCollide: true, desc: "A 3 m run of warm bulbs for a wall or window." },
  { id: "neonCoffee", name: "Neon · but first, coffee", kr: "네온 사인", icon: "💗", template: "neon", price: 350000, size: [1.6, 0.2], ambience: 9, section: "lighting", colors: ["#ff7bd5", "but first, coffee"], light: true, power: 1200, noCollide: true, desc: "Pink neon script." },
  { id: "neonHongdae", name: "Neon · 홍대", kr: "네온 홍대", icon: "💙", template: "neon", price: 350000, size: [1.2, 0.2], ambience: 9, section: "lighting", colors: ["#48dbfb", "홍 대"], light: true, power: 1200, noCollide: true, desc: "Blue neon Hangul." },
  { id: "neonOpen", name: "Neon · OPEN 24", kr: "네온 오픈", icon: "🟢", template: "neon", price: 290000, size: [1.0, 0.2], ambience: 6, section: "lighting", colors: ["#2ecc71", "OPEN ☕"], light: true, power: 1000, noCollide: true, desc: "Green neon for the window." },
  { id: "candles", name: "Candle Cluster", kr: "캔들", icon: "🕯️", template: "candles", price: 60000, size: [0.3, 0.3], ambience: 4, section: "lighting", colors: ["#f5e6c8"], light: true, desc: "Three pillar candles on a tray. Tabletop." },
  { id: "saltLamp", name: "Salt Lamp", kr: "소금 램프", icon: "🧂", template: "saltLamp", price: 80000, size: [0.3, 0.3], ambience: 4, section: "lighting", colors: ["#f39c7a"], light: true, power: 200, desc: "Glowing pink rock." },
  { id: "moonMirror", name: "Moon Mirror", kr: "달 거울", icon: "🌕", template: "moonMirror", price: 260000, size: [1.0, 0.15], ambience: 7, section: "lighting", colors: ["#ffe3a0"], light: true, power: 400, noCollide: true, desc: "Round backlit mirror." },

  // ------------------------------------------------------------------ plants & flowers
  { id: "monstera", name: "Monstera", kr: "몬스테라", icon: "🌿", template: "plantBig", price: 95000, size: [0.7, 0.7], ambience: 5, section: "plants", colors: ["#2f8a3d", "#b5593a"], desc: "Big split leaves in a terracotta pot." },
  { id: "fiddleFig", name: "Fiddle-leaf Fig", kr: "떡갈고무나무", icon: "🌳", template: "tree", price: 160000, size: [0.8, 0.8], ambience: 7, section: "plants", colors: ["#3e9a4b", "#f1ebe1"], desc: "Tall indoor tree, white planter." },
  { id: "oliveTree", name: "Olive Tree", kr: "올리브 나무", icon: "🫒", template: "tree", price: 190000, size: [0.8, 0.8], ambience: 8, section: "plants", colors: ["#8fa37a", "#cfc8bd"], desc: "Silvery olive in a stone pot." },
  { id: "fern", name: "Boston Fern", kr: "보스턴 고사리", icon: "🌿", template: "plant", price: 60000, size: [0.5, 0.5], ambience: 4, section: "plants", colors: ["#4fb35b", "#b5593a"], desc: "Frilly fern on a stand." },
  { id: "snakePlant", name: "Snake Plant", kr: "산세베리아", icon: "🪴", template: "snake", price: 55000, size: [0.4, 0.4], ambience: 3, section: "plants", colors: ["#2e8b57", "#2d3436"], desc: "Impossible to kill." },
  { id: "cactusTall", name: "Tall Cactus", kr: "선인장", icon: "🌵", template: "cactus", price: 90000, size: [0.5, 0.5], ambience: 4, section: "plants", colors: ["#3e9a4b", "#c8714f"], desc: "Desert vibes." },
  { id: "bambooPot", name: "Lucky Bamboo", kr: "개운죽", icon: "🎋", template: "bamboo", price: 70000, size: [0.4, 0.4], ambience: 4, section: "plants", colors: ["#6ab04c", "#dfe6e9"], desc: "Three stalks in a glass vase." },
  { id: "hangingRail", name: "Hanging Plant Rail", kr: "행잉 플랜트", icon: "🌿", template: "hanging", price: 230000, size: [1.8, 0.4], ambience: 8, section: "plants", colors: ["#3e9a4b"], noCollide: true, desc: "Trailing pothos from a ceiling rail." },
  { id: "flowersSeasonal", name: "Seasonal Flowers", kr: "계절 꽃", icon: "💐", template: "flowers", price: 90000, size: [0.4, 0.4], ambience: 5, section: "plants", colors: ["season"], desc: "A tall vase on a stand; blooms change with the season." },
  { id: "flowersSunflower", name: "Sunflowers", kr: "해바라기", icon: "🌻", template: "flowers", price: 85000, size: [0.4, 0.4], ambience: 5, section: "plants", colors: ["#f9ca24", "#e1b12c", "#f39c12"], desc: "Big and cheerful." },
  { id: "flowersTulip", name: "Tulips", kr: "튤립", icon: "🌷", template: "flowers", price: 85000, size: [0.4, 0.4], ambience: 5, section: "plants", colors: ["#e84393", "#fd79a8", "#f5f6fa"], desc: "Pink and white tulips." },
  { id: "flowersDried", name: "Dried Pampas", kr: "팜파스 그라스", icon: "🌾", template: "flowers", price: 75000, size: [0.4, 0.4], ambience: 5, section: "plants", colors: ["#e6ddcf", "#d9c7a8", "#c9b58a"], desc: "Beige pampas grass. Very 2024." },
  { id: "wreath", name: "Eucalyptus Wreath", kr: "유칼립투스 리스", icon: "🌿", template: "wreath", price: 65000, size: [0.6, 0.1], ambience: 4, section: "plants", colors: ["#8fa37a"], noCollide: true, desc: "Lean it on a wall or hang in a window." },
  { id: "terrarium", name: "Glass Terrarium", kr: "테라리움", icon: "🫙", template: "terrarium", price: 70000, size: [0.3, 0.3], ambience: 4, section: "plants", colors: ["#4fb35b"], desc: "Tiny forest in a jar. Tabletop." },

  // ------------------------------------------------------------------ rugs
  { id: "rugPersian", name: "Persian Rug", kr: "페르시안 러그", icon: "🧶", template: "rug", price: 420000, size: [3.0, 2.0], ambience: 9, section: "rugs", colors: ["#8e2a2a", "#e3c08d", "#2b3a55"], noCollide: true, desc: "Deep red with a cream border." },
  { id: "rugJute", name: "Jute Rug", kr: "황마 러그", icon: "🧶", template: "rug", price: 180000, size: [3.0, 2.0], ambience: 6, section: "rugs", colors: ["#c9b58a", "#b89f72", "#c9b58a"], noCollide: true, desc: "Natural woven jute." },
  { id: "rugBoucle", name: "Bouclé Rug · Cream", kr: "크림 러그", icon: "🧶", template: "rug", price: 260000, size: [2.4, 1.6], ambience: 7, section: "rugs", colors: ["#f1ebe1", "#e6ddcf", "#f1ebe1"], noCollide: true, desc: "Soft cream loop pile." },
  { id: "rugGeo", name: "Geometric Rug", kr: "지오메트릭 러그", icon: "🧶", template: "rugGeo", price: 300000, size: [2.4, 1.6], ambience: 8, section: "rugs", colors: ["#2d3436", "#f1ebe1", "#e17055"], noCollide: true, desc: "Black, cream and clay triangles." },
  { id: "rugRound", name: "Round Rug · Sage", kr: "원형 러그", icon: "🟢", template: "rugRound", price: 220000, size: [2.0, 2.0], ambience: 7, section: "rugs", colors: ["#b7c4a8", "#f1ebe1"], noCollide: true, desc: "Round sage rug for under a bistro set." },
  { id: "rugRunner", name: "Hallway Runner", kr: "러너 러그", icon: "🧶", template: "rug", price: 150000, size: [2.6, 0.8], ambience: 5, section: "rugs", colors: ["#2b3a55", "#e3c08d", "#2b3a55"], noCollide: true, desc: "Long narrow runner." },
  { id: "rugCowhide", name: "Faux Cowhide", kr: "카우하이드 러그", icon: "🐄", template: "rugHide", price: 340000, size: [2.2, 1.8], ambience: 8, section: "rugs", colors: ["#f1ebe1", "#5a3b26"], noCollide: true, desc: "Splotchy and a little bit wild." },
  { id: "doormat", name: "Doormat · 어서오세요", kr: "현관 매트", icon: "🚪", template: "mat", price: 40000, size: [0.9, 0.6], ambience: 2, section: "rugs", colors: ["#8b5e3c", "어서오세요"], noCollide: true, desc: "Coir mat that says welcome." },

  // ------------------------------------------------------------------ art & mirrors
  { id: "printHongdae", name: "Print · Hongdae at Night", kr: "홍대의 밤", icon: "🖼️", template: "print", price: 210000, size: [1.5, 0.2], ambience: 8, section: "art", colors: ["#1b1f3a", "#ff7bd5", "홍대의 밤", "☔ 🌃 ☔"], noCollide: true, desc: "Neon street in the rain." },
  { id: "printHan", name: "Print · Han River Sunset", kr: "한강 노을", icon: "🖼️", template: "print", price: 210000, size: [1.5, 0.2], ambience: 8, section: "art", colors: ["#e8743b", "#2c2c54", "한강 노을", "🌉 🌇 🌉"], noCollide: true, desc: "Orange sky over the bridges." },
  { id: "printTiger", name: "Minhwa Tiger", kr: "민화 호랑이", icon: "🐯", template: "print", price: 320000, size: [1.2, 0.2], ambience: 10, section: "art", colors: ["#f3e7c9", "#8a4b1e", "까치와 호랑이", "🐯 🐦"], noCollide: true, desc: "Folk-art tiger and magpie." },
  { id: "printMoon", name: "Print · Moon Jar", kr: "달항아리", icon: "🏺", template: "print", price: 240000, size: [1.0, 0.2], ambience: 8, section: "art", colors: ["#f7f7f4", "#2d3436", "달항아리", "⚪"], noCollide: true, desc: "Minimal Joseon moon jar." },
  { id: "printAbstract", name: "Print · Abstract Blocks", kr: "추상화", icon: "🎨", template: "print", price: 180000, size: [1.2, 0.2], ambience: 7, section: "art", colors: ["#f1ebe1", "#e17055", "▮ ▬ ●", "◆ ▲"], noCollide: true, desc: "Terracotta shapes on cream." },
  { id: "printBotanical", name: "Botanical Trio", kr: "보태니컬 프린트", icon: "🌿", template: "triptych", price: 260000, size: [1.8, 0.2], ambience: 8, section: "art", colors: ["#f7f7f4", "#2e8b57"], noCollide: true, desc: "Three framed leaf prints." },
  { id: "printPolaroids", name: "Polaroid Wall", kr: "폴라로이드 월", icon: "📷", template: "polaroids", price: 90000, size: [1.4, 0.1], ambience: 6, section: "art", colors: ["#ffffff"], noCollide: true, desc: "String of regulars' photos." },
  { id: "mirrorArch", name: "Arched Mirror", kr: "아치 거울", icon: "🪞", template: "mirror", price: 280000, size: [0.8, 0.15], ambience: 7, section: "art", colors: ["#c9a24d"], noCollide: true, desc: "Full-height gold arch mirror." },
  { id: "clockStation", name: "Station Clock", kr: "벽시계", icon: "🕰️", template: "clock", price: 120000, size: [0.6, 0.1], ambience: 4, section: "art", colors: ["#2d3436", "#f7f7f4"], noCollide: true, desc: "Big round wall clock." },
  { id: "chalkboard", name: "Chalkboard Menu", kr: "칠판 메뉴", icon: "📝", template: "chalkboard", price: 70000, size: [0.7, 0.1], ambience: 3, section: "art", colors: ["#1f2a24", "#f3e7c9", "TODAY'S SPECIAL", "아인슈페너 ₩5,800"], noCollide: true, desc: "A-frame chalkboard for specials." },
  { id: "vinylWall", name: "Vinyl Sleeve Wall", kr: "LP 벽장식", icon: "🎵", template: "vinylWall", price: 150000, size: [1.2, 0.1], ambience: 7, section: "art", colors: ["#c0392b", "#2980b9", "#f1c40f", "#2d3436"], noCollide: true, desc: "Six framed LP covers." },
  { id: "tapestry", name: "Macramé Hanging", kr: "마크라메", icon: "🪢", template: "macrame", price: 110000, size: [0.9, 0.1], ambience: 6, section: "art", colors: ["#f1ebe1"], noCollide: true, desc: "Knotted cotton wall hanging." },

  // ------------------------------------------------------------------ statues & objects
  { id: "statueBuddha", name: "Stone Buddha", kr: "석불", icon: "🪷", template: "statue", price: 380000, size: [0.6, 0.6], ambience: 9, section: "statues", colors: ["#9e978f", "buddha"], desc: "Weathered granite, very calm." },
  { id: "statueHaetae", name: "Haetae Guardian", kr: "해태상", icon: "🦁", template: "statue", price: 460000, size: [0.7, 0.9], ambience: 11, section: "statues", colors: ["#8a8078", "haetae"], desc: "Mythical lion-dog that wards off fire. Pair them at the door." },
  { id: "statueDolHareubang", name: "Dol Hareubang", kr: "돌하르방", icon: "🗿", template: "statue", price: 340000, size: [0.5, 0.5], ambience: 9, section: "statues", colors: ["#6f6a66", "hareubang"], desc: "Jeju's basalt grandfather." },
  { id: "statueBust", name: "Plaster Bust", kr: "석고상", icon: "🗿", template: "statue", price: 220000, size: [0.4, 0.4], ambience: 7, section: "statues", colors: ["#f1ebe1", "bust"], desc: "Art-school classic on a plinth." },
  { id: "statueMoonJar", name: "Moon Jar", kr: "달항아리", icon: "🏺", template: "vaseBig", price: 300000, size: [0.5, 0.5], ambience: 8, section: "statues", colors: ["#f7f7f4"], desc: "Large white porcelain jar." },
  { id: "statueCeladon", name: "Celadon Vase", kr: "청자", icon: "🏺", template: "vaseBig", price: 260000, size: [0.4, 0.4], ambience: 7, section: "statues", colors: ["#a8c7bd"], desc: "Goryeo-green glaze." },
  { id: "catTower", name: "Café Cat & Tower", kr: "카페 고양이", icon: "🐈", template: "cat", price: 450000, size: [0.7, 0.7], ambience: 14, section: "statues", colors: ["#e67e22"], desc: "A sleepy ginger cat and its tower." },
  { id: "catBlack", name: "Café Cat · Black", kr: "검은 고양이", icon: "🐈‍⬛", template: "cat", price: 450000, size: [0.7, 0.7], ambience: 14, section: "statues", colors: ["#1e1e1e"], desc: "A black cat on a grey tower. Judges you." },
  { id: "fishTank", name: "Aquarium", kr: "수족관", icon: "🐠", template: "aquarium", price: 890000, size: [1.2, 0.5], ambience: 13, section: "statues", colors: ["#48dbfb"], light: true, power: 1200, desc: "Lit tank with guppies on a cabinet." },
  { id: "globe", name: "Vintage Globe", kr: "지구본", icon: "🌍", template: "globe", price: 110000, size: [0.4, 0.4], ambience: 4, section: "statues", colors: ["#c9a24d", "#2b3a55"], desc: "Brass-stand globe." },
  { id: "gramophone", name: "Gramophone", kr: "축음기", icon: "📯", template: "gramophone", price: 320000, size: [0.6, 0.6], ambience: 8, section: "statues", colors: ["#c9a24d", "#5a3b26"], desc: "Brass horn on a walnut box." },
  { id: "typewriter", name: "Typewriter", kr: "타자기", icon: "⌨️", template: "typewriter", price: 90000, size: [0.4, 0.35], ambience: 4, section: "statues", colors: ["#2d3436"], desc: "Tabletop prop. Clack clack." },

  // ------------------------------------------------------------------ shelving & storage
  { id: "shelfLadder", name: "Ladder Shelf", kr: "사다리 선반", icon: "📚", template: "ladderShelf", price: 190000, size: [0.7, 0.4], ambience: 6, section: "shelving", colors: ["#c9a070"], desc: "Leaning oak shelf with books and pots." },
  { id: "shelfCube", name: "Cube Shelf", kr: "큐브 선반", icon: "🧱", template: "cubeShelf", price: 260000, size: [1.5, 0.4], ambience: 7, section: "shelving", colors: ["#f5f6fa"], desc: "White 4×2 cubes with baskets and books." },
  { id: "bookshelfTall", name: "Tall Bookshelf", kr: "책장", icon: "📚", template: "bookshelf", price: 280000, size: [1.4, 0.4], ambience: 8, section: "shelving", colors: ["#6b4a35"], desc: "Webtoons, travel books and a plant." },
  { id: "vinylShelf", name: "Vinyl & Turntable", kr: "턴테이블", icon: "🎵", template: "turntable", price: 640000, size: [1.2, 0.5], ambience: 11, section: "shelving", colors: ["#6b4a35"], power: 600, desc: "Record shelf with a spinning turntable." },
  { id: "magazineRack", name: "Magazine Rack", kr: "잡지꽂이", icon: "📰", template: "magRack", price: 60000, size: [0.4, 0.3], ambience: 3, section: "shelving", colors: ["#2d3436"], desc: "Today's papers and design mags." },
  { id: "coatStand", name: "Coat Stand", kr: "옷걸이", icon: "🧥", template: "coatStand", price: 80000, size: [0.4, 0.4], ambience: 3, section: "shelving", colors: ["#5a3b26"], desc: "Somewhere for winter coats." },
  { id: "umbrellaStand", name: "Umbrella Stand", kr: "우산꽂이", icon: "☂️", template: "umbrellaStand", price: 45000, size: [0.3, 0.3], ambience: 2, section: "shelving", colors: ["#636e72"], desc: "Essential in jangma season." },
  { id: "roomDivider", name: "Wooden Screen", kr: "병풍 파티션", icon: "🪟", template: "screen", price: 320000, size: [1.8, 0.1], ambience: 7, section: "shelving", colors: ["#6b4a35", "#f3e7c9"], desc: "Slatted screen to break up a room." },

  // ------------------------------------------------------------------ accents
  { id: "cushionPile", name: "Cushion Pile", kr: "쿠션", icon: "🛏️", template: "cushions", price: 50000, size: [0.6, 0.6], ambience: 3, section: "accents", colors: ["#e17055", "#fdcb6e", "#74b9ff", "#a29bfe"], noCollide: true, desc: "Four cushions in a heap." },
  { id: "throwBasket", name: "Blanket Basket", kr: "담요 바구니", icon: "🧺", template: "basket", price: 60000, size: [0.45, 0.45], ambience: 3, section: "accents", colors: ["#c9a070", "#b7c4a8"], desc: "Woven basket of folded throws." },
  { id: "boardGames", name: "Board Game Stack", kr: "보드게임", icon: "🎲", template: "games", price: 70000, size: [0.4, 0.4], ambience: 5, section: "accents", colors: ["#e84393", "#0984e3", "#f9ca24"], desc: "Stays-for-hours bait." },
  { id: "bookStack", name: "Book Stack", kr: "책 더미", icon: "📖", template: "books", price: 35000, size: [0.3, 0.3], ambience: 2, section: "accents", colors: ["#c0392b", "#2980b9", "#27ae60"], desc: "Tabletop stack of hardbacks." },
  { id: "tipJar", name: "Big Tip Jar", kr: "팁 항아리", icon: "🫙", template: "jar", price: 25000, size: [0.25, 0.25], ambience: 1, section: "accents", colors: ["#dff9fb"], desc: "Suggestive." },
  { id: "menuStand", name: "Menu Stand", kr: "메뉴 스탠드", icon: "📋", template: "menuStand", price: 55000, size: [0.4, 0.4], ambience: 2, section: "accents", colors: ["#2d3436", "#f3e7c9"], desc: "Floor-standing menu by the door." },
  { id: "luckyCat", name: "Waving Lucky Cat", kr: "마네키네코", icon: "🐱", template: "luckyCat", price: 45000, size: [0.25, 0.25], ambience: 3, section: "accents", colors: ["#f5f6fa", "#c0392b"], desc: "Waves at customers all day." },
  { id: "dessertDome", name: "Cake Dome", kr: "케이크 돔", icon: "🍰", template: "dome", price: 40000, size: [0.3, 0.3], ambience: 2, section: "accents", colors: ["#f8a5c2"], desc: "Glass dome for a showpiece cake." },
  { id: "signageArrow", name: "Light-up Arrow", kr: "화살표 사인", icon: "➡️", template: "arrow", price: 130000, size: [0.8, 0.15], ambience: 5, section: "accents", colors: ["#ffd166"], light: true, power: 600, noCollide: true, desc: "Marquee arrow with bulbs." },
  { id: "deskFan", name: "Retro Desk Fan", kr: "레트로 선풍기", icon: "🌀", template: "deskFan", price: 70000, size: [0.3, 0.3], ambience: 3, section: "accents", colors: ["#bfe6dc"], power: 300, desc: "Mint tabletop fan (decorative)." },
  { id: "radio", name: "Vintage Radio", kr: "라디오", icon: "📻", template: "radio", price: 80000, size: [0.35, 0.25], ambience: 4, section: "accents", colors: ["#c8714f", "#c9a24d"], power: 200, desc: "Walnut and brass, tuned to jazz." },
  { id: "suitcaseStack", name: "Vintage Suitcases", kr: "빈티지 트렁크", icon: "🧳", template: "suitcases", price: 140000, size: [0.7, 0.5], ambience: 5, section: "accents", colors: ["#8b5a2b", "#5a3b26", "#c8714f"], desc: "Three stacked leather trunks." },
  { id: "birdcage", name: "Decorative Birdcage", kr: "새장", icon: "🐦", template: "birdcage", price: 90000, size: [0.4, 0.4], ambience: 4, section: "accents", colors: ["#c9a24d"], desc: "Empty brass cage with a trailing plant." },
  { id: "parasol", name: "Patio Parasol", kr: "파라솔", icon: "⛱️", template: "parasol", price: 180000, size: [0.4, 0.4], ambience: 5, section: "accents", colors: ["#e17055"], outdoor: true, desc: "Terrace shade. Outdoors only." },
  { id: "planterBox", name: "Terrace Planter", kr: "테라스 화분", icon: "🌸", template: "planter", price: 80000, size: [1.6, 0.4], ambience: 5, section: "accents", colors: ["#6b4a35"], outdoor: true, desc: "Flower box for the terrace or balcony." },
  { id: "heaterPatio", name: "Patio Heater", kr: "야외 히터", icon: "🔥", template: "patioHeater", price: 420000, size: [0.6, 0.6], ambience: 6, section: "accents", colors: ["#b2bec3"], outdoor: true, light: true, power: 6000, desc: "Mushroom heater for the terrace (looks; climate still needs indoor units)." },
];

export const DECOR_MAP = Object.fromEntries(DECOR.map((d) => [d.id, d])) as Record<string, DecorDef>;
export const DECOR_SECTIONS: { id: DecorDef["section"]; name: string; icon: string }[] = [
  { id: "seating", name: "Seating", icon: "🛋️" },
  { id: "tables", name: "Tables", icon: "🪵" },
  { id: "lighting", name: "Lighting", icon: "💡" },
  { id: "plants", name: "Plants & flowers", icon: "🌿" },
  { id: "rugs", name: "Rugs", icon: "🧶" },
  { id: "art", name: "Art & mirrors", icon: "🖼️" },
  { id: "statues", name: "Statues & objects", icon: "🗿" },
  { id: "shelving", name: "Shelving", icon: "📚" },
  { id: "accents", name: "Accents", icon: "✨" },
];
