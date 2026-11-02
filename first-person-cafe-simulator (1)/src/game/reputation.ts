import { OPEN_HOUR, isWeekend } from "./calendar";
import type { VipDef } from "./types";

// ---------------------------------------------------------------------------
// Reputation levels (stars). Rep is a running score; the level is where it sits.
// ---------------------------------------------------------------------------
export const LEVEL_CAPS = [0, 500, 1250, 4000, 10000, 25000]; // index = level - 1 → threshold to ENTER that level
export const MAX_LEVEL = 5;
export const REP_FLOOR = 0;
export const REP_MAX = 30000;

export function getLevel(rep: number): number {
  let lvl = 1;
  for (let i = 1; i < LEVEL_CAPS.length; i++) if (rep >= LEVEL_CAPS[i]) lvl = i + 1;
  return Math.min(MAX_LEVEL, lvl);
}

/** Star rating shown everywhere: whole level plus progress through it (1.0 – 5.0). */
export function getStars(rep: number): number {
  const lvl = getLevel(rep);
  if (lvl >= MAX_LEVEL) return 5;
  const lo = LEVEL_CAPS[lvl - 1];
  const hi = LEVEL_CAPS[lvl];
  const t = Math.max(0, Math.min(0.99, (rep - lo) / (hi - lo)));
  return Math.round((lvl + t) * 10) / 10;
}

export function levelProgress(rep: number): { level: number; current: number; next: number | null; pct: number } {
  const level = getLevel(rep);
  const lo = LEVEL_CAPS[level - 1];
  const next = level >= MAX_LEVEL ? null : LEVEL_CAPS[level];
  const pct = next ? Math.max(0, Math.min(1, (rep - lo) / (next - lo))) : 1;
  return { level, current: rep - lo, next: next ? next - lo : null, pct };
}

export const LEVEL_NAMES = ["Unknown", "Neighbourhood spot", "Local favourite", "Hongdae hotspot", "Seoul famous"];

// Rep deltas -----------------------------------------------------------------
export const REP = {
  review5: 18,
  review4: 9,
  review3: 0,
  review2: -12,
  review1: -25,
  walkout: -6, // customer left without being served
  tooHotCold: -8,
  noStock: -5,
  noCounter: -10,
  wrongVibe: -3, // uncomfortable / long waits that still got served
  vipGood: 500,
  vipBad: -500,
  vipMeh: 120,
};

/** Stars for a review from a plain customer given service quality (0..1) and a little luck. */
export function rollStars(quality: number, comfort: number, waitedLong: boolean): 1 | 2 | 3 | 4 | 5 {
  const r = Math.random();
  const score = quality * 0.7 + comfort * 0.3;
  if (waitedLong && r < 0.5) return quality < 0.15 ? 1 : 2;
  if (score > 0.75) return r < 0.8 ? 5 : 4;
  if (score > 0.5) return r < 0.55 ? 4 : r < 0.9 ? 5 : 3;
  if (score > 0.3) return r < 0.5 ? 3 : r < 0.8 ? 4 : 2;
  return r < 0.5 ? 2 : r < 0.8 ? 3 : 1;
}

