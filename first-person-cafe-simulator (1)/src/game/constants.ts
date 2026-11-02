import { WEATHERS, clamp, getComfort, getSeason, getTimeFactor, type Capacity } from "./calendar";
import { DECOR, type DecorDef } from "./catalog";
import { crowdMultiplier, getStars } from "./reputation";
import type {
  Applicant,
  DishId,
  CompetitorState,
  CustomerColors,
  EconomyState,
  IngredientId,
  InstallationId,
  ItemCategory,
  ItemId,
  PlacedItem,
  ProductId,
  ProductStation,
  RoleId,
  Season,
  ShopId,
  SkillId,
  Staff,
  StationKind,
  Stats,
  StorageKind,
  WeatherId,
  FloorPattern,
  WallPaint,
  RoofStyle,
  KitchenLook,
  StyleState,
} from "./types";

export { clamp } from "./calendar";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
export const STARTING_MONEY = 0; // start at ₩0 — bills are paid until next month
export const MAX_QUEUE = 7;
export const BASE_TRAFFIC = 22;
export const MAX_SPAWN_RATE = 6;
export const EYE_HEIGHT = 1.62;
export const PLAYER_RADIUS = 0.32;
export const DEFAULT_CAFE_NAME = "카페 달빛 · Café Dalbit";
export const BOX_SLOTS = 12;
export const DELIVERY_FEE = 3000;
export const RENT_BASE = 900_000;
export const ELECTRIC_BASE = 3000; // ₩/day lighting etc.
export const DAYS_PER_MONTH = 14;

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------
export interface IngredientDef {
  name: string;
  icon: string;
  storage: StorageKind;
  size: number; // storage units per item
}

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  beans: { name: "Coffee beans", icon: "🫘", storage: "pantry", size: 1 },
  milk: { name: "Milk", icon: "🥛", storage: "fridge", size: 1 },
  ice: { name: "Ice", icon: "🧊", storage: "fridge", size: 0.5 },
  syrup: { name: "Dalgona syrup", icon: "🍯", storage: "pantry", size: 1 },
  misugaru: { name: "Misugaru powder", icon: "🌾", storage: "pantry", size: 1 },
  yuja: { name: "Yuja marmalade", icon: "🍊", storage: "fridge", size: 1 },
  redbean: { name: "Sweet red beans", icon: "🫘", storage: "fridge", size: 1 },
  soboro: { name: "Soboro bread", icon: "🍞", storage: "display", size: 1 },
  croissant: { name: "Croissants", icon: "🥐", storage: "display", size: 1 },
  eggtart: { name: "Egg tarts", icon: "🥧", storage: "display", size: 1 },
  macaron: { name: "Ttungcarons", icon: "🍬", storage: "display", size: 1 },
  honeybread: { name: "Honey bread", icon: "🍯", storage: "display", size: 1.5 },
  cups: { name: "To-go cups & lids", icon: "🥤", storage: "cupboard", size: 0.08 },
  bags: { name: "Paper bags", icon: "🛍️", storage: "pantry", size: 0.04 },
  flour: { name: "Flour & bread", icon: "🌾", storage: "pantry", size: 1 },
  bakingSoda: { name: "Baking soda", icon: "🧂", storage: "pantry", size: 0.3 },
  eggs: { name: "Eggs", icon: "🥚", storage: "fridge", size: 0.5 },
  butter: { name: "Butter & cream", icon: "🧈", storage: "fridge", size: 1 },
  cheese: { name: "Cheese & ham", icon: "🧀", storage: "fridge", size: 1 },
  berries: { name: "Berries", icon: "🫐", storage: "fridge", size: 0.5 },
  mango: { name: "Mango", icon: "🥭", storage: "fridge", size: 0.5 },
  banana: { name: "Bananas", icon: "🍌", storage: "pantry", size: 0.3 },
  meat: { name: "Meat & mince", icon: "🥩", storage: "freezer", size: 1.5 },
  icecream: { name: "Ice cream", icon: "🍦", storage: "freezer", size: 1 },
  mug: { name: "Mugs", icon: "☕", storage: "rack", size: 0.25 },
  plate: { name: "Plates", icon: "🍽️", storage: "rack", size: 0.25 },
  bowl: { name: "Bowls", icon: "🥣", storage: "rack", size: 0.25 },
  spoon: { name: "Spoons & forks", icon: "🥄", storage: "rack", size: 0.1 },
};

export const INGREDIENT_ORDER = Object.keys(INGREDIENTS) as IngredientId[];

export interface MartPack {
  ingredient: IngredientId;
  qty: number;
  price: number;
}

export const MART_PACKS: MartPack[] = [
  { ingredient: "beans", qty: 10, price: 9000 },
  { ingredient: "milk", qty: 10, price: 8000 },
  { ingredient: "ice", qty: 20, price: 7000 },
  { ingredient: "cups", qty: 50, price: 7500 },
  { ingredient: "bags", qty: 50, price: 4000 },
  { ingredient: "syrup", qty: 5, price: 4500 },
  { ingredient: "misugaru", qty: 5, price: 6000 },
  { ingredient: "yuja", qty: 5, price: 7500 },
  { ingredient: "redbean", qty: 5, price: 7000 },
  { ingredient: "soboro", qty: 6, price: 7200 },
  { ingredient: "croissant", qty: 6, price: 9600 },
  { ingredient: "eggtart", qty: 6, price: 9000 },
  { ingredient: "macaron", qty: 6, price: 10800 },
  { ingredient: "honeybread", qty: 4, price: 12000 },
  { ingredient: "flour", qty: 10, price: 6000 },
  { ingredient: "eggs", qty: 12, price: 5500 },
  { ingredient: "butter", qty: 8, price: 9000 },
  { ingredient: "cheese", qty: 8, price: 11000 },
  { ingredient: "bakingSoda", qty: 10, price: 6000 },
  { ingredient: "berries", qty: 10, price: 14000 },
  { ingredient: "mango", qty: 10, price: 12000 },
  { ingredient: "banana", qty: 20, price: 8000 },
  { ingredient: "meat", qty: 10, price: 40000 },
  { ingredient: "icecream", qty: 8, price: 24000 },
  { ingredient: "mug", qty: 12, price: 30000 },
  { ingredient: "plate", qty: 8, price: 36000 },
  { ingredient: "bowl", qty: 8, price: 28000 },
  { ingredient: "spoon", qty: 20, price: 18000 },
];

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export interface ProductDef {
  id: ProductId;
  name: string;
  kr: string;
  icon: string;
  station: ProductStation;
  temp: "hot" | "cold" | "neutral";
  fair: number;
  brewTime: number;
  ingredients: Partial<Record<IngredientId, number>>;
  requiresTier?: number;
  requiresItem?: ItemId;
  weight: number;
  color: string;
  kidFav?: boolean;
}

export const PRODUCT_ORDER: ProductId[] = [
  "americano", "icedAmericano", "latte", "icedLatte", "einspanner", "dalgona", "misugaru", "yuja", "bingsu",
  "soboro", "croissant", "eggtart", "macaron", "honeybread",
  "croffle", "scone", "cheesecake", "eggSandwich", "streetToast", "brunch",
  "smoothie", "mangoSmoothie", "toastie", "friedChicken",
];

