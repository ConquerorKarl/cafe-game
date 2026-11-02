import type { Season, WeatherId } from "./types";

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------
export const DAYS_PER_SEASON = 14;
export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;
export const DAY_MINUTES = (CLOSE_HOUR - OPEN_HOUR) * 60; // 840
export const LAST_ORDER_MINUTES = DAY_MINUTES - 60; // no new customers after 21:00
export const DAY_SECONDS = 360; // real seconds per in-game day

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const getSeason = (day: number): Season => SEASONS[Math.floor((day - 1) / DAYS_PER_SEASON) % 4];
export const getSeasonDay = (day: number) => ((day - 1) % DAYS_PER_SEASON) + 1;
export const getYear = (day: number) => Math.floor((day - 1) / (DAYS_PER_SEASON * 4)) + 1;
export const nextSeasonOf = (s: Season): Season => SEASONS[(SEASONS.indexOf(s) + 1) % 4];

export interface SeasonInfo {
  id: Season;
  name: string;
  kr: string;
  icon: string;
  tempBase: number;
  sunrise: number;
  sunset: number;
  maxElev: number;
  needs: "cool" | "heat" | null;
  foliage: { ginkgo: string; cherry: string; maple: string; bare: boolean };
  blurb: string;
  tips: string[];
}

export const SEASON_INFO: Record<Season, SeasonInfo> = {
  spring: {
    id: "spring",
    name: "Spring",
    kr: "봄",
    icon: "🌸",
    tempBase: 16,
    sunrise: 6.3,
    sunset: 19.2,
    maxElev: 0.85,
    needs: null,
    foliage: { ginkgo: "#8fd16a", cherry: "#f7b7d2", maple: "#79c46a", bare: false },
    blurb: "Cherry blossoms, yellow-dust warnings and the first iced americanos of the year. Mild weather — no heating or cooling needed.",
    tips: ["Blossom days bring extra foot traffic to Hongdae.", "On fine-dust days customers wear masks and fewer people go out.", "Use the calm weather to build up reviews and buy furniture."],
  },
  summer: {
    id: "summer",
    name: "Summer",
    kr: "여름",
    icon: "☀️",
    tempBase: 30,
    sunrise: 5.4,
    sunset: 19.9,
    maxElev: 0.98,
    needs: "cool",
    foliage: { ginkgo: "#4f9d45", cherry: "#3f8f4a", maple: "#3f8f4a", bare: false },
    blurb: "Jangma monsoon rains, then a sticky heatwave. Nobody stays in a café without air-con, and nobody orders a hot latte in August.",
    tips: ["Install a fan or air conditioner — hot customers are impatient and leave no reviews.", "Stock lots of ice: iced americanos and bingsu dominate the menu.", "Thunderstorms empty the street. Use quiet days to restock."],
  },
  autumn: {
    id: "autumn",
    name: "Autumn",
    kr: "가을",
    icon: "🍂",
    tempBase: 17,
    sunrise: 6.6,
    sunset: 18.2,
    maxElev: 0.7,
    needs: null,
    foliage: { ginkgo: "#f3c93a", cherry: "#d9743a", maple: "#d6452c", bare: false },
    blurb: "Crisp air and golden ginkgo leaves — the best café weather of the year. No heating or cooling needed.",
    tips: ["Foggy mornings slow things down; evenings are busy.", "Prepare for winter: order a heater before the first snow.", "Dessert cafés get a boost from autumn date nights."],
  },
  winter: {
    id: "winter",
    name: "Winter",
    kr: "겨울",
    icon: "❄️",
    sunrise: 7.6,
    sunset: 17.4,
    tempBase: -2,
    maxElev: 0.45,
    needs: "heat",
    foliage: { ginkgo: "#8a7f70", cherry: "#8a7f70", maple: "#8a7f70", bare: true },
    blurb: "Snow, black ice and biting wind off the Han river. Keep the café warm or customers will walk straight back out.",
    tips: ["Install a heater or ondol floor heating.", "Yuja tea and hot lattes sell well — but Koreans still love their iced americano (얼죽아!).", "Blizzards and icy sidewalks keep people home."],
  },
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const weekdayIndex = (day: number) => (day - 1) % 7;
export const weekdayName = (day: number) => WEEKDAYS[weekdayIndex(day)];
export const isWeekend = (day: number) => weekdayIndex(day) >= 5;

export function formatDate(day: number): string {
  const s = SEASON_INFO[getSeason(day)];
  return `${s.icon} ${s.name} ${getSeasonDay(day)} (${weekdayName(day)}) · Year ${getYear(day)}`;
}

export function formatClock(minutes: number): string {
  const total = OPEN_HOUR * 60 + Math.floor(minutes);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function getPeriod(minutes: number): string {
  const h = OPEN_HOUR + minutes / 60;
  if (h < 11) return "Morning";
  if (h < 14) return "Lunch rush";
  if (h < 17) return "Afternoon";
  if (h < 20) return "Evening";
  return "Night";
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------
export interface WeatherDef {
  id: WeatherId;
  name: string;
  kr: string;
  icon: string;
  traffic: number; // street traffic multiplier
  speed: number; // pedestrian speed multiplier
  patience: number;
  stay: number; // how long people linger inside
  hot: number; // hot drink preference
  cold: number; // cold drink preference
  umbrella: number; // probability
  mask: number;
  tempDelta: number;
  particles: "rain" | "snow" | "hail" | "petals" | null;
  intensity: number;
  sky: { turbidity: number; rayleigh: number; light: number; fogNear: number; fogFar: number; fogColor: string };
  /** 0 = clear blue sky, 1 = solid overcast (no sun disc, grey dome) */
  cover: number;
  audio: "none" | "rain" | "heavy" | "wind";
  lightning?: boolean;
  wet?: boolean;
  severe?: boolean;
  lines: string[];
}

export const WEATHERS: Record<WeatherId, WeatherDef> = {
  clear: {
    id: "clear", name: "Clear", kr: "맑음", icon: "☀️", traffic: 1, speed: 1, patience: 1, stay: 1, hot: 1, cold: 1, umbrella: 0, mask: 0.05, tempDelta: 0, particles: null, intensity: 0,
    sky: { turbidity: 4, rayleigh: 1.2, light: 1, fogNear: 60, fogFar: 260, fogColor: "#cfe3f2" }, cover: 0.08, audio: "none",
    lines: ["Nice day for a coffee.", "Perfect weather for a walk around Hongdae.", "The playground is packed today!"],
  },
  cloudy: {
    id: "cloudy", name: "Cloudy", kr: "흐림", icon: "☁️", traffic: 0.95, speed: 1, patience: 1, stay: 1.05, hot: 1.1, cold: 0.9, umbrella: 0.05, mask: 0.05, tempDelta: -1, particles: null, intensity: 0,
    sky: { turbidity: 12, rayleigh: 0.6, light: 0.62, fogNear: 50, fogFar: 200, fogColor: "#b9c2ca" }, cover: 0.85, audio: "none",
    lines: ["Looks like it might rain later.", "Grey day. Need caffeine.", "Hope it holds off until I get home."],
  },
  blossom: {
    id: "blossom", name: "Cherry Blossoms", kr: "벚꽃", icon: "🌸", traffic: 1.35, speed: 0.9, patience: 1.1, stay: 1.2, hot: 1, cold: 1.1, umbrella: 0, mask: 0.05, tempDelta: 2, particles: "petals", intensity: 0.5,
    sky: { turbidity: 4, rayleigh: 1.1, light: 1, fogNear: 60, fogFar: 260, fogColor: "#e3dcec" }, cover: 0.12, audio: "none",
    lines: ["The cherry blossoms are gorgeous!", "Came for the blossoms, staying for coffee.", "Everyone's taking photos outside.", "벚꽃 엔딩~ ♪"],
  },
  dust: {
    id: "dust", name: "Fine Dust", kr: "미세먼지", icon: "😷", traffic: 0.7, speed: 1.1, patience: 1, stay: 1.25, hot: 1, cold: 1, umbrella: 0, mask: 0.9, tempDelta: 1, particles: null, intensity: 0,
    sky: { turbidity: 20, rayleigh: 0.3, light: 0.6, fogNear: 18, fogFar: 85, fogColor: "#d6c08a" }, cover: 0.9, audio: "none",
    lines: ["The fine dust is terrible today.", "Can't breathe out there. Mask on.", "Air quality: very bad. Coffee: hopefully very good."],
  },
  fog: {
    id: "fog", name: "Fog", kr: "안개", icon: "🌫️", traffic: 0.85, speed: 0.9, patience: 1, stay: 1.1, hot: 1.3, cold: 0.7, umbrella: 0, mask: 0.1, tempDelta: -2, particles: null, intensity: 0,
    sky: { turbidity: 20, rayleigh: 0.2, light: 0.5, fogNear: 6, fogFar: 45, fogColor: "#d8dde2" }, cover: 1.0, audio: "none",
    lines: ["Can barely see the end of the street.", "Spooky fog this morning.", "Is that a café? Oh good, it is."],
  },
  rain: {
    id: "rain", name: "Rain", kr: "비", icon: "🌧️", traffic: 0.7, speed: 1.25, patience: 1.15, stay: 1.4, hot: 1.4, cold: 0.7, umbrella: 0.9, mask: 0.05, tempDelta: -3, particles: "rain", intensity: 0.6,
    sky: { turbidity: 18, rayleigh: 0.4, light: 0.38, fogNear: 30, fogFar: 140, fogColor: "#868e96" }, cover: 1.0, audio: "rain", wet: true,
    lines: ["It's pouring out there!", "Forgot my umbrella at the subway.", "Rain means coffee. That's the rule.", "My socks are wet."],
  },
  monsoon: {
    id: "monsoon", name: "Monsoon Rain", kr: "장마", icon: "⛈️", traffic: 0.45, speed: 1.4, patience: 1.2, stay: 1.7, hot: 1.2, cold: 0.9, umbrella: 1, mask: 0, tempDelta: -2, particles: "rain", intensity: 1,
    sky: { turbidity: 20, rayleigh: 0.3, light: 0.3, fogNear: 18, fogFar: 105, fogColor: "#737b82" }, cover: 1.0, audio: "heavy", wet: true, severe: true,
    lines: ["Jangma season again…", "My shoes are completely soaked.", "This rain is never going to stop.", "The street is a river!"],
  },
  thunderstorm: {
    id: "thunderstorm", name: "Thunderstorm", kr: "뇌우", icon: "🌩️", traffic: 0.35, speed: 1.5, patience: 1.2, stay: 1.8, hot: 1.3, cold: 0.8, umbrella: 0.9, mask: 0, tempDelta: -3, particles: "rain", intensity: 0.9,
    sky: { turbidity: 20, rayleigh: 0.2, light: 0.22, fogNear: 18, fogFar: 95, fogColor: "#565c63" }, cover: 1.0, audio: "heavy", lightning: true, wet: true, severe: true,
    lines: ["Did you hear that thunder?!", "I'm not going back out in that.", "Hope the power doesn't go out.", "That lightning was close!"],
  },
  hail: {
    id: "hail", name: "Hail", kr: "우박", icon: "🧊", traffic: 0.3, speed: 1.6, patience: 1.2, stay: 1.8, hot: 1.3, cold: 0.6, umbrella: 0.8, mask: 0, tempDelta: -4, particles: "hail", intensity: 0.8,
    sky: { turbidity: 18, rayleigh: 0.3, light: 0.4, fogNear: 25, fogFar: 120, fogColor: "#8c949b" }, cover: 1.0, audio: "rain", wet: true, severe: true,
    lines: ["Ouch — hail! In Seoul!", "That hail nearly got me.", "My umbrella has holes now."],
  },
  snow: {
    id: "snow", name: "Snow", kr: "눈", icon: "🌨️", traffic: 0.8, speed: 0.85, patience: 1.1, stay: 1.4, hot: 2, cold: 0.5, umbrella: 0.4, mask: 0.1, tempDelta: -4, particles: "snow", intensity: 0.6,
    sky: { turbidity: 14, rayleigh: 0.4, light: 0.6, fogNear: 30, fogFar: 130, fogColor: "#d7dee6" }, cover: 1.0, audio: "none",
    lines: ["It's snowing! 첫눈!", "Hot drink, please. Anything hot.", "Hongdae looks so pretty in the snow.", "Snow day = café day."],
  },
  blizzard: {
    id: "blizzard", name: "Blizzard", kr: "눈보라", icon: "❄️", traffic: 0.3, speed: 0.7, patience: 1.2, stay: 1.9, hot: 2.5, cold: 0.3, umbrella: 0.3, mask: 0.3, tempDelta: -8, particles: "snow", intensity: 1,
    sky: { turbidity: 20, rayleigh: 0.2, light: 0.35, fogNear: 8, fogFar: 50, fogColor: "#e3e8ee" }, cover: 1.0, audio: "wind", severe: true,
    lines: ["Can't see a thing out there!", "The bus isn't coming. Coffee time.", "My ears are frozen.", "Is this Seoul or Siberia?"],
  },
  icy: {
    id: "icy", name: "Icy", kr: "빙판", icon: "🥶", traffic: 0.7, speed: 0.7, patience: 1, stay: 1.2, hot: 2, cold: 0.4, umbrella: 0, mask: 0.2, tempDelta: -6, particles: null, intensity: 0,
    sky: { turbidity: 5, rayleigh: 1.4, light: 0.95, fogNear: 50, fogFar: 220, fogColor: "#d5e4f2" }, cover: 0.15, audio: "none",
    lines: ["Careful, the sidewalk is black ice.", "Slipped twice on the way here.", "So cold today…", "Sunny but freezing. Classic Seoul."],
  },
  heatwave: {
    id: "heatwave", name: "Heatwave", kr: "폭염", icon: "🥵", traffic: 0.9, speed: 0.95, patience: 0.85, stay: 1.2, hot: 0.3, cold: 3, umbrella: 0.15, mask: 0, tempDelta: 6, particles: null, intensity: 0,
    sky: { turbidity: 7, rayleigh: 1.6, light: 1.15, fogNear: 40, fogFar: 200, fogColor: "#e6dcc7" }, cover: 0.05, audio: "none",
    lines: ["It's melting hot out there.", "Iced americano. Biggest size. Now.", "Is your air-con on?", "The asphalt is literally steaming."],
  },
};

const SEASON_WEATHER: Record<Season, [WeatherId, number][]> = {
  spring: [["clear", 35], ["cloudy", 20], ["rain", 18], ["dust", 15], ["thunderstorm", 5], ["hail", 4], ["fog", 3]],
  summer: [["clear", 22], ["heatwave", 22], ["cloudy", 10], ["rain", 10], ["monsoon", 12], ["thunderstorm", 14], ["hail", 4]],
  autumn: [["clear", 42], ["cloudy", 22], ["rain", 14], ["fog", 10], ["thunderstorm", 4], ["hail", 3], ["icy", 5]],
  winter: [["clear", 25], ["cloudy", 15], ["snow", 25], ["blizzard", 10], ["icy", 18], ["hail", 4], ["fog", 3]],
};

export function rollWeather(day: number, prev?: WeatherId): WeatherId {
  const season = getSeason(day);
  const sd = getSeasonDay(day);
  const table = SEASON_WEATHER[season].map(([id, w]) => [id, w] as [WeatherId, number]);
  if (season === "spring" && sd <= 6) table.push(["blossom", 40]);
  if (season === "summer" && sd >= 3 && sd <= 9) table.push(["monsoon", 22]); // jangma
  if (season === "winter" && (prev === "snow" || prev === "blizzard")) table.push(["icy", 25]);
  if (season === "autumn" && sd < 10) {
    const i = table.findIndex(([id]) => id === "icy");
    if (i >= 0) table.splice(i, 1);
  }
  const total = table.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return "clear";
}

// ---------------------------------------------------------------------------
// Temperature & comfort
// ---------------------------------------------------------------------------
export function getTemperature(day: number, weather: WeatherId, minutes: number): number {
  const season = getSeason(day);
  const h = OPEN_HOUR + minutes / 60;
  const diurnal = 4 * Math.sin((Math.PI * (h - 8)) / 12) - 1;
  let t = SEASON_INFO[season].tempBase + WEATHERS[weather].tempDelta + diurnal;
  if (season === "spring" || season === "autumn") t = clamp(t, 8, 25);
  return Math.round(t);
}

export interface Comfort {
  temp: number;
  need: "cool" | "heat" | null;
  strength: number; // 0..1 how badly the appliance is needed
  capacity: number; // 0..1 what the appliances provide
  comfort: number; // 0..1
}

export interface Capacity {
  cool: number;
  heat: number;
}

export function getComfort(day: number, weather: WeatherId, minutes: number, cap: Capacity): Comfort {
  const temp = getTemperature(day, weather, minutes);
  let need: Comfort["need"] = null;
  let strength = 0;
  if (temp >= 26) {
    need = "cool";
    strength = clamp((temp - 24) / 12, 0.2, 1);
  } else if (temp <= 6) {
    need = "heat";
    strength = clamp((8 - temp) / 14, 0.2, 1);
  }
  const capacity = need === "cool" ? clamp(cap.cool, 0, 1) : need === "heat" ? clamp(cap.heat, 0, 1) : 1;
  const comfort = need ? 1 - strength * (1 - capacity) : 1;
  return { temp, need, strength, capacity, comfort: Math.round(comfort * 100) / 100 };
}

// ---------------------------------------------------------------------------
// Time of day
// ---------------------------------------------------------------------------
const TRAFFIC_BY_HOUR: [number, number][] = [[8, 0.45], [10, 0.8], [12, 1.2], [14, 1.0], [17, 1.35], [20, 1.15], [21, 0.9], [22, 0.6]];

export function getTimeFactor(minutes: number): number {
  const h = OPEN_HOUR + minutes / 60;
  for (let i = 0; i < TRAFFIC_BY_HOUR.length - 1; i++) {
    const [h0, v0] = TRAFFIC_BY_HOUR[i];
    const [h1, v1] = TRAFFIC_BY_HOUR[i + 1];
    if (h >= h0 && h <= h1) return lerp(v0, v1, (h - h0) / (h1 - h0));
  }
  return 0.6;
}

export interface SunState {
  pos: [number, number, number];
  elev: number; // 0..1 (0 = horizon or below)
  night: number; // 0 day .. 1 night
  dusk: number; // 0..1 warm horizon glow
}

export function getSun(day: number, minutes: number): SunState {
  const { sunrise, sunset, maxElev } = SEASON_INFO[getSeason(day)];
  const h = OPEN_HOUR + minutes / 60;
  const t = (h - sunrise) / (sunset - sunrise);
  const raw = t >= 0 && t <= 1 ? Math.sin(Math.PI * t) : t > 1 ? -(t - 1) * 3 : t * 3;
  const elev = clamp(raw * maxElev, -1, 1);
  const theta = Math.PI * clamp(t, -0.12, 1.12);
  const pos: [number, number, number] = [Math.cos(theta) * 120, Math.max(-25, Math.sin(theta) * 120 * maxElev), 50];
  const night = clamp(1 - elev / 0.12, 0, 1);
  const dusk = clamp(1 - Math.abs(elev - 0.06) / 0.14, 0, 1);
  return { pos, elev: Math.max(0, elev), night, dusk };
}
