import type * as THREE from "three";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type WeatherId =
  | "clear" | "cloudy" | "blossom" | "dust" | "fog" | "rain" | "monsoon"
  | "thunderstorm" | "hail" | "snow" | "blizzard" | "icy" | "heatwave";

export type IngredientId =
  | "beans" | "milk" | "ice" | "syrup" | "misugaru" | "yuja" | "redbean"
  | "soboro" | "croissant" | "eggtart" | "macaron" | "honeybread" | "cups" | "bags"
  | "flour" | "eggs" | "butter" | "cheese" | "bakingSoda"
  | "berries" | "mango" | "banana" | "meat" | "icecream"
  | "mug" | "plate" | "bowl" | "spoon";

export type DishId = "mug" | "plate" | "bowl" | "spoon";

export type StorageKind = "fridge" | "pantry" | "display" | "warmer" | "rack" | "cupboard" | "freezer";

export type ProductId =
  | "americano" | "icedAmericano" | "latte" | "icedLatte" | "einspanner" | "dalgona"
  | "misugaru" | "yuja" | "bingsu" | "soboro" | "croissant" | "eggtart" | "macaron" | "honeybread"
  | "croffle" | "scone" | "cheesecake" | "eggSandwich" | "streetToast" | "brunch"
  | "smoothie" | "mangoSmoothie" | "toastie" | "friedChicken";

export type StationKind = "machine" | "bingsu" | "oven" | "range" | "blender" | "toastie";
export type ProductStation = StationKind | "display";

export type CoreItemId =
  | "counter" | "pantry" | "dryCupboard" | "fridgeSmall" | "fridgeLarge" | "displaySmall" | "displayDeluxe" | "warmer" | "trash"
  | "sink" | "dishRack" | "cupboard" | "worktop"
  | "espresso1" | "espresso2" | "espresso3" | "grinder" | "blender" | "industrialBlender" | "bingsuMachine" | "iceMaker"
  | "oven" | "ovenLarge" | "ovenConveyor" | "range" | "grillBasic" | "grillPro"
  | "doughSheeter" | "dishwasher" | "mixer" | "foodProcessor" | "toastie" | "eftpos" | "kiosk"
  | "prepTable" | "servingCart" | "wallShelf"
  | "freezerShelf"
  | "table2" | "table4" | "sofaSet" | "plant" | "plantBig" | "art1" | "art2" | "rug" | "bookshelf"
  | "speaker" | "pendantLamp" | "floorLamp" | "patioSet" | "flowerBox" | "tv"
  | "fan" | "ac" | "heater" | "hvac";
/** Core items plus catalogue decor ("decor:<id>"). */
export type ItemId = CoreItemId | `decor:${string}`;

export type DecorTemplate =
  | "sofa" | "chesterfield" | "loveseat" | "armchair" | "beanbag" | "bench" | "stool" | "pouf" | "daybed" | "eggchair"
  | "coffeeTable" | "sideTable" | "console" | "communal" | "ledge" | "bistro"
  | "arcLamp" | "tripodLamp" | "tableLamp" | "mushroomLamp" | "pendantTrio" | "globePendant" | "rattanPendant" | "hanji" | "chandelier" | "festoon" | "neon" | "candles" | "saltLamp" | "moonMirror"
  | "plantBig" | "tree" | "plant" | "snake" | "cactus" | "bamboo" | "hanging" | "flowers" | "wreath" | "terrarium"
  | "rug" | "rugGeo" | "rugRound" | "rugHide" | "mat"
  | "print" | "triptych" | "polaroids" | "mirror" | "clock" | "chalkboard" | "vinylWall" | "macrame"
  | "statue" | "vaseBig" | "cat" | "aquarium" | "globe" | "gramophone" | "typewriter"
  | "ladderShelf" | "cubeShelf" | "bookshelf" | "turntable" | "magRack" | "coatStand" | "umbrellaStand" | "screen"
  | "cushions" | "basket" | "games" | "books" | "jar" | "menuStand" | "luckyCat" | "dome" | "arrow" | "deskFan" | "radio" | "suitcases" | "birdcage" | "parasol" | "planter" | "patioHeater";

// ---------------------------------------------------------------------------
// Styling (CaféOS → Style app)
// ---------------------------------------------------------------------------
export type FloorPattern = "oak" | "walnut" | "herringbone" | "checker" | "terrazzo" | "concrete" | "whiteTile" | "hanok";
export type WallPaint = "cream" | "white" | "sage" | "blush" | "navy" | "terracotta" | "charcoal" | "mint" | "exposedBrick";
export type RoofStyle = "plain" | "warm" | "dark" | "sky";
export type KitchenLook = "steel" | "copper" | "whiteTile" | "blackTile";
export type FloorStyleKey = "0" | "1" | "2" | "-1";