export const PRODUCTS: Record<ProductId, ProductDef> = {
  americano: { id: "americano", name: "Americano", kr: "아메리카노", icon: "☕", station: "machine", temp: "hot", fair: 4000, brewTime: 5, ingredients: { beans: 1 }, weight: 9, color: "#3b2416" },
  icedAmericano: { id: "icedAmericano", name: "Iced Americano", kr: "아이스 아메리카노", icon: "🧋", station: "machine", temp: "cold", fair: 4000, brewTime: 4, ingredients: { beans: 1, ice: 1 }, weight: 12, color: "#5a3a26" },
  latte: { id: "latte", name: "Café Latte", kr: "카페라떼", icon: "🥛", station: "machine", temp: "hot", fair: 4800, brewTime: 7, ingredients: { beans: 1, milk: 1 }, weight: 8, color: "#d9b58a" },
  icedLatte: { id: "icedLatte", name: "Iced Latte", kr: "아이스 라떼", icon: "🥤", station: "machine", temp: "cold", fair: 4800, brewTime: 6, ingredients: { beans: 1, milk: 1, ice: 1 }, weight: 8, color: "#c9a57a" },
  einspanner: { id: "einspanner", name: "Einspänner", kr: "아인슈페너", icon: "🍮", station: "machine", temp: "neutral", fair: 5800, brewTime: 8, ingredients: { beans: 1, milk: 1 }, requiresTier: 2, weight: 7, color: "#f1e3c8" },
  dalgona: { id: "dalgona", name: "Dalgona Latte", kr: "달고나 라떼", icon: "🍯", station: "machine", temp: "neutral", fair: 5500, brewTime: 9, ingredients: { beans: 1, milk: 1, syrup: 1 }, requiresItem: "blender", weight: 7, color: "#c98a3a", kidFav: true },
  misugaru: { id: "misugaru", name: "Misugaru Latte", kr: "미숫가루 라떼", icon: "🌾", station: "machine", temp: "cold", fair: 5000, brewTime: 7, ingredients: { misugaru: 1, milk: 1, ice: 1 }, requiresItem: "blender", weight: 6, color: "#b9a284" },
  yuja: { id: "yuja", name: "Yuja Tea", kr: "유자차", icon: "🍊", station: "machine", temp: "hot", fair: 4500, brewTime: 5, ingredients: { yuja: 1 }, weight: 5, color: "#f5b335", kidFav: true },
  bingsu: { id: "bingsu", name: "Patbingsu", kr: "팥빙수", icon: "🍧", station: "bingsu", temp: "cold", fair: 8900, brewTime: 8, ingredients: { ice: 2, redbean: 1, milk: 1 }, weight: 6, color: "#f4e4ee", kidFav: true },
  soboro: { id: "soboro", name: "Soboro Bread", kr: "소보로빵", icon: "🍞", station: "display", temp: "neutral", fair: 2800, brewTime: 0, ingredients: { soboro: 1 }, weight: 7, color: "#d9a05b", kidFav: true },
  croissant: { id: "croissant", name: "Croissant", kr: "크루아상", icon: "🥐", station: "display", temp: "neutral", fair: 3500, brewTime: 0, ingredients: { croissant: 1 }, weight: 6, color: "#e3a95a" },
  eggtart: { id: "eggtart", name: "Egg Tart", kr: "에그타르트", icon: "🥧", station: "display", temp: "neutral", fair: 3200, brewTime: 0, ingredients: { eggtart: 1 }, weight: 6, color: "#f2c45a", kidFav: true },
  macaron: { id: "macaron", name: "Ttungcaron", kr: "뚱카롱", icon: "🍬", station: "display", temp: "neutral", fair: 3800, brewTime: 0, ingredients: { macaron: 1 }, requiresItem: "displayDeluxe", weight: 6, color: "#f8a5c2", kidFav: true },
  honeybread: { id: "honeybread", name: "Honey Butter Bread", kr: "허니브레드", icon: "🍯", station: "display", temp: "neutral", fair: 6500, brewTime: 0, ingredients: { honeybread: 1 }, requiresItem: "displayDeluxe", weight: 4, color: "#e8b86d", kidFav: true },
  croffle: { id: "croffle", name: "Croffle", kr: "크로플", icon: "🧇", station: "oven", temp: "neutral", fair: 6500, brewTime: 8.6, ingredients: { flour: 1, butter: 1, bakingSoda: 1 }, weight: 6, color: "#d9a05b", kidFav: true },
  scone: { id: "scone", name: "Butter Scone", kr: "버터 스콘", icon: "🥯", station: "oven", temp: "neutral", fair: 5500, brewTime: 8.6, ingredients: { flour: 1, butter: 1, eggs: 1 }, weight: 5, color: "#e3b981" },
  cheesecake: { id: "cheesecake", name: "Basque Cheesecake", kr: "바스크 치즈케이크", icon: "🍰", station: "oven", temp: "neutral", fair: 8500, brewTime: 8.6, ingredients: { cheese: 1, eggs: 1, butter: 1 }, weight: 5, color: "#f1d9a8", kidFav: true },
  eggSandwich: { id: "eggSandwich", name: "Egg Sandwich", kr: "에그 샌드위치", icon: "🥪", station: "range", temp: "neutral", fair: 7000, brewTime: 5.2, ingredients: { eggs: 1, flour: 1 }, weight: 6, color: "#f5d76e" },
  streetToast: { id: "streetToast", name: "Street Toast", kr: "길거리 토스트", icon: "🍞", station: "range", temp: "hot", fair: 6000, brewTime: 5.2, ingredients: { eggs: 1, flour: 1, cheese: 1 }, weight: 7, color: "#e8a24a" },
  brunch: { id: "brunch", name: "Brunch Plate", kr: "브런치 플레이트", icon: "🍳", station: "range", temp: "hot", fair: 14500, brewTime: 5.2, ingredients: { eggs: 2, cheese: 1, butter: 1, flour: 1 }, weight: 4, color: "#f0c060" },
  smoothie: { id: "smoothie", name: "Berry Smoothie", kr: "베리 스무디", icon: "🫐", station: "blender", temp: "cold", fair: 7500, brewTime: 4, ingredients: { berries: 1, ice: 1, milk: 1, banana: 1 }, requiresItem: "industrialBlender", weight: 6, color: "#8e44ad", kidFav: true },
  mangoSmoothie: { id: "mangoSmoothie", name: "Mango Smoothie", kr: "망고 스무디", icon: "🥭", station: "blender", temp: "cold", fair: 7500, brewTime: 4, ingredients: { mango: 1, ice: 1, milk: 1 }, requiresItem: "industrialBlender", weight: 5, color: "#f5b335", kidFav: true },
  toastie: { id: "toastie", name: "Cheese Toastie", kr: "치즈 토스티", icon: "🧀", station: "toastie", temp: "hot", fair: 6500, brewTime: 6, ingredients: { flour: 1, cheese: 1, butter: 1 }, requiresItem: "toastie", weight: 7, color: "#f1c40f", kidFav: true },
  friedChicken: { id: "friedChicken", name: "Fried Chicken", kr: "후라이드 치킨", icon: "🍗", station: "range", temp: "hot", fair: 16000, brewTime: 5.2, ingredients: { meat: 1, flour: 1, eggs: 1 }, weight: 5, color: "#e8a24a" },
};

/** Which clean dish a product needs when eaten in. */
export const dishFor = (p: ProductDef): DishId => (p.station === "machine" || p.station === "blender" ? "mug" : p.id === "bingsu" || p.id === "brunch" ? "bowl" : "plate");
/** To-go packaging: drinks → cup, everything else → bag. */
export const packFor = (p: ProductDef): IngredientId => (p.station === "machine" || p.station === "blender" || p.station === "bingsu" ? "cups" : "bags");

export const DEFAULT_PRICES: Record<ProductId, number> = Object.fromEntries(PRODUCT_ORDER.map((id) => [id, PRODUCTS[id].fair])) as Record<ProductId, number>;

export const STARTING_INVENTORY: Record<IngredientId, number> = {
  beans: 8, milk: 4, ice: 0, syrup: 0, misugaru: 0, yuja: 0, redbean: 0,
  soboro: 0, croissant: 0, eggtart: 0, macaron: 0, honeybread: 0, cups: 24, bags: 10,
  flour: 0, eggs: 0, butter: 0, cheese: 0, bakingSoda: 0, berries: 0, mango: 0, banana: 0, meat: 0, icecream: 0,
  mug: 8, plate: 6, bowl: 4, spoon: 12,
};

// ---------------------------------------------------------------------------
// Items — everything physical in the café
// ---------------------------------------------------------------------------
export interface ItemDef {
  id: ItemId;
  name: string;
  kr?: string;
  icon: string;
  category: ItemCategory;
  shop: ShopId;
  price: number;
  size: [number, number]; // footprint w × d (metres), front faces +z
  ambience: number;
  desc: string;
  seats?: [number, number][]; // local seat offsets
  power?: number; // ₩ per day while in use
  powerSeason?: "summer" | "winter" | "both";
  cool?: number;
  heat?: number;
  station?: StationKind;
  tier?: 1 | 2 | 3;
  storage?: StorageKind;
  capacity?: number;
  grinder?: boolean;
  infiniteIce?: boolean;
  light?: boolean;
  outdoor?: boolean;
  noCollide?: boolean;
  height?: number;
  kitchenOnly?: boolean;
  /** height of a usable flat top (metres) — small items can be placed on it */
  surface?: number;
  /** snaps onto a free prebuilt appliance slot in the kitchen */
  slot?: boolean;
  /** number of baking trays (oven) — items per batch = trays × 4 */
  trays?: number;
  /** prep minigame this appliance removes */
  autoPrep?: "dough" | "chop";
  /** auto-washes dishes */
  autoWash?: boolean;
}