// ---------------------------------------------------------------------------
// Celebrities / influencers (level 3+, ~5% per day)
// ---------------------------------------------------------------------------
export const VIPS: VipDef[] = [
  { kind: "idol", name: "Yerin (NOVA)", kr: "예린", handle: "@nova_yerin", look: { shirt: "#f5f6fa", pants: "#2d3436", hair: "#f6d365", skin: "#ffdbac", glasses: true, mask: true, hat: "bucket", scarf: null }, entourage: 2, blurb: "Main vocal of girl group NOVA. Travels with a manager and a camera." },
  { kind: "idol", name: "Jun-ho (BLAZE)", kr: "준호", handle: "@blaze_junho", look: { shirt: "#1e1e1e", pants: "#1e1e1e", hair: "#c0392b", skin: "#f1c27d", glasses: true, mask: false, hat: "cap", scarf: null }, entourage: 2, blurb: "Rapper, 12 million followers, notoriously picky about espresso." },
  { kind: "actor", name: "Seo Ji-an", kr: "서지안", handle: "@jian_official", look: { shirt: "#e6ddcf", pants: "#5a3b26", hair: "#1c1c1c", skin: "#ffdbac", glasses: true, mask: false, hat: "beret", scarf: "#c8714f" }, entourage: 1, blurb: "Drama actress. If she sits in your window, the whole street knows by dinner." },
  { kind: "influencer", name: "Minji Eats", kr: "민지잇츠", handle: "@minji.eats", look: { shirt: "#fd79a8", pants: "#f5f6fa", hair: "#5b3a8a", skin: "#f6d7b0", glasses: false, mask: false, hat: null, scarf: null }, entourage: 1, blurb: "Café-review YouTuber. Films everything, rates the croffle out of ten." },
  { kind: "chef", name: "Chef Baek", kr: "백셰프", handle: "@chef_baek", look: { shirt: "#f5f6fa", pants: "#2d3436", hair: "#6b6b6b", skin: "#e8b98a", glasses: false, mask: false, hat: null, scarf: null }, entourage: 1, blurb: "TV chef and restaurateur. Judges the coffee, the plating and your hygiene." },
  { kind: "streamer", name: "DoDo", kr: "도도", handle: "@dodo_live", look: { shirt: "#00cec9", pants: "#2d3436", hair: "#48dbfb", skin: "#f1c27d", glasses: false, mask: false, hat: "cap", scarf: null }, entourage: 1, blurb: "Live-streams her whole afternoon. 40,000 people are watching you make a latte." },
];

export const VIP_DAILY_CHANCE = 0.05;
export const VIP_MIN_LEVEL = 3;

// ---------------------------------------------------------------------------
// Crowds: office lunch rush (weekdays 12:00), school-out wave (weekdays 16:00)
// ---------------------------------------------------------------------------
export const LUNCH_START = (12 - OPEN_HOUR) * 60; // 240
export const LUNCH_END = (13.5 - OPEN_HOUR) * 60; // 330
export const SCHOOL_START = (16 - OPEN_HOUR) * 60; // 480
export const SCHOOL_END = (17.5 - OPEN_HOUR) * 60; // 570
export const BUSKING_EARLIEST = (18.5 - OPEN_HOUR) * 60; // 630
export const WEEKEND_BONUS = 1.3;

export function crowdMultiplier(day: number, clock: number): { traffic: number; cap: number; label: string | null } {
  if (day === 1) return { traffic: 1, cap: 1, label: null }; // day 1: no rush hours
  const weekend = isWeekend(day);
  let traffic = weekend ? WEEKEND_BONUS : 1;
  let cap = weekend ? WEEKEND_BONUS : 1;
  let label: string | null = weekend ? "Weekend crowd" : null;
  if (!weekend && clock >= LUNCH_START && clock < LUNCH_END) {
    traffic *= 1.7;
    cap *= 1.4;
    label = "Office lunch rush";
  }
  if (!weekend && clock >= SCHOOL_START && clock < SCHOOL_END) {
    traffic *= 1.6;
    cap *= 1.4;
    label = "School's out";
  }
  return { traffic, cap, label };
}

/** Which rush (if any) is coming up, for the "it's about to get busy" warnings. */
export function upcomingRush(day: number, clock: number): { kind: "lunch" | "school"; inMinutes: number } | null {
  if (isWeekend(day) || day === 1) return null;
  if (clock < LUNCH_START && LUNCH_START - clock <= 30) return { kind: "lunch", inMinutes: LUNCH_START - clock };
  if (clock < SCHOOL_START && SCHOOL_START - clock <= 30) return { kind: "school", inMinutes: SCHOOL_START - clock };
  return null;
}

export const OFFICE_LINES = ["Lunch break — 40 minutes, go go go.", "Team lunch? Team lunch.", "Boss said the café by the plaza is decent.", "I need an iced americano before the 2pm meeting.", "Expense it. It's a client meeting.", "If I'm late back 부장님 will notice."];
export const STUDENT_LINES = ["School's out!", "Let's get bingsu!", "I have 3,000 won. What can I get?", "Hagwon starts at 6, we have time.", "Take a pic for my story~", "Last one to the café buys."];
export const BUSKING_LINES = ["Ooh, buskers!", "Is that a NOVA cover?", "Let's watch for a minute.", "They're really good tonight."];
