import { create } from "zustand";
import * as THREE from "three";
import { DAY_MINUTES, SEASON_INFO, WEATHERS, clamp, getComfort, getSeason, getSeasonDay, getTemperature, isWeekend, nextSeasonOf, rollWeather, weekdayName } from "./calendar";
import { BUSKING_LINES, LEVEL_NAMES, OFFICE_LINES, REP, REP_FLOOR, REP_MAX, STUDENT_LINES, VIPS, VIP_DAILY_CHANCE, VIP_MIN_LEVEL, crowdMultiplier, getLevel, rollStars } from "./reputation";
import {
  BOX_SLOTS,
  COMPETITORS,
  COMPETITOR_MAP,
  DAYS_PER_MONTH,
  DEFAULT_CAFE_NAME,
  DEFAULT_PRICES,
  DELIVERY_FEE,
  INGREDIENTS,
  INGREDIENT_ORDER,
  INSTALLATION_MAP,
  ITEMS,
  MART_PACKS,
  MAX_QUEUE,
  PRODUCTS,
  QUESTS,
  STARTING_INVENTORY,
  STARTING_MONEY,
  STARTING_PLACED,
  canMake,
  getAmbience,
  getBrewTime,
  getCapacity,
  getMarket,
  getMenu,
  getPatience,
  getPowerBreakdown,
  getProductWeight,
  getRating,
  getRent,
  getStorageCapacity,
  getStorageUsed,
  ROLE_MAP,
  DEFAULT_STYLE,
  FLOOR_PATTERNS,
  KITCHEN_LOOKS,
  ROOF_STYLES,
  WALL_PAINTS,
  WARMER_CAP,
  generateApplicant,
  getStaffCap,
  initialCompetitors,
  money as fmtMoney,
  orderable,
  requiredIngredients,
  staffWage,
  dishFor,
  packFor,
  priceCutoff,
  getPriceFactor,
  stationMenu,
  warmerCount,
  type ProductDef,
  type QuestContext,
  type QuestDef,
} from "./constants";
import { FLOOR_Y, footprint, kitchenSlots, POINTS, deliverySlot, floorFromY, getCounter, getSeats, routeFromSeat, routeToSeat, v3, validatePlacement, waitSlot } from "./layout";
import { FIRST_NAMES, GOODBYES, GROUP_LINES, IMPATIENT, KID_LINES, LIGHTNING, NO_COUNTER, NO_SEATS, RIDER_LINES, THANKS, TOO_COLD, TOO_HOT, kidColors, makeOutfit, pick, randomColors, reviewText, vipReviewText } from "./names";
import { lockPointer, simState, unlockPointer } from "./registry";
import { setAmbience, sfx } from "./sfx";
import type {
  AimState,
  MusicId,
  Applicant,
  BillRecord,
  Box,
  BoxContents,
  Carried,
  CompetitorState,
  DishId,
  DishSet,
  DirtyPile,
  Customer,
  CustomerMode,
  DaySummary,
  FloorId,
  IngredientId,
  InstallationId,
  InteractTarget,
  ItemId,
  MachineState,
  Modal,
  PauseKind,
  Phase,
  PlacedItem,
  ProductId,
  Quality,
  RepEvent,
  Review,
  RoleId,
  Rot,
  Seat,
  Staff,
  StaffNpc,
  Stats,
  StorageKind,
  StyleState,
  FloorStyleKey,
  Ticket,
  Toast,
  VipDef,
  WashingState,
  WeatherId,
  WorldEvent,
} from "./types";

const IDLE: MachineState = { brewing: null, timeLeft: 0, total: 0, ready: null };

const initialStats = (): Stats => ({
  vipVisits: 0, vipHappy: 0,
  washes: 0, posSales: 0, batches: 0, pastryServed: 0, smoothieServed: 0, dishesBroken: 0,
  servedTotal: 0, servedToday: 0, staffServedToday: 0, lostTotal: 0, lostToday: 0, stolenTotal: 0, stolenToday: 0, earnedTotal: 0, earnedToday: 0,
  reviewsToday: 0, tipsTotal: 0, togoServed: 0, dineinServed: 0, groupsServed: 0, ridersServed: 0, grocerPurchases: 0, hardwarePurchases: 0, itemsPlaced: 0, payrollTotal: 0,
});

let nextTicketId = 1;
let nextStaffId = 1;

function makeApplicants(day: number, keep: Applicant[]): Applicant[] {
  const out = keep.filter(() => Math.random() < 0.6).slice(0, 4);
  while (out.length < 5) out.push(generateApplicant(nextStaffId++, day));
  return out;
}

let nextCustomerId = 1;
let nextToastId = 1;
let nextParty = 1;
let nextUid = 100;

const QUEUE_STATES = new Set(["entering", "queueing", "ordering"]);
const SAVE_KEY = "hongdae-cafe-save-v6";

function exitPath(seat: Seat | null, floorHint: FloorId, inst: Partial<Record<InstallationId, boolean>>): THREE.Vector3[] {
  const exit = Math.random() < 0.5 ? POINTS.spawnLeft : POINTS.spawnRight;
  return [...routeFromSeat(seat, floorHint, inst), v3([POINTS.doorOutside[0], 0, POINTS.sidewalkZ]), v3(exit)];
}

export function pathToCompetitor(from: THREE.Vector3, competitorId: string): THREE.Vector3[] {
  const def = COMPETITOR_MAP[competitorId];
  const door = def.door;
  const pts: THREE.Vector3[] = [v3([from.x, 0, POINTS.sidewalkZ])];
  if (door[2] > 10) {
    pts.push(v3([door[0] < 12 ? door[0] : 8, 0, POINTS.sidewalkZ]));
    if (door[0] >= 12) pts.push(v3([14, 0, 16]), v3([door[0], 0, 16]));
    else pts.push(v3([door[0], 0, 15.5]));
    pts.push(v3(door));
  } else {
    pts.push(v3([door[0], 0, POINTS.sidewalkZ]));
    pts.push(v3(door));
  }
  return pts;
}

/** Per-day scripted state: celebrity visit roll, rush warning flags. */
/** Old v6 saves had the utility items jammed into the doorways — snap them to the new layout. */
const UTILITY_MIGRATION: Record<string, { x: number; z: number; rot: 0 | 1 | 2 | 3 }> = {
  sink: { x: 0.9, z: -9.55, rot: 0 },
  cupboard: { x: 0.8, z: -8.6, rot: 3 },
  dishRack: { x: -1.4, z: -9.35, rot: 1 },
  dryCupboard: { x: 0.8, z: -7.35, rot: 3 },
};
const UTILITY_OLD: Record<string, [number, number]> = {
  sink: [-1.5, -9.6],
  cupboard: [1.1, -9.7],
  dishRack: [-0.2, -9.6],
  dryCupboard: [-1.3, -6.7],
};
function migrateEftposOnCounter(placed: PlacedItem[]): PlacedItem[] {
  const counter = placed.find((p) => p.item === "counter" && p.floor === 0);
  const eft = placed.find((p) => p.item === "eftpos" && p.floor === 0 && !p.onUid);
  if (counter && eft && Math.abs(eft.x - counter.x) < 2.2 && Math.abs(eft.z - counter.z) < 0.8) {
    return placed.map((p) => (p.uid === eft.uid ? { ...p, x: counter.x + 0.8, z: counter.z, onUid: counter.uid } : p));
  }
  return placed;
}

function migrateUtilityItem(p: PlacedItem): PlacedItem {
  const nw = UTILITY_MIGRATION[p.item];
  const old = UTILITY_OLD[p.item];
  if (!nw || p.floor !== 0) return p;
  // snap if at a known old spot, or if the item currently blocks a doorway
  const def = ITEMS[p.item];
  const fp = footprint(def, p.x, p.z, p.rot);
  const DOOR_ZONES = [
    { x0: -0.95, x1: 0.35, z0: -10.1, z1: -9.0 },
    { x0: -2.1, x1: -1.7, z0: -8.7, z1: -7.5 },
    { x0: -1.0, x1: 0.4, z0: -6.3, z1: -5.9 },
  ];
  const inDoor = DOOR_ZONES.some((d) => fp.x0 < d.x1 && fp.x1 > d.x0 && fp.z0 < d.z1 && fp.z1 > d.z0);
  if ((old && Math.abs(p.x - old[0]) < 0.3 && Math.abs(p.z - old[1]) < 0.3) || inDoor) {
    return { ...p, x: nw.x, z: nw.z, rot: nw.rot };
  }
  return p;
}

function planDay(_day: number, rep: number) {
  const level = getLevel(rep);
  const vipToday = level >= VIP_MIN_LEVEL && Math.random() < VIP_DAILY_CHANCE ? pick(VIPS) : null;
  const vipSpawnAt = vipToday ? 120 + Math.floor(Math.random() * 540) : -1; // 10:00–19:00
  return { vipToday, vipSpawnAt, rushWarned: { lunch: false, school: false }, repToday: { gained: 0, lost: 0 }, buzz: 0, events: [] as WorldEvent[], buskingAt: null as number | null };
}

function announceDay(s: GameStore) {
  if (s.day === 1) {
    s.notify("📅 Day 1 — quiet tutorial day. No rush hours today; just learn the ropes: serve, ring up at the EFTPOS, stock up.");
    return;
  }
  if (isWeekend(s.day)) {
    s.notify(`📅 ${weekdayName(s.day)} — weekend. Expect about 30% more people on the street all day.`);
    s.pushEvent({ kind: "weekend", label: "📅 Weekend crowd", until: DAY_MINUTES });
  } else s.notify(`📅 ${weekdayName(s.day)}. Office lunch rush from 12:00, school's out at 16:00 — stock up before then.`);
}

function canMakeN(s: GameStore, p: ProductDef, n: number): boolean {
  return requiredIngredients(p, s.placed).every(([ing, qty]) => (s.inventory[ing] ?? 0) >= qty * n);
}

function staffWashBreak() {
  return Math.random() < 0.04;
}

/** While a staff member is "carrying" a dirty pile we keep the counts here. */
const staffCarrying = new Map<number, DishSet>();

function weightedPick<T>(items: T[], weight: (t: T) => number): T {
  const total = items.reduce((a, p) => a + weight(p), 0);
  let r = Math.random() * total;
  for (const p of items) {
    r -= weight(p);
    if (r <= 0) return p;
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
interface SaveData {
  v: number;
  cafeName: string;
  money: number;
  day: number;
  weather: WeatherId;
  forecast: WeatherId;
  inventory: Record<IngredientId, number>;
  prices: Record<ProductId, number>;
  placed: PlacedItem[];
  boxes: Box[];
  installations: Partial<Record<InstallationId, boolean>>;
  reviews: Review[];
  stats: Stats;
  completedQuests: Record<string, boolean>;
  competitors: CompetitorState[];
  electricAccrued: number;
  billHistory: BillRecord[];
  quality: Quality;
  fpsCap?: number;
  nextUid: number;
  applicants?: Applicant[];
  staff?: Staff[];
  autoStock?: boolean;
  nextStaffId?: number;
  style?: StyleState;
  warmer?: Partial<Record<ProductId, number>>;
  styled?: boolean;
  rep?: number;
  repLog?: RepEvent[];
  dishes?: DishSet;
  dirtyPiles?: DirtyPile[];
  music?: MusicId;
  menuOn?: Partial<Record<ProductId, boolean>>;
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 6 || typeof d.day !== "number") return null;
    return d;
  } catch {
    return null;
  }
}

const saved = loadSave();
if (saved?.nextUid) nextUid = saved.nextUid;
if (saved?.nextStaffId) nextStaffId = saved.nextStaffId;

function freshData() {
  const day = 1;
  return {
    cafeName: DEFAULT_CAFE_NAME,
    money: STARTING_MONEY,
    day,
    weather: "thunderstorm" as WeatherId, // testing default: rain + thunder on day 1
    forecast: rollWeather(day + 1, "thunderstorm"),
    inventory: { ...STARTING_INVENTORY },
    prices: { ...DEFAULT_PRICES },
    placed: (() => {
      const arr = STARTING_PLACED.map((p) => ({ ...p, uid: nextUid++ })) as PlacedItem[];
      // the EFTPOS sits on the counter top from the start
      const counter = arr.find((p) => p.item === "counter");
      const eftpos = arr.find((p) => p.item === "eftpos");
      if (counter && eftpos && (eftpos.onUid === 100 || !eftpos.onUid)) {
        eftpos.onUid = counter.uid;
        eftpos.x = counter.x + 0.8;
        eftpos.z = counter.z;
      }
      return arr;
    })(),
    boxes: [] as Box[],
    installations: {} as Partial<Record<InstallationId, boolean>>,
    reviews: [] as Review[],
    stats: initialStats(),
    completedQuests: {} as Record<string, boolean>,
    competitors: initialCompetitors(),
    electricAccrued: 0,
    billHistory: [] as BillRecord[],
    applicants: makeApplicants(day, []),
    staff: [] as Staff[],
    autoStock: true,
    style: JSON.parse(JSON.stringify(DEFAULT_STYLE)) as StyleState,
    warmer: {} as Partial<Record<ProductId, number>>,
    styled: false,
    rep: 0,
    repLog: [] as RepEvent[],
    dishes: { mug: 8, plate: 6, bowl: 4, spoon: 12 },
    dirtyPiles: [] as DirtyPile[],
    music: "jazz" as MusicId,
    menuOn: {} as Partial<Record<ProductId, boolean>>, // empty = everything unlocked is listed
  };
}