const CORE_ITEMS: Record<string, ItemDef> = {
  counter: { id: "counter", name: "Service Counter", kr: "카운터", icon: "🧾", category: "fixture", shop: "hardware", price: 600000, size: [4, 1], ambience: 2, surface: 1.06, desc: "Customers queue in front of it. Small appliances (EFTPOS, blenders) can sit on top." },
  pantry: { id: "pantry", name: "Pantry Shelf", kr: "선반", icon: "🗄️", category: "fixture", shop: "hardware", price: 180000, size: [1.2, 0.5], ambience: 1, desc: "Dry storage: beans, powders, cups and bags.", storage: "pantry", capacity: 120 },
  trash: { id: "trash", name: "Trash Bin", icon: "🗑️", category: "fixture", shop: "hardware", price: 30000, size: [0.5, 0.5], ambience: 0, desc: "For mistakes." },
  table2: { id: "table2", name: "Café Table (2 seats)", kr: "2인 테이블", icon: "🪑", category: "furniture", shop: "hardware", price: 280000, size: [1, 1], ambience: 6, surface: 0.77, desc: "Round oak table with two chairs. Small items fit on top.", seats: [[0, -0.75], [0, 0.75]] },
  table4: { id: "table4", name: "Family Table (4 seats)", kr: "4인 테이블", icon: "🪑", category: "furniture", shop: "hardware", price: 450000, size: [1.4, 1.4], ambience: 8, surface: 0.77, desc: "Square table for groups. Small items fit on top.", seats: [[0, -0.95], [0, 0.95], [-0.95, 0], [0.95, 0]] },
  sofaSet: { id: "sofaSet", name: "Sofa Lounge Set", kr: "소파 세트", icon: "🛋️", category: "furniture", shop: "living", price: 900000, size: [2.4, 1.8], ambience: 14, desc: "Low table with sofas. Groups love it.", seats: [[-0.6, -0.65], [0.6, -0.65], [-0.6, 0.65], [0.6, 0.65]] },
  plant: { id: "plant", name: "Potted Fern", icon: "🪴", category: "decor", shop: "living", price: 60000, size: [0.5, 0.5], ambience: 4, desc: "A little green." },
  plantBig: { id: "plantBig", name: "Monstera", icon: "🌿", category: "decor", shop: "living", price: 90000, size: [0.7, 0.7], ambience: 5, desc: "Big leafy friend." },
  art1: { id: "art1", name: "Hongdae Mural Print", icon: "🖼️", category: "decor", shop: "living", price: 140000, size: [1.5, 0.25], ambience: 6, desc: "Street-art colours. Lean it against a wall.", noCollide: true },
  art2: { id: "art2", name: "K-Indie Gig Posters", icon: "🎸", category: "decor", shop: "living", price: 160000, size: [1.5, 0.25], ambience: 7, desc: "Framed posters from the live clubs.", noCollide: true },
  rug: { id: "rug", name: "Cozy Rug", icon: "🧶", category: "decor", shop: "living", price: 200000, size: [3, 2], ambience: 8, desc: "Softens the whole room.", noCollide: true },
  bookshelf: { id: "bookshelf", name: "Bookshelf", icon: "📚", category: "decor", shop: "living", price: 250000, size: [1.4, 0.4], ambience: 8, desc: "Webtoons and travel books." },
  speaker: { id: "speaker", name: "Bluetooth Speaker", icon: "🔊", category: "decor", shop: "living", price: 220000, size: [0.4, 0.4], ambience: 8, desc: "K-indie and lo-fi beats.", power: 500, powerSeason: "both" },
  pendantLamp: { id: "pendantLamp", name: "Pendant Lamp", icon: "💡", category: "decor", shop: "living", price: 120000, size: [0.6, 0.6], ambience: 5, desc: "Warm hanging light. Hangs above wherever you place it.", power: 1000, powerSeason: "both", light: true, noCollide: true },
  floorLamp: { id: "floorLamp", name: "Floor Lamp", icon: "🕯️", category: "decor", shop: "living", price: 90000, size: [0.4, 0.4], ambience: 4, desc: "Cozy corner light.", power: 800, powerSeason: "both", light: true },
  patioSet: { id: "patioSet", name: "Patio Set", kr: "야외 테이블", icon: "⛱️", category: "furniture", shop: "hardware", price: 450000, size: [2, 2], ambience: 10, surface: 0.75, desc: "Outdoor table with a parasol. Place it on the terrace out front.", seats: [[-0.75, 0], [0.75, 0]], outdoor: true },
  flowerBox: { id: "flowerBox", name: "Flower Box", icon: "🌸", category: "decor", shop: "living", price: 80000, size: [1.6, 0.4], ambience: 5, desc: "Curb appeal for the terrace.", outdoor: true },
  sink: { id: "sink", name: "Sink Unit", kr: "싱크대", icon: "🚰", category: "utility", shop: "hardware", price: 250000, size: [0.9, 0.6], ambience: 1, desc: "Wash dirty dishes here (scrub minigame). Moves to the kitchen when you upgrade it." },
  dishRack: { id: "dishRack", name: "Dish Rack", kr: "식기 건조대", icon: "🍽️", category: "utility", shop: "hardware", price: 80000, size: [1.0, 0.5], ambience: 1, desc: "Clean mugs, plates, bowls and cutlery live here. Capacity 40.", storage: "rack", capacity: 40 },
  cupboard: { id: "cupboard", name: "Utility Cupboard", kr: "수납장", icon: "🚪", category: "utility", shop: "hardware", price: 120000, size: [1.2, 0.5], ambience: 1, desc: "To-go cups and lids are stored here. Capacity 200.", storage: "cupboard", capacity: 200 },
  dryCupboard: { id: "dryCupboard", name: "Ingredient Cupboard", kr: "식재료 찬장", icon: "🫙", category: "utility", shop: "hardware", price: 220000, size: [1.2, 0.5], ambience: 2, desc: "Dry baking goods: flour, baking soda, bananas. Pantry capacity 120.", storage: "pantry", capacity: 120 },
  worktop: { id: "worktop", name: "Prep Worktop", kr: "작업대", icon: "🧑‍🍳", category: "countertop", shop: "hardware", price: 300000, size: [1.6, 0.7], ambience: 3, surface: 0.96, desc: "Extra counter space behind the counter, in the back room or the kitchen. Put countertop appliances on it." },
  tv: { id: "tv", name: "Wall TV", kr: "TV", icon: "📺", category: "decor", shop: "living", price: 700000, size: [1.4, 0.15], ambience: 8, desc: "Games and music videos on the wall. Choose the playlist in CaféOS → Ambience.", power: 1500, powerSeason: "both", light: true, noCollide: true },
  industrialBlender: { id: "industrialBlender", name: "Industrial Blender", kr: "대형 블렌더", icon: "🌀", category: "kitchen", shop: "appliance", price: 2600000, size: [0.8, 0.7], ambience: 6, desc: "Smoothies for the whole street. Baristas work this station. Kitchen slot.", station: "blender", slot: true, power: 4000, powerSeason: "both", kitchenOnly: true },
  toastie: { id: "toastie", name: "Toastie Press", kr: "토스티기", icon: "🥪", category: "countertop", shop: "appliance", price: 650000, size: [0.5, 0.5], ambience: 3, desc: "Countertop cheese toasties — no kitchen needed. Place on a worktop, behind the counter, or in the back room. Any staff can use it.", station: "toastie", power: 2500, powerSeason: "both" },
  doughSheeter: { id: "doughSheeter", name: "Dough Sheeter", kr: "반죽 밀대", icon: "🥖", category: "kitchen", shop: "appliance", price: 1800000, size: [0.9, 0.7], ambience: 4, desc: "Rolls dough automatically in 2.5s instead of the 6s minigame. Kitchen slot.", slot: true, autoPrep: "dough", power: 2000, powerSeason: "both", kitchenOnly: true },
  foodProcessor: { id: "foodProcessor", name: "Food Processor", kr: "푸드프로세서", icon: "🔪", category: "kitchen", shop: "appliance", price: 1200000, size: [0.6, 0.6], ambience: 3, desc: "Chops and mixes prep in 2.5s instead of 6s by hand. Kitchen slot.", slot: true, autoPrep: "chop", power: 1500, powerSeason: "both", kitchenOnly: true },
  dishwasher: { id: "dishwasher", name: "Dishwasher", kr: "식기세척기", icon: "🫧", category: "utility", shop: "appliance", price: 1500000, size: [0.7, 0.7], ambience: 3, desc: "Washes a whole pile in 4s with no minigame. Place in the utility room or kitchen.", autoWash: true, power: 3000, powerSeason: "both" },
  mixer: { id: "mixer", name: "Stand Mixer", kr: "스탠드ミキ서", icon: "🥣", category: "kitchen", shop: "appliance", price: 900000, size: [0.6, 0.6], ambience: 3, desc: "Mixes dough and batter. Bakes 25% faster. Kitchen slot.", slot: true, power: 1200, powerSeason: "both", kitchenOnly: true },
  ovenLarge: { id: "ovenLarge", name: "Double Deck Oven", kr: "더블 오븐", icon: "🔥", category: "kitchen", shop: "appliance", price: 4200000, size: [1.0, 0.8], ambience: 6, desc: "6 trays — bake up to 24 items per batch. Kitchen slot.", station: "oven", trays: 6, slot: true, power: 8000, powerSeason: "both", kitchenOnly: true },
  ovenConveyor: { id: "ovenConveyor", name: "Conveyor Oven", kr: "컨베이어 오븐", icon: "⚙️", category: "kitchen", shop: "appliance", price: 7500000, size: [1.2, 0.8], ambience: 10, desc: "12 trays and 30% faster baking. The pizza-oven of bakeries. Kitchen slot.", station: "oven", trays: 12, slot: true, power: 12000, powerSeason: "both", kitchenOnly: true },
  grillBasic: { id: "grillBasic", name: "Basic Grill", kr: "기본 그릴", icon: "🍖", category: "kitchen", shop: "appliance", price: 0, size: [1.2, 0.8], ambience: 4, desc: "Comes free with the full kitchen. Frying and grilling. Kitchen slot.", station: "range", slot: true, power: 5000, powerSeason: "both", kitchenOnly: true },
  grillPro: { id: "grillPro", name: "Pro Grill Station", kr: "프로 그릴", icon: "🔥", category: "kitchen", shop: "appliance", price: 3200000, size: [1.4, 0.8], ambience: 8, desc: "Double the throughput, half the smoke. Kitchen slot.", station: "range", slot: true, power: 8000, powerSeason: "both", kitchenOnly: true },
  eftpos: { id: "eftpos", name: "EFTPOS Terminal", kr: "카드단말기", icon: "💳", category: "countertop", shop: "appliance", price: 900000, size: [0.45, 0.45], ambience: 2, noCollide: true, desc: "Ring orders up here and take card payments — every customer must be rung up and confirmed, then they pay. Buy a second one so two cashiers can work the counter at once." },
  kiosk: { id: "kiosk", name: "Self-Order Kiosk", kr: "키오스크", icon: "🖥️", category: "countertop", shop: "appliance", price: 2500000, size: [0.8, 0.8], ambience: 4, noCollide: true, desc: "Customers ring themselves up at the stand — no staff needed at the counter, transactions are much faster." },
  freezerShelf: { id: "freezerShelf", name: "Freezer Shelf", kr: "냉동 선반", icon: "🧊", category: "utility", shop: "hardware", price: 150000, size: [1.0, 0.6], ambience: 2, desc: "Goes inside the walk-in freezer. Meat, ice cream and anything frozen must be stored here or it spoils.", storage: "freezer", capacity: 40 },
  prepTable: { id: "prepTable", name: "Big Prep Table", kr: "대형 조리대", icon: "🪵", category: "countertop", shop: "hardware", price: 450000, size: [2.4, 0.9], ambience: 4, surface: 0.96, desc: "A big stainless worktop. Place blenders, presses and more appliances on it." },
  servingCart: { id: "servingCart", name: "Serving Cart", kr: "서빙 카트", icon: "🛒", category: "furniture", shop: "hardware", price: 320000, size: [0.9, 0.6], ambience: 5, surface: 0.75, desc: "Rolling cart with a flat top — appliances or stock can sit on it." },
  wallShelf: { id: "wallShelf", name: "Wall Shelf", kr: "벽 선반", icon: "🪵", category: "decor", shop: "living", price: 90000, size: [1.2, 0.35], ambience: 3, surface: 1.0, noCollide: true, desc: "Lean against a wall. Small decor, plants and tabletop gear fit on it." },
  fan: { id: "fan", name: "Standing Fan", kr: "선풍기", icon: "🌬️", category: "climate", shop: "hardware", price: 80000, size: [0.5, 0.5], ambience: 0, desc: "Half-decent cooling. Two of them equal one air-con.", cool: 0.5, power: 2000, powerSeason: "summer" },
  ac: { id: "ac", name: "Stand Air Conditioner", kr: "스탠드 에어컨", icon: "❄️", category: "climate", shop: "hardware", price: 1300000, size: [0.5, 0.45], ambience: 3, desc: "Full cooling for the whole café.", cool: 1, power: 15000, powerSeason: "summer" },
  heater: { id: "heater", name: "Space Heater", kr: "난로", icon: "🔥", category: "climate", shop: "hardware", price: 150000, size: [0.5, 0.35], ambience: 2, desc: "Half-strength heating. Two of them keep the café warm.", heat: 0.5, power: 9000, powerSeason: "winter" },
  hvac: { id: "hvac", name: "System Aircon", kr: "냉난방기", icon: "🌡️", category: "climate", shop: "hardware", price: 3200000, size: [0.9, 0.9], ambience: 6, desc: "Ceiling cassette that cools in summer and heats in winter. Mounts above wherever you place it.", cool: 1, heat: 1, power: 18000, powerSeason: "both", noCollide: true },
  espresso1: { id: "espresso1", name: "Old Espresso Machine", icon: "☕", category: "machine", shop: "appliance", price: 900000, size: [1.2, 0.7], ambience: 2, desc: "Slow but it works. Americanos, lattes, yuja tea.", station: "machine", tier: 1, power: 3000, powerSeason: "both" },
  espresso2: { id: "espresso2", name: "Barista Pro 2000", icon: "☕", category: "machine", shop: "appliance", price: 2500000, size: [1.2, 0.7], ambience: 6, desc: "Brews 40% faster and unlocks Einspänner.", station: "machine", tier: 2, power: 4000, powerSeason: "both" },
  espresso3: { id: "espresso3", name: "La Suprema X", icon: "✨", category: "machine", shop: "appliance", price: 6000000, size: [1.4, 0.7], ambience: 12, desc: "Top of the line. Brews 65% faster.", station: "machine", tier: 3, power: 5000, powerSeason: "both" },
  grinder: { id: "grinder", name: "Burr Grinder", icon: "⚙️", category: "machine", shop: "appliance", price: 500000, size: [0.5, 0.5], ambience: 2, desc: "Fresher espresso. All machines brew 15% faster.", grinder: true, power: 800, powerSeason: "both" },
  blender: { id: "blender", name: "Blender Station", icon: "🌀", category: "machine", shop: "appliance", price: 450000, size: [0.6, 0.6], ambience: 2, desc: "Unlocks Dalgona and Misugaru lattes at any espresso machine.", power: 1500, powerSeason: "both" },
  bingsuMachine: { id: "bingsuMachine", name: "Bingsu Ice Shaver", icon: "🍧", category: "machine", shop: "appliance", price: 1800000, size: [0.8, 0.7], ambience: 5, desc: "A second station. Patbingsu is the summer money maker.", station: "bingsu", power: 3000, powerSeason: "both" },
  iceMaker: { id: "iceMaker", name: "Ice Maker", icon: "🧊", category: "machine", shop: "appliance", price: 1200000, size: [0.6, 0.7], ambience: 2, desc: "Unlimited ice. Iced drinks no longer use ice from the fridge.", infiniteIce: true, power: 5000, powerSeason: "both" },
  fridgeSmall: { id: "fridgeSmall", name: "Café Fridge", kr: "냉장고", icon: "🧊", category: "fixture", shop: "appliance", price: 600000, size: [0.7, 0.7], ambience: 1, desc: "Cold storage for milk, ice, yuja and red beans (60 units).", storage: "fridge", capacity: 60, power: 3000, powerSeason: "both" },
  fridgeLarge: { id: "fridgeLarge", name: "Double-door Fridge", kr: "업소용 냉장고", icon: "🧊", category: "fixture", shop: "appliance", price: 1600000, size: [1.4, 0.8], ambience: 2, desc: "Big cold storage (160 units).", storage: "fridge", capacity: 160, power: 5000, powerSeason: "both" },
  displaySmall: { id: "displaySmall", name: "Display Case", kr: "쇼케이스", icon: "🍞", category: "fixture", shop: "appliance", price: 500000, size: [1.5, 0.8], ambience: 3, desc: "Holds 30 pastries. Customers take their bread from here.", storage: "display", capacity: 30 },
  oven: { id: "oven", name: "Convection Oven", kr: "컨벡션 오븐", icon: "🥐", category: "kitchen", shop: "appliance", price: 2200000, size: [0.9, 0.8], ambience: 4, desc: "2 trays — bake up to 8 per batch, 20 in-game minutes per bake. Needs the half kitchen and a free appliance slot.", station: "oven", trays: 2, slot: true, power: 6000, powerSeason: "both", kitchenOnly: true },
  range: { id: "range", name: "Cooking Range", kr: "업소용 가스레인지", icon: "🍳", category: "kitchen", shop: "appliance", price: 1900000, size: [1.2, 0.8], ambience: 4, desc: "Legacy range — replaced by grills. Still works for range dishes.", station: "range", power: 4000, powerSeason: "both", kitchenOnly: true },
  warmer: { id: "warmer", name: "Hot Food Warmer", kr: "온장고", icon: "🍱", category: "fixture", shop: "appliance", price: 900000, size: [1.2, 0.7], ambience: 3, desc: "Heated glass case for cooked goods. Cooks and bakers can batch-make croffles, scones, toast etc. ahead of time; customers order straight from it (needs the kitchen).", storage: "warmer", capacity: 24, power: 2500, powerSeason: "both" },
  displayDeluxe: { id: "displayDeluxe", name: "Deluxe Chilled Display", kr: "냉장 쇼케이스", icon: "🍰", category: "fixture", shop: "appliance", price: 1200000, size: [1.9, 0.8], ambience: 8, desc: "Holds 60 pastries and unlocks Ttungcarons and Honey Butter Bread.", storage: "display", capacity: 60, power: 2500, powerSeason: "both" },
};