export interface FloorStyle {
  floor: FloorPattern;
  wall: WallPaint;
  ceiling: RoofStyle;
}

export interface StyleState {
  floors: Record<FloorStyleKey, FloorStyle>;
  kitchen: KitchenLook;
  facade: WallPaint;
}

export type ItemCategory = "fixture" | "machine" | "kitchen" | "utility" | "countertop" | "furniture" | "decor" | "boutique" | "climate";
export type ShopId = "mart" | "hardware" | "appliance" | "living";
export type InstallationId = "sign" | "ext_front" | "toilet" | "floor2" | "floor3" | "basement" | "balcony" | "kitchen" | "kitchen2" | "floorHeat" | "deliveryApp" | "styleApp";
export type FloorId = -1 | 0 | 1 | 2;
export type Rot = 0 | 1 | 2 | 3;

export interface PlacedItem {
  uid: number;
  item: ItemId;
  x: number;
  z: number;
  rot: Rot;
  floor: FloorId;
  /** if set, the item sits on top of this placed item's surface */
  onUid?: number;
}

export type BoxContents = Partial<Record<IngredientId, number>>;

export interface Box {
  uid: number;
  kind: "item" | "mart";
  item?: ItemId;
  contents?: BoxContents;
  x: number;
  z: number;
  floor: FloorId;
}

export type DishSet = Record<DishId, number>;

export interface DirtyPile {
  id: number;
  x: number;
  z: number;
  floor: FloorId;
  counts: DishSet;
  assigned: number | null;
}

export interface WashingState {
  counts: DishSet;
  scrubsLeft: number;
  marker: number; // 0..1 moving scrub marker
  dir: 1 | -1;
  good: number;
  source: "player" | "staff";
  staffId?: number;
  /** if set, completing the minigame starts this bake instead of washing */
  prepFor?: { stationUid: number; product: ProductId };
}

export type Carried = ({ kind: "item"; item: ItemId } | { kind: "mart"; contents: BoxContents } | { kind: "dirty"; counts: DishSet }) & { uid?: number };

export type Modal = "none" | "computer" | "mart" | "hardware" | "appliance" | "living" | "bed" | "pos";
export type Phase = "menu" | "playing" | "summary" | "season";
export type Quality = "high" | "low";

/** Café playlist (CaféOS → Ambience). */
export type MusicId = "classic" | "jazz" | "pop" | "kpop" | "whiteNoise" | "lofi" | "off";
export type PauseKind = "none" | "slim" | "menu";

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export type SkillId = "barista" | "cooking" | "baking" | "service" | "speed" | "organising";
export type RoleId = "cashier" | "barista" | "waiter" | "cook" | "baker" | "headChef" | "office";

export interface Applicant {
  id: number;
  name: string;
  age: number;
  gender: "f" | "m";
  skills: Record<SkillId, number>; // 1..10
  wage: number; // ₩ per day
  bio: string;
  star: boolean; // "good worker"
  colors: CustomerColors;
  appliedDay: number;
}

export interface Staff extends Applicant {
  role: RoleId | null;
  hiredDay: number;
  served: number;
}

export type TicketStatus = "pending" | "making" | "carrying" | "pickup";

export interface Ticket {
  id: number;
  customerId: number;
  product: ProductId;
  status: TicketStatus;
  stationUid: number | null;
  staffId: number | null; // who is making / carrying it
  created: number;
}

export type StaffState = "idle" | "toSpot" | "takingOrder" | "toStation" | "working" | "toPickup" | "toCustomer" | "toAlley" | "toStorage" | "wander" | "toDishes" | "toDishesWash" | "washingDishes" | "toPos" | "ringingUp";