export interface GameStore {
  phase: Phase;
  locked: boolean;
  pause: PauseKind;
  dragLook: boolean;
  quality: Quality;
  fpsCap: number;
  modal: Modal;
  hasSave: boolean;
  cafeName: string;
  money: number;
  day: number;
  clock: number;
  weather: WeatherId;
  forecast: WeatherId;
  news: string[];
  inventory: Record<IngredientId, number>;
  heldItem: ProductId | null;
  carried: Carried | null;
  placeRot: Rot;
  aim: AimState | null;
  prices: Record<ProductId, number>;
  placed: PlacedItem[];
  boxes: Box[];
  installations: Partial<Record<InstallationId, boolean>>;
  reviews: Review[];
  stats: Stats;
  completedQuests: Record<string, boolean>;
  competitors: CompetitorState[];
  customers: Customer[];
  stations: Record<number, MachineState>;
  seatTaken: Record<string, number>;
  electricAccrued: number;
  billHistory: BillRecord[];
  applicants: Applicant[];
  staff: Staff[];
  autoStock: boolean;
  style: StyleState;
  styled: boolean;
  warmer: Partial<Record<ProductId, number>>;
  rep: number;
  repLog: RepEvent[];
  dishes: DishSet;
  dirtyPiles: DirtyPile[];
  washing: WashingState | null;
  music: MusicId;
  menuOn: Partial<Record<ProductId, boolean>>;
  /** which EFTPOS/kiosk the POS screen is open on */
  posUid: number | null;
  /** eftpos uid → staff id currently operating it */
  posBusy: Record<number, number>;
  repToday: { gained: number; lost: number };
  buzz: number;
  events: WorldEvent[];
  vipToday: VipDef | null;
  vipSpawnAt: number;
  rushWarned: { lunch: boolean; school: boolean };
  buskingAt: number | null;
  tickets: Ticket[];
  staffNpcs: StaffNpc[];
  focused: InteractTarget | null;
  toasts: Toast[];
  daySummary: DaySummary | null;
  lightningAt: number;

  startGame: () => void;
  newGame: (name: string) => void;
  setCafeName: (n: string) => void;
  devAddMoney: (amount: number) => void;
  save: () => void;
  setQuality: (q: Quality) => void;
  setFpsCap: (fps: number) => void;
  setLocked: (v: boolean) => void;
  setPause: (p: PauseKind) => void;
  setDragLook: (v: boolean) => void;
  openModal: (m: Modal) => void;
  closeModal: () => void;
  escape: () => void;
  setFocused: (t: InteractTarget | null) => void;
  setAim: (a: AimState | null) => void;
  rotatePlacement: () => void;
  notify: (text: string, kind?: Toast["kind"]) => void;
  interact: () => void;
  pickUp: () => void;
  dropCarried: () => void;
  hotkey: (n: number) => void;
  buyMart: (cart: BoxContents, deliver: boolean) => boolean;
  buyItems: (item: ItemId, qty: number) => void;
  buyInstallation: (id: InstallationId) => void;
  setPrice: (id: ProductId, price: number) => void;
  serveCustomer: (id: number) => void;
  completeSale: (c: Customer, by: { staffId: number; service: number } | null) => boolean;
  revalidateOrder: (c: Customer) => boolean;
  ringUpAt: (posUid: number, customerId: number, byStaffId: number | null) => boolean;
  setMenu: (id: ProductId, on: boolean) => void;
  setPosUid: (uid: number | null) => void;
  claimPos: (uid: number, staffId: number) => boolean;
  releasePos: (uid: number, staffId: number) => void;
  cancelTicket: (ticketId: number) => void;
  updateTicket: (ticketId: number, patch: Partial<Ticket>) => void;
  hire: (applicantId: number) => void;
  dismiss: (staffId: number) => void;
  assignRole: (staffId: number, role: RoleId | null) => void;
  setAutoStock: (v: boolean) => void;
  spawnStaff: () => void;
  staffStartBrew: (stationUid: number, product: ProductId, staffId: number, skill: number) => boolean;
  staffTakeReady: (stationUid: number) => ProductId | null;
  staffTakeDisplay: (product: ProductId) => boolean;
  staffUnpack: (contents: BoxContents, kind: StorageKind) => BoxContents;
  officeOrder: (organising: number) => boolean;
  putInWarmer: (product: ProductId) => boolean;
  takeFromWarmer: (product: ProductId) => boolean;
  setFloorStyle: (floor: FloorStyleKey, patch: Partial<StyleState["floors"]["0"]>) => void;
  setKitchenLook: (look: StyleState["kitchen"]) => void;
  startBake: (stationUid: number, product: ProductId, staffId: number | null, skill: number) => boolean;
  setFacade: (paint: StyleState["facade"]) => void;
  addReview: (stars: 1 | 2 | 3 | 4 | 5, product: ProductId, opts?: { author?: string; vip?: boolean; rep?: number }) => void;
  addRep: (delta: number, reason: string, icon?: string) => void;
  spawnVip: () => void;
  spawnCrowdCustomers: (kind: "office" | "student") => void;
  startBusking: () => void;
  setBuzz: (b: number) => void;
  menuOnOrDefault: (id: ProductId) => boolean;
  pushEvent: (e: WorldEvent) => void;
  setMusic: (m: MusicId) => void;
  spawnDirtyPile: (x: number, z: number, floor: FloorId, counts: Partial<DishSet>) => void;
  claimPile: (id: number, staffId: number) => boolean;
  takePile: (id: number) => boolean;
  staffTakePile: (id: number, staffId: number) => boolean;
  staffDropPile: (staffId: number) => void;
  startWash: (auto: boolean, staffId?: number) => void;
  prepMinigame: (stationUid: number, product: ProductId) => void;
  scrub: () => void;
  finishWash: () => void;

  canServeDineIn: (p: ProductDef) => boolean;
  canServeToGo: (p: ProductDef) => boolean;
  checkQuests: () => void;
  sleep: () => void;

  chooseOrder: (kid: boolean) => ProductId | null;
  spawnParty: (force?: boolean) => void;
  stolenCustomer: () => void;
  customerLeaves: (c: Customer, reason: "impatient" | "noMenu" | "noCounter" | "done") => void;
  finishSitting: (c: Customer) => void;
  bumpCustomers: () => void;
  removeCustomer: (id: number) => void;
  setStation: (uid: number, m: MachineState) => void;
  setClock: (minutes: number) => void;
  lightning: () => void;
  endDay: (slept?: boolean) => void;
  continueFromSummary: () => void;
  nextDay: () => void;
}