/** Catalogue decor → ItemDef (same placement / seat / power machinery as core items). */
export function decorToItem(d: DecorDef): ItemDef {
  return {
    id: `decor:${d.id}`,
    name: d.name,
    kr: d.kr,
    icon: d.icon,
    category: d.section === "seating" || d.section === "tables" ? "furniture" : "decor",
    shop: "living",
    price: d.price,
    size: d.size,
    ambience: d.ambience,
    desc: d.desc,
    seats: d.seats,
    power: d.power,
    powerSeason: d.power ? "both" : undefined,
    light: d.light,
    outdoor: d.outdoor,
    noCollide: d.noCollide,
    surface: d.surface,
  };
}

export const ITEMS: Record<ItemId, ItemDef> = { ...CORE_ITEMS, ...Object.fromEntries(DECOR.map((d) => [`decor:${d.id}`, decorToItem(d)])) } as Record<ItemId, ItemDef>;
export const ITEM_LIST = Object.values(ITEMS);
export const shopItems = (shop: ShopId) => ITEM_LIST.filter((i) => i.shop === shop);
export const decorOf = (id: ItemId): DecorDef | null => (id.startsWith("decor:") ? DECOR.find((d) => d.id === id.slice(6)) ?? null : null);

export const STARTING_PLACED: Omit<PlacedItem, "uid">[] = [
  { item: "counter", x: -1.5, z: -5.45, rot: 0, floor: 0 },
  { item: "eftpos", x: -0.7, z: -5.45, rot: 0, floor: 0, onUid: 100 },
  { item: "espresso1", x: -3.9, z: -5.3, rot: 0, floor: 0 },
  { item: "fridgeSmall", x: 1.4, z: -5.3, rot: 0, floor: 0 },
  { item: "trash", x: 2.8, z: -5.3, rot: 0, floor: 0 },
  // utility room (back): sink, dish rack, cupboard for to-go cups
  // utility room, arranged around its three doors (alley door south, bedroom door west, café door north)
  { item: "sink", x: 0.9, z: -9.55, rot: 0, floor: 0 },
  { item: "cupboard", x: 0.8, z: -8.6, rot: 3, floor: 0 },
  { item: "dishRack", x: -1.4, z: -9.35, rot: 1, floor: 0 },
  { item: "dryCupboard", x: 0.8, z: -7.35, rot: 3, floor: 0 },
];

