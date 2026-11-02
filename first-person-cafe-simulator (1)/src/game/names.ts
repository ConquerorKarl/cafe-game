import type { CustomerColors, Outfit, Season, WeatherId } from "./types";
import { WEATHERS } from "./calendar";

export const FIRST_NAMES = [
  "Minjun", "Seoyeon", "Jiwoo", "Hajun", "Yuna", "Doyun", "Seo-ah", "Siwoo", "Jia", "Eunwoo",
  "Haeun", "Jihoon", "Sumin", "Yejin", "Taeyang", "Nayeon", "Junseo", "Chaewon", "Hyunwoo", "Soyeon",
  "Woojin", "Dahyun", "Seojun", "Yerin", "Jisoo", "Minseo", "Gunwoo", "Hyejin", "Dongha", "Bora",
  "Emma", "Liam", "Yuki", "Wei", "Sofia",
];

export const REVIEWS_5 = [
  "Best {p} in Hongdae, hands down!",
  "Lightning fast service and a perfect {p}. ⚡",
  "Hidden gem near the playground. Already planning my next {p}.",
  "Cozy vibes, friendly owner, great {p}. 별 다섯 개!",
  "Walked in after busking practice, left with the best {p} of my week.",
  "The {p} here is dangerously good. 맛집 인정.",
  "Fast, warm and delicious. My new morning ritual before class.",
  "Sunbae took me here and now I'm hooked on the {p}.",
  "Way better than the franchise next door. Real {p}.",
];

export const REVIEWS_4 = [
  "Nice {p}. Took a little while, but worth it.",
  "Good coffee, cute place. Would come back after a Hongdae night out.",
  "Solid {p}, pleasant staff.",
  "A pleasant stop on my walk from Exit 9. Decent {p}.",
  "Small place, big flavour. The {p} hit the spot.",
  "Friendly service. {p} was good, not life changing (yet).",
  "Quiet spot to study. {p} was fine.",
];

const SHIRTS = ["#e06c75", "#61afef", "#98c379", "#e5c07b", "#c678dd", "#56b6c2", "#ff9f68", "#f06292", "#4db6ac", "#7986cb", "#f5f6fa", "#2d3436", "#dfe6e9"];
const COATS = ["#2d3436", "#3d4a63", "#4b3832", "#1e3a5f", "#5c4b51", "#8d6e63", "#b2bec3", "#636e72", "#2c3e50"];
const PANTS = ["#2f3542", "#3d4a63", "#57606f", "#4b3832", "#1e3a5f", "#5c4b51", "#1c1c1c"];
const SKINS = ["#f6d7b0", "#f1c27d", "#e8b98a", "#ffdbac", "#e0ac69", "#c68642", "#8d5524"];
const HAIRS = ["#1c1c1c", "#2b1b17", "#4a2c2a", "#8b5a2b", "#d9b36b", "#a52a2a", "#6b6b6b", "#5b3a8a"];
const UMBRELLAS = ["#f5f6fa", "#f5f6fa", "#2d3436", "#e84393", "#0984e3", "#fdcb6e", "#00b894"];
const SCARVES = ["#c0392b", "#e67e22", "#8e44ad", "#16a085", "#f5f6fa", "#2c3e50"];

export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomColors(season: Season): CustomerColors {
  const shirt = season === "winter" || season === "autumn" ? pick(Math.random() < 0.6 ? COATS : SHIRTS) : pick(SHIRTS);
  return { shirt, pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS) };
}

export function makeOutfit(weather: WeatherId, season: Season): Outfit {
  const wd = WEATHERS[weather];
  return {
    umbrella: Math.random() < wd.umbrella ? pick(UMBRELLAS) : null,
    mask: Math.random() < wd.mask,
    scarf: season === "winter" && Math.random() < 0.7 ? pick(SCARVES) : null,
    beanie: season === "winter" && Math.random() < 0.5,
    coat: season === "winter" || (season === "autumn" && Math.random() < 0.4),
    shortSleeves: season === "summer" || weather === "heatwave",
  };
}

export const REVIEWS_3 = [
  "Fine. {p} was okay, nothing special.",
  "Average café, average {p}. Convenient for the station.",
  "Took a while. {p} was alright.",
];
export const REVIEWS_2 = [
  "Waited forever for a {p}. Staff looked lost.",
  "Too hot inside and the {p} was lukewarm. Hmm.",
  "Nice decor, slow service. Go to Giga if you're in a hurry.",
];
export const REVIEWS_1 = [
  "Stood in line, nobody served me, left. Never again.",
  "Nothing in stock, no seats, no explanation.",
  "Ordered a {p} and gave up after 10 minutes. 별 하나도 아까움.",
];
export const VIP_GOOD = [
  "Found my new favourite café in Hongdae 🤍 the {p} is unreal. Go before it gets crowded!!",
  "Filmed the whole thing — {p} 10/10, owner was lovely. Link in bio.",
  "Quiet corner, perfect {p}, nobody bothered me. Rare.",
];
export const VIP_BAD = [
  "Waited 15 minutes, nobody came. Hongdae has better. Sorry.",
  "Wrong order, cold {p}, no apology. Not what I expected from the hype.",
  "No seats, no stock, chaos. I'll pass.",
];

export function reviewText(stars: 1 | 2 | 3 | 4 | 5, productName: string): string {
  const pool = stars === 5 ? REVIEWS_5 : stars === 4 ? REVIEWS_4 : stars === 3 ? REVIEWS_3 : stars === 2 ? REVIEWS_2 : REVIEWS_1;
  return pick(pool).replace("{p}", productName.toLowerCase());
}
export function vipReviewText(good: boolean, productName: string): string {
  return pick(good ? VIP_GOOD : VIP_BAD).replace("{p}", productName.toLowerCase());
}

export const THANKS = ["Thanks!", "감사합니다~", "Perfect ☺", "Yum!", "Cheers!", "Lovely!", "잘 먹을게요!"];
export const GOODBYES = ["Bye!", "See you tomorrow!", "That was nice.", "안녕히 계세요~"];
export const IMPATIENT = ["Too slow…", "Forget it.", "I give up.", "아 진짜…"];
export const TOO_HOT = ["It's a sauna in here!", "No air-con? I'm out.", "Too hot to wait."];
export const TOO_COLD = ["It's freezing in here!", "Turn on the heating!", "Colder inside than outside…"];
export const LIGHTNING = ["😱", "Whoa!", "깜짝이야!", "!!"];
export const NO_SEATS = ["No seats? To-go then.", "Standing room only…", "I'll take it to go."];
export const NO_COUNTER = ["Where's the counter?!", "Is this place even open?", "Nobody to order from…"];
export const KID_LINES = ["Mommy, I want cake!", "Can I have the pink one?", "Yay!", "Bingsu! Bingsu!"];
export const GROUP_LINES = ["Table for four?", "Let's sit upstairs!", "I'm paying today~", "Shall we share a honey bread?"];
export const RIDER_LINES = ["배민 pickup!", "Order for delivery?", "Quick, I have 3 more stops."];

const KID_SHIRTS = ["#ff7675", "#74b9ff", "#ffeaa7", "#55efc4", "#fd79a8", "#a29bfe"];
export function kidColors(): CustomerColors {
  return { shirt: pick(KID_SHIRTS), pants: pick(["#2d3436", "#0984e3", "#e17055"]), skin: pick(SKINS), hair: pick(HAIRS) };
}
