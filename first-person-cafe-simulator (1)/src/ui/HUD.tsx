import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { DAYS_PER_SEASON, SEASON_INFO, WEATHERS, formatClock, getComfort, getPeriod, getSeason, getSeasonDay, getYear, weekdayName } from "@/game/calendar";
import { LEVEL_NAMES, levelProgress } from "@/game/reputation";
import { INGREDIENTS, INGREDIENT_ORDER, ITEMS, PRODUCTS, QUESTS, ROLE_MAP, canMake, getCapacity, getMarket, getMenu, getRating, getRent, getStorageCapacity, getStorageUsed, money, requiredIngredients, stationMenu, type QuestContext } from "@/game/constants";
import { getSeats } from "@/game/layout";
import { useGame } from "@/game/store";
import type { Carried, IngredientId, StorageKind } from "@/game/types";

export function Stars({ rating, size = "text-base" }: { rating: number; size?: string }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className={`relative inline-block leading-none ${size}`} aria-label={`${rating} stars`}>
      <span className="text-white/25">★★★★★</span>
      <span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-amber-400" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

function TopLeft() {
  const moneyV = useGame((s) => s.money);
  const day = useGame((s) => s.day);
  const clock = useGame((s) => s.clock);
  const weather = useGame((s) => s.weather);
  const placed = useGame((s) => s.placed);
  const installations = useGame((s) => s.installations);
  const electricAccrued = useGame((s) => s.electricAccrued);
  const reviews = useGame((s) => s.reviews.length);
  const rep = useGame((s) => s.rep);
  const events = useGame((s) => s.events);
  const customers = useGame((s) => s.customers.filter((c) => !c.browser).length);
  const staffOn = useGame((s) => s.staffNpcs.length);
  const openTickets = useGame((s) => s.tickets.length);
  const unpaidNow = useGame((s) => s.customers.filter((c) => c.state === "ordering" && !c.paid).length);
  const share = useGame((s) => getMarket(s).share);
  const rating = getRating(rep);
  const lp = levelProgress(rep);
  const season = getSeason(day);
  const info = SEASON_INFO[season];
  const wd = WEATHERS[weather];
  const cf = getComfort(day, weather, clock, getCapacity({ placed, installations }));
  const closing = clock >= 780;
  const seats = getSeats(placed, installations).length;
  const daysToBill = DAYS_PER_SEASON - getSeasonDay(day) + 1;
  const billEstimate = getRent(installations).total + electricAccrued;

  const comfortLabel =
    !cf.need ? { text: "Comfortable inside", cls: "text-emerald-300" }
    : cf.comfort >= 0.95 ? { text: cf.need === "cool" ? "Cool inside ❄️" : "Warm inside ♨️", cls: "text-emerald-300" }
    : cf.comfort >= 0.6 ? { text: cf.need === "cool" ? "A bit warm inside" : "A bit chilly inside", cls: "text-amber-300" }
    : { text: cf.need === "cool" ? "Too hot inside! Buy a fan/AC" : "Too cold inside! Buy a heater", cls: "text-rose-300" };

  return (
    <div className="pointer-events-none absolute left-4 top-4 w-72 space-y-2">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-white shadow-xl backdrop-blur">
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-black tabular-nums ${moneyV < 0 ? "text-rose-300" : "text-emerald-300"}`}>{money(moneyV)}</div>
          <div className="text-right text-xs font-semibold text-slate-300">
            <div>
              {info.icon} {info.name} {getSeasonDay(day)} <span className="text-slate-500">· {weekdayName(day)} · Y{getYear(day)}</span>
            </div>
            <div className="tabular-nums">
              {formatClock(clock)} <span className="text-slate-500">· {getPeriod(clock)}</span>
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Stars rating={rating} />
          <span className="text-sm font-bold">{rating.toFixed(1)}</span>
          <span className="text-xs text-slate-400">Lv{lp.level} · {reviews} reviews</span>
          <span className="ml-auto text-xs font-bold text-sky-300">{Math.round(share * 100)}% share</span>
        </div>
        <div className="mt-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{LEVEL_NAMES[lp.level - 1]}</span>
            <span className="tabular-nums">{lp.next ? `${rep.toLocaleString()} / ${(rep - lp.current + lp.next).toLocaleString()} rep` : `${rep.toLocaleString()} rep · max`}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
            <div className="h-full bg-gradient-to-r from-amber-400 to-pink-400 transition-all" style={{ width: `${lp.pct * 100}%` }} />
          </div>
        </div>
        {events.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {events.map((e) => (
              <span key={e.kind} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${e.kind === "vip" ? "bg-pink-500/30 text-pink-200" : e.kind === "busking" ? "bg-violet-500/30 text-violet-200" : "bg-amber-500/25 text-amber-200"}`}>
                {e.label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center justify-between text-xs text-slate-300">
          <span>
            👥 {customers} inside{unpaidNow ? ` · 💳 ${unpaidNow} to pay` : ""} · 🪑 {seats} · 🧑‍🍳 {staffOn} staff{openTickets ? ` · 🧾 ${openTickets}` : ""}
          </span>
          <span className={closing ? "text-rose-300" : "text-emerald-300"}>{closing ? "Last orders" : "Open"}</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          🧾 {day <= 14 ? "first month free" : `bills due in ${daysToBill}d · ≈${money(billEstimate)}`}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white shadow-xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{wd.icon}</span>
            <div>
              <div className="text-sm font-bold leading-tight">
                {wd.name} <span className="text-slate-400">{wd.kr}</span>
              </div>
              <div className="text-[11px] text-slate-400">Street traffic ×{wd.traffic.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black tabular-nums">{cf.temp}°C</div>
            <div className={`text-[11px] font-semibold ${comfortLabel.cls}`}>{comfortLabel.text}</div>
          </div>
        </div>
      </div>

      <StockBar />
      <DishBar />
    </div>
  );
}

function StockBar() {
  const inventory = useGame((s) => s.inventory);
  const placed = useGame((s) => s.placed);
  const infinite = placed.some((p) => ITEMS[p.item].infiniteIce);
  const kinds: StorageKind[] = ["fridge", "pantry", "display", "cupboard", "rack"];
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white shadow-xl backdrop-blur">
      {kinds.map((k) => {
        const cap = getStorageCapacity(placed, k);
        const used = getStorageUsed(inventory, k);
        return (
          <div key={k} className="mb-1 last:mb-0">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>{k === "fridge" ? "🧊 Fridge" : k === "pantry" ? "🗄️ Pantry" : k === "display" ? "🍞 Display" : k === "cupboard" ? "🥤 Cupboard (cups)" : "🍽️ Dish rack"}</span>
              <span className={cap === 0 ? "text-rose-300" : used > cap * 0.9 ? "text-amber-300" : ""}>{cap === 0 ? "none placed!" : `${Math.round(used)}/${cap}`}</span>
            </div>
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs">
              {INGREDIENT_ORDER.filter((id) => INGREDIENTS[id].storage === k).map((id) => {
                const n = inventory[id];
                if (id === "ice" && infinite) return <span key={id} className="text-sky-300">🧊 ∞</span>;
                if (n === 0 && ["syrup", "misugaru", "redbean", "macaron", "honeybread", "flour", "eggs", "butter", "cheese"].includes(id)) return null;
                return (
                  <span key={id} className={n === 0 ? "text-rose-300" : n < 5 ? "text-amber-300" : ""} title={INGREDIENTS[id].name}>
                    {INGREDIENTS[id].icon} {n}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DishBar() {
  const dishes = useGame((s) => s.dishes);
  const dirty = useGame((s) => s.dirtyPiles.reduce((a, p) => a + Object.values(p.counts).reduce((x, y) => x + y, 0), 0));
  const washing = useGame((s) => s.washing);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white shadow-xl backdrop-blur">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>🍽️ Dishes</span>
        <span className={dirty > 8 ? "text-rose-300" : dirty > 3 ? "text-amber-300" : ""}>{dirty} dirty</span>
      </div>
      <div className="mt-1 flex gap-2 text-xs">
        <span>☕ {dishes.mug} mugs</span>
        <span>🍽️ {dishes.plate} plates</span>
        <span>🥣 {dishes.bowl} bowls</span>
        <span>🥄 {dishes.spoon} cutlery</span>
      </div>
      {washing && <div className="mt-1 text-[11px] font-bold text-sky-300">🫧 Washing…</div>}
    </div>
  );
}

/** The scrub / dough-rolling timing minigame. */
function Minigame() {
  const w = useGame((s) => s.washing);
  if (!w || w.source !== "player") return null;
  const prep = !!w.prepFor;
  const pct = w.marker * 100;
  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 w-80 -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-900/85 p-4 text-white shadow-2xl backdrop-blur">
      <div className="mb-1 text-center text-sm font-black">{prep ? "🥖 Roll the dough — press Space in the green!" : "🫧 Scrub! Press Space in the green!"}</div>
      <div className="relative h-4 overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-[30%] right-[25%] bg-emerald-400/50" />
        <div className="absolute inset-y-0 w-1 bg-white" style={{ left: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-center gap-1">
        {Array.from({ length: w.scrubsLeft + w.good }).map((_, i) => (
          <span key={i} className={`h-2 w-6 rounded ${i < w.good ? "bg-emerald-400" : "bg-white/20"}`} />
        ))}
      </div>
      <div className="mt-1 text-center text-[11px] text-slate-400"><Key k="Space" small /> scrub</div>
    </div>
  );
}

export function useQuestContext(): QuestContext {
  const stats = useGame((s) => s.stats);
  const reviews = useGame((s) => s.reviews.length);
  const placed = useGame((s) => s.placed);
  const installations = useGame((s) => s.installations);
  const moneyV = useGame((s) => s.money);
  const day = useGame((s) => s.day);
  const share = useGame((s) => getMarket(s).share);
  const staffWithRoles = useGame((s) => s.staff.filter((x) => x.role).length);
  const styled = useGame((s) => s.styled);
  const rep = useGame((s) => s.rep);
  const inventory = useGame((s) => s.inventory);
  return useMemo(
    () => ({ stats, inventory, reviewCount: reviews, rating: getRating(rep), seats: getSeats(placed, installations).length, installations, placed, money: moneyV, share, day, staffWithRoles, styled }),
    [stats, inventory, reviews, rep, placed, installations, moneyV, share, day, staffWithRoles, styled]
  );
}

function QuestTracker() {
  const ctx = useQuestContext();
  const completed = useGame((s) => s.completedQuests);
  const day = useGame((s) => s.day);
  const quest = QUESTS.find((q) => !completed[q.id] && q.fromDay <= day);
  const next = QUESTS.find((q) => !completed[q.id] && q.fromDay > day);
  if (!quest) {
    if (!next) return null;
    return (
      <div className="pointer-events-none absolute right-4 top-4 w-72 rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-white shadow-xl backdrop-blur">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">All done for today</div>
        <div className="mt-0.5 text-xs text-slate-300">Next: {next.title} unlocks tomorrow.</div>
      </div>
    );
  }
  const p = Math.min(quest.goal, quest.progress(ctx));
  const fmt = quest.format ?? ((v: number) => String(v));
  return (
    <div className="pointer-events-none absolute right-4 top-4 w-72 rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-white shadow-xl backdrop-blur">
      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Current quest</div>
      <div className="mt-0.5 font-bold">{quest.title}</div>
      <div className="text-xs text-slate-300">{quest.desc}</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10">
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${(p / quest.goal) * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-300">
        <span>
          {fmt(p)} / {fmt(quest.goal)}
        </span>
        <span className="text-emerald-300">Reward {money(quest.reward)}</span>
      </div>
    </div>
  );
}

interface PromptOption {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
}

function Prompt() {
  const s = useGame(
    useShallow((st) => ({
      focused: st.focused,
      heldItem: st.heldItem,
      carried: st.carried,
      aim: st.aim,
      placeRot: st.placeRot,
      stations: st.stations,
      inventory: st.inventory,
      placed: st.placed,
      customers: st.customers,
      staff: st.staff,
      staffNpcs: st.staffNpcs,
      warmer: st.warmer,
      dirtyPiles: st.dirtyPiles,
      boxes: st.boxes,
    }))
  );
  const { focused, heldItem, aim, placeRot } = s;
  const carried = s.carried as Carried | null;
  const carriedKind = carried?.kind;
  const econ = { inventory: s.inventory, placed: s.placed };

  let title = "";
  let sub: string | undefined;
  let keyHint: string | undefined;
  let options: PromptOption[] | undefined;
  let progress: number | undefined;
  let tone: "normal" | "good" | "bad" = "normal";
  let extra: string | undefined;

  if (carriedKind === "item" && carried?.kind === "item" && focused?.kind === "dumpster") {
    const def = ITEMS[carried.item];
    title = `🗑️ Throw away the ${def.name}?`;
    sub = `Scrap value +${money(Math.round((def.price * 0.2) / 1000) * 1000)} · this can't be undone`;
    keyHint = "E";
    tone = "bad";
  } else if (carriedKind === "item" && carried?.kind === "item") {
    const def = ITEMS[carried.item];
    title = `📦 Placing ${def.icon} ${def.name}`;
    if (!aim) sub = "Look at the floor of a room you own, or at a table/counter top to put it on";
    else if (aim.valid) {
      const parent = s.placed.find((pp) => pp.uid === aim.onUid);
      sub = parent ? `On top of the ${ITEMS[parent.item].name} · rotation ${placeRot * 90}°` : `Rotation ${placeRot * 90}°`;
      tone = "good";
      keyHint = "E";
    } else {
      sub = aim.reason;
      tone = "bad";
    }
    extra = "R rotate · Q put the box down";
  } else if (carriedKind === "dirty" && carried?.kind === "dirty") {
    title = "🍽️ Carrying dirty dishes";
    sub = (Object.entries(carried.counts) as [IngredientId, number][]).filter(([, v]) => v > 0).map(([k, v]) => `${INGREDIENTS[k].icon}${v}`).join(" ");
    extra = "Take it to the sink and press E · Q drops the pile";
  } else if (carriedKind === "mart" && focused?.kind === "dumpster") {
    title = "🗑️ Throw away the box of supplies?";
    sub = "This can't be undone";
    keyHint = "E";
    tone = "bad";
  } else if (carriedKind === "mart" && carried?.kind === "mart") {
    const items = Object.entries(carried.contents)
      .map(([k, v]) => `${INGREDIENTS[k as keyof typeof INGREDIENTS].icon}${v}`)
      .join(" ");
    title = "📦 Carrying supplies";
    sub = items;
    extra = "Look at the fridge / pantry shelf / display case and press E to unpack · Q put down";
    if (focused?.kind === "placed") {
      const p = s.placed.find((x) => x.uid === focused.uid);
      const def = p ? ITEMS[p.item] : null;
      if (def?.storage) {
        title = `Unpack into ${def.icon} ${def.name}`;
        const match = Object.keys(carried.contents).filter((k) => INGREDIENTS[k as keyof typeof INGREDIENTS].storage === def.storage);
        sub = match.length ? `${match.map((k) => INGREDIENTS[k as keyof typeof INGREDIENTS].icon).join(" ")} go in here` : "Nothing in the box belongs here";
        tone = match.length ? "good" : "bad";
        keyHint = match.length ? "E" : undefined;
      }
    }
  } else if (!focused) return null;
  else {
    switch (focused.kind) {
      case "placed": {
        const p = s.placed.find((x) => x.uid === focused.uid);
        if (!p) return null;
        const def = ITEMS[p.item];
        if (def.station) {
          const st = s.stations[p.uid];
          if (st?.ready) {
            const pr = PRODUCTS[st.ready];
            title = heldItem ? `${pr.icon} ${pr.name} is ready — your hands are full` : `Pick up ${pr.icon} ${pr.name}`;
            keyHint = heldItem ? undefined : "E";
            tone = heldItem ? "bad" : "good";
          } else if (st?.brewing) {
            const pr = PRODUCTS[st.brewing];
            title = `Making ${pr.icon} ${pr.name}…`;
            progress = 1 - st.timeLeft / st.total;
          } else {
            title = `${def.icon} ${def.name}`;
            sub = "Choose what to make";
            options = stationMenu(econ, p).map((pr, i) => ({ key: String(i + 1), label: `${pr.icon} ${pr.name}`, ok: canMake(econ, pr), hint: requiredIngredients(pr, s.placed).map(([ing, q]) => `${q}${INGREDIENTS[ing].icon}`).join(" ") }));
            extra = "F pick up & move";
          }
        } else if (def.storage === "warmer") {
          const list = (Object.keys(s.warmer) as (keyof typeof PRODUCTS)[]).filter((id) => (s.warmer[id] ?? 0) > 0);
          title = `${def.icon} ${def.name}`;
          if (heldItem && (PRODUCTS[heldItem].station === "oven" || PRODUCTS[heldItem].station === "range")) {
            sub = `Put the ${PRODUCTS[heldItem].name} in the warmer`;
            keyHint = "E";
            tone = "good";
          } else {
            sub = list.length ? "Take a hot item" : "Empty — cook something at the oven / range and put it here";
            options = list.map((id, i) => ({ key: String(i + 1), label: `${PRODUCTS[id].icon} ${PRODUCTS[id].name}`, ok: !heldItem, hint: `${s.warmer[id]} ready` }));
          }
          extra = "F pick up & move";
        } else if (def.storage === "display") {
          title = `${def.icon} ${def.name}`;
          sub = heldItem ? "Your hands are full" : "Take a pastry";
          options = getMenu(econ)
            .filter((pr) => pr.station === "display")
            .map((pr, i) => {
              const stock = s.inventory[pr.id as keyof typeof s.inventory] ?? 0;
              return { key: String(i + 1), label: `${pr.icon} ${pr.name}`, ok: stock > 0 && !heldItem, hint: `${stock} left` };
            });
          extra = "F pick up & move";
        } else if (def.id === "sink") {
          title = "🚰 Sink";
          sub = carriedKind === "dirty" ? `Wash the pile${s.placed.some((p) => ITEMS[p.item].autoWash) ? " (dishwasher: automatic)" : " — scrub 3× with Space"}` : "Dirty dishes go here";
          keyHint = carriedKind === "dirty" ? "E" : undefined;
          tone = carriedKind === "dirty" ? "good" : "normal";
          extra = "F pick up & move";
        } else if (def.storage) {
          const used = getStorageUsed(s.inventory, def.storage);
          const cap = getStorageCapacity(s.placed, def.storage);
          title = `${def.icon} ${def.name}`;
          sub = `${Math.round(used)}/${cap} units · ${INGREDIENT_ORDER.filter((i) => INGREDIENTS[i].storage === def.storage && s.inventory[i] > 0).map((i) => `${INGREDIENTS[i].icon}${s.inventory[i]}`).join(" ") || "empty"}`;
          extra = "E inspect · F pick up & move";
        } else if (def.id === "counter") {
          title = "🧾 Service counter · POS";
          sub = "Open CaféOS";
          keyHint = "E";
          extra = "F pick up & move";
        } else if (def.id === "trash") {
          title = heldItem ? `Throw away the ${PRODUCTS[heldItem].name}` : "🗑️ Trash bin";
          keyHint = heldItem ? "E" : undefined;
          extra = "F pick up & move";
        } else {
          title = `${def.icon} ${def.name}`;
          sub = def.seats ? `${def.seats.length} seats · +${def.ambience} ambience` : `+${def.ambience} ambience`;
          keyHint = "F";
          extra = "pick up & move";
        }
        break;
      }
      case "box": {
        const b = s.boxes.find((x) => x.uid === focused.uid);
        if (!b) return null;
        title = b.kind === "item" ? `📦 ${ITEMS[b.item!].icon} ${ITEMS[b.item!].name}` : "📦 Box of supplies";
        sub = carriedKind ? "Put down what you're carrying first (Q)" : heldItem ? "Hands full" : "Pick up the box";
        keyHint = carriedKind || heldItem ? undefined : "E";
        tone = carriedKind || heldItem ? "bad" : "good";
        break;
      }
      case "computer":
        title = "💻 CaféOS";
        sub = "Money · Bills · Property · Prices · Street";
        keyHint = "E";
        break;
      case "dumpster":
        title = "🗑️ Waste dumpster";
        sub = "Carry a box here to throw it away (equipment returns 20% scrap value)";
        break;
      case "dishes": {
        const p = s.dirtyPiles.find((x) => x.id === focused.id);
        if (!p) return null;
        const n = Object.values(p.counts).reduce((a, b) => a + b, 0);
        title = `🍽️ ${n} dirty dishes`;
        sub = carried ? "Hands full (Q to put down)" : heldItem ? "Hands full" : "Pick up the pile → take it to the sink";
        keyHint = !carried && !heldItem ? "E" : undefined;
        tone = "normal";
        break;
      }
      case "staff": {
        const m = s.staff.find((x) => x.id === focused.id);
        if (!m) return null;
        const npc = s.staffNpcs.find((n) => n.id === m.id);
        title = `${m.role ? ROLE_MAP[m.role].icon : "💤"} ${m.name} · ${m.role ? ROLE_MAP[m.role].name : "no role"}`;
        sub = npc?.state === "working" ? "Making an order" : npc?.state === "takingOrder" ? "Taking an order" : npc?.carrying ? `Delivering ${PRODUCTS[npc.carrying].name}` : npc?.box ? "Restocking" : "Waiting for something to do";
        keyHint = "E";
        extra = "Manage roles in CaféOS → Staff";
        break;
      }
      case "npc":
        title = "Talk";
        sub = focused.id.split(":")[0];
        keyHint = "E";
        break;
      case "bed":
        title = "🛏️ Your bed";
        sub = "Sleep (ends the day) & save";
        keyHint = "E";
        break;
      case "mart":
        title = "Talk to Minji (민지)";
        sub = "Beans, milk, ice, cups, bakery stock";
        keyHint = "E";
        break;
      case "hardware":
        title = "Talk to Mr. Park (박사장님)";
        sub = "Furniture, decor, fans, air-con, heaters";
        keyHint = "E";
        break;
      case "appliance":
        title = "Talk to Mr. Choi (최사장님)";
        sub = "Espresso machines, fridges, display cases, blenders";
        keyHint = "E";
        break;
      case "living":
        title = "Talk to Yuna (유나)";
        sub = "Dalgona Living — sofas, lamps, rugs, plants, art, statues";
        keyHint = "E";
        break;
      case "competitor":
        title = "Size up the competition";
        sub = "Peek at their rating, prices and share";
        keyHint = "E";
        break;
      case "customer": {
        const c = s.customers.find((x) => x.id === focused.id);
        if (!c) return null;
        const order = c.order ? PRODUCTS[c.order] : null;
        const tag = `${c.vip ? `🌟 ${c.vip.handle} · ` : c.crowd === "office" ? "🏢 office worker · " : c.crowd === "student" ? "🎒 student · " : ""}${c.rider ? "🛵 delivery rider" : c.mode === "togo" ? "to-go" : "dine-in"}`;
        if (c.browser) {
          title = `${c.name} is deciding where to go`;
          sub = c.say ?? "Window shopping…";
          tone = "bad";
        } else if (c.state === "ordering" && order) {
          if (heldItem === c.order) {
            title = `Serve ${c.name} their ${order.icon} ${order.name}`;
            sub = `${tag}${c.mode === "togo" ? ` · uses 1 ${order.station === "display" ? "bag" : "cup"}` : ""}`;
            keyHint = "E";
            tone = "good";
          } else {
            title = `${c.name} wants a ${order.icon} ${order.name}`;
            sub = `${tag} · ${heldItem ? `you're holding a ${PRODUCTS[heldItem].name}` : "your hands are empty"}`;
            tone = "bad";
          }
        } else if ((c.state === "waiting" || (c.awaiting && (c.state === "sitting" || c.state === "toSeat"))) && order) {
          if (heldItem === c.order) {
            title = `Hand ${c.name} their ${order.icon} ${order.name}`;
            keyHint = "E";
            tone = "good";
          } else {
            title = `${c.name} is waiting for a ${order.icon} ${order.name}`;
            sub = `Order taken by staff · ${c.seat ? "seated" : "at the pickup counter"}`;
          }
        } else if (c.state === "queueing" && order) {
          title = `${c.name} is waiting in line`;
          sub = `Will order: ${order.icon} ${order.name} · ${tag}${c.partySize >= 2 ? ` · party of ${c.partySize}` : ""}`;
        } else if (c.state === "sitting") {
          title = `${c.name} is enjoying their ${order?.name ?? "visit"}`;
          sub = c.partySize >= 2 ? `Party of ${c.partySize}` : undefined;
        } else {
          title = c.name;
          sub = c.state === "entering" ? "Coming in…" : "Heading out";
        }
        break;
      }
    }
  }

  const border = tone === "good" ? "border-emerald-400/60" : tone === "bad" ? "border-rose-400/60" : "border-white/15";
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 mt-8 w-80 -translate-x-1/2">
      <div className={`rounded-2xl border ${border} bg-slate-900/80 px-4 py-3 text-white shadow-2xl backdrop-blur`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bold leading-tight">{title}</div>
            {sub && <div className="text-xs text-slate-300">{sub}</div>}
          </div>
          {keyHint && <Key k={keyHint} />}
        </div>
        {progress !== undefined && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-white/10">
            <div className="h-full bg-amber-400" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {options && (
          <div className="mt-2 space-y-1">
            {options.map((o) => (
              <div key={o.key} className={`flex items-center justify-between rounded-lg px-2 py-1 ${o.ok ? "bg-white/5" : "opacity-50"}`}>
                <div className="flex items-center gap-2">
                  <Key k={o.key} small />
                  <span className="text-sm font-semibold">{o.label}</span>
                </div>
                <span className="text-xs text-slate-300">{o.hint}</span>
              </div>
            ))}
          </div>
        )}
        {extra && <div className="mt-2 text-[11px] text-slate-400">{extra}</div>}
      </div>
    </div>
  );
}

export function Key({ k, small = false }: { k: string; small?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 font-mono font-bold text-white shadow-[0_2px_0_rgba(255,255,255,0.15)] ${small ? "h-5 min-w-5 px-1 text-[11px]" : "h-7 min-w-7 px-2 text-sm"}`}>{k}</span>
  );
}

function Held() {
  const heldItem = useGame((s) => s.heldItem);
  const carried = useGame((s) => s.carried);
  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-1.5 text-sm text-white shadow-xl backdrop-blur">
      {carried ? (
        <span>
          Carrying: <span className="font-bold">{carried.kind === "item" ? `📦 ${ITEMS[carried.item].name}` : carried.kind === "mart" ? "📦 Supplies" : `🍽️ ${Object.values(carried.counts).reduce((a, b) => a + b, 0)} dirty dishes`}</span>
        </span>
      ) : heldItem ? (
        <span>
          Holding: <span className="font-bold">{PRODUCTS[heldItem].icon} {PRODUCTS[heldItem].name}</span>
        </span>
      ) : (
        <span className="text-slate-300">Hands empty</span>
      )}
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none absolute bottom-5 left-4 flex w-96 flex-col gap-1.5">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-in rounded-xl border px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur ${t.kind === "good" ? "border-emerald-400/40 bg-emerald-900/70" : t.kind === "warn" ? "border-rose-400/40 bg-rose-900/70" : "border-white/10 bg-slate-900/70"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Controls() {
  const dragLook = useGame((s) => s.dragLook);
  return (
    <div className="pointer-events-none absolute bottom-5 right-4 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-300 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span><Key k="WASD" small /> move</span>
        {dragLook && <span><Key k="Drag" small /> look</span>}
        <span><Key k="Space" small /> jump</span>
        <span><Key k="Shift" small /> run</span>
        <span><Key k="E" small /> use</span>
        <span><Key k="F" small /> pick up</span>
        <span><Key k="Q" small /> drop</span>
        <span><Key k="R" small /> rotate</span>
        <span><Key k="1-9" small /> choose</span>
        <span><Key k="Esc" small /> close / menu</span>
      </div>
    </div>
  );
}

export function HUD() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_0_2px_rgba(0,0,0,0.35)]" />
      <TopLeft />
      <Minigame />
      <QuestTracker />
      <Prompt />
      <Held />
      <Toasts />
      <Controls />
    </div>
  );
}