// ---------------------------------------------------------------------------
// Installations (construction & services, ordered from CaféOS)
// ---------------------------------------------------------------------------
export interface InstallationDef {
  id: InstallationId;
  name: string;
  icon: string;
  price: number;
  rent: number; // added monthly rent
  power?: number; // ₩/day
  powerSeason?: "summer" | "winter" | "both";
  ambience: number;
  desc: string;
  requires?: InstallationId;
}

export const INSTALLATIONS: InstallationDef[] = [
  { id: "sign", name: "Neon Sign", icon: "🪧", price: 800000, rent: 0, power: 2000, powerSeason: "both", ambience: 6, desc: "Your café name in neon above the door. +30% visibility on the street." },
  { id: "deliveryApp", name: "Delivery App Listing", icon: "🛵", price: 300000, rent: 0, ambience: 0, desc: "List the café on 배달의민족. Riders come to pick up to-go orders (+₩1,500 per order, needs cups & bags)." },
  { id: "ext_front", name: "Front Extension", icon: "🏗️", price: 3000000, rent: 500000, ambience: 10, desc: "Knock through to the empty unit next door — a second room running the full depth of the building." },
  { id: "toilet", name: "Customer Toilet", icon: "🚻", price: 1500000, rent: 100000, ambience: 10, desc: "Fit out the rear of the extension as a restroom. Customers stay longer; groups prefer it.", requires: "ext_front" },
  { id: "floor2", name: "Second Floor + Stairwell", icon: "🪜", price: 5000000, rent: 800000, ambience: 15, desc: "Take over the apartment above. A spiral stairwell tower is built onto the left side of the building — no floor space lost downstairs. Floor 2 has windows front and side." },
  { id: "floor3", name: "Third Floor", icon: "🏢", price: 6000000, rent: 800000, ambience: 15, desc: "The stairwell climbs one more storey — a third room with the Hongdae rooftop view.", requires: "floor2" },
  { id: "balcony", name: "2F Balcony", icon: "🌇", price: 2000000, rent: 200000, ambience: 12, desc: "A railed balcony off the second floor, over the terrace. Outdoor seating with a street view — and it shelters the terrace below from rain.", requires: "floor2" },
  { id: "kitchen", name: "Half Kitchen", icon: "🥐", price: 3000000, rent: 250000, power: 3000, powerSeason: "both", ambience: 6, desc: "Convert the storage room behind the café into a small open kitchen with a pass window onto the main room. 1 prebuilt appliance slot, baker roles only, +2 staff cap. Baked goods only.", requires: "ext_front" },
  { id: "kitchen2", name: "Full Kitchen + Freezer", icon: "👨‍🍳", price: 8000000, rent: 550000, power: 6000, powerSeason: "both", ambience: 14, desc: "Expand to a full kitchen: 4 appliance slots, comes with a basic grill, cook & head chef roles, +2 more staff, and a walk-in freezer for meat and frozen goods (buy freezer shelves).", requires: "kitchen" },
  { id: "styleApp", name: "Style Studio App", icon: "🎨", price: 600000, rent: 0, ambience: 4, desc: "Hire a designer friend to set up the Style Studio in CaféOS: paint the walls, pick floor patterns and ceilings per floor, restyle the kitchen and the façade." },
  { id: "basement", name: "Basement Lounge", icon: "🕳️", price: 4000000, rent: 400000, ambience: 15, desc: "Dig out the basement for a cozy underground lounge. Uses the stairwell tower (built if you don't have it yet)." },
  { id: "floorHeat", name: "Ondol Floor Heating", icon: "♨️", price: 1600000, rent: 0, power: 20000, powerSeason: "winter", ambience: 6, desc: "Traditional Korean floor heating for the whole café. Full-strength warmth in winter." },
];

export const INSTALLATION_MAP = Object.fromEntries(INSTALLATIONS.map((i) => [i.id, i])) as Record<InstallationId, InstallationDef>;

export const MACHINE_TIERS: Record<1 | 2 | 3, { speed: number }> = { 1: { speed: 1 }, 2: { speed: 0.6 }, 3: { speed: 0.35 } };

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------
export interface CompetitorDef {
  id: string;
  name: string;
  kr: string;
  color: string;
  textColor: string;
  desc: string;
  rating0: number;
  ratingCap: number;
  priceRatio: number;
  ambience: number;
  seasonBoost: Partial<Record<Season, number>>;
  signature: string;
  door: [number, number, number];
  position: [number, number];
  facing: "N" | "S";
  floors: 1 | 2;
  width: number;
}

export const COMPETITORS: CompetitorDef[] = [
  { id: "giga", name: "Giga Coffee", kr: "기가커피", color: "#f9ca24", textColor: "#2d2d2d", desc: "Low-cost franchise. ₩2,000 iced americanos the size of a bucket.", rating0: 3.6, ratingCap: 4.0, priceRatio: 0.6, ambience: 10, seasonBoost: { summer: 1.4, winter: 0.9 }, signature: "₩2,000 Iced Americano", door: [-27, 0, 17.4], position: [-27, 24], facing: "N", floors: 1, width: 10 },
  { id: "starbeans", name: "Starbeans", kr: "스타빈스", color: "#1e8449", textColor: "#f4fff6", desc: "Global chain. Pricey, but the sofas upstairs and the Wi-Fi are excellent.", rating0: 4.2, ratingCap: 4.6, priceRatio: 1.35, ambience: 65, seasonBoost: { winter: 1.25, autumn: 1.1 }, signature: "₩5,900 Latte", door: [19, 0, 29.4], position: [19, 36], facing: "N", floors: 2, width: 14 },
  { id: "haru", name: "Haru Dessert", kr: "하루 디저트", color: "#f8a5c2", textColor: "#4a2030", desc: "Instagram-famous strawberry cakes. Weekend queues around the block.", rating0: 4.0, ratingCap: 4.5, priceRatio: 1.1, ambience: 45, seasonBoost: { spring: 1.25, autumn: 1.15 }, signature: "₩9,500 Strawberry Cake", door: [-35.75, 0, 5.1], position: [-35.75, -1.5], facing: "S", floors: 1, width: 8.5 },
];

export const COMPETITOR_MAP = Object.fromEntries(COMPETITORS.map((c) => [c.id, c])) as Record<string, CompetitorDef>;
export const initialCompetitors = (): CompetitorState[] => COMPETITORS.map((c) => ({ id: c.id, rating: c.rating0, promo: 1, promoText: null }));

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------
export interface QuestContext {
  stats: Stats;
  inventory: Record<IngredientId, number>;
  reviewCount: number;
  rating: number;
  seats: number;
  installations: Partial<Record<InstallationId, boolean>>;
  placed: PlacedItem[];
  money: number;
  share: number;
  day: number;
  staffWithRoles: number;
  styled: boolean;
}

export interface QuestDef {
  id: string;
  /** quests appear from this day onward (day 1 = tutorial) */
  fromDay: number;
  title: string;
  desc: string;
  goal: number;
  reward: number;
  progress: (c: QuestContext) => number;
  format?: (v: number) => string;
}

const pct = (v: number) => `${v}%`;
const has = (c: QuestContext, id: ItemId) => c.placed.some((p) => p.item === id);