export interface StaffNpc {
  id: number; // = Staff.id
  pos: THREE.Vector3;
  yaw: number;
  path: THREE.Vector3[];
  moving: boolean;
  walkPhase: number;
  speed: number;
  state: StaffState;
  ticketId: number | null;
  carrying: ProductId | null;
  box: BoxContents | null;
  timer: number;
  say: string | null;
  sayTimer: number;
  targetUid: number | null;
  wanderTimer: number;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export type CustomerState = "entering" | "queueing" | "ordering" | "waiting" | "toSeat" | "sitting" | "leaving" | "browsing" | "defecting";
export type CustomerMode = "togo" | "dinein";

export interface CustomerColors {
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
}

export interface Outfit {
  umbrella: string | null;
  scarf: string | null;
  beanie: boolean;
  mask: boolean;
  shortSleeves: boolean;
  coat: boolean;
}

export interface Customer {
  id: number;
  name: string;
  colors: CustomerColors;
  outfit: Outfit;
  browser: boolean;
  kid: boolean;
  rider: boolean;
  /** office worker / student from a rush wave, or a celebrity */
  crowd?: CrowdKind;
  vip?: VipDef;
  party: number;
  partySize: number;
  mode: CustomerMode;
  state: CustomerState;
  order: ProductId | null;
  /** rung up and paid at the EFTPOS/POS */
  paid: boolean;
  path: THREE.Vector3[];
  pos: THREE.Vector3;
  yaw: number;
  speed: number;
  patience: number;
  maxPatience: number;
  waited: number;
  queueIndex: number;
  waitIndex: number;
  /** order taken by staff; item still on its way */
  awaiting: boolean;
  seat: string | null;
  sitTimer: number;
  stateTime: number;
  say: string | null;
  sayTimer: number;
  walkPhase: number;
  moving: boolean;
  hasItem: boolean;
  target?: string;
}

export interface Review {
  id: number;
  author: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
  day: number;
  /** reputation change this review caused */
  rep: number;
  vip?: boolean;
}

export interface RepEvent {
  id: number;
  day: number;
  clock: number;
  delta: number;
  reason: string;
  icon: string;
}

export type VipKind = "idol" | "actor" | "influencer" | "chef" | "streamer";

export interface VipDef {
  kind: VipKind;
  name: string;
  kr: string;
  handle: string;
  look: { shirt: string; pants: string; hair: string; skin: string; glasses: boolean; mask: boolean; hat: "cap" | "beret" | "bucket" | null; scarf: string | null };
  entourage: number;
  blurb: string;
}

export type CrowdKind = "office" | "student";

export interface WorldEvent {
  kind: "lunchRush" | "schoolOut" | "busking" | "weekend" | "vip";
  label: string;
  until: number; // clock minutes
}

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "good" | "warn";
}

export interface MachineState {
  brewing: ProductId | null;
  timeLeft: number;
  total: number;
  ready: ProductId | null;
  /** batch baking: number of items this bake will produce / currently ready */
  batch?: number;
  readyCount?: number;
  /** prep phase (rolling dough / chopping) before the actual bake */
  prepLeft?: number;
  prepTotal?: number;
}

export interface Stats {
  vipVisits: number;
  vipHappy: number;
  servedTotal: number;
  servedToday: number;
  staffServedToday: number;
  lostTotal: number;
  lostToday: number;
  stolenTotal: number;
  stolenToday: number;
  earnedTotal: number;
  earnedToday: number;
  reviewsToday: number;
  tipsTotal: number;
  togoServed: number;
  dineinServed: number;
  groupsServed: number;
  ridersServed: number;
  grocerPurchases: number;
  hardwarePurchases: number;
  itemsPlaced: number;
  payrollTotal: number;
  washes: number;
  posSales: number;
  batches: number;
  pastryServed: number;
  smoothieServed: number;
  dishesBroken: number;
}

export interface BillRecord {
  day: number;
  rent: number;
  electric: number;
  total: number;
}

export interface DaySummary {
  day: number;
  season: Season;
  weather: WeatherId;
  tempHigh: number;
  earned: number;
  served: number;
  staffServed: number;
  lost: number;
  stolen: number;
  reviews: number;
  rating: number;
  ratingBefore: number;
  repGained: number;
  repLost: number;
  level: number;
  electricToday: number;
  payroll: number;
  bill: BillRecord | null;
  forecast: WeatherId;
  nextSeason: Season | null;
  slept: boolean;
}

export interface CompetitorState {
  id: string;
  rating: number;
  promo: number;
  promoText: string | null;
}

export type InteractTarget =
  | { kind: "placed"; uid: number }
  | { kind: "box"; uid: number }
  | { kind: "dishes"; id: number }
  | { kind: "customer"; id: number }
  | { kind: "staff"; id: number }
  | { kind: "competitor"; id: string }
  | { kind: "npc"; id: string }
  | { kind: "mart" | "hardware" | "appliance" | "living" | "bed" | "computer" | "dumpster" };

export interface AimState {
  x: number;
  z: number;
  floor: FloorId;
  /** set when aiming at the surface of another placed item */
  onUid?: number;
  valid: boolean;
  reason: string;
}

/** The slice of game state the economy formulas need. */
export interface EconomyState {
  prices: Record<ProductId, number>;
  /** items currently listed for sale (CaféOS → Prices toggles); optional so partial views still work */
  menuOn?: Partial<Record<ProductId, boolean>>;
  placed: PlacedItem[];
  installations: Partial<Record<InstallationId, boolean>>;
  reviews: Review[];
  rep: number;
  /** temporary traffic bonus (0 = none), e.g. a celebrity sighting */
  buzz?: number;
  inventory: Record<IngredientId, number>;
  day: number;
  clock: number;
  weather: WeatherId;
  competitors: CompetitorState[];
}

export interface Seat {
  key: string;
  table: number;
  pos: [number, number, number];
  yaw: number;
  floor: FloorId;
  outdoor: boolean;
}