export const useGame = create<GameStore>()((set, get) => ({
  phase: "menu",
  locked: false,
  pause: "none",
  dragLook: false,
  quality: saved?.quality ?? "high",
  fpsCap: saved?.fpsCap ?? 60,
  modal: "none",
  hasSave: !!saved,
  clock: 0,
  news: [],
  heldItem: null,
  carried: null,
  placeRot: 0,
  aim: null,
  customers: [],
  stations: {},
  seatTaken: {},
  tickets: [],
  staffNpcs: [],
  focused: null,
  toasts: [],
  daySummary: null,
  lightningAt: 0,
  repToday: { gained: 0, lost: 0 },
  washing: null,
  posUid: null,
  posBusy: {},
  buzz: 0,
  events: [],
  vipToday: null,
  vipSpawnAt: -1,
  rushWarned: { lunch: false, school: false },
  buskingAt: null,
  ...freshData(),
  ...(saved
    ? {
        cafeName: saved.cafeName || DEFAULT_CAFE_NAME,
        money: saved.money,
        day: saved.day,
        weather: saved.weather,
        forecast: saved.forecast,
        inventory: { ...STARTING_INVENTORY, ...saved.inventory },
        prices: { ...DEFAULT_PRICES, ...saved.prices },
        boxes: saved.boxes ?? [],
        installations: saved.installations ?? {},
        reviews: saved.reviews ?? [],
        stats: { ...initialStats(), ...saved.stats },
        completedQuests: saved.completedQuests ?? {},
        competitors: saved.competitors?.length ? saved.competitors : initialCompetitors(),
        electricAccrued: saved.electricAccrued ?? 0,
        billHistory: saved.billHistory ?? [],
        applicants: saved.applicants?.length ? saved.applicants : makeApplicants(saved.day, []),
        staff: saved.staff ?? [],
        autoStock: saved.autoStock ?? true,
        placed: migrateEftposOnCounter((saved.placed ?? []).map((p) => migrateUtilityItem(p))),
        style: saved.style ?? (JSON.parse(JSON.stringify(DEFAULT_STYLE)) as StyleState),
        warmer: saved.warmer ?? {},
        styled: saved.styled ?? false,
        // migrate: old saves scored reputation purely by review count
        rep: saved.rep ?? Math.min(REP_MAX, (saved.reviews?.length ?? 0) * 14),
        repLog: saved.repLog ?? [],
        dishes: saved.dishes ?? { mug: 8, plate: 6, bowl: 4, spoon: 12 },
        dirtyPiles: saved.dirtyPiles ?? [],
        music: saved.music ?? "jazz",
        menuOn: saved.menuOn ?? {},
      }
    : {}),

  // -------------------------------------------------------------------------
  // Session
  // -------------------------------------------------------------------------
  startGame: () => {
    simState.clock = 0;
    simState.spawnTimer = 0;
    simState.nextSpawn = 4;
    const s = get();
    set({ phase: "playing", clock: 0, customers: [], stations: {}, seatTaken: {}, tickets: [], heldItem: null, carried: null, pause: "none", ...planDay(s.day, s.rep) });
    get().spawnStaff();
    setAmbience(WEATHERS[s.weather].audio);
    const w = WEATHERS[s.weather];
    s.notify(`${w.icon} ${w.name} today, ${getTemperature(s.day, s.weather, 240)}°C at noon.`);
    announceDay(get());
    if (!getSeats(s.placed, s.installations).length) s.notify("No tables yet — customers can only order to-go. Buy tables at Hongdae Hardware.", "warn");
  },

  newGame: (name) => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    nextUid = 100;
    nextStaffId = 1;
    set({ ...freshData(), cafeName: name.trim() || DEFAULT_CAFE_NAME, hasSave: false, news: [], completedQuests: {} });
    get().startGame();
  },

  setCafeName: (n) => set({ cafeName: n }),
  devAddMoney: (amount) => set((st) => ({ money: st.money + amount })),

  save: () => {
    const s = get();
    const data: SaveData = {
      v: 6, cafeName: s.cafeName, money: s.money, day: s.day, weather: s.weather, forecast: s.forecast, inventory: s.inventory, prices: s.prices,
      placed: s.placed, boxes: s.boxes, installations: s.installations, reviews: s.reviews.slice(0, 200), stats: s.stats, completedQuests: s.completedQuests,
      competitors: s.competitors, electricAccrued: s.electricAccrued, billHistory: s.billHistory.slice(-24), quality: s.quality, fpsCap: s.fpsCap, nextUid,
      applicants: s.applicants, staff: s.staff, autoStock: s.autoStock, nextStaffId, style: s.style, warmer: s.warmer, styled: s.styled, rep: s.rep, repLog: s.repLog.slice(-80),
      dishes: s.dishes, dirtyPiles: s.dirtyPiles, music: s.music, menuOn: s.menuOn,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      set({ hasSave: true });
    } catch {
      /* ignore */
    }
  },

  setQuality: (q) => set({ quality: q }),
  setFpsCap: (fps) => {
    set({ fpsCap: fps });
    get().save();
  },
  setLocked: (v) => set({ locked: v }),
  setPause: (p) => set({ pause: p }),
  setDragLook: (v) => set({ dragLook: v }),

  openModal: (m) => {
    sfx.open();
    set({ modal: m, focused: null });
  },

  closeModal: () => set({ modal: "none" }),

  /** Escape: close interfaces first, open the pause menu second. */
  escape: () => {
    const s = get();
    if (s.carried) {
      // Esc while carrying: put the box down first
      s.dropCarried();
      return;
    }
    if (s.modal !== "none") {
      set({ modal: "none" });
      if (!s.locked) set({ pause: "slim" });
      return;
    }
    if (s.phase !== "playing") return;
    if (s.pause === "none") set({ pause: "menu" });
  },

  setFocused: (t) => set({ focused: t }),
  setAim: (a) => set({ aim: a }),
  rotatePlacement: () => set((st) => ({ placeRot: ((st.placeRot + 1) % 4) as Rot })),

  notify: (text, kind = "info") => {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }].slice(-5) }));
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },

  // -------------------------------------------------------------------------
  // Interaction
  // -------------------------------------------------------------------------
  interact: () => {
    const s = get();
    if (s.phase !== "playing" || s.modal !== "none") return;

    // washing a carried dirty pile at a sink
    if (s.carried?.kind === "dirty" && s.focused?.kind === "placed") {
      const p = s.placed.find((x) => x.uid === (s.focused as { uid: number }).uid);
      if (p && p.item === "sink") {
        get().startWash(false);
        return;
      }
    }

    // throwing a carried box away at the dumpster (works for both box kinds)
    if (s.carried && s.focused?.kind === "dumpster") {
      if (s.carried.kind === "item") {
        const def = ITEMS[s.carried.item];
        const scrap = Math.round((def.price * 0.2) / 1000) * 1000;
        sfx.pickup();
        set((st) => ({ carried: null, aim: null, money: st.money + scrap }));
        s.notify(`🗑️ Threw away the ${def.name}. Scrap value +${fmtMoney(scrap)}.`, "good");
      } else {
        sfx.pickup();
        set({ carried: null });
        s.notify("🗑️ Threw away the box of supplies.");
      }
      return;
    }

    // placing a carried item box
    if (s.carried?.kind === "item") {
      const a = s.aim;
      if (!a) {
        s.notify("Look at the floor where you want to put it.", "warn");
        return;
      }
      if (!a.valid) {
        // if the surface aim was invalid, try the floor under it before giving up
        if (a.onUid !== undefined) {
          const fv = validatePlacement(ITEMS[s.carried.item], a.x, a.z, s.placeRot, a.floor, s.placed, s.installations);
          if (fv.ok) {
            const item: PlacedItem = { uid: nextUid++, item: s.carried.item, x: a.x, z: a.z, rot: s.placeRot, floor: a.floor };
            sfx.buy();
            set((st) => ({ placed: [...st.placed, item], carried: null, aim: null, stats: { ...st.stats, itemsPlaced: st.stats.itemsPlaced + 1 } }));
            s.notify(`${ITEMS[item.item].icon} ${ITEMS[item.item].name} placed.`);
            get().checkQuests();
          } else {
            sfx.error();
            s.notify(a.reason || fv.reason || "Can't place it there.", "warn");
          }
          return;
        }
        sfx.error();
        s.notify(a.reason || "Can't place it there.", "warn");
        return;
      }
      const item: PlacedItem = { uid: (s.carried as { uid?: number }).uid ?? nextUid++, item: s.carried.item, x: a.x, z: a.z, rot: s.placeRot, floor: a.floor, onUid: a.onUid };
      sfx.buy();
      set((st) => ({ placed: [...st.placed, item], carried: null, aim: null, stats: { ...st.stats, itemsPlaced: st.stats.itemsPlaced + 1 } }));
      s.notify(`${ITEMS[item.item].icon} ${ITEMS[item.item].name} placed.`, "good");
      get().checkQuests();
      return;
    }

    const f: InteractTarget | null = s.focused;
    if (!f) return;
    switch (f.kind) {
      case "computer":
        s.openModal("computer");
        break;
      case "bed":
        s.openModal("bed");
        break;
      case "mart":
        s.openModal("mart");
        break;
      case "dumpster":
        s.notify("Carry a box here and press E to throw it away (equipment returns 20% scrap value).");
        break;
      case "dishes": {
        const p = s.dirtyPiles.find((x) => x.id === f.id);
        if (!p) return;
        if (s.carried) {
          s.notify("Hands full — put the box down first (Q).", "warn");
          return;
        }
        if (s.heldItem) {
          s.notify("Hands full — serve it or bin it first.", "warn");
          return;
        }
        if (get().takePile(p.id)) {
          const n = Object.values(p.counts).reduce((a, b) => a + b, 0);
          s.notify(`Picked up ${n} dirty dishes. Take them to the sink.`);
        }
        return;
      }
      case "staff": {
        const st = s.staff.find((x) => x.id === f.id);
        const npc = s.staffNpcs.find((x) => x.id === f.id);
        if (!st) return;
        const role = st.role ? ROLE_MAP[st.role] : null;
        s.notify(`${st.name} (${role ? role.name : "no role"}) · ${npc?.state === "working" ? "busy" : npc?.state === "idle" ? "waiting for something to do" : "on the move"} · served ${st.served} today. Manage roles in CaféOS → Staff.`);
        break;
      }
      case "npc":
        s.notify(f.id);
        break;
      case "hardware":
        s.openModal("hardware");
        break;
      case "appliance":
        s.openModal("appliance");
        break;
      case "living":
        s.openModal("living");
        break;
      case "box": {
        const box = s.boxes.find((b) => b.uid === f.uid);
        if (!box) return;
        if (s.carried) {
          s.notify("You're already carrying a box. Press Q to put it down.", "warn");
          return;
        }
        if (s.heldItem) {
          s.notify("Put the drink down first (serve it or bin it).", "warn");
          return;
        }
        const carried: Carried = box.kind === "item" ? { kind: "item", item: box.item! } : { kind: "mart", contents: { ...(box.contents ?? {}) } };
        sfx.pickup();
        set((st) => ({ boxes: st.boxes.filter((b) => b.uid !== f.uid), carried, placeRot: 0 }));
        if (carried.kind === "item") s.notify(`Carrying 📦 ${ITEMS[carried.item].name}. Look at the floor and press E to place, R to rotate, Q to put down.`);
        else s.notify("Carrying 📦 supplies. Take them to the fridge / pantry / display case and press E to unpack.");
        break;
      }
      case "placed": {
        const p = s.placed.find((x) => x.uid === f.uid);
        if (!p) return;
        const def = ITEMS[p.item];
        // unpacking a mart box into storage
        if (s.carried?.kind === "mart") {
          if (!def.storage) {
            s.notify(`Take the box to a fridge, pantry shelf or display case.`, "warn");
            return;
          }
          unpackInto(def.storage);
          return;
        }
        if (p.item === "counter") {
          s.openModal("computer");
          return;
        }
        if (p.item === "eftpos" || p.item === "kiosk") {
          set({ posUid: p.uid });
          s.openModal("pos");
          return;
        }
        if (p.item === "trash") {
          if (s.heldItem) {
            const name = PRODUCTS[s.heldItem].name;
            set({ heldItem: null });
            sfx.pickup();
            s.notify(`Threw away the ${name}.`);
          }
          return;
        }
        if (def.station) {
          const m = s.stations[p.uid] ?? IDLE;
          if (m.ready) {
            if (s.heldItem) {
              sfx.error();
              s.notify("Your hands are full.", "warn");
            } else {
              set((st) => ({ heldItem: m.ready, stations: { ...st.stations, [p.uid]: { ...m, ready: null } } }));
              sfx.pickup();
            }
          } else if (m.brewing) s.notify("Still preparing…");
          else s.notify("Press a number key to choose what to make.");
          return;
        }
        if (def.storage === "display") {
          s.notify("Press a number key to take a pastry.");
          return;
        }
        if (def.storage === "warmer") {
          if (s.heldItem && (PRODUCTS[s.heldItem].station === "oven" || PRODUCTS[s.heldItem].station === "range")) {
            if (get().putInWarmer(s.heldItem)) {
              sfx.pickup();
              set({ heldItem: null });
              s.notify(`Put the ${PRODUCTS[s.heldItem].name} in the warmer.`);
            } else s.notify("The warmer is full.", "warn");
            return;
          }
          const list = (Object.keys(s.warmer) as ProductId[]).filter((id) => (s.warmer[id] ?? 0) > 0);
          s.notify(list.length ? `Warmer: ${list.map((id) => `${PRODUCTS[id].icon}×${s.warmer[id]}`).join(" ")} · press a number key to take one.` : "The warmer is empty. Cook something and put it here (or let the kitchen stock it).");
          return;
        }
        if (def.storage) {
          const used = getStorageUsed(s.inventory, def.storage);
          const cap = getStorageCapacity(s.placed, def.storage);
          const items = INGREDIENT_ORDER.filter((i) => INGREDIENTS[i].storage === def.storage && s.inventory[i] > 0).map((i) => `${INGREDIENTS[i].icon}${s.inventory[i]}`).join(" ");
          s.notify(`${def.icon} ${def.name}: ${items || "empty"} · ${Math.round(used)}/${cap} units`);
          return;
        }
        s.notify(`${def.name}. Press F to pick it up and move it.`);
        break;
      }
      case "customer":
        s.serveCustomer(f.id);
        break;
      case "competitor": {
        const def = COMPETITOR_MAP[f.id];
        const st = s.competitors.find((c) => c.id === f.id);
        const m = getMarket(s);
        const share = m.competitors.find((c) => c.id === f.id)?.share ?? 0;
        s.notify(`${def.name} (${def.kr}) · ${st?.rating.toFixed(1)}★ · ${def.signature} · ${Math.round(share * 100)}% of the street${st?.promoText ? ` · ${st.promoText}` : ""}`);
        break;
      }
    }

    function unpackInto(kind: StorageKind) {
      const st = get();
      if (st.carried?.kind !== "mart") return;
      const contents = { ...st.carried.contents };
      const inventory = { ...st.inventory };
      const cap = getStorageCapacity(st.placed, kind);
      let used = getStorageUsed(inventory, kind);
      const moved: string[] = [];
      let anyMatching = false;
      for (const id of INGREDIENT_ORDER) {
        const qty = contents[id] ?? 0;
        if (!qty || INGREDIENTS[id].storage !== kind) continue;
        anyMatching = true;
        const size = INGREDIENTS[id].size;
        const fit = Math.max(0, Math.min(qty, Math.floor((cap - used) / size + 1e-6)));
        if (fit > 0) {
          inventory[id] += fit;
          used += fit * size;
          contents[id] = qty - fit;
          if (!contents[id]) delete contents[id];
          moved.push(`${INGREDIENTS[id].icon}${fit}`);
        }
      }
      if (!anyMatching) {
        st.notify(`Nothing in this box goes in the ${kind === "fridge" ? "fridge" : kind === "pantry" ? "pantry" : "display case"}.`, "warn");
        return;
      }
      if (!moved.length) {
        sfx.error();
        st.notify(`The ${kind} is full (${Math.round(used)}/${cap}). Buy a bigger one at the appliance store.`, "warn");
        return;
      }
      sfx.pickup();
      const empty = Object.keys(contents).length === 0;
      set({ inventory, carried: empty ? null : { kind: "mart", contents } });
      st.notify(`Unpacked ${moved.join(" ")} into the ${kind}.${empty ? " Box empty — recycled." : ""}`, "good");
      get().checkQuests();
    }
  },

  /** F: pick up a placed item into a box. */
  pickUp: () => {
    const s = get();
    if (s.phase !== "playing" || s.modal !== "none") return;
    const f = s.focused;
    if (!f || f.kind !== "placed") return;
    // lifting a surface keeps children attached to the box — they ride along and land on the new surface
    void s;
    if (s.carried) {
      s.notify("Put down the box you're carrying first (Q).", "warn");
      return;
    }
    if (s.heldItem) {
      s.notify("Your hands are full.", "warn");
      return;
    }
    const p = s.placed.find((x) => x.uid === f.uid);
    if (!p) return;
    void p.onUid;
    const def = ITEMS[p.item];
    const m = s.stations[p.uid];
    if (m && (m.brewing || m.ready)) {
      s.notify("That station is busy.", "warn");
      return;
    }
    if (s.staffNpcs.some((n) => n.targetUid === p.uid && (n.state === "toStation" || n.state === "working"))) {
      s.notify("A staff member is about to use that.", "warn");
      return;
    }
    if (def.seats && Object.keys(s.seatTaken).some((k) => k.startsWith(`${p.uid}:`))) {
      s.notify("Someone is sitting there!", "warn");
      return;
    }
    const seatTaken = { ...s.seatTaken };
    const stations = { ...s.stations };
    delete stations[p.uid];
    sfx.pickup();
    const keepUid = p.uid;
    set((st) => ({ placed: st.placed.filter((x) => x.uid !== p.uid), carried: { kind: "item", item: p.item, uid: keepUid }, placeRot: p.rot, stations, seatTaken, focused: null }));
    void 0;
    s.notify(`Picked up ${def.icon} ${def.name}. E to place, R to rotate, Q to put the box down.`);
  },

  /** Q: put the carried box on the floor where you stand. */
  dropCarried: () => {
    const s = get();
    if (!s.carried || s.phase !== "playing" || s.modal !== "none") return;
    const y = simState.playerY;
    const floor = floorFromY(y);
    if (Math.abs(FLOOR_Y[floor] - y) > 0.3) {
      s.notify("Can't put a box down on the stairs.", "warn");
      return;
    }
    if (s.carried.kind === "dirty") {
      const y = simState.playerY;
      const floor = floorFromY(y);
      if (Math.abs(FLOOR_Y[floor] - y) > 0.3) {
        s.notify("Can't put dishes down on the stairs.", "warn");
        return;
      }
      get().spawnDirtyPile(simState.playerX, simState.playerZ, floor, s.carried.counts);
      sfx.pickup();
      set({ carried: null, aim: null });
      return;
    }
    const box: Box = { uid: (s.carried as { uid?: number }).uid ?? nextUid++, kind: s.carried.kind, item: s.carried.kind === "item" ? s.carried.item : undefined, contents: s.carried.kind === "mart" ? s.carried.contents : undefined, x: simState.playerX, z: simState.playerZ, floor };
    sfx.pickup();
    set((st) => ({ boxes: [...st.boxes, box], carried: null, aim: null }));
  },

  hotkey: (n) => {
    const s = get();
    const f = s.focused;
    if (!f || f.kind !== "placed" || s.phase !== "playing" || s.modal !== "none" || s.carried) return;
    const p = s.placed.find((x) => x.uid === f.uid);
    if (!p) return;
    void p.onUid;
    const def = ITEMS[p.item];
    if (def.station) {
      const st = s.stations[p.uid] ?? IDLE;
      if (st.brewing || st.ready || st.prepLeft) {
        s.notify("That station is busy.", "warn");
        return;
      }
      const list = stationMenu(s, p);
      const prod = list[n - 1];
      if (!prod) return;
      const batch = def.station === "oven" ? Math.max(1, (def.trays ?? 2) * 4) : 1;
      if (!canMakeN(s, prod, batch)) {
        sfx.error();
        s.notify(`Not enough ingredients for a ${batch}× batch of ${prod.name}. Check the fridge/pantry or visit Minji's Mart.`, "warn");
        return;
      }
      // hand prep (rolling dough / chopping) needs the minigame unless a machine does it
      const auto = s.placed.some((x) => ITEMS[x.item].autoPrep === (def.station === "oven" ? "dough" : "chop"));
      if (!auto && (def.station === "oven" || def.station === "range")) {
        s.prepMinigame(p.uid, prod.id);
        s.notify(`🥖 ${def.station === "oven" ? "Roll the dough" : "Chop the prep"}: press Space when the marker is in the green (3×) — bakes ${batch} at once.`);
        return;
      }
      get().startBake(p.uid, prod.id, null, 5);
    } else if (def.storage === "warmer") {
      if (s.heldItem) {
        sfx.error();
        s.notify("Your hands are full.", "warn");
        return;
      }
      const list = (Object.keys(s.warmer) as ProductId[]).filter((id) => (s.warmer[id] ?? 0) > 0);
      const prod = list[n - 1];
      if (!prod) return;
      if (get().takeFromWarmer(prod)) {
        sfx.pickup();
        set({ heldItem: prod });
      }
    } else if (def.storage === "display") {
      if (s.heldItem) {
        sfx.error();
        s.notify("Your hands are full.", "warn");
        return;
      }
      const pastries = getMenu(s).filter((x) => x.station === "display");
      const prod = pastries[n - 1];
      if (!prod) return;
      if (!canMake(s, prod)) {
        sfx.error();
        s.notify(`No ${prod.name} left. Buy more at Minji's Mart.`, "warn");
        return;
      }
      const inventory = { ...s.inventory };
      for (const [ing, qty] of requiredIngredients(prod, s.placed)) inventory[ing] -= qty;
      sfx.pickup();
      set({ inventory, heldItem: prod.id });
    }
  },

  buyMart: (cart, deliver) => {
    const s = get();
    let total = 0;
    let slots = 0;
    for (const pack of MART_PACKS) {
      const q = cart[pack.ingredient] ?? 0;
      if (!q) continue;
      const packs = Math.ceil(q / pack.qty);
      total += packs * pack.price;
      slots += packs;
    }
    if (!slots) return false;
    if (slots > BOX_SLOTS) {
      s.notify(`A box holds ${BOX_SLOTS} packs.`, "warn");
      return false;
    }
    if (deliver) total += DELIVERY_FEE;
    if (s.money < total) {
      sfx.error();
      s.notify("Not enough money.", "warn");
      return false;
    }
    if (!deliver && s.carried) {
      s.notify("You're already carrying a box — choose delivery instead.", "warn");
      return false;
    }
    sfx.buy();
    const contents: BoxContents = {};
    for (const pack of MART_PACKS) {
      const q = cart[pack.ingredient] ?? 0;
      if (q) contents[pack.ingredient] = Math.ceil(q / pack.qty) * pack.qty;
    }
    if (deliver) {
      const idx = s.boxes.length;
      const [x, z] = deliverySlot(idx);
      const box: Box = { uid: nextUid++, kind: "mart", contents, x, z, floor: 0 };
      set((st) => ({ money: st.money - total, boxes: [...st.boxes, box], stats: { ...st.stats, grocerPurchases: st.stats.grocerPurchases + 1 } }));
      s.notify("📦 Supplies delivered to the alley behind your café (back door).", "good");
    } else {
      set((st) => ({ money: st.money - total, carried: { kind: "mart", contents }, stats: { ...st.stats, grocerPurchases: st.stats.grocerPurchases + 1 } }));
      s.notify("📦 Carrying a box of supplies. Unpack it into the fridge / pantry / display case.", "good");
    }
    get().checkQuests();
    get().save();
    return true;
  },

  buyItems: (item, qty) => {
    const s = get();
    const def = ITEMS[item];
    const total = def.price * qty;
    if (qty <= 0) return;
    if (s.money < total) {
      sfx.error();
      s.notify("Not enough money.", "warn");
      return;
    }
    sfx.buy();
    const boxes = [...s.boxes];
    for (let i = 0; i < qty; i++) {
      const [x, z] = deliverySlot(boxes.length);
      boxes.push({ uid: nextUid++, kind: "item", item, x, z, floor: 0 });
    }
    set((st) => ({ money: st.money - total, boxes, stats: { ...st.stats, hardwarePurchases: st.stats.hardwarePurchases + qty } }));
    s.notify(`📦 ${qty}× ${def.name} delivered to the alley behind your café. Carry each box in and place it.`, "good");
    get().checkQuests();
    get().save();
  },

  buyInstallation: (id) => {
    const s = get();
    const def = INSTALLATION_MAP[id];
    if (!def || s.installations[id]) return;
    if (def.requires && !s.installations[def.requires]) {
      s.notify(`Requires ${INSTALLATION_MAP[def.requires].name} first.`, "warn");
      return;
    }
    if (s.money < def.price) {
      sfx.error();
      s.notify("Not enough money.", "warn");
      return;
    }
    sfx.quest();
    const installations = { ...s.installations, [id]: true };
    const grillNeeded = id === "kitchen2" && !s.placed.some((p) => p.item === "grillBasic");
    const grillSlot = kitchenSlots(installations).at(-1) ?? [5.85, -7.2];
    const occupied = s.placed.some((p) => ITEMS[p.item].slot && Math.hypot(p.x - grillSlot[0], p.z - grillSlot[1]) < 0.9);
    const candidates: PlacedItem[] = grillNeeded && !occupied
      ? [...s.placed, { uid: nextUid++, item: "grillBasic" as const, x: grillSlot[0], z: grillSlot[1], rot: 1 as const, floor: 0 as const }]
      : s.placed;
    // builders move anything that now blocks a new doorway back to the alley
    const moved: PlacedItem[] = [];
    const keep: PlacedItem[] = [];
    for (const p of candidates) {
      const v = validatePlacement(ITEMS[p.item], p.x, p.z, p.rot, p.floor, candidates, installations, p.uid, p.onUid);
      if (v.ok) keep.push(p);
      else moved.push(p);
    }
    const boxes = [...s.boxes];
    for (const p of moved) {
      const [x, z] = deliverySlot(boxes.length);
      boxes.push({ uid: nextUid++, kind: "item", item: p.item, x, z, floor: 0 });
    }
    const stations = { ...s.stations };
    for (const p of moved) delete stations[p.uid];
    set((st) => ({ money: st.money - def.price, installations, placed: keep, boxes, stations }));
    s.notify(`${def.icon} ${def.name} done!${def.rent ? ` Rent +${fmtMoney(def.rent)}/month.` : ""}`, "good");
    if (moved.length) s.notify(`🧰 The builders boxed up ${moved.map((p) => ITEMS[p.item].name).join(", ")} (it blocked a new doorway) — find it in the alley.`, "warn");
    get().checkQuests();
    get().save();
  },

  setPrice: (id, price) => {
    const p = Math.round(clamp(price, 500, 30000) / 100) * 100;
    set((st) => ({ prices: { ...st.prices, [id]: p } }));
  },

  // -------------------------------------------------------------------------
  // Serving
  // -------------------------------------------------------------------------
  /** Player hands the held item to a customer (ordering at the counter, waiting for a ticket, or seated & waiting). */
  serveCustomer: (id) => {
    const s = get();
    const c = s.customers.find((x) => x.id === id);
    if (!c || !c.order) return;
    const servable = c.state === "ordering" || c.state === "waiting" || (c.state === "sitting" && c.awaiting) || (c.state === "toSeat" && c.awaiting);
    if (!servable) return;
    const wanted = PRODUCTS[c.order];
    if (!s.heldItem) {
      s.notify(`${c.name} wants a ${wanted.name}. Your hands are empty.`, "warn");
      return;
    }
    if (s.heldItem !== c.order) {
      sfx.error();
      s.notify(`That's a ${PRODUCTS[s.heldItem].name} — ${c.name} wants a ${wanted.name}.`, "warn");
        return;
    }
    if (!c.paid) {
      s.notify(`${c.name} hasn't paid — ring them up at the EFTPOS first!`, "warn");
      return;
    }
    if (get().completeSale(c, null)) set({ heldItem: null });
  },

  /**
   * Finalise a sale: packaging, payment, tips, reviews and the customer's next move.
   * `by` is null for the player, or the staff member handing the item over.
   */
  completeSale: (c, by) => {
    const s = get();
    if (!c.order) return false;
    if (!c.paid) {
      s.notify(`${c.name} hasn't paid yet — ring them up at the EFTPOS first!`, "warn");
      return false;
    }
    const wanted = PRODUCTS[c.order];
    const inst = s.installations;
    const wd = WEATHERS[s.weather];
    const cf = getComfort(s.day, s.weather, s.clock, getCapacity(s));
    const outdoorOk = wd.traffic >= 0.85 && cf.temp >= 10 && cf.temp <= 30;
    const freeSeats = getSeats(s.placed, inst).filter((st) => !s.seatTaken[st.key] && (!st.outdoor || outdoorOk));

    let seat: Seat | null = null;
    let mode: CustomerMode = c.mode;
    const alreadySeated = !!c.seat;
    if (alreadySeated) mode = "dinein";
    else if (mode === "dinein") {
      const partyMates = s.customers.filter((o) => o.party === c.party && o.id !== c.id && o.seat);
      const mateTable = partyMates[0]?.seat?.split(":")[0];
      seat = (mateTable ? freeSeats.find((st) => String(st.table) === mateTable) : null) ?? null;
      if (!seat) {
        const remaining = s.customers.filter((o) => o.party === c.party && !o.seat && (o.state === "queueing" || o.state === "ordering" || o.state === "waiting")).length;
        const byTable = new Map<number, Seat[]>();
        for (const st of freeSeats) byTable.set(st.table, [...(byTable.get(st.table) ?? []), st]);
        const good = [...byTable.values()].filter((l) => l.length >= remaining);
        const list = good.length ? good : [...byTable.values()];
        seat = list.length ? pick(list)[0] : null;
      }
      if (!seat) {
        mode = "togo";
        c.say = pick(NO_SEATS);
        c.sayTimer = 2.5;
      }
    }

    const inventory = { ...s.inventory };
    const dishes = { ...s.dishes };
    if (mode === "togo") {
      const need = packFor(wanted);
      if ((inventory[need] ?? 0) < 1) {
        if (!by) {
          sfx.error();
          s.notify(`Out of ${INGREDIENTS[need].name.toLowerCase()} (utility cupboard)! Buy more at Minji's Mart.`, "warn");
          get().addRep(-3, "Out of packaging", "🥤");
          return false;
        }
        s.notify(`⚠️ Out of ${INGREDIENTS[need].name.toLowerCase()} — handing it over unpacked. Restock soon.`, "warn");
        get().addRep(-2, "Out of packaging", "🥤");
      } else inventory[need] -= 1;
    } else {
      // dine-in: needs a clean dish from the rack
      const dish = dishFor(wanted);
      if ((dishes[dish] ?? 0) < 1) {
        // try to downgrade to to-go
        const pack = packFor(wanted);
        if ((inventory[pack] ?? 0) >= 1 && !alreadySeated) {
          mode = "togo";
          c.mode = "togo";
          c.say = pick(NO_SEATS.length ? ["No clean dishes — to-go it is!", "I'll take it to go."] : ["To go then."]);
          c.sayTimer = 2.5;
          inventory[pack] -= 1;
        } else {
          sfx.error();
          s.notify(`No clean ${INGREDIENTS[dish].name.toLowerCase()} on the rack! Wash dishes at the sink${!by ? "" : " — the waitress will get them"}.`, "warn");
          get().addRep(-4, "No clean dishes", "🍽️");
          if (!by) return false;
        }
      } else {
        dishes[dish] -= 1;
        if (Math.random() < 0.02) {
          // a dish breaks in use
          inventory[dish] = (inventory[dish] ?? 1) - 1;
          set((st) => ({ stats: { ...st.stats, dishesBroken: st.stats.dishesBroken + 1 } }));
          get().addRep(-2, "A dish broke during service", "🥄");
        }
      }
    }

    const price = s.prices[c.order] + (c.rider ? 1500 : 0); // for tip sizing — money was taken at the POS
    const quality = clamp(1 - c.waited / c.maxPatience, 0, 1);
    const ambience = getAmbience(s);
    const serviceBoost = by ? 0.6 + by.service / 10 : 1;
    let tip = 0;
    if (!c.rider) {
      const tipChance = (mode === "dinein" ? 0.6 : 0.25) * quality * serviceBoost;
      if (c.vip || Math.random() < tipChance) {
        tip = price * (0.1 + Math.random() * 0.25);
        if (c.partySize >= 2) tip *= 1.8;
        if (c.vip) tip = Math.max(tip * 6, 20000 + Math.random() * 30000) * (0.5 + quality);
        tip = Math.round(tip / 100) * 100;
      }
    }
    const reviewChance = c.rider ? 0 : (0.06 + 0.25 * quality + Math.min(0.15, ambience / 500) + (mode === "dinein" ? 0.08 : 0) + (wd.severe ? 0.06 : 0) + (by ? (by.service - 5) * 0.012 : 0)) * (0.3 + 0.7 * cf.comfort);
    const waitedLong = c.waited > c.maxPatience * 0.7;

    for (const o of s.customers) if (o.queueIndex > c.queueIndex && c.queueIndex >= 0) o.queueIndex--;
    if (c.waitIndex >= 0) for (const o of s.customers) if (o.waitIndex > c.waitIndex) o.waitIndex--;
    c.queueIndex = -1;
    c.waitIndex = -1;
    c.awaiting = false;
    c.hasItem = true;
    c.patience = c.maxPatience;
    c.stateTime = 0;
    const seatTaken = { ...s.seatTaken };
    const base = (16 + Math.random() * 16) * wd.stay * Math.max(0.3, cf.comfort) * (inst.toilet ? 1.2 : 1);
    const sitFor = c.partySize >= 2 ? base * 1.3 : base;
    if (alreadySeated) {
      if (c.state === "sitting") c.sitTimer = sitFor;
      else c.sitTimer = sitFor; // still walking to the seat: timer starts when seated (sim keeps it)
      c.mode = "dinein";
      if (!c.say) {
        c.say = pick(THANKS);
        c.sayTimer = 2.5;
      }
    } else if (seat) {
      seatTaken[seat.key] = c.id;
      c.seat = seat.key;
      c.mode = "dinein";
      c.state = "toSeat";
      c.path = routeToSeat(seat, inst);
      c.sitTimer = sitFor;
      if (!c.say) {
        c.say = pick(THANKS);
        c.sayTimer = 2.5;
      }
    } else {
      c.mode = "togo";
      c.state = "leaving";
      c.path = exitPath(null, 0, inst);
      if (!c.say) {
        c.say = c.rider ? "On my way! 🛵" : pick(THANKS);
        c.sayTimer = 2.5;
      }
    }

    const total = price + tip;
    const isGroupLead = c.partySize >= 2 && !s.customers.some((o) => o.party === c.party && o.id !== c.id && o.hasItem);
    const staffId = by?.staffId ?? null;
    if (wanted.station === "display") set((st) => ({ stats: { ...st.stats, pastryServed: st.stats.pastryServed + 1 } }));
    if (wanted.station === "blender") set((st) => ({ stats: { ...st.stats, smoothieServed: st.stats.smoothieServed + 1 } }));
    (c as Customer & { dishUsed?: DishId }).dishUsed = mode === "dinein" ? dishFor(wanted) : undefined;
    set((st) => ({
      money: st.money + total,
      inventory,
      dishes,
      seatTaken,
      customers: [...st.customers],
      tickets: st.tickets.filter((t) => t.customerId !== c.id),
      staff: staffId === null ? st.staff : st.staff.map((x) => (x.id === staffId ? { ...x, served: x.served + 1 } : x)),
      stats: {
        ...st.stats,
        servedTotal: st.stats.servedTotal + 1,
        servedToday: st.stats.servedToday + 1,
        staffServedToday: st.stats.staffServedToday + (by ? 1 : 0),
        tipsTotal: st.stats.tipsTotal + tip,
        togoServed: st.stats.togoServed + (mode === "togo" ? 1 : 0),
        dineinServed: st.stats.dineinServed + (mode === "dinein" ? 1 : 0),
        groupsServed: st.stats.groupsServed + (isGroupLead ? 1 : 0),
        ridersServed: st.stats.ridersServed + (c.rider ? 1 : 0),
      },
    }));
    const who = by ? s.staff.find((x) => x.id === by.staffId)?.name : null;
    s.notify(`${wanted.icon} ${wanted.name} served to ${c.name}${c.rider ? " (delivery)" : mode === "togo" ? " (to-go)" : ""}${tip ? ` · +${fmtMoney(tip)} tip` : ""}${who ? ` · ${who}` : ""}`, "good");
    if (c.vip) {
      // celebrities always post. Fast + comfortable = huge boost; slow or uncomfortable = heavy hit.
      const good = quality > 0.45 && cf.comfort > 0.6;
      const meh = !good && quality > 0.2;
      get().addReview(good ? 5 : meh ? 3 : 2, c.order, { author: c.vip.handle, vip: true, rep: good ? REP.vipGood : meh ? REP.vipMeh : REP.vipBad });
      if (good) {
        set((st) => ({ stats: { ...st.stats, vipHappy: st.stats.vipHappy + 1 }, buzz: Math.max(st.buzz, 0.8) }));
        get().pushEvent({ kind: "vip", label: `🌟 ${c.vip.name} posted about you!`, until: s.clock + 120 });
        s.notify(`📱 ${c.vip.handle} posted a story from your café. The street is about to notice.`, "good");
      } else if (!meh) s.notify(`📱 ${c.vip.handle} posted… and it wasn't kind.`, "warn");
    } else if (Math.random() < reviewChance) {
      get().addReview(rollStars(quality, cf.comfort, waitedLong), c.order);
    } else if (waitedLong && Math.random() < 0.3) get().addRep(REP.wrongVibe, `${c.name} waited too long`, "⏳");
    get().checkQuests();
    return true;
  },

  /** Called when a customer reaches the queue: if what they wanted can no longer be made, they pick again or leave. */
  revalidateOrder: (c) => {
    const s = get();
    const ok = c.order ? orderable(s).some((p) => p.id === c.order) : false;
    if (ok) return true;
    const next = s.chooseOrder(c.kid);
    if (!next) return false;
    if (c.order && c.order !== next) {
      c.say = pick(["Oh, no " + PRODUCTS[c.order].name + "? Then a " + PRODUCTS[next].name + ".", "Hmm, I'll have a " + PRODUCTS[next].name + " instead."]);
      c.sayTimer = 3;
    }
    c.order = next;
    return true;
  },

  /** A cashier takes the front customer's order: creates a ticket and moves the customer out of the queue. */
  cancelTicket: (ticketId) => {
    const s = get();
    const t = s.tickets.find((x) => x.id === ticketId);
    if (!t) return;
    for (const n of s.staffNpcs) {
      if (n.ticketId === ticketId) {
        n.ticketId = null;
        if (n.carrying) {
          n.carrying = null;
          n.say = "Oh — they left.";
          n.sayTimer = 2;
        }
        n.state = "idle";
        n.path = [];
      }
    }
    set((st) => ({ tickets: st.tickets.filter((x) => x.id !== ticketId) }));
  },

  updateTicket: (ticketId, patch) => set((st) => ({ tickets: st.tickets.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)) })),

  hire: (applicantId) => {
    const s = get();
    const a = s.applicants.find((x) => x.id === applicantId);
    if (!a) return;
    if (s.staff.length >= getStaffCap(s.installations)) {
      sfx.error();
      s.notify(`You can only employ ${getStaffCap(s.installations)} people with a café this size. Expand to hire more.`, "warn");
      return;
    }
    sfx.quest();
    const member: Staff = { ...a, role: null, hiredDay: s.day, served: 0 };
    set((st) => ({ staff: [...st.staff, member], applicants: st.applicants.filter((x) => x.id !== applicantId) }));
    s.notify(`🤝 Hired ${a.name} (${fmtMoney(a.wage)}/day). Give them a role in the Staff tab — they start right away.`, "good");
    get().save();
  },

  dismiss: (staffId) => {
    const s = get();
    const st = s.staff.find((x) => x.id === staffId);
    if (!st) return;
    for (const t of s.tickets) if (t.staffId === staffId) get().updateTicket(t.id, { status: "pending", staffId: null, stationUid: null });
    set((x) => ({ staff: x.staff.filter((m) => m.id !== staffId), staffNpcs: x.staffNpcs.filter((n) => n.id !== staffId) }));
    s.notify(`${st.name} has left the café.`);
    get().save();
  },

  assignRole: (staffId, role) => {
    const s = get();
    if (role && ROLE_MAP[role].needsKitchen2 && !s.installations.kitchen2) {
      s.notify(`${ROLE_MAP[role].name} needs the FULL kitchen (CaféOS → Property). The half kitchen only supports bakers.`, "warn");
      return;
    }
    if (role && ROLE_MAP[role].needsKitchen && !s.installations.kitchen) {
      s.notify("That role needs the kitchen expansion (CaféOS → Property).", "warn");
      return;
    }
    if (role && s.staff.filter((x) => x.role === role && x.id !== staffId).length >= ROLE_MAP[role].max) {
      s.notify(`You already have the maximum number of ${ROLE_MAP[role].name.toLowerCase()}s for this café.`, "warn");
      return;
    }
    for (const t of s.tickets) if (t.staffId === staffId) get().updateTicket(t.id, { status: "pending", staffId: null, stationUid: null });
    set((st) => ({ staff: st.staff.map((x) => (x.id === staffId ? { ...x, role } : x)) }));
    get().spawnStaff();
    get().checkQuests();
    get().save();
  },

  setAutoStock: (v) => set({ autoStock: v }),
  setMusic: (m) => {
    set({ music: m });
    get().save();
  },

  /** Make sure every rostered employee has an NPC on the floor (and nobody without a role does). */
  spawnStaff: () => {
    const s = get();
    if (s.phase !== "playing") return;
    const npcs = s.staffNpcs.filter((n) => s.staff.some((x) => x.id === n.id && x.role));
    let i = npcs.length;
    for (const st of s.staff) {
      if (!st.role || npcs.some((n) => n.id === st.id)) continue;
      const spot = POINTS.staffIdle[i % POINTS.staffIdle.length];
      i++;
      npcs.push({
        id: st.id, pos: new THREE.Vector3(spot[0] + (Math.random() - 0.5) * 0.4, 0, spot[2]), yaw: 0, path: [], moving: false, walkPhase: Math.random() * 6,
        speed: 1.35 + (st.skills.speed - 1) * 0.07, state: "idle", ticketId: null, carrying: null, box: null, timer: 0, say: null, sayTimer: 0, targetUid: null, wanderTimer: 2 + Math.random() * 4,
      });
    }
    for (const n of s.staffNpcs) if (!npcs.includes(n) && n.ticketId) get().updateTicket(n.ticketId, { status: "pending", staffId: null, stationUid: null });
    set({ staffNpcs: npcs });
  },

  /** Start a bake/cook at a station. Ovens bake a batch (trays × 4). Prep phase handled by sim. */
  startBake: (stationUid, product, _staffId, _skill) => {
    const s = get();
    const p = s.placed.find((x) => x.uid === stationUid);
    const prod = PRODUCTS[product];
    if (!p) return false;
    const st = s.stations[stationUid];
    if (st && (st.brewing || st.ready || st.prepLeft)) return false;
    const def = ITEMS[p.item];
    const batch = def.station === "oven" ? Math.max(1, (def.trays ?? 2) * 4) : 1;
    // one batch up front is too much stock at once — reserve ingredients but consume per finished item in the sim
    if (!canMakeN(s, prod, batch)) return false;
    const inventory = { ...s.inventory };
    const mixer = s.placed.some((x) => x.item === "mixer");
    let t = getBrewTime(prod, s.placed, def.tier ?? 1);
    if (mixer && def.station === "oven") t *= 0.75;
    // prep phase: rolling dough / chopping — machines skip it
    const needsDough = def.station === "oven";
    const sheeter = s.placed.some((x) => ITEMS[x.item].autoPrep === "dough");
    const processor = s.placed.some((x) => ITEMS[x.item].autoPrep === "chop");
    const auto = needsDough ? sheeter : processor;
    const prep = auto ? 2.5 : 6;
    set((x) => ({
      inventory,
      stations: { ...x.stations, [stationUid]: { brewing: product, timeLeft: t, total: t, ready: null, batch, readyCount: 0, prepLeft: prep, prepTotal: prep } },
    }));
    return true;
  },

  staffStartBrew: (stationUid, product, staffId, skill) => {
    const s = get();
    const p = s.placed.find((x) => x.uid === stationUid);
    const prod = PRODUCTS[product];
    if (!p) return false;
    const def = ITEMS[p.item];
    if (def.station === "oven" || def.station === "range") return get().startBake(stationUid, product, staffId, skill);
    const st = s.stations[stationUid];
    if (st && (st.brewing || st.ready)) return false;
    if (!canMake(s, prod)) return false;
    const inventory = { ...s.inventory };
    for (const [ing, qty] of requiredIngredients(prod, s.placed)) inventory[ing] -= qty;
    const speed = clamp(1.6 - (skill - 1) / 9, 0.6, 1.6);
    void staffId;
    const t = getBrewTime(prod, s.placed, def.tier ?? 1) * speed;
    set((x) => ({ inventory, stations: { ...x.stations, [stationUid]: { brewing: product, timeLeft: t, total: t, ready: null } } }));
    return true;
  },

  staffTakeReady: (stationUid) => {
    const s = get();
    const st = s.stations[stationUid];
    if (!st?.ready) return null;
    const ready = st.ready;
    const left = (st.readyCount ?? 1) - 1;
    set((x) => ({ stations: { ...x.stations, [stationUid]: { ...st, ready: left > 0 ? st.ready : null, readyCount: left } } }));
    return ready;
  },

  staffTakeDisplay: (product) => {
    const s = get();
    const prod = PRODUCTS[product];
    if (prod.station !== "display" || !canMake(s, prod)) return false;
    const inventory = { ...s.inventory };
    for (const [ing, qty] of requiredIngredients(prod, s.placed)) inventory[ing] -= qty;
    set({ inventory });
    return true;
  },

  putInWarmer: (product) => {
    const s = get();
    if (!s.placed.some((p) => p.item === "warmer")) return false;
    if (warmerCount(s.warmer) >= WARMER_CAP) return false;
    set((st) => ({ warmer: { ...st.warmer, [product]: (st.warmer[product] ?? 0) + 1 } }));
    return true;
  },

  takeFromWarmer: (product) => {
    const s = get();
    if ((s.warmer[product] ?? 0) <= 0) return false;
    set((st) => {
      const w = { ...st.warmer, [product]: (st.warmer[product] ?? 0) - 1 };
      if (w[product]! <= 0) delete w[product];
      return { warmer: w };
    });
    return true;
  },

  setFloorStyle: (floor, patch) => {
    const s = get();
    const cur = s.style.floors[floor];
    let cost = 0;
    if (patch.floor && patch.floor !== cur.floor) cost += FLOOR_PATTERNS.find((f) => f.id === patch.floor)?.price ?? 0;
    if (patch.wall && patch.wall !== cur.wall) cost += WALL_PAINTS.find((f) => f.id === patch.wall)?.price ?? 0;
    if (patch.ceiling && patch.ceiling !== cur.ceiling) cost += ROOF_STYLES.find((f) => f.id === patch.ceiling)?.price ?? 0;
    if (cost > s.money) {
      sfx.error();
      s.notify("Not enough money for that finish.", "warn");
      return;
    }
    sfx.buy();
    set((st) => ({ money: st.money - cost, styled: true, style: { ...st.style, floors: { ...st.style.floors, [floor]: { ...st.style.floors[floor], ...patch } } } }));
    if (cost) s.notify(`🎨 Redecorated (−${fmtMoney(cost)}).`, "good");
    get().checkQuests();
    get().save();
  },

  setKitchenLook: (look) => {
    const s = get();
    const cost = look === s.style.kitchen ? 0 : KITCHEN_LOOKS.find((k) => k.id === look)?.price ?? 0;
    if (cost > s.money) {
      sfx.error();
      s.notify("Not enough money for that finish.", "warn");
      return;
    }
    sfx.buy();
    set((st) => ({ money: st.money - cost, styled: true, style: { ...st.style, kitchen: look } }));
    get().checkQuests();
    get().save();
  },

  setFacade: (paint) => {
    const s = get();
    const cost = paint === s.style.facade ? 0 : (WALL_PAINTS.find((f) => f.id === paint)?.price ?? 0) * 2;
    if (cost > s.money) {
      sfx.error();
      s.notify("Not enough money for that finish.", "warn");
      return;
    }
    sfx.buy();
    set((st) => ({ money: st.money - cost, styled: true, style: { ...st.style, facade: paint } }));
    get().checkQuests();
    get().save();
  },

  /** Office worker unpacks what fits; returns the remaining contents. */
  staffUnpack: (contents, kind) => {
    const s = get();
    const left = { ...contents };
    const inventory = { ...s.inventory };
    const cap = getStorageCapacity(s.placed, kind);
    let used = getStorageUsed(inventory, kind);
    for (const id of INGREDIENT_ORDER) {
      const qty = left[id] ?? 0;
      if (!qty || INGREDIENTS[id].storage !== kind) continue;
      const size = INGREDIENTS[id].size;
      const fit = Math.max(0, Math.min(qty, Math.floor((cap - used) / size + 1e-6)));
      if (fit > 0) {
        inventory[id] += fit;
        used += fit * size;
        left[id] = qty - fit;
        if (!left[id]) delete left[id];
      }
    }
    set({ inventory });
    return left;
  },

  menuOnOrDefault: (id) => get().menuOn[id] !== false,
  setMenu: (id, on) => {
    set((st) => ({ menuOn: { ...st.menuOn, [id]: on } }));
    get().save();
  },
  setPosUid: (uid) => set({ posUid: uid }),
  claimPos: (uid, staffId) => {
    const s = get();
    if (s.posBusy[uid]) return false;
    set((st) => ({ posBusy: { ...st.posBusy, [uid]: staffId } }));
    return true;
  },
  releasePos: (uid, staffId) =>
    set((st) => (st.posBusy[uid] === staffId ? { posBusy: Object.fromEntries(Object.entries(st.posBusy).filter(([k]) => +k !== uid)) } : st.posBusy)),

  /**
   * Ring a customer up at an EFTPOS/kiosk and take payment.
   * Creates the kitchen ticket and moves the customer to the pickup/wait area.
   */
  ringUpAt: (_posUid, customerId, byStaffId) => {
    const s = get();
    const c = s.customers.find((x) => x.id === customerId);
    if (!c || c.state !== "ordering" || c.paid || !c.order) return false;
    if (!get().revalidateOrder(c)) {
      get().customerLeaves(c, "noMenu");
      return false;
    }
    const wanted = PRODUCTS[c.order];
    const price = s.prices[c.order] + (c.rider ? 1500 : 0);

    set((st) => ({
      money: st.money + price,
      stats: { ...st.stats, earnedTotal: st.stats.earnedTotal + price, earnedToday: st.stats.earnedToday + price, posSales: st.stats.posSales + 1 },
    }));
    sfx.cash();
    s.notify(`💳 ${fmtMoney(price)} paid by ${c.name}${c.rider ? " (delivery)" : ""}${byStaffId ? " — rung up by " + (s.staff.find((x) => x.id === byStaffId)?.name ?? "staff") : ""}.`, "good");

    const counter = getCounter(s.placed);
    const inst = s.installations;
    const wd = WEATHERS[s.weather];
    const cf = getComfort(s.day, s.weather, s.clock, getCapacity(s));
    const outdoorOk = wd.traffic >= 0.85 && cf.temp >= 10 && cf.temp <= 30;
    const hasWaiter = s.staff.some((x) => x.role === "waiter") && s.staffNpcs.some((n) => s.staff.find((x) => x.id === n.id)?.role === "waiter");

    const ticket: Ticket = { id: nextTicketId++, customerId: c.id, product: c.order, status: "pending", stationUid: null, staffId: null, created: s.clock };
    for (const o of s.customers) if (o.queueIndex > c.queueIndex) o.queueIndex--;
    c.queueIndex = -1;
    c.paid = true;
    c.awaiting = true;
    c.stateTime = 0;
    c.say = pick(["Paid!", "Card's in.", "감사합니다!", "One " + wanted.name + " please."]);
    c.sayTimer = 2;
    const seatTaken = { ...s.seatTaken };
    let seated = false;
    if (c.mode === "dinein" && hasWaiter && counter) {
      const freeSeats = getSeats(s.placed, inst).filter((st) => !s.seatTaken[st.key] && (!st.outdoor || outdoorOk));
      const partyMates = s.customers.filter((o) => o.party === c.party && o.id !== c.id && o.seat);
      const mateTable = partyMates[0]?.seat?.split(":")[0];
      let seat = (mateTable ? freeSeats.find((st) => String(st.table) === mateTable) : null) ?? null;
      if (!seat && freeSeats.length) seat = pick(freeSeats);
      if (seat) {
        seatTaken[seat.key] = c.id;
        c.seat = seat.key;
        c.state = "toSeat";
        c.path = routeToSeat(seat, inst);
        c.sitTimer = 0;
        seated = true;
      }
    }
    if (!seated && counter) {
      const waiting = s.customers.filter((o) => o.waitIndex >= 0).length;
      c.waitIndex = waiting;
      c.state = "waiting";
      const [wx, wz] = waitSlot(counter, c.waitIndex);
      c.path = [new THREE.Vector3(wx, 0, wz)];
    } else if (!seated) {
      c.state = "leaving";
      c.path = exitPath(null, 0, inst);
    }
    set((st) => ({ tickets: [...st.tickets, ticket], seatTaken, customers: [...st.customers] }));
    return true;
  },

  dishNeeded: (p: ProductDef) => dishFor(p),
  canServeDineIn: (p) => {
    const s = get();
    return (s.dishes[dishFor(p)] ?? 0) > 0;
  },
  canServeToGo: (p) => {
    const s = get();
    return (s.inventory[packFor(p)] ?? 0) > 0;
  },

  spawnDirtyPile: (x, z, floor, counts) => {
    const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
    if (!total) return;
    const s = get();
    const existing = s.dirtyPiles.find((p) => Math.hypot(p.x - x, p.z - z) < 0.7 && p.floor === floor);
    if (existing) {
      for (const k of Object.keys(counts) as DishId[]) existing.counts[k] = (existing.counts[k] ?? 0) + (counts[k] ?? 0);
      set((st) => ({ dirtyPiles: [...st.dirtyPiles] }));
      return;
    }
    const pile: DirtyPile = { id: Date.now() % 1000000 + Math.floor(Math.random() * 1000), x, z, floor, counts: { mug: 0, plate: 0, bowl: 0, spoon: 0, ...counts }, assigned: null };
    set((st) => ({ dirtyPiles: [...st.dirtyPiles, pile] }));
  },

  claimPile: (id, staffId) => {
    const p = get().dirtyPiles.find((x) => x.id === id);
    if (!p || p.assigned) return false;
    set((st) => ({ dirtyPiles: st.dirtyPiles.map((x) => (x.id === id ? { ...x, assigned: staffId } : x)) }));
    return true;
  },

  takePile: (id) => {
    const s = get();
    const p = s.dirtyPiles.find((x) => x.id === id);
    if (!p || s.carried) return false;
    set((st) => ({ dirtyPiles: st.dirtyPiles.filter((x) => x.id !== id), carried: { kind: "dirty", counts: { ...p.counts } } }));
    sfx.pickup();
    return true;
  },

  /** Staff member grabs a pile (counts move to the staff-carried map, not the player's hands). */
  staffTakePile: (id, staffId) => {
    const p = get().dirtyPiles.find((x) => x.id === id);
    if (!p || p.assigned) return false;
    staffCarrying.set(staffId, { ...p.counts });
    set((st) => ({ dirtyPiles: st.dirtyPiles.map((x) => (x.id === id ? { ...x, assigned: staffId } : x)).filter((x) => x.id !== id || true) }));
    set((st) => ({ dirtyPiles: st.dirtyPiles.filter((x) => x.id !== id) }));
    return true;
  },
  staffDropPile: (staffId) => staffCarrying.delete(staffId),

  /** Player rolls dough / chops: 3 quick timing scrubs instead of the 6 s wait. */
  prepMinigame: (stationUid, product) => {
    const s = get();
    if (s.washing) return;
    set({ washing: { counts: { mug: 0, plate: 0, bowl: 0, spoon: 0 }, scrubsLeft: 3, marker: 0, dir: 1, good: 0, source: "player", prepFor: { stationUid, product } } });
  },

  /** Begin washing the carried pile at a sink. auto = dishwasher present (no minigame). */
  startWash: (auto, staffId) => {
    const s = get();
    if (s.washing) return;
    const counts = staffId !== undefined ? staffCarrying.get(staffId) : s.carried?.kind === "dirty" ? s.carried.counts : null;
    if (!counts) return;
    const dishwasher = s.placed.some((p) => ITEMS[p.item].autoWash && p.floor === 0);
    const wash: WashingState = { counts: { ...counts }, scrubsLeft: auto || dishwasher ? 1 : 3, marker: 0, dir: 1, good: 0, source: staffId !== undefined ? "staff" : "player", staffId };
    set({ washing: wash });
    if (staffId === undefined) set({ carried: null });
  },

  /** One scrub attempt (player presses Space at the right moment). */
  scrub: () => {
    const s = get();
    const w = s.washing;
    if (!w || w.source !== "player") return;
    const good = w.marker > 0.3 && w.marker < 0.75;
    if (good) {
      w.scrubsLeft--;
      w.good++;
      sfx.pickup();
      if (w.scrubsLeft <= 0) {
        const pf = w.prepFor;
        set({ washing: null });
        if (pf) {
          const ok = get().startBake(pf.stationUid, pf.product, null, 5);
          if (ok) {
            // machine-less: the minigame WAS the rolling; bake starts immediately
            set((st) => ({ stations: { ...st.stations, [pf.stationUid]: { ...st.stations[pf.stationUid], prepLeft: 0 } } }));
            sfx.buy();
            get().notify("🥖 Dough rolled. Into the oven!");
          } else {
            sfx.error();
            get().notify("Not enough ingredients for that batch.", "warn");
          }
        } else get().finishWash();
        return;
      }
      w.marker = 0;
      w.dir = 1;
    } else {
      // a slip: one dish breaks
      const kinds = (Object.keys(w.counts) as DishId[]).filter((k) => w.counts[k] > 0);
      if (kinds.length) {
        const k = pick(kinds);
        w.counts[k]--;
        if (w.counts[k] <= 0) delete (w.counts as Partial<DishSet>)[k];
        set((st) => ({ stats: { ...st.stats, dishesBroken: st.stats.dishesBroken + 1 } }));
        get().addRep(-2, "Dropped a dish", "🥄");
      }
      sfx.error();
      w.marker = 0;
      w.dir = 1;
    }
    set({ washing: { ...w } });
  },

  finishWash: () => {
    const s = get();
    const w = s.washing;
    if (!w) return;
    const rack = s.placed.find((p) => ITEMS[p.item].storage === "rack" && p.floor === 0);
    const rackCap = rack ? ITEMS[rack.item].capacity ?? 0 : 0;
    const rackUsed = getStorageUsed(s.inventory, "rack");
    const free = Math.max(0, rackCap - rackUsed);
    const inventory = { ...s.inventory };
    const dishes = { ...s.dishes };
    let washed = 0;
    let broken = 0;
    for (const k of Object.keys(w.counts) as DishId[]) {
      let n = w.counts[k];
      if (staffWashBreak()) { n--; broken++; }
      const fit = Math.min(n, free - washed);
      if (fit > 0) {
        inventory[k] = (inventory[k] ?? 0) + fit;
        dishes[k] = (dishes[k] ?? 0) + fit;
        washed += fit;
      }
    }
    set((st) => ({ washing: null, dishes, inventory, stats: { ...st.stats, washes: st.stats.washes + 1, dishesBroken: st.stats.dishesBroken + broken } }));
    if (w.source === "player") {
      sfx.buy();
      s.notify(`🫧 Washed ${washed} dishes${broken ? ` — ${broken} broke!` : ""}.${washed < Object.values(w.counts).reduce((a, b) => a + b, 0) ? " Rack is full." : ""}`);
    }
    get().checkQuests();
  },

  /** Office worker orders a restock box when core stock is low. */
  officeOrder: (organising) => {
    const s = get();
    if (!s.autoStock) return false;
    const threshold = 6 + Math.round(organising * 0.8);
    const target = threshold * 3;
    const cart: BoxContents = {};
    let slots = 0;
    const core: IngredientId[] = ["beans", "milk", "ice", "cups", "bags", "soboro", "croissant", "eggtart"];
    const menu = getMenu(s);
    for (const p of menu) for (const ing of Object.keys(p.ingredients) as IngredientId[]) if (!core.includes(ing)) core.push(ing);
    const hasIce = s.placed.some((p) => ITEMS[p.item].infiniteIce);
    for (const ing of core) {
      if (ing === "ice" && hasIce) continue;
      if (INGREDIENTS[ing].storage === "display" && !s.placed.some((p) => ITEMS[p.item].storage === "display")) continue;
      const pack = MART_PACKS.find((m) => m.ingredient === ing);
      if (!pack) continue;
      const have = s.inventory[ing];
      const thr = ing === "cups" || ing === "bags" ? threshold * 4 : threshold;
      if (have >= thr) continue;
      const want = (ing === "cups" || ing === "bags" ? target * 4 : target) - have;
      const packs = Math.min(Math.ceil(want / pack.qty), BOX_SLOTS - slots);
      if (packs <= 0) continue;
      cart[ing] = packs * pack.qty;
      slots += packs;
      if (slots >= BOX_SLOTS) break;
    }
    if (!slots) return false;
    return get().buyMart(cart, true);
  },

  addReview: (stars, product, opts) => {
    const s = get();
    const text = opts?.vip ? vipReviewText(stars >= 4, PRODUCTS[product].name) : reviewText(stars, PRODUCTS[product].name);
    const rep = opts?.rep ?? (stars === 5 ? REP.review5 : stars === 4 ? REP.review4 : stars === 3 ? REP.review3 : stars === 2 ? REP.review2 : REP.review1);
    const review: Review = { id: (s.reviews[0]?.id ?? 0) + 1, author: opts?.author ?? pick(FIRST_NAMES), stars, text, day: s.day, rep, vip: opts?.vip };
    set((st) => ({ reviews: [review, ...st.reviews].slice(0, 300), stats: { ...st.stats, reviewsToday: st.stats.reviewsToday + 1 } }));
    if (rep !== 0) get().addRep(rep, `${"★".repeat(stars)} review from ${review.author}`, opts?.vip ? "🌟" : stars >= 4 ? "⭐" : "💢");
    if (stars >= 4) sfx.ding();
    else sfx.error();
    s.notify(`${"⭐".repeat(stars)}${"☆".repeat(5 - stars)} ${opts?.vip ? "🌟 " : ""}"${text}" (${rep >= 0 ? "+" : ""}${rep} rep)`, stars >= 4 ? "good" : "warn");
    get().checkQuests();
  },

  addRep: (delta, reason, icon = "📈") => {
    const s = get();
    const before = s.rep;
    const after = clamp(before + delta, REP_FLOOR, REP_MAX);
    const applied = after - before;
    if (applied === 0) return;
    const ev: RepEvent = { id: (s.repLog[s.repLog.length - 1]?.id ?? 0) + 1, day: s.day, clock: s.clock, delta: applied, reason, icon };
    const lvlBefore = getLevel(before);
    const lvlAfter = getLevel(after);
    set((st) => ({
      rep: after,
      repLog: [...st.repLog, ev].slice(-120),
      repToday: { gained: st.repToday.gained + Math.max(0, applied), lost: st.repToday.lost + Math.max(0, -applied) },
    }));
    if (lvlAfter > lvlBefore) {
      sfx.quest();
      s.notify(`🏆 Level ${lvlAfter}: ${LEVEL_NAMES[lvlAfter - 1]}! More people will hear about you${lvlAfter >= VIP_MIN_LEVEL ? " — and celebrities might drop by" : ""}.`, "good");
    } else if (lvlAfter < lvlBefore) {
      sfx.error();
      s.notify(`📉 Dropped to level ${lvlAfter} (${LEVEL_NAMES[lvlAfter - 1]}). Word gets around.`, "warn");
    }
  },

  setBuzz: (b) => set({ buzz: b }),
  pushEvent: (e) => set((st) => ({ events: [...st.events.filter((x) => x.kind !== e.kind), e] })),

  /** A celebrity walks in with their entourage. */
  spawnVip: () => {
    const s = get();
    const vip = s.vipToday;
    if (!vip) return;
    const season = getSeason(s.day);
    const wd = WEATHERS[s.weather];
    const cf = getComfort(s.day, s.weather, s.clock, getCapacity(s));
    const queueCount = s.customers.filter((c) => QUEUE_STATES.has(c.state)).length;
    const party = nextParty++;
    const size = 1 + vip.entourage;
    const spawn = Math.random() < 0.5 ? POINTS.spawnLeft : POINTS.spawnRight;
    const dir = spawn[0] < 0 ? -1 : 1;
    const maxPatience = getPatience(getAmbience(s)) * wd.patience * (0.4 + 0.6 * cf.comfort) * 0.9;
    const seats = getSeats(s.placed, s.installations).filter((st) => !s.seatTaken[st.key]).length;
    const members: Customer[] = [];
    for (let i = 0; i < size; i++) {
      const lead = i === 0;
      members.push({
        id: nextCustomerId++,
        name: lead ? vip.name : i === 1 ? "Manager" : "Camera",
        colors: lead ? { shirt: vip.look.shirt, pants: vip.look.pants, skin: vip.look.skin, hair: vip.look.hair } : { shirt: "#1e1e1e", pants: "#1e1e1e", skin: pick(["#f6d7b0", "#e8b98a"]), hair: "#1c1c1c" },
        outfit: { umbrella: null, scarf: lead ? vip.look.scarf : null, beanie: false, mask: lead ? vip.look.mask : false, shortSleeves: season === "summer", coat: season === "winter" },
        browser: false,
        kid: false,
        rider: false,
        paid: false,
        vip: lead ? vip : undefined,
        party,
        partySize: size,
        mode: seats >= size ? "dinein" : "togo",
        state: "entering",
        order: s.chooseOrder(false),
        path: [v3([POINTS.doorOutside[0], 0, POINTS.sidewalkZ]), v3(POINTS.doorOutside), v3(POINTS.doorInside)],
        pos: v3([spawn[0] + dir * i * 0.9, 0, spawn[2] + (i % 2) * 0.5]),
        yaw: 0,
        speed: 1.4 * wd.speed,
        patience: maxPatience,
        maxPatience,
        waited: 0,
        queueIndex: queueCount + i,
        waitIndex: -1,
        awaiting: false,
        seat: null,
        sitTimer: 0,
        stateTime: 0,
        say: lead ? pick(["Is this the place everyone's posting?", "Quick coffee before the shoot~", "Don't make a fuss, I'm just here for the latte."]) : i === 1 ? "Table for three, quietly please." : "📸",
        sayTimer: 0,
        walkPhase: Math.random() * 6,
        moving: true,
        hasItem: false,
      });
    }
    sfx.quest();
    set((st) => ({ customers: [...st.customers, ...members], vipSpawnAt: -1, stats: { ...st.stats, vipVisits: st.stats.vipVisits + 1 } }));
    get().pushEvent({ kind: "vip", label: `🌟 ${vip.name} is here!`, until: s.clock + 60 });
    s.notify(`🌟 ${vip.name} (${vip.handle}) just walked in with ${vip.entourage} people. ${vip.blurb} Serve them fast and well!`, "good");
  },

  /** A wave of office workers / students: a burst of customers who all want food now. */
  spawnCrowdCustomers: (kind) => {
    const s = get();
    const m = getMarket(s);
    const n = Math.max(1, Math.round((2 + Math.random() * 3) * m.share * 4));
    for (let i = 0; i < n; i++) {
      const before = get().customers.length;
      get().spawnParty();
      const after = get().customers;
      for (let k = before; k < after.length; k++) {
        after[k].crowd = kind;
        after[k].say = pick(kind === "office" ? OFFICE_LINES : STUDENT_LINES);
        if (kind === "student") {
          after[k].colors = { shirt: "#f5f6fa", pants: "#2b3a55", skin: after[k].colors.skin, hair: after[k].colors.hair };
          after[k].outfit = { ...after[k].outfit, coat: true };
        } else {
          after[k].colors = { shirt: pick(["#2d3436", "#3d4a63", "#1e3a5f", "#f5f6fa"]), pants: "#2d3436", skin: after[k].colors.skin, hair: after[k].colors.hair };
        }
      }
    }
  },

  startBusking: () => {
    const s = get();
    set({ buskingAt: s.clock, buzz: Math.max(s.buzz, 0.35) });
    get().pushEvent({ kind: "busking", label: "🎸 Busking on the plaza", until: s.clock + 90 });
    s.notify("🎸 A busker started playing on the plaza — people are drifting out of the shops to watch. Busy half hour ahead.", "good");
    for (const c of s.customers) if (c.state === "sitting" && Math.random() < 0.4) { c.say = pick(BUSKING_LINES); c.sayTimer = 3; }
  },

  checkQuests: () => {
    const s = get();
    const ctx: QuestContext = {
      stats: s.stats,
      inventory: s.inventory,
      reviewCount: s.reviews.length,
      rating: getRating(s.rep),
      seats: getSeats(s.placed, s.installations).length,
      installations: s.installations,
      placed: s.placed,
      money: s.money,
      share: getMarket(s).share,
      day: s.day,
      staffWithRoles: s.staff.filter((x) => x.role).length,
      styled: s.styled,
    };
    const completed = { ...s.completedQuests };
    const newly: QuestDef[] = [];
    let reward = 0;
    for (const q of QUESTS) {
      if (!completed[q.id] && q.fromDay <= s.day && q.progress(ctx) >= q.goal) {
        completed[q.id] = true;
        reward += q.reward;
        newly.push(q);
      }
    }
    if (newly.length) {
      set((st) => ({ money: st.money + reward, completedQuests: completed }));
      sfx.quest();
      for (const q of newly) s.notify(`✅ Quest complete: ${q.title} (+${fmtMoney(q.reward)})`, "good");
    }
  },

  sleep: () => {
    const s = get();
    set({ modal: "none" });
    s.endDay(true);
  },

  // -------------------------------------------------------------------------
  // Simulation-facing
  // -------------------------------------------------------------------------
  chooseOrder: (kid) => {
    const s = get();
    const available = orderable(s);
    if (!available.length) return null;
    const season = getSeason(s.day);
    const temp = getTemperature(s.day, s.weather, s.clock);
    const rating = getRating(s.rep);
    const inBudget = available.filter((p) => s.prices[p.id] <= priceCutoff(p.fair, rating));
    const pool = inBudget.length ? inBudget : available;
    return weightedPick(pool, (p: ProductDef) => {
      let w = getProductWeight(p, season, s.weather, temp, kid);
      w *= getPriceFactor(s.prices[p.id] / p.fair, rating);
      return w;
    }).id;
  },

  spawnParty: (force = false) => {
    const s = get();
    const queueCount = s.customers.filter((c) => QUEUE_STATES.has(c.state)).length;
    const cap = Math.round(MAX_QUEUE * crowdMultiplier(s.day, s.clock).cap * (1 + s.buzz * 0.5));
    if (queueCount >= cap && !force) return;
    const season = getSeason(s.day);
    const wd = WEATHERS[s.weather];
    const cf = getComfort(s.day, s.weather, s.clock, getCapacity(s));
    const seats = getSeats(s.placed, s.installations);
    const freeSeats = seats.filter((st) => !s.seatTaken[st.key]).length;
    const rider = !!s.installations.deliveryApp && Math.random() < 0.3;
    void freeSeats;
    let size = 1;
    if (!rider) {
      const r = Math.random();
      size = r < 0.72 ? 1 : r < 0.88 ? 2 : r < 0.95 ? 3 : r < 0.985 ? 4 : 5;
    }
    size = Math.min(size, cap - queueCount);
    if (size <= 0) return;
    const party = nextParty++;
    const baseDine = size >= 2 ? 0.8 : 0.5;
    const dineChance = baseDine * clamp(wd.stay, 0.6, 1.4) * (0.4 + 0.6 * cf.comfort) * (s.installations.toilet ? 1.1 : 1);
    // dine-in needs seats AND a clean dish of the right kind (checked again at serve time)
    const anyDish = (s.dishes.mug ?? 0) + (s.dishes.plate ?? 0) + (s.dishes.bowl ?? 0);
    const canDine = !rider && freeSeats >= size && anyDish > 0 && Math.random() < dineChance;
    const mode: CustomerMode = canDine ? "dinein" : "togo";
    const spawn = Math.random() < 0.5 ? POINTS.spawnLeft : POINTS.spawnRight;
    const dir = spawn[0] < 0 ? -1 : 1;
    const maxPatience = getPatience(getAmbience(s)) * wd.patience * (0.4 + 0.6 * cf.comfort);
    const kidIndex = size >= 3 && Math.random() < 0.4 ? size - 1 : -1;
    const members: Customer[] = [];
    for (let i = 0; i < size; i++) {
      const kid = i === kidIndex;
      members.push({
        id: nextCustomerId++,
        name: pick(FIRST_NAMES),
        colors: kid ? kidColors() : randomColors(season),
        outfit: makeOutfit(s.weather, season),
        browser: false,
        kid,
        rider,
        party,
        partySize: size,
        mode,
        state: "entering",
        order: s.chooseOrder(kid),
        paid: false,
        path: [v3([POINTS.doorOutside[0], 0, POINTS.sidewalkZ]), v3(POINTS.doorOutside), v3(POINTS.doorInside)],
        pos: v3([spawn[0] + dir * i * 0.9, 0, spawn[2] + (i % 2) * 0.5]),
        yaw: 0,
        speed: (rider ? 2.2 : 1.5 + Math.random() * 0.4) * wd.speed,
        patience: maxPatience * (rider ? 1.4 : 1),
        maxPatience: maxPatience * (rider ? 1.4 : 1),
        waited: 0,
        queueIndex: queueCount + i,
        waitIndex: -1,
        awaiting: false,
        seat: null,
        sitTimer: 0,
        stateTime: 0,
        say: rider ? pick(RIDER_LINES) : kid ? pick(KID_LINES) : size >= 2 && i === 0 ? pick(GROUP_LINES) : null,
        sayTimer: 0,
        walkPhase: Math.random() * 6,
        moving: true,
        hasItem: false,
      });
    }
    set((st) => ({ customers: [...st.customers, ...members] }));
  },

  stolenCustomer: () => {
    const s = get();
    set((st) => ({ stats: { ...st.stats, stolenToday: st.stats.stolenToday + 1, stolenTotal: st.stats.stolenTotal + 1 } }));
    const browsing = s.customers.filter((c) => c.browser).length;
    if (browsing >= 2 || Math.random() > 0.3) return;
    const m = getMarket(s);
    const target = weightedPick(m.competitors, (c) => c.appeal);
    const def = COMPETITOR_MAP[target.id];
    const reasons: string[] = [];
    if (m.comfort < 0.75) reasons.push(m.need === "cool" ? "No air-con? No thanks." : "Looks freezing in there.");
    if (m.priceRatio > 1.15) reasons.push("That much for an americano?!", "Bit pricey…");
    if (m.rating < 2.5) reasons.push("Never heard of this place.", "Only 1 star on the map…");
    if (!getSeats(s.placed, s.installations).length) reasons.push("Nowhere to sit.", "No tables? Let's go somewhere else.");
    if (m.ambience < 20) reasons.push("Looks a bit empty inside.");
    reasons.push(`${def.name} has a 1+1 deal.`, `Let's just go to ${def.name}.`);
    const season = getSeason(s.day);
    const wd = WEATHERS[s.weather];
    const spawn = Math.random() < 0.5 ? POINTS.spawnLeft : POINTS.spawnRight;
    const c: Customer = {
      id: nextCustomerId++,
      name: pick(FIRST_NAMES),
      colors: randomColors(season),
      outfit: makeOutfit(s.weather, season),
      browser: true,
      kid: false,
      rider: false,
      party: nextParty++,
      partySize: 1,
      mode: "togo",
      state: "browsing",
      order: null,
      paid: false,
      path: [v3([POINTS.browseSpot[0], 0, POINTS.sidewalkZ]), v3(POINTS.browseSpot)],
      pos: v3(spawn),
      yaw: 0,
      speed: (1.4 + Math.random() * 0.4) * wd.speed,
      patience: 99,
      maxPatience: 99,
      waited: 0,
      queueIndex: -1,
      waitIndex: -1,
      awaiting: false,
      seat: null,
      sitTimer: 0,
      stateTime: 0,
      say: pick(reasons),
      sayTimer: 0,
      walkPhase: Math.random() * 6,
      moving: true,
      hasItem: false,
      target: def.id,
    };
    set((st) => ({ customers: [...st.customers, c] }));
  },

  customerLeaves: (c, reason) => {
    const s = get();
    if (c.queueIndex >= 0) {
      for (const o of s.customers) if (o.queueIndex > c.queueIndex) o.queueIndex--;
      c.queueIndex = -1;
    }
    if (c.waitIndex >= 0) {
      for (const o of s.customers) if (o.waitIndex > c.waitIndex) o.waitIndex--;
      c.waitIndex = -1;
    }
    for (const t of s.tickets) if (t.customerId === c.id) get().cancelTicket(t.id);
    c.awaiting = false;
    const seatTaken = { ...s.seatTaken };
    let seatObj: Seat | null = null;
    if (c.seat) {
      delete seatTaken[c.seat];
      seatObj = getSeats(s.placed, s.installations).find((x) => x.key === c.seat) ?? null;
      c.seat = null;
    }
    c.state = "leaving";
    c.stateTime = 0;
    c.path = exitPath(seatObj, floorFromY(c.pos.y), s.installations);
    c.sayTimer = 3;
    if (c.vip && reason !== "done") {
      // a celebrity walked out unserved: the worst outcome
      const review: Review = { id: (s.reviews[0]?.id ?? 0) + 1, author: c.vip.handle, stars: 1, text: pick(["Waited 15 minutes, nobody came. Hongdae has better. Sorry.", "No seats, no stock, chaos. I'll pass.", "Stood at the counter like a ghost. Unfollowing the hype."]), day: s.day, rep: REP.vipBad, vip: true };
      set((st) => ({ reviews: [review, ...st.reviews].slice(0, 300), stats: { ...st.stats, reviewsToday: st.stats.reviewsToday + 1 } }));
      get().addRep(REP.vipBad, `${c.vip.handle} left unserved and posted about it`, "📱");
      sfx.error();
      s.notify(`📱 ${c.vip.handle} left without being served and posted about it. Ouch. (${REP.vipBad} rep)`, "warn");
    }
    if (reason === "impatient") {
      const cf = getComfort(s.day, s.weather, s.clock, getCapacity(s));
      if (cf.need && cf.comfort < 0.7 && Math.random() < 0.7) {
        c.say = pick(cf.need === "cool" ? TOO_HOT : TOO_COLD);
        s.notify(`${c.name} left — ${cf.need === "cool" ? "it's too hot" : "it's too cold"} in the café.`, "warn");
        if (!c.vip) get().addRep(REP.tooHotCold, `${c.name} left: ${cf.need === "cool" ? "too hot" : "too cold"} inside`, "🌡️");
      } else {
        c.say = pick(IMPATIENT);
        s.notify(`${c.name} got tired of waiting and left.`, "warn");
        if (!c.vip) get().addRep(REP.walkout, `${c.name} walked out after waiting`, "🚶");
      }
    } else if (reason === "noMenu") {
      c.say = "Nothing to order?!";
      s.notify(`${c.name} left — nothing in stock to order (check the fridge, pantry and display case).`, "warn");
      if (!c.vip) get().addRep(REP.noStock, `${c.name} left: nothing in stock`, "📦");
    } else if (reason === "noCounter") {
      c.say = pick(NO_COUNTER);
      s.notify(`${c.name} left — there's no counter to order at!`, "warn");
      if (!c.vip) get().addRep(REP.noCounter, `${c.name} left: no counter`, "🧾");
    } else {
      c.say = pick(GOODBYES);
    }
    set((st) => ({
      customers: [...st.customers],
      seatTaken,
      stats: reason === "done" ? st.stats : { ...st.stats, lostTotal: st.stats.lostTotal + 1, lostToday: st.stats.lostToday + 1 },
    }));
  },

  finishSitting: (c) => {
    const s = get();
    const ambience = getAmbience(s);
    const cf = getComfort(s.day, s.weather, s.clock, getCapacity(s));
    const chance = (0.14 + ambience / 400 + (c.partySize >= 2 ? 0.08 : 0)) * cf.comfort;
    if (c.order && !c.vip && Math.random() < chance) s.addReview(cf.comfort < 0.6 ? 3 : ambience >= 30 ? 5 : 4, c.order);
    // they leave their dishes at the table
    const dish = (c as Customer & { dishUsed?: DishId }).dishUsed;
    if (dish && c.seat) {
      const seat = getSeats(s.placed, s.installations).find((x) => x.key === c.seat);
      if (seat) s.spawnDirtyPile(seat.pos[0], seat.pos[2], seat.floor, { [dish]: 1, spoon: 1 } as Partial<DishSet>);
    }
    get().customerLeaves(c, "done");
  },

  bumpCustomers: () => set((st) => ({ customers: [...st.customers] })),

  removeCustomer: (id) =>
    set((st) => ({
      customers: st.customers.filter((c) => c.id !== id),
      focused: st.focused?.kind === "customer" && st.focused.id === id ? null : st.focused,
    })),

  setStation: (uid, m) => set((st) => ({ stations: { ...st.stations, [uid]: m } })),
  setClock: (minutes) => set({ clock: minutes }),

  lightning: () => {
    // mutate in place — the customer meshes read `say` every frame, no re-render needed
    for (const c of get().customers) {
      if (Math.random() < 0.5) {
        c.say = pick(LIGHTNING);
        c.sayTimer = 1.6;
      }
    }
  },

  endDay: (slept = false) => {
    const s = get();
    const season = getSeason(s.day);
    const rating = getRating(s.rep);
    const ratingBefore = getRating(clamp(s.rep - s.repToday.gained + s.repToday.lost, REP_FLOOR, REP_MAX));
    // customers still in the queue at closing count as walk-outs for the day's rep (not individually penalised)
    const electricToday = getPowerBreakdown(s, season).total;
    const accrued = s.electricAccrued + electricToday;
    const billsDue = getSeasonDay(s.day) === DAYS_PER_MONTH && s.day > DAYS_PER_MONTH; // month 1 is free
    let bill: BillRecord | null = null;
    let money = s.money;
    let electricAccrued = accrued;
    let billHistory = s.billHistory;
    if (billsDue) {
      const rent = getRent(s.installations).total;
      bill = { day: s.day, rent, electric: accrued, total: rent + accrued };
      money -= bill.total;
      electricAccrued = 0;
      billHistory = [...s.billHistory, bill];
    }
    const nextSeason = getSeasonDay(s.day) === DAYS_PER_MONTH ? nextSeasonOf(season) : null;
    const payroll = staffWage(s.staff);
    money -= payroll;
    const summary: DaySummary = {
      day: s.day, season, weather: s.weather, tempHigh: getTemperature(s.day, s.weather, 360), earned: s.stats.earnedToday, served: s.stats.servedToday, staffServed: s.stats.staffServedToday,
      lost: s.stats.lostToday, stolen: s.stats.stolenToday, reviews: s.stats.reviewsToday, rating, ratingBefore, repGained: s.repToday.gained, repLost: s.repToday.lost, level: getLevel(s.rep), electricToday, payroll, bill, forecast: s.forecast, nextSeason, slept,
    };
    setAmbience("none");
    unlockPointer();
    set({
      phase: "summary", pause: "none", modal: "none", daySummary: summary, customers: [], stations: {}, seatTaken: {}, tickets: [], staffNpcs: [], focused: null, heldItem: null,
      money, electricAccrued, billHistory,
      stats: { ...s.stats, payrollTotal: s.stats.payrollTotal + payroll },
      staff: s.staff.map((st) => ({ ...st, served: 0 })),
      warmer: {},
      buzz: 0,
      events: [],
      buskingAt: null,
    });
    // spoilage: frozen ingredients not on a freezer shelf are lost
    {
      const s2 = get();
      const hasFreezerShelf = s2.placed.some((p) => p.item === "freezerShelf");
      const freezerUsed = hasFreezerShelf ? getStorageUsed(s2.inventory, "freezer") : 0;
      const freezerCap = hasFreezerShelf ? getStorageCapacity(s2.placed, "freezer") : 0;
      let spoiled = 0;
      const inventory = { ...s2.inventory };
      if (!hasFreezerShelf || freezerUsed > freezerCap) {
        for (const id of INGREDIENT_ORDER) {
          if (INGREDIENTS[id].storage === "freezer" && (inventory[id] ?? 0) > 0) {
            spoiled += inventory[id];
            inventory[id] = 0;
          }
        }
        if (spoiled) {
          set({ inventory });
          window.setTimeout(() => get().notify(`🧊 ${spoiled} frozen items spoiled overnight — no freezer shelf! Meat and ice cream must be stored in the walk-in freezer.`, "warn"), 1200);
        }
      }
    }
    get().save();
  },

  continueFromSummary: () => {
    const s = get();
    if (s.daySummary?.nextSeason) {
      sfx.season();
      set({ phase: "season" });
    } else s.nextDay();
  },

  nextDay: () => {
    const s = get();
    const day = s.day + 1;
    const weather: WeatherId = Math.random() < 0.8 ? s.forecast : rollWeather(day, s.weather);
    const forecast = rollWeather(day + 1, weather);
    const season = getSeason(day);
    const news: string[] = [];
    const competitors = s.competitors.map((c) => {
      const def = COMPETITOR_MAP[c.id];
      let rating = Math.min(def.ratingCap, c.rating + 0.015 + Math.random() * 0.02);
      let promo = 1;
      let promoText: string | null = null;
      const r = Math.random();
      if (r < 0.12) {
        promo = 1.5;
        promoText = pick(["1+1 event today", "New seasonal menu launch", "Influencer visit"]);
        news.push(`${def.name} is running a promotion: ${promoText}.`);
      } else if (r < 0.17) {
        promo = 0.4;
        promoText = pick(["closed for renovation", "staff shortage", "broken espresso machine"]);
        news.push(`${def.name} is struggling today — ${promoText}.`);
      } else if (r < 0.2) {
        rating = Math.max(def.rating0 - 0.3, rating - 0.25);
        news.push(`${def.name} got a wave of bad reviews.`);
      }
      return { ...c, rating, promo, promoText };
    });
    simState.clock = 0;
    simState.spawnTimer = 0;
    simState.nextSpawn = 4;
    simState.lastSpawnClock = -100;
    set({
      phase: "playing", pause: "none", day, clock: 0, weather, forecast, news, competitors, daySummary: null, customers: [], stations: {}, seatTaken: {}, heldItem: null,
      stats: { ...s.stats, earnedToday: 0, servedToday: 0, staffServedToday: 0, lostToday: 0, stolenToday: 0, reviewsToday: 0 },
      tickets: [],
      applicants: makeApplicants(day, s.applicants),
      ...planDay(day, s.rep),
    });
    get().spawnStaff();
    setAmbience(WEATHERS[weather].audio);
    const w = WEATHERS[weather];
    const info = SEASON_INFO[season];
    get().notify(`${info.icon} ${info.name} ${getSeasonDay(day)} (${weekdayName(day)}) · ${w.icon} ${w.name} (${w.kr}), high of ${getTemperature(day, weather, 360)}°C.`);
    announceDay(get());
    if (w.id !== s.forecast) get().notify("The forecast was wrong!", "warn");
    for (const n of news) get().notify(`📰 ${n}`);
    const cf = getComfort(day, weather, 360, getCapacity(s));
    if (cf.need && cf.capacity < 1) get().notify(cf.need === "cool" ? "🥵 It's hot — without cooling customers won't stay. Fans and air-con are at Hongdae Hardware." : "🥶 It's cold — without heating customers won't stay. Heaters are at Hongdae Hardware.", "warn");
    const daysToBill = DAYS_PER_MONTH - getSeasonDay(day) + 1;
    if (day <= DAYS_PER_MONTH) get().notify("🧾 First month's rent & power are already paid — first bill at the end of next month.", "good");
    else if (daysToBill <= 3) get().notify(`🧾 Rent & electricity (${fmtMoney(getRent(s.installations).total + s.electricAccrued)}+) due in ${daysToBill} day${daysToBill > 1 ? "s" : ""}.`, "warn");
    if (DAY_MINUTES > 0) get().checkQuests();
    get().save();
    lockPointer();
  },
}));

export const competitorList = COMPETITORS;