export const QUESTS: QuestDef[] = [
  // ---- Day 1: basic loop only ----
  { id: "first", fromDay: 1, title: "Grand Opening", desc: "Serve your first customer (brew it, ring them up at the EFTPOS, hand it over).", goal: 1, reward: 150000, progress: (c) => c.stats.servedTotal },
  { id: "pos", fromDay: 1, title: "Ring Up", desc: "Take a payment at the EFTPOS — every customer pays before they get their order.", goal: 1, reward: 80000, progress: (c) => c.stats.posSales },
  { id: "stock", fromDay: 1, title: "Stock Up for Tomorrow", desc: "Order more coffee beans, milk and to-go cups from Minji's Mart and unpack them.", goal: 1, reward: 120000, progress: (c) => { const n = (c.inventory.beans >= 10 ? 1 : 0) + (c.inventory.milk >= 4 ? 1 : 0) + (c.inventory.cups >= 40 ? 1 : 0); return n / 3; }, format: (v) => `${Math.round(v * 100)}%` },
  { id: "seats", fromDay: 1, title: "First Tables", desc: "Buy a table at Hongdae Hardware, carry the box in and place it (2 seats).", goal: 2, reward: 250000, progress: (c) => c.seats },
  // ---- Day 2+ ----
  { id: "hire", fromDay: 2, title: "Help Wanted", desc: "Hire someone from CaféOS → Staff and give them a role.", goal: 1, reward: 300000, progress: (c) => c.staffWithRoles },
  { id: "dinein", fromDay: 2, title: "Dine-In Ready", desc: "Have 2+ seats and buy a dish pack from the mart.", goal: 1, reward: 200000, progress: (c) => (c.seats >= 2 && c.inventory.plate + c.inventory.mug > 0 ? 1 : 0) },
  { id: "dishes", fromDay: 2, title: "Wash Up", desc: "Wash a pile of dirty dishes at the sink (scrub with Space, or buy a dishwasher).", goal: 1, reward: 150000, progress: (c) => c.stats.washes },
  { id: "pastries", fromDay: 3, title: "Pastry Case", desc: "Buy a display case at the appliance store, stock it and serve a pastry.", goal: 1, reward: 400000, progress: (c) => ((has(c, "displaySmall") || has(c, "displayDeluxe")) && c.stats.pastryServed > 0 ? 1 : 0) },
  { id: "bake", fromDay: 3, title: "First Batch", desc: "Build the half kitchen, place an oven in a slot and bake a batch.", goal: 1, reward: 800000, progress: (c) => c.stats.batches },
  { id: "smoothie", fromDay: 4, title: "Smooth Move", desc: "Buy the industrial blender and fruit, then sell a smoothie.", goal: 1, reward: 600000, progress: (c) => (has(c, "industrialBlender") && c.stats.smoothieServed > 0 ? 1 : 0) },
  { id: "rating3", fromDay: 4, title: "Rising Star", desc: "Reach a 3.0★ reputation.", goal: 30, reward: 1000000, progress: (c) => Math.round(c.rating * 10), format: (v) => (v / 10).toFixed(1) },
  { id: "fullkitchen", fromDay: 5, title: "Full Kitchen", desc: "Upgrade to the full kitchen, fit the freezer and store frozen goods correctly.", goal: 1, reward: 1500000, progress: (c) => (c.installations.kitchen2 && has(c, "freezerShelf") && (c.inventory.meat > 0 || c.inventory.icecream > 0) ? 1 : 0) },
  { id: "share20", fromDay: 5, title: "Hongdae Contender", desc: "Reach 20% market share on the street.", goal: 20, reward: 1500000, progress: (c) => Math.round(c.share * 100), format: pct },
  { id: "earn5m", fromDay: 7, title: "Cash Flow", desc: "Earn ₩5,000,000 in total sales.", goal: 5000000, reward: 750000, progress: (c) => Math.floor(c.stats.earnedTotal), format: (v) => money(v) },
  { id: "rating4", fromDay: 8, title: "Talk of the Town", desc: "Reach a 4.0★ reputation.", goal: 40, reward: 2500000, progress: (c) => Math.round(c.rating * 10), format: (v) => (v / 10).toFixed(1) },
  { id: "served100", fromDay: 9, title: "Neighbourhood Favourite", desc: "Serve 100 customers in total.", goal: 100, reward: 1500000, progress: (c) => c.stats.servedTotal },
  { id: "share40", fromDay: 10, title: "King of the Street", desc: "Reach 40% market share.", goal: 40, reward: 4000000, progress: (c) => Math.round(c.share * 100), format: pct },
  { id: "summer", fromDay: 15, title: "Survive Spring", desc: "Make it to the first day of summer.", goal: 15, reward: 800000, progress: (c) => c.day },
];

// ---------------------------------------------------------------------------
// Formulas
// ---------------------------------------------------------------------------
/** Star rating derived from reputation (see reputation.ts for level caps). */
export function getRating(rep: number): number {
  return getStars(rep);
}

export const hasItem = (placed: PlacedItem[], id: ItemId) => placed.some((p) => p.item === id);
export const placedOf = (placed: PlacedItem[], pred: (d: ItemDef) => boolean) => placed.filter((p) => pred(ITEMS[p.item]));

export function getBestTier(placed: PlacedItem[]): number {
  return placed.reduce((m, p) => Math.max(m, ITEMS[p.item].tier ?? 0), 0);
}

export function getBrewTime(product: ProductDef, placed: PlacedItem[], tier: number): number {
  if (product.station !== "machine") return product.brewTime;
  let t = product.brewTime * MACHINE_TIERS[(clamp(tier, 1, 3) as 1 | 2 | 3)].speed;
  if (placed.some((p) => ITEMS[p.item].grinder)) t *= 0.85;
  return Math.max(1.2, t);
}

export function getAmbience(s: Pick<EconomyState, "placed" | "installations">): number {
  let a = 0;
  for (const p of s.placed) a += ITEMS[p.item].ambience;
  for (const i of INSTALLATIONS) if (s.installations[i.id]) a += i.ambience;
  return a;
}

export function getCapacity(s: Pick<EconomyState, "placed" | "installations">): Capacity {
  let cool = 0;
  let heat = s.installations.floorHeat ? 1 : 0;
  for (const p of s.placed) {
    cool += ITEMS[p.item].cool ?? 0;
    heat += ITEMS[p.item].heat ?? 0;
  }
  return { cool: Math.min(1, cool), heat: Math.min(1, heat) };
}

export function getStorageCapacity(placed: PlacedItem[], kind: StorageKind): number {
  return placed.reduce((a, p) => a + (ITEMS[p.item].storage === kind ? ITEMS[p.item].capacity ?? 0 : 0), 0);
}

export function getStorageUsed(inventory: Record<IngredientId, number>, kind: StorageKind): number {
  return INGREDIENT_ORDER.reduce((a, id) => a + (INGREDIENTS[id].storage === kind ? inventory[id] * INGREDIENTS[id].size : 0), 0);
}

/** Products currently unlocked by the equipment in the café. */
export function getMenu(s: Pick<EconomyState, "placed" | "menuOn">): ProductDef[] {
  const tier = getBestTier(s.placed);
  return PRODUCT_ORDER.map((id) => PRODUCTS[id]).filter((p) => {
    if (s.menuOn?.[p.id] === false) return false;
    if (p.station === "machine" && tier === 0) return false;
    if (p.station === "bingsu" && !hasItem(s.placed, "bingsuMachine")) return false;
    if (p.station === "oven" && !hasItem(s.placed, "oven")) return false;
    if (p.station === "range" && !hasItem(s.placed, "range")) return false;
    if (p.station === "display" && !s.placed.some((x) => ITEMS[x.item].storage === "display")) return false;
    if (p.requiresTier && tier < p.requiresTier) return false;
    if (p.requiresItem && !hasItem(s.placed, p.requiresItem)) return false;
    return true;
  });
}

/** What a customer may order right now: unlocked by equipment AND makeable from stock (or sitting in the warmer). */
export function orderable(s: Pick<EconomyState, "inventory" | "placed"> & { warmer?: Partial<Record<ProductId, number>> }): ProductDef[] {
  return getMenu(s).filter((p) => canMake(s, p) || ((s.warmer?.[p.id] ?? 0) > 0 && s.placed.some((x) => x.item === "warmer")));
}

/** Products a specific station can make. */
export function stationMenu(s: Pick<EconomyState, "placed">, placed: PlacedItem): ProductDef[] {
  const def = ITEMS[placed.item];
  const tier = def.tier ?? 0;
  return getMenu(s).filter((p) => p.station === def.station && (!p.requiresTier || tier >= p.requiresTier));
}

export function requiredIngredients(p: ProductDef, placed: PlacedItem[]): [IngredientId, number][] {
  const infinite = placed.some((x) => ITEMS[x.item].infiniteIce);
  return (Object.entries(p.ingredients) as [IngredientId, number][]).filter(([ing]) => !(ing === "ice" && infinite));
}

export function canMake(s: Pick<EconomyState, "inventory" | "placed">, p: ProductDef): boolean {
  if (p.station === "display" && !s.placed.some((x) => ITEMS[x.item].storage === "display")) return false;
  if ((p.station === "oven" && !hasItem(s.placed, "oven")) || (p.station === "range" && !hasItem(s.placed, "range"))) return false;
  if (p.station === "bingsu" && !hasItem(s.placed, "bingsuMachine")) return false;
  if (p.station === "machine" && getBestTier(s.placed) === 0) return false;
  return requiredIngredients(p, s.placed).every(([ing, qty]) => {
    if ((s.inventory[ing] ?? 0) < qty) return false;
    return getStorageCapacity(s.placed, INGREDIENTS[ing].storage) > 0;
  });
}

export const WARMER_CAP = 24;
export const warmerCount = (w: Partial<Record<ProductId, number>>) => Object.values(w).reduce((a, b) => a + (b ?? 0), 0);

export function getPriceRatio(s: Pick<EconomyState, "prices" | "placed">): number {
  const menu = getMenu(s);
  let num = 0;
  let den = 0;
  for (const p of menu) {
    num += (s.prices[p.id] / p.fair) * p.weight;
    den += p.weight;
  }
  return den ? num / den : 1;
}

/**
 * How much customers tolerate above the fair price. At 1★ they only accept ~fair,
 * at 5★ they will happily pay up to ~145% of fair (and low prices are always loved).
 */
export const priceTolerance = (rating: number) => 0.55 + 0.9 * (rating / 5);

export const getPriceFactor = (ratio: number, rating = 3) => {
  const eff = ratio / priceTolerance(rating);
  return clamp(Math.pow(Math.max(eff, 0.05), -1.6), 0.1, 2.2);
};

/** Hard cutoff: above this multiple of fair (scaled by rating) customers refuse to order the item at all. */
export const priceCutoff = (fair: number, rating: number) => fair * priceTolerance(rating) * 1.6;
export const getRatingFactor = (rating: number) => 0.6 + 0.45 * (rating - 1);
export const getAmbienceFactor = (ambience: number) => 1 + ambience / 100;
export const getPatience = (ambience: number) => 75 + ambience * 0.35;

export function getProductWeight(p: ProductDef, season: Season, weather: WeatherId, temp: number, kid: boolean): number {
  let w = p.weight;
  const wd = WEATHERS[weather];
  if (p.temp === "hot") w *= wd.hot * (temp <= 5 ? 1.6 : temp >= 28 ? 0.5 : 1);
  if (p.temp === "cold") w *= wd.cold * (temp >= 28 ? 1.8 : temp <= 5 ? 0.6 : 1);
  if (p.id === "bingsu") w *= season === "summer" ? 3 : 0.25;
  if (p.id === "yuja") w *= season === "winter" ? 2.5 : season === "summer" ? 0.4 : 1;
  if (p.id === "icedAmericano" && season === "winter") w *= 1.6;
  if (p.station === "range" || p.station === "oven") w *= 1.15; // hot food is a draw
  if (kid) w *= p.kidFav ? 4 : 0.15;
  return w;
}

export function competitorAppeal(def: CompetitorDef, state: CompetitorState, season: Season): number {
  return getRatingFactor(state.rating) * getPriceFactor(def.priceRatio) * getAmbienceFactor(def.ambience) * (def.seasonBoost[season] ?? 1) * state.promo;
}

export interface MarketBreakdown {
  season: Season;
  rating: number;
  ratingFactor: number;
  priceRatio: number;
  priceFactor: number;
  ambience: number;
  ambienceFactor: number;
  signFactor: number;
  comfort: number;
  comfortFactor: number;
  need: "cool" | "heat" | null;
  temp: number;
  ourAppeal: number;
  timeFactor: number;
  weatherFactor: number;
  crowdFactor: number;
  crowdLabel: string | null;
  buzz: number;
  traffic: number;
  competitors: { id: string; name: string; appeal: number; share: number }[];
  share: number;
  rate: number;
}

export function getMarket(s: EconomyState): MarketBreakdown {
  const dayOneFactor = s.day === 1 ? 0.7 : 1; // day 1 is a quiet tutorial day
  const season = getSeason(s.day);
  const rating = getRating(s.rep);
  const ratingFactor = getRatingFactor(rating);
  const priceRatio = getPriceRatio(s);
  const priceFactor = getPriceFactor(priceRatio, rating);
  const ambience = getAmbience(s);
  const ambienceFactor = getAmbienceFactor(ambience);
  const signFactor = s.installations.sign ? 1.3 : 1;
  const cf = getComfort(s.day, s.weather, s.clock, getCapacity(s));
  const comfortFactor = 0.5 + 0.5 * cf.comfort;
  const ourAppeal = ratingFactor * priceFactor * ambienceFactor * signFactor * comfortFactor;
  const comps = COMPETITORS.map((def) => {
    const st = s.competitors.find((c) => c.id === def.id) ?? { id: def.id, rating: def.rating0, promo: 1, promoText: null };
    return { id: def.id, name: def.name, appeal: competitorAppeal(def, st, season), share: 0 };
  });
  const total = ourAppeal + comps.reduce((a, c) => a + c.appeal, 0);
  for (const c of comps) c.share = c.appeal / total;
  const share = ourAppeal / total;
  const timeFactor = getTimeFactor(s.clock);
  const weatherFactor = WEATHERS[s.weather].traffic;
  const crowd = crowdMultiplier(s.day, s.clock);
  const buzz = 1 + (s.buzz ?? 0);
  const traffic = BASE_TRAFFIC * timeFactor * weatherFactor * crowd.traffic * buzz * dayOneFactor;
  const rate = Math.min(MAX_SPAWN_RATE * crowd.cap * buzz, traffic * share);
  return { season, rating, ratingFactor, priceRatio, priceFactor, ambience, ambienceFactor, signFactor, comfort: cf.comfort, comfortFactor, need: cf.need, temp: cf.temp, ourAppeal, timeFactor, weatherFactor, crowdFactor: crowd.traffic, crowdLabel: crowd.label, buzz, traffic, competitors: comps, share, rate };
}

export interface PowerLine {
  name: string;
  icon: string;
  perDay: number;
  count: number;
}

/** Electricity cost per day, broken down. */
export function getPowerBreakdown(s: Pick<EconomyState, "placed" | "installations">, season: Season): { total: number; lines: PowerLine[] } {
  const lines: PowerLine[] = [{ name: "Lighting & POS", icon: "💡", perDay: ELECTRIC_BASE, count: 1 }];
  const active = (ps?: "summer" | "winter" | "both") => ps === "both" || ps === season;
  const counts = new Map<ItemId, number>();
  for (const p of s.placed) counts.set(p.item, (counts.get(p.item) ?? 0) + 1);
  for (const [id, count] of counts) {
    const d = ITEMS[id];
    if (d.power && active(d.powerSeason)) lines.push({ name: d.name, icon: d.icon, perDay: d.power * count, count });
  }
  for (const i of INSTALLATIONS) if (s.installations[i.id] && i.power && active(i.powerSeason)) lines.push({ name: i.name, icon: i.icon, perDay: i.power, count: 1 });
  return { total: lines.reduce((a, l) => a + l.perDay, 0), lines };
}

export function getRent(installations: Partial<Record<InstallationId, boolean>>): { total: number; lines: { name: string; amount: number }[] } {
  const lines = [{ name: "Ground-floor unit (base rent)", amount: RENT_BASE }];
  for (const i of INSTALLATIONS) if (installations[i.id] && i.rent) lines.push({ name: i.name, amount: i.rent });
  return { total: lines.reduce((a, l) => a + l.amount, 0), lines };
}

export const money = (v: number) => `${v < 0 ? "−" : ""}₩${Math.abs(Math.round(v)).toLocaleString("en-US")}`;

// ---------------------------------------------------------------------------
// Styling palettes (Style Studio)
// ---------------------------------------------------------------------------
export const FLOOR_PATTERNS: { id: FloorPattern; name: string; kr: string; swatch: string; price: number }[] = [
  { id: "oak", name: "Oak boards", kr: "오크 마루", swatch: "#9a6b43", price: 0 },
  { id: "walnut", name: "Dark walnut", kr: "월넛 마루", swatch: "#5a3b26", price: 350000 },
  { id: "herringbone", name: "Herringbone", kr: "헤링본", swatch: "#b08055", price: 600000 },
  { id: "checker", name: "Checkerboard", kr: "체커보드", swatch: "#dcdcdc", price: 450000 },
  { id: "terrazzo", name: "Terrazzo", kr: "테라조", swatch: "#e7e0d6", price: 700000 },
  { id: "concrete", name: "Polished concrete", kr: "노출 콘크리트", swatch: "#9a9a98", price: 300000 },
  { id: "whiteTile", name: "White tile", kr: "흰 타일", swatch: "#eef0f2", price: 400000 },
  { id: "hanok", name: "Hanok stone", kr: "한옥 전돌", swatch: "#7a7068", price: 800000 },
];
export const WALL_PAINTS: { id: WallPaint; name: string; kr: string; hex: string; price: number }[] = [
  { id: "cream", name: "Cream", kr: "크림", hex: "#f1e6d2", price: 0 },
  { id: "white", name: "Gallery white", kr: "화이트", hex: "#f7f7f4", price: 150000 },
  { id: "sage", name: "Sage", kr: "세이지", hex: "#b7c4a8", price: 200000 },
  { id: "blush", name: "Blush", kr: "블러시", hex: "#f0c9c0", price: 200000 },
  { id: "navy", name: "Midnight navy", kr: "네이비", hex: "#2b3a55", price: 250000 },
  { id: "terracotta", name: "Terracotta", kr: "테라코타", hex: "#c8714f", price: 250000 },
  { id: "charcoal", name: "Charcoal", kr: "차콜", hex: "#3a3d42", price: 250000 },
  { id: "mint", name: "Mint", kr: "민트", hex: "#bfe6dc", price: 200000 },
  { id: "exposedBrick", name: "Exposed brick", kr: "노출 벽돌", hex: "#9c4a3a", price: 500000 },
];
export const ROOF_STYLES: { id: RoofStyle; name: string; kr: string; hex: string; price: number }[] = [
  { id: "plain", name: "Plain plaster", kr: "석고", hex: "#f3eee4", price: 0 },
  { id: "warm", name: "Warm timber", kr: "원목 천장", hex: "#b8926a", price: 300000 },
  { id: "dark", name: "Industrial black", kr: "블랙", hex: "#2a2d31", price: 250000 },
  { id: "sky", name: "Painted sky", kr: "하늘 벽화", hex: "#bfe0f5", price: 450000 },
];
export const KITCHEN_LOOKS: { id: KitchenLook; name: string; kr: string; hex: string; tile: string; price: number }[] = [
  { id: "steel", name: "Stainless steel", kr: "스테인리스", hex: "#c8ccd1", tile: "#eef1f3", price: 0 },
  { id: "copper", name: "Copper & oak", kr: "구리 & 오크", hex: "#b87333", tile: "#f3e6d4", price: 700000 },
  { id: "whiteTile", name: "White subway tile", kr: "화이트 타일", hex: "#dfe6e9", tile: "#ffffff", price: 400000 },
  { id: "blackTile", name: "Black tile & brass", kr: "블랙 타일", hex: "#2d3436", tile: "#1e272e", price: 800000 },
];
export const DEFAULT_STYLE: StyleState = {
  floors: { "0": { floor: "oak", wall: "cream", ceiling: "plain" }, "1": { floor: "oak", wall: "cream", ceiling: "plain" }, "2": { floor: "oak", wall: "cream", ceiling: "plain" }, "-1": { floor: "concrete", wall: "exposedBrick", ceiling: "dark" } },
  kitchen: "steel",
  facade: "cream",
};

// ---------------------------------------------------------------------------
// Staff: skills, roles, recruitment
// ---------------------------------------------------------------------------
export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  desc: string;
}

export const SKILLS: SkillDef[] = [
  { id: "barista", name: "Barista", icon: "☕", desc: "Espresso & bingsu speed and quality" },
  { id: "cooking", name: "Cooking", icon: "🍳", desc: "Range dishes (kitchen)" },
  { id: "baking", name: "Baking", icon: "🥐", desc: "Oven goods (kitchen)" },
  { id: "service", name: "Service", icon: "💬", desc: "Order taking, tips, reviews" },
  { id: "speed", name: "Speed", icon: "⚡", desc: "Walking & task pace" },
  { id: "organising", name: "Organising", icon: "📦", desc: "Stock, unpacking, kitchen coordination" },
];

export const SKILL_ORDER = SKILLS.map((k) => k.id);

export interface RoleDef {
  id: RoleId;
  name: string;
  kr: string;
  icon: string;
  desc: string;
  primary: SkillId;
  secondary: SkillId;
  needsKitchen?: boolean;
  needsKitchen2?: boolean;
  apron: string;
  max: number;
}

export const ROLES: RoleDef[] = [
  { id: "cashier", name: "Counter / Cashier", kr: "카운터", icon: "🧾", desc: "Takes orders at the counter so the queue keeps moving, hands over finished items and to-go bags, deals with delivery riders.", primary: "service", secondary: "speed", apron: "#2d3436", max: 2 },
  { id: "barista", name: "Barista", kr: "바리스타", icon: "☕", desc: "Works the espresso machines and bingsu shaver. Brews the drinks on open tickets, or the next customer's order if nobody is taking tickets.", primary: "barista", secondary: "speed", apron: "#6b4a35", max: 3 },
  { id: "waiter", name: "Waiter / Waitress", kr: "홀 서빙", icon: "🍽️", desc: "Carries finished orders to seated customers (any floor), so dine-in guests sit down right after ordering. Charm earns tips.", primary: "service", secondary: "speed", apron: "#1e3a5f", max: 3 },
  { id: "cook", name: "Line Cook", kr: "요리사", icon: "🍳", desc: "Works the grills: sandwiches, toast, fried chicken, brunch.", primary: "cooking", secondary: "speed", needsKitchen2: true, apron: "#f5f6fa", max: 2 },
  { id: "baker", name: "Baker", kr: "제빵사", icon: "🥐", desc: "Works the oven: croffles, scones, cheesecake in batches. Needs the half kitchen.", primary: "baking", secondary: "organising", needsKitchen: true, apron: "#f5f6fa", max: 2 },
  { id: "headChef", name: "Head Chef", kr: "헤드 셰프", icon: "👨‍🍳", desc: "Works both oven and grill and keeps the kitchen running: every other kitchen worker gets +20% speed. Needs the full kitchen.", primary: "cooking", secondary: "baking", needsKitchen2: true, apron: "#c0392b", max: 1 },
  { id: "office", name: "Office / Stock", kr: "사무 · 재고", icon: "📦", desc: "Watches the fridge and pantry, orders from Minji's Mart when stock runs low, fetches boxes from the alley and unpacks them.", primary: "organising", secondary: "speed", apron: "#0984e3", max: 1 },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<RoleId, RoleDef>;

export function getStaffCap(inst: Partial<Record<InstallationId, boolean>>): number {
  let cap = 2;
  if (inst.ext_front) cap += 1;
  if (inst.floor2) cap += 1;
  if (inst.floor3) cap += 1;
  if (inst.basement) cap += 1;
  if (inst.kitchen) cap += 2; // half kitchen supports 2 kitchen staff
  if (inst.kitchen2) cap += 2; // full kitchen supports 4
  return cap;
}

/** 0..1 — how well a person fits a role. */
export function roleFit(skills: Record<SkillId, number>, role: RoleId): number {
  const def = ROLE_MAP[role];
  let primary = skills[def.primary];
  if (role === "headChef") primary = Math.max(skills.cooking, skills.baking);
  const secondary = role === "headChef" ? skills.organising : skills[def.secondary];
  return clamp((primary * 0.7 + secondary * 0.3 - 1) / 9, 0, 1);
}

export const skillLevel = (v: number) => (v >= 8 ? "strong" : v <= 3 ? "weak" : "ok");

const STAFF_NAMES_F = ["Seoyeon", "Jiwoo", "Yuna", "Haeun", "Sumin", "Yejin", "Nayeon", "Chaewon", "Soyeon", "Dahyun", "Yerin", "Jisoo", "Minseo", "Hyejin", "Bora", "Eunji", "Hana", "Sora", "Mina", "Jieun"];
const STAFF_NAMES_M = ["Minjun", "Hajun", "Doyun", "Siwoo", "Eunwoo", "Jihoon", "Taeyang", "Junseo", "Hyunwoo", "Woojin", "Seojun", "Gunwoo", "Dongha", "Jaehyun", "Sungmin", "Yongjun", "Kyungsoo", "Taemin", "Seungho", "Jaewon"];
const BIOS = [
  "Art student at Hongik, needs rent money. Lives three doors down.",
  "Ex-franchise barista, left over the 1+1 events.",
  "Busker by night. Very good with people, slightly late in the mornings.",
  "Culinary school graduate, wants kitchen hours.",
  "Ran her parents' bunsik shop for years. Nothing fazes her.",
  "Exchange student, cheerful, learning Korean fast.",
  "Former office worker who quit to 'do something with my hands'.",
  "Baked for a Yeonnam-dong bakery until it closed.",
  "Delivery rider recovering from a scooter crash — wants something indoors.",
  "Retired teacher. Organised to a fault.",
  "Trainee at a specialty roaster. Talks about extraction yield.",
  "Kitchen porter at a hotel buffet. Fast, tidy, quiet.",
];
const SHIRTS = ["#e06c75", "#61afef", "#98c379", "#e5c07b", "#c678dd", "#56b6c2", "#f5f6fa", "#2d3436", "#dfe6e9"];
const SKINS = ["#f6d7b0", "#f1c27d", "#e8b98a", "#ffdbac", "#e0ac69"];
const HAIRS = ["#1c1c1c", "#2b1b17", "#4a2c2a", "#8b5a2b", "#5b3a8a", "#a52a2a"];
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function generateApplicant(id: number, day: number): Applicant {
  const gender = Math.random() < 0.5 ? "f" : "m";
  const star = Math.random() < 0.15;
  const skills = {} as Record<SkillId, number>;
  for (const k of SKILL_ORDER) skills[k] = rnd(3, 6);
  const shuffled = [...SKILL_ORDER].sort(() => Math.random() - 0.5);
  if (star) {
    const strong = rnd(2, 3);
    for (let i = 0; i < strong; i++) skills[shuffled[i]] = rnd(8, 10);
    skills[shuffled[strong]] = rnd(1, 2);
  } else {
    skills[shuffled[0]] = rnd(7, 8);
    skills[shuffled[1]] = rnd(2, 3);
    if (Math.random() < 0.35) skills[shuffled[2]] = rnd(1, 3);
  }
  const sum = SKILL_ORDER.reduce((a, k) => a + skills[k], 0);
  const strongCount = SKILL_ORDER.filter((k) => skills[k] >= 8).length;
  const wage = Math.round((62000 + sum * 3000 + strongCount * 9000) / 1000) * 1000;
  const colors: CustomerColors = { shirt: pickOne(SHIRTS), pants: pickOne(["#2f3542", "#3d4a63", "#4b3832"]), skin: pickOne(SKINS), hair: pickOne(HAIRS) };
  return { id, name: pickOne(gender === "f" ? STAFF_NAMES_F : STAFF_NAMES_M), age: rnd(19, 52), gender, skills, wage, bio: pickOne(BIOS), star, colors, appliedDay: day };
}

export const staffWage = (staff: Staff[]) => staff.reduce((a, s) => a + s.wage, 0);

/** Skill → multiplier on task duration (10 = 0.6×, 5 = 1.0×, 1 = 1.6×). */
export const skillSpeed = (v: number) => clamp(1.6 - (v - 1) * (1 / 9), 0.6, 1.6);
export const skillWalk = (speed: number) => 1.35 + (speed - 1) * 0.07;
/** Chance of botching a task at a given skill (only meaningful when weak). */
export const botchChance = (v: number) => (v <= 2 ? 0.12 : v <= 3 ? 0.05 : 0);
export const roleForStation = (station: StationKind): RoleId[] =>
  station === "machine" || station === "bingsu" ? ["barista"] :
  station === "blender" || station === "toastie" ? ["barista", "waiter", "office"] :
  station === "oven" ? ["baker", "headChef"] : ["cook", "headChef"];
export const skillForStation = (station: StationKind): SkillId => (station === "machine" || station === "bingsu" ? "barista" : station === "oven" ? "baking" : "cooking");
