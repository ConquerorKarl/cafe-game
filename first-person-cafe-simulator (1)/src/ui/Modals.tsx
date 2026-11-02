import { useState, type ReactNode } from "react";
import { DAYS_PER_SEASON, SEASON_INFO, WEATHERS, formatDate, getComfort, getSeason, getSeasonDay, getTemperature, nextSeasonOf } from "@/game/calendar";
import {
  BOX_SLOTS,
  COMPETITORS,
  DELIVERY_FEE,
  INGREDIENTS,
  INGREDIENT_ORDER,
  INSTALLATIONS,
  ITEMS,
  MART_PACKS,
  QUESTS,
  ROLES,
  ROLE_MAP,
  SKILLS,
  FLOOR_PATTERNS,
  WALL_PAINTS,
  ROOF_STYLES,
  KITCHEN_LOOKS,
  getStaffCap,
  roleFit,
  staffWage,
  getCapacity,
  getMarket,
  getMenu,
  getPowerBreakdown,
  getPriceFactor,
  getRating,
  getRent,
  getStorageCapacity,
  getStorageUsed,
  money,
  shopItems,
  type ItemDef,
} from "@/game/constants";
import { getSeats } from "@/game/layout";
import { LEVEL_CAPS, LEVEL_NAMES, VIP_DAILY_CHANCE, VIP_MIN_LEVEL, levelProgress } from "@/game/reputation";
import { DECOR, DECOR_SECTIONS, type DecorDef } from "@/game/catalog";
import { PRODUCTS, PRODUCT_ORDER, priceCutoff, priceTolerance, orderable } from "@/game/constants";
import { useGame } from "@/game/store";
import type { Applicant, BoxContents, FloorStyleKey, IngredientId, ItemCategory, MusicId, ShopId, SkillId, Staff } from "@/game/types";
import { Stars, useQuestContext } from "./HUD";

function Modal({ title, subtitle, icon, children, width = "max-w-3xl" }: { title: string; subtitle?: string; icon: string; children: ReactNode; width?: string }) {
  const closeModal = useGame((s) => s.closeModal);
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={`flex max-h-[88vh] w-full ${width} flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl">{icon}</div>
            <div>
              <h2 className="text-lg font-black leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button onClick={closeModal} className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            Close <span className="ml-1 text-slate-400">Tab / E</span>
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Button({ children, onClick, disabled, variant = "primary" }: { children: ReactNode; onClick: () => void; disabled?: boolean; variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${variant === "primary" ? "bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:bg-white/10 disabled:text-slate-500" : variant === "danger" ? "bg-rose-500/80 text-white hover:bg-rose-500 disabled:opacity-40" : "bg-white/10 hover:bg-white/20 disabled:opacity-40"}`}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</Button>
      <span className="w-8 text-center font-black tabular-nums">{value}</span>
      <Button variant="ghost" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mart — fill a box
// ---------------------------------------------------------------------------
export function MartModal() {
  const inventory = useGame((s) => s.inventory);
  const placed = useGame((s) => s.placed);
  const moneyV = useGame((s) => s.money);
  const carried = useGame((s) => s.carried);
  const buyMart = useGame((s) => s.buyMart);
  const [cart, setCart] = useState<Record<string, number>>({});
  const packs = (id: IngredientId) => cart[id] ?? 0;
  const slots = MART_PACKS.reduce((a, p) => a + packs(p.ingredient), 0);
  const total = MART_PACKS.reduce((a, p) => a + packs(p.ingredient) * p.price, 0);
  const infinite = placed.some((p) => ITEMS[p.item].infiniteIce);

  const checkout = (deliver: boolean) => {
    const contents: BoxContents = {};
    for (const p of MART_PACKS) if (packs(p.ingredient)) contents[p.ingredient] = packs(p.ingredient) * p.qty;
    if (buyMart(contents, deliver)) setCart({});
  };

  return (
    <Modal title="Minji's Mart 민지네 마트" subtitle="안녕하세요! Fill a box — carry it out or have it delivered to your alley." icon="🛒" width="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm">
        <span className="font-bold text-emerald-300">{money(moneyV)}</span>
        <span className="text-slate-400">·</span>
        {(["fridge", "pantry", "display"] as const).map((k) => (
          <span key={k} className="rounded-lg bg-white/10 px-2 py-0.5 text-xs">
            {k === "fridge" ? "🧊" : k === "pantry" ? "🗄️" : "🍞"} {Math.round(getStorageUsed(inventory, k))}/{getStorageCapacity(placed, k)}
          </span>
        ))}
        <span className="ml-auto text-xs text-slate-400">Your stock: {INGREDIENT_ORDER.map((id) => `${INGREDIENTS[id].icon}${inventory[id]}`).join(" ")}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {MART_PACKS.map((pack) => {
          const ing = INGREDIENTS[pack.ingredient];
          const pointless = pack.ingredient === "ice" && infinite;
          return (
            <div key={pack.ingredient} className={`flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 ${pointless ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{ing.icon}</div>
                <div>
                  <div className="font-bold">
                    {ing.name} <span className="text-slate-400">× {pack.qty}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {money(pack.price)} / pack · goes in the {ing.storage}
                  </div>
                </div>
              </div>
              <Stepper value={packs(pack.ingredient)} onChange={(v) => setCart({ ...cart, [pack.ingredient]: v })} max={pointless ? 0 : BOX_SLOTS} />
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-900/20 p-4">
        <div>
          <div className="font-black">
            📦 Box: {slots}/{BOX_SLOTS} packs · {money(total)}
          </div>
          <div className="text-xs text-slate-300">{slots > BOX_SLOTS ? "Too much for one box — order the rest as a second delivery." : "One box per trip. Unpack it into the fridge / pantry / display case back at the café."}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setCart({})} disabled={!slots}>Clear</Button>
          <Button onClick={() => checkout(false)} disabled={!slots || slots > BOX_SLOTS || !!carried || moneyV < total}>
            Carry it out
          </Button>
          <Button onClick={() => checkout(true)} disabled={!slots || slots > BOX_SLOTS || moneyV < total + DELIVERY_FEE}>
            Deliver to alley (+{money(DELIVERY_FEE)})
          </Button>
        </div>
      </div>
      {carried && <p className="mt-2 text-xs text-amber-300">You're already carrying a box — choose delivery, or put it down first.</p>}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Hardware & appliance stores — buy N, delivered to the alley
// ---------------------------------------------------------------------------
const CATEGORY_LABEL: Record<ItemCategory, string> = { fixture: "Fixtures & storage", machine: "Machines", kitchen: "Kitchen appliances (need a free slot in the kitchen)", utility: "Utility: sink, dish rack, cupboards, dishwasher", countertop: "Countertop appliances (worktop / back room / kitchen)", furniture: "Seating", decor: "Decor & lighting", boutique: "✨ Boutique — statement pieces (late game)", climate: "Heating & cooling" };

function ItemShop({ shop, title, subtitle, icon, intro }: { shop: ShopId; title: string; subtitle: string; icon: string; intro: string }) {
  const moneyV = useGame((s) => s.money);
  const placed = useGame((s) => s.placed);
  const boxes = useGame((s) => s.boxes);
  const buyItems = useGame((s) => s.buyItems);
  const [qty, setQty] = useState<Record<string, number>>({});
  const items = shopItems(shop);
  const cats = [...new Set(items.map((i) => i.category))];
  const owned = (d: ItemDef) => placed.filter((p) => p.item === d.id).length + boxes.filter((b) => b.item === d.id).length;
  return (
    <Modal title={title} subtitle={subtitle} icon={icon} width="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm">
        <span className="font-bold text-emerald-300">{money(moneyV)}</span>
        <span className="text-slate-300">{intro}</span>
      </div>
      {cats.map((cat) => (
        <div key={cat} className="mb-5">
          <h3 className="mb-2 font-black">{CATEGORY_LABEL[cat]}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {items
              .filter((i) => i.category === cat)
              .map((d) => {
                const q = qty[d.id] ?? 1;
                return (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{d.icon}</div>
                      <div>
                        <div className="font-bold">
                          {d.name} {d.kr && <span className="text-xs font-normal text-slate-400">{d.kr}</span>}
                        </div>
                        <div className="text-xs text-slate-400">{d.desc}</div>
                        <div className="mt-0.5 text-[11px] text-amber-300">
                          {d.size[0]}×{d.size[1]} m · +{d.ambience} ambience
                          {d.seats ? ` · ${d.seats.length} seats` : ""}
                          {d.cool ? ` · cooling ${Math.round(d.cool * 100)}%` : ""}
                          {d.heat ? ` · heating ${Math.round(d.heat * 100)}%` : ""}
                          {d.capacity ? ` · ${d.capacity} units` : ""}
                          {d.power ? ` · ⚡ ${money(d.power)}/day${d.powerSeason === "summer" ? " (summer)" : d.powerSeason === "winter" ? " (winter)" : ""}` : ""}
                          {owned(d) ? ` · you own ${owned(d)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Stepper value={q} onChange={(v) => setQty({ ...qty, [d.id]: v })} min={1} max={9} />
                      <Button onClick={() => buyItems(d.id, q)} disabled={moneyV < d.price * q}>
                        Buy {q > 1 ? `${q} · ` : ""}{money(d.price * q)}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </Modal>
  );
}

export const HardwareModal = () => <ItemShop shop="hardware" title="Hongdae Hardware 홍대 철물점" subtitle="Mr. Park: counters, shelves, basic tables, fans, air-con and heaters." icon="🛠️" intro="Everything is delivered as boxes to the alley behind your café (through the back door). Carry one box at a time, place it with E. For sofas, lamps, rugs and decor see Dalgona Living on the plaza." />;

// ---------------------------------------------------------------------------
// Dalgona Living — homeware catalogue
// ---------------------------------------------------------------------------
function DecorCard({ d, qty, setQty, owned, moneyV, buy }: { d: DecorDef; qty: number; setQty: (v: number) => void; owned: number; moneyV: number; buy: () => void }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${d.colors[0]?.startsWith("#") ? d.colors[0] : "#64748b"}33`, border: `1px solid ${d.colors[0]?.startsWith("#") ? d.colors[0] : "#64748b"}66` }}>
          {d.icon}
        </div>
        <div className="min-w-0">
          <div className="truncate font-bold">
            {d.name} {d.kr && <span className="text-xs font-normal text-slate-400">{d.kr}</span>}
          </div>
          <div className="text-xs text-slate-400">{d.desc}</div>
          <div className="mt-0.5 text-[11px] text-amber-300">
            {d.size[0]}×{d.size[1]} m · +{d.ambience} ambience
            {d.seats ? ` · ${d.seats.length} seat${d.seats.length > 1 ? "s" : ""}` : ""}
            {d.light ? " · lights up" : ""}
            {d.power ? ` · ⚡ ${money(d.power)}/day` : ""}
            {d.outdoor ? " · outdoors" : ""}
            {owned ? ` · you own ${owned}` : ""}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Stepper value={qty} onChange={setQty} min={1} max={9} />
        <Button onClick={buy} disabled={moneyV < d.price * qty}>
          {qty > 1 ? `${qty} · ` : ""}{money(d.price * qty)}
        </Button>
      </div>
    </div>
  );
}

export function LivingModal() {
  const moneyV = useGame((s) => s.money);
  const placed = useGame((s) => s.placed);
  const boxes = useGame((s) => s.boxes);
  const buyItems = useGame((s) => s.buyItems);
  const [section, setSection] = useState<DecorDef["section"]>("seating");
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const q = search.trim().toLowerCase();
  const list = q ? DECOR.filter((d) => `${d.name} ${d.kr ?? ""} ${d.desc} ${d.section}`.toLowerCase().includes(q)) : DECOR.filter((d) => d.section === section);
  const owned = (d: DecorDef) => placed.filter((p) => p.item === `decor:${d.id}`).length + boxes.filter((b) => b.item === `decor:${d.id}`).length;
  return (
    <Modal title="Dalgona Living 달고나 리빙" subtitle={`Yuna: ${DECOR.length} pieces of homeware. Delivered boxed to your alley, like everything else.`} icon="🛋️" width="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {DECOR_SECTIONS.map((sec) => (
          <button key={sec.id} onClick={() => { setSection(sec.id); setSearch(""); }} className={`rounded-xl px-3 py-1.5 text-sm font-bold ${!q && section === sec.id ? "bg-pink-400 text-slate-900" : "bg-white/10 hover:bg-white/20"}`}>
            {sec.icon} {sec.name} <span className="text-xs font-normal opacity-70">{DECOR.filter((d) => d.section === sec.id).length}</span>
          </button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="ml-auto w-44 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm outline-none focus:border-pink-400" />
        <span className="text-sm font-bold text-emerald-300">{money(moneyV)}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((d) => (
          <DecorCard key={d.id} d={d} qty={qty[d.id] ?? 1} setQty={(v) => setQty({ ...qty, [d.id]: v })} owned={owned(d)} moneyV={moneyV} buy={() => buyItems(`decor:${d.id}`, qty[d.id] ?? 1)} />
        ))}
        {!list.length && <p className="text-sm text-slate-400">Nothing matches that search.</p>}
      </div>
      <p className="mt-4 text-xs text-slate-400">Anything with seats can be used by customers (and counted for groups). Items marked "lights up" add to the electricity bill. Wall art, rugs, rails and pendants don't block walking — lean or hang them wherever.</p>
    </Modal>
  );
}
export const ApplianceModal = () => <ItemShop shop="appliance" title="Café Appliance Center 카페기기 전문점" subtitle="Mr. Choi: espresso machines, fridges, display cases, blenders and more." icon="☕" intro="Appliances are delivered to your alley. You can own several of each — two espresso machines means two drinks brewing at once." />;

// ---------------------------------------------------------------------------
// Bed
// ---------------------------------------------------------------------------
export function BedModal() {
  const sleep = useGame((s) => s.sleep);
  const save = useGame((s) => s.save);
  const closeModal = useGame((s) => s.closeModal);
  const notify = useGame((s) => s.notify);
  const clock = useGame((s) => s.clock);
  const customers = useGame((s) => s.customers.filter((c) => !c.browser).length);
  return (
    <Modal title="Bedroom 침실" subtitle="Your cozy study behind the café." icon="🛏️" width="max-w-md">
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
          Sleeping ends the day now{customers ? ` (${customers} customers still inside will go home)` : ""}. Progress is also saved automatically every night.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={sleep}>😴 Sleep & save (end day)</Button>
          <Button
            variant="ghost"
            onClick={() => {
              save();
              notify("💾 Game saved.", "good");
              closeModal();
            }}
          >
            💾 Save only
          </Button>
          <Button variant="ghost" onClick={closeModal}>Not yet</Button>
        </div>
        {clock < 300 && <p className="text-xs text-amber-300">It's still early — you'd miss the lunch and evening rush.</p>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// POS / EFTPOS screen
// ---------------------------------------------------------------------------
export function PosModal() {
  const posUid = useGame((s) => s.posUid);
  const closeModal = useGame((s) => s.closeModal);
  const customers = useGame((s) => s.customers);
  const prices = useGame((s) => s.prices);
  const menuOn = useGame((s) => s.menuOn);
  const moneyV = useGame((s) => s.money);
  const machine = useGame((s) => s.placed.find((p) => p.uid === posUid) ?? null);
  const [selected, setSelected] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const queue = customers.filter((c) => c.state === "ordering" && !c.paid && c.order).sort((a, b) => a.queueIndex - b.queueIndex);
  const sel = queue.find((c) => c.id === selected) ?? queue[0] ?? null;
  // products we sell and can currently make
  const s = useGame.getState();
  const ringable = orderable(s).filter((p) => menuOn[p.id] !== false);

  const charge = () => {
    if (!sel || !posUid || processing) return;
    setProcessing(true);
    // card/contactless processing takes a moment
    window.setTimeout(() => {
      const ok = useGame.getState().ringUpAt(posUid, sel.id, null);
      setProcessing(false);
      if (ok) {
        setSelected(null);
        if (!useGame.getState().customers.some((c) => c.state === "ordering" && !c.paid)) closeModal();
      }
    }, 1000);
  };

  return (
    <Modal title={machine?.item === "kiosk" ? "Self-Order Kiosk" : "EFTPOS · POS"} subtitle={`${useGame.getState().cafeName} — ring up the order, confirm, customer pays`} icon="💳" width="max-w-3xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">At the counter ({queue.length})</h3>
          {!queue.length && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Nobody waiting to pay. Paid customers are making their way to the pickup end.</p>}
          <div className="space-y-1.5">
            {queue.map((c, i) => {
              const p = c.order ? PRODUCTS[c.order] : null;
              const price = c.order ? prices[c.order] + (c.rider ? 1500 : 0) : 0;
              const over = p && price > priceCutoff(p.fair, getRating(useGame.getState().rep));
              return (
                <button key={c.id} onClick={() => setSelected(c.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${sel?.id === c.id ? "border-emerald-400 bg-emerald-900/30" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <span className="w-5 text-center text-xs font-black text-slate-400">{i + 1}</span>
                  <span className="font-bold">{c.name}{c.rider ? " 🛵" : ""}{c.partySize > 1 ? ` 👥${c.partySize}` : ""}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {p && <span>{p.icon} {p.name}{over && <span className="ml-1 text-[10px] font-bold text-rose-300">overpriced!</span>}</span>}
                    <span className="font-black tabular-nums text-emerald-300">{p ? money(price) : "—"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Bill</h3>
          {sel && sel.order ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{PRODUCTS[sel.order].icon} {PRODUCTS[sel.order].name}</span>
                <span className="font-black">{money(prices[sel.order] + (sel.rider ? 1500 : 0))}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">{sel.name}{sel.rider ? " · delivery order" : ""} · {sel.mode === "togo" ? "to-go" : "dine-in"}</div>
              <button onClick={charge} disabled={processing} className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-lg font-black text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50">
                {processing ? "Processing…" : `Charge ${money(prices[sel.order] + (sel.rider ? 1500 : 0))}`}
              </button>
              {processing && <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10"><div className="h-full animate-pulse bg-emerald-300" style={{ width: "65%" }} /></div>}
            </div>
          ) : (
            <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">Select a customer at the counter.</p>
          )}
          <div className="mt-3">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">On the menu &amp; makeable now ({ringable.length})</h3>
            <div className="flex flex-wrap gap-1">
              {ringable.map((p) => (
                <span key={p.id} className="rounded-lg bg-white/10 px-1.5 py-0.5 text-[11px]">{p.icon} {money(prices[p.id])}</span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Customers order from this list. At 1★ they only pay ~fair price; at 5★ they'll pay up to ~{Math.round(priceTolerance(5) * 100)}% of fair. Manage items &amp; prices in CaféOS → Prices. Balance: <b className="text-emerald-300">{money(moneyV)}</b>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// CaféOS
// ---------------------------------------------------------------------------
type Tab = "dashboard" | "staff" | "style" | "ambience" | "bills" | "property" | "street" | "prices" | "quests" | "reviews";

export function ComputerModal() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const cafeName = useGame((s) => s.cafeName);
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "staff", label: "Staff", icon: "👥" },
    { id: "style", label: "Style Studio", icon: "🎨" },
    { id: "ambience", label: "Ambience", icon: "🎵" },
    { id: "bills", label: "Bills", icon: "🧾" },
    { id: "property", label: "Property", icon: "🏗️" },
    { id: "street", label: "The Street", icon: "🏙️" },
    { id: "prices", label: "Prices", icon: "🏷️" },
    { id: "quests", label: "Quests", icon: "📋" },
    { id: "reviews", label: "Reviews", icon: "⭐" },
  ];
  return (
    <Modal title="CaféOS" subtitle={`${cafeName} — management terminal`} icon="💻" width="max-w-4xl">
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${tab === t.id ? "bg-sky-400 text-slate-900" : "bg-white/10 hover:bg-white/20"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <Dashboard />}
      {tab === "staff" && <StaffTab />}
      {tab === "style" && <StyleTab />}
      {tab === "ambience" && <AmbienceTab />}
      {tab === "bills" && <Bills />}
      {tab === "property" && <Property />}
      {tab === "street" && <Street />}
      {tab === "prices" && <Prices />}
      {tab === "quests" && <Quests />}
      {tab === "reviews" && <Reviews />}
    </Modal>
  );
}

function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-0.5 text-xl font-black ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function Dashboard() {
  const s = useGame();
  const [confirm, setConfirm] = useState(false);
  const m = getMarket(s);
  const season = getSeason(s.day);
  const info = SEASON_INFO[season];
  const wd = WEATHERS[s.weather];
  const fc = WEATHERS[s.forecast];
  const cap = getCapacity(s);
  const cf = getComfort(s.day, s.weather, s.clock, cap);
  const daysLeft = DAYS_PER_SEASON - getSeasonDay(s.day);
  const seats = getSeats(s.placed, s.installations).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Balance" value={money(s.money)} accent={s.money < 0 ? "text-rose-300" : "text-emerald-300"} />
        <Stat label="Rating" value={<span className="flex items-center gap-2">{m.rating.toFixed(1)} <Stars rating={m.rating} size="text-sm" /></span>} accent="text-amber-300" />
        <Stat label="Market share" value={`${Math.round(m.share * 100)}%`} accent="text-sky-300" />
        <Stat label="Date" value={formatDate(s.day)} />
        <Stat label="Served today" value={`${s.stats.servedToday}`} />
        <Stat label="Earned today" value={money(s.stats.earnedToday)} accent="text-emerald-300" />
        <Stat label="Dine-in / to-go" value={`${s.stats.dineinServed} / ${s.stats.togoServed}`} />
        <Stat label="Walked out · elsewhere" value={`${s.stats.lostToday} · ${s.stats.stolenToday}`} accent={s.stats.lostToday ? "text-rose-300" : ""} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-black">
            {wd.icon} Weather · {wd.name} <span className="text-slate-400">{wd.kr}</span>
          </h3>
          <div className="mt-1 text-sm text-slate-300">
            {cf.temp}°C now · high of {getTemperature(s.day, s.weather, 360)}°C · street traffic ×{wd.traffic.toFixed(2)}
          </div>
          <div className="mt-2 text-sm">
            Tomorrow: <b>{fc.icon} {fc.name}</b> <span className="text-xs text-slate-400">(~80% accurate)</span>
          </div>
          <div className="mt-2 text-sm">
            {info.icon} <b>{info.name}</b>, day {getSeasonDay(s.day)} of {DAYS_PER_SEASON} · {daysLeft === 0 ? `${SEASON_INFO[nextSeasonOf(season)].name} starts tomorrow!` : `${daysLeft} days until ${SEASON_INFO[nextSeasonOf(season)].name}`}
          </div>
          {s.news.length > 0 && (
            <div className="mt-3 space-y-1 rounded-xl bg-slate-950/40 p-2 text-xs text-slate-300">
              {s.news.map((n, i) => (
                <div key={i}>📰 {n}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-black">🌡️ Climate & seating</h3>
          <div className="mt-1 text-sm">
            {cf.need === null ? <span className="text-emerald-300">Mild weather — no heating or cooling needed right now.</span> : cf.comfort >= 0.95 ? <span className="text-emerald-300">{cf.need === "cool" ? "Air-con is keeping everyone cool." : "The café is toasty warm."}</span> : <span className="text-rose-300">{cf.need === "cool" ? "It's hot inside." : "It's cold inside."} Comfort {Math.round(cf.comfort * 100)}% — buy {cf.need === "cool" ? "fans / air-con" : "heaters"} at Hongdae Hardware.</span>}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-slate-950/40 p-2">
              <div className="text-slate-400">Cooling</div>
              <div className="text-lg font-black">{Math.round(cap.cool * 100)}%</div>
            </div>
            <div className="rounded-xl bg-slate-950/40 p-2">
              <div className="text-slate-400">Heating</div>
              <div className="text-lg font-black">{Math.round(cap.heat * 100)}%</div>
            </div>
            <div className="rounded-xl bg-slate-950/40 p-2">
              <div className="text-slate-400">Seats</div>
              <div className="text-lg font-black">{seats}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">{seats === 0 ? "No seats: everyone orders to-go (needs cups & bags). Tables make people sit, tip and review." : "Groups of 2–5 sit together when a table has enough free seats and tip generously."}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-black">Why people come (or don't)</h3>
          <span className="text-sm text-slate-300">≈ <b className="text-white">{m.rate.toFixed(1)}</b> customers / min right now</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Factor label="Reputation" detail={`${m.rating.toFixed(1)}★`} value={m.ratingFactor} />
          <Factor label="Pricing" detail={`Menu is ${Math.round(m.priceRatio * 100)}% of fair`} value={m.priceFactor} />
          <Factor label="Ambience & tech" detail={`${m.ambience} points`} value={m.ambienceFactor} />
          <Factor label="Comfort" detail={cf.need ? `${cf.need === "cool" ? "Cooling" : "Heating"} at ${Math.round(cf.capacity * 100)}%` : "No climate need"} value={m.comfortFactor} />
          <Factor label="Visibility" detail={s.installations.sign ? "Neon sign installed" : "No neon sign yet"} value={m.signFactor} />
          <Factor label="Street traffic" detail={`${wd.name} × time of day${m.crowdLabel ? ` × ${m.crowdLabel}` : ""}${m.buzz > 1 ? " × buzz" : ""}`} value={m.timeFactor * m.weatherFactor * m.crowdFactor * m.buzz} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <div className="font-bold">Close early</div>
          <div className="text-xs text-slate-400">Skip to closing time (or go to bed in the back room).</div>
        </div>
        {confirm ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => s.endDay(false)}>Yes, close</Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirm(true)}>Close shop</Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff: recruitment + roster
// ---------------------------------------------------------------------------
function SkillBars({ skills, compact = false }: { skills: Record<SkillId, number>; compact?: boolean }) {
  return (
    <div className={`grid ${compact ? "grid-cols-3 gap-x-3 gap-y-1" : "grid-cols-2 gap-x-4 gap-y-1.5"}`}>
      {SKILLS.map((k) => {
        const v = skills[k.id];
        const cls = v >= 8 ? "bg-emerald-400" : v <= 3 ? "bg-rose-400" : "bg-sky-400";
        return (
          <div key={k.id} title={k.desc}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">{k.icon} {k.name}</span>
              <span className={`font-bold ${v >= 8 ? "text-emerald-300" : v <= 3 ? "text-rose-300" : "text-slate-200"}`}>{v}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
              <div className={`h-full ${cls}`} style={{ width: `${v * 10}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tags({ skills }: { skills: Record<SkillId, number> }) {
  const strong = SKILLS.filter((k) => skills[k.id] >= 8);
  const weak = SKILLS.filter((k) => skills[k.id] <= 3);
  return (
    <div className="flex flex-wrap gap-1 text-[11px]">
      {strong.map((k) => (
        <span key={k.id} className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-300">+ {k.icon} {k.name}</span>
      ))}
      {weak.map((k) => (
        <span key={k.id} className="rounded-md bg-rose-500/20 px-1.5 py-0.5 font-bold text-rose-300">− {k.icon} {k.name}</span>
      ))}
    </div>
  );
}

function FitStars({ v }: { v: number }) {
  const n = Math.round(v * 5);
  return <span className="text-[11px] text-amber-300">{"★".repeat(n)}<span className="text-white/20">{"★".repeat(5 - n)}</span></span>;
}

function BestRoles({ skills, kitchen }: { skills: Record<SkillId, number>; kitchen: boolean }) {
  const ranked = ROLES.filter((r) => kitchen || !r.needsKitchen).map((r) => ({ r, fit: roleFit(skills, r.id) })).sort((a, b) => b.fit - a.fit).slice(0, 3);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
      {ranked.map(({ r, fit }) => (
        <span key={r.id}>{r.icon} {r.name} <FitStars v={fit} /></span>
      ))}
    </div>
  );
}

function ApplicantCard({ a, canHire, kitchen }: { a: Applicant; canHire: boolean; kitchen: boolean }) {
  const hire = useGame((s) => s.hire);
  return (
    <div className={`rounded-2xl border p-4 ${a.star ? "border-amber-400/50 bg-amber-900/15" : "border-white/10 bg-white/5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl" style={{ background: a.colors.shirt }}>{a.gender === "f" ? "👩" : "👨"}</div>
          <div>
            <div className="font-bold">
              {a.name} <span className="text-xs font-normal text-slate-400">{a.age}</span>
              {a.star && <span className="ml-2 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300">★ STANDOUT</span>}
            </div>
            <div className="text-xs text-slate-400">{a.bio}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-black text-pink-300">{money(a.wage)}<span className="text-xs font-normal text-slate-400">/day</span></div>
          <Button onClick={() => hire(a.id)} disabled={!canHire}>Hire</Button>
        </div>
      </div>
      <div className="mt-3">
        <SkillBars skills={a.skills} compact />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Tags skills={a.skills} />
        <BestRoles skills={a.skills} kitchen={kitchen} />
      </div>
    </div>
  );
}

function StaffCard({ m, kitchen, kitchen2 }: { m: Staff; kitchen: boolean; kitchen2: boolean }) {
  const assignRole = useGame((s) => s.assignRole);
  const dismiss = useGame((s) => s.dismiss);
  const staff = useGame((s) => s.staff);
  const npc = useGame((s) => s.staffNpcs.find((n) => n.id === m.id));
  const [confirm, setConfirm] = useState(false);
  const status = !m.role ? "no role — not working" : !npc ? "off the floor" : npc.state === "working" ? "making an order" : npc.state === "takingOrder" ? "taking an order" : npc.carrying ? "delivering" : npc.box ? "restocking" : npc.state === "idle" ? "waiting" : "walking";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl" style={{ background: m.colors.shirt }}>{m.role ? ROLE_MAP[m.role].icon : "💤"}</div>
          <div>
            <div className="font-bold">
              {m.name} <span className="text-xs font-normal text-slate-400">{m.age}{m.star ? " · ★" : ""}</span>
            </div>
            <div className="text-xs text-slate-400">{m.role ? ROLE_MAP[m.role].name : "Unassigned"} · {status} · served {m.served} today</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-black text-pink-300">{money(m.wage)}<span className="text-xs font-normal text-slate-400">/day</span></div>
          {confirm ? (
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => setConfirm(false)}>Keep</Button>
              <Button variant="danger" onClick={() => dismiss(m.id)}>Dismiss</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirm(true)}>Dismiss…</Button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <SkillBars skills={m.skills} compact />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ROLES.map((r) => {
          const fit = roleFit(m.skills, r.id);
          const locked = (r.needsKitchen && !kitchen) || (r.needsKitchen2 && !kitchen2);
          const full = staff.filter((x) => x.role === r.id && x.id !== m.id).length >= r.max;
          const active = m.role === r.id;
          return (
            <button
              key={r.id}
              onClick={() => assignRole(m.id, active ? null : r.id)}
              disabled={locked || (full && !active)}
              title={r.needsKitchen2 && !kitchen2 ? "Needs the FULL kitchen upgrade" : r.needsKitchen && !kitchen ? "Needs the kitchen expansion" : full ? "Role is full" : r.desc}
              className={`flex flex-col items-start rounded-xl border px-2.5 py-1.5 text-left text-xs transition ${active ? "border-sky-400 bg-sky-400/20" : "border-white/10 bg-white/5 hover:bg-white/10"} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <span className="font-bold">{r.icon} {r.name}</span>
              <FitStars v={fit} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StaffTab() {
  const s = useGame();
  const cap = getStaffCap(s.installations);
  const kitchen = !!s.installations.kitchen;
  const kitchen2 = !!s.installations.kitchen2;
  const canHire = s.staff.length < cap;
  const [view, setView] = useState<"roster" | "recruit">(s.staff.length ? "roster" : "recruit");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm">
        <div className="flex gap-2">
          <button onClick={() => setView("roster")} className={`rounded-xl px-3 py-1.5 font-bold ${view === "roster" ? "bg-pink-400 text-slate-900" : "bg-white/10 hover:bg-white/20"}`}>👥 Roster & roles ({s.staff.length})</button>
          <button onClick={() => setView("recruit")} className={`rounded-xl px-3 py-1.5 font-bold ${view === "recruit" ? "bg-pink-400 text-slate-900" : "bg-white/10 hover:bg-white/20"}`}>📱 Recruitment app ({s.applicants.length})</button>
        </div>
        <div className="text-slate-300">
          Staff <b className={canHire ? "text-white" : "text-rose-300"}>{s.staff.length}/{cap}</b> <span className="text-slate-500">· capacity grows with each expansion (kitchen +2)</span> · payroll <b className="text-pink-300">{money(staffWage(s.staff))}/day</b>
        </div>
      </div>

      {view === "recruit" && (
        <>
          <p className="text-sm text-slate-300">
            Applications from the neighbourhood, refreshed every morning. Skills run 1–10: <span className="text-emerald-300">8+ is a strength</span>, <span className="text-rose-300">3 or less is a weakness</span> (slow, occasional mistakes). ★ Standouts are rare — strong at two or three things.
            Mix and match: a charming cashier, a fast barista, an organised office worker.
          </p>
          {!canHire && <div className="rounded-xl border border-rose-400/40 bg-rose-900/30 p-3 text-sm text-rose-200">You're at capacity ({cap}). Expand the café (Property tab) to hire more people.</div>}
          <div className="grid gap-3 lg:grid-cols-2">
            {s.applicants.map((a) => (
              <ApplicantCard key={a.id} a={a} canHire={canHire} kitchen={kitchen} />
            ))}
          </div>
        </>
      )}

      {view === "roster" && (
        <>
          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.id} className={`rounded-xl bg-white/5 p-2 ${r.needsKitchen && !kitchen ? "opacity-50" : ""}`}>
                <div className="font-bold text-white">{r.icon} {r.name} <span className="font-normal text-slate-400">{s.staff.filter((x) => x.role === r.id).length}/{r.max}</span></div>
                <div>{r.desc}</div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <input type="checkbox" checked={s.autoStock} onChange={(e) => s.setAutoStock(e.target.checked)} className="h-4 w-4" />
            <span>Office worker may order supplies from Minji's Mart automatically (delivered to the alley, +{money(DELIVERY_FEE)} per box)</span>
          </label>
          {s.staff.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">Nobody on the books yet. Open the recruitment app to see who's applying.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {s.staff.map((m) => (
                <StaffCard key={m.id} m={m} kitchen={kitchen} kitchen2={kitchen2} />
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400">
            How a shift works: the <b>cashier</b> takes orders so the queue keeps moving · <b>baristas / cooks / bakers</b> make tickets at their stations and leave them on the pickup end of the counter · the <b>cashier</b> hands over to-go orders and the <b>waiter</b> carries dine-in orders to tables (upstairs too) · the <b>office worker</b> keeps the fridge and pantry stocked. Without a cashier, baristas still pre-make the next customer's drink and hand it over themselves.
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Style Studio
// ---------------------------------------------------------------------------
function Swatch({ color, active, label, price, onClick, disabled, kr }: { color: string; active: boolean; label: string; kr?: string; price: number; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-xs transition ${active ? "border-pink-400 bg-pink-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"} disabled:cursor-not-allowed disabled:opacity-40`}>
      <span className="h-7 w-7 shrink-0 rounded-lg border border-white/20" style={{ background: color }} />
      <span className="min-w-0">
        <span className="block truncate font-bold">{label} {kr && <span className="font-normal text-slate-400">{kr}</span>}</span>
        <span className="text-[10px] text-slate-400">{active ? "current" : price ? money(price) : "free"}</span>
      </span>
    </button>
  );
}

function StyleTab() {
  const s = useGame();
  const owned = !!s.installations.styleApp;
  const [floor, setFloor] = useState<FloorStyleKey>("0");
  const floors: { key: FloorStyleKey; label: string }[] = [
    { key: "0", label: "Ground floor" },
    ...(s.installations.floor2 ? [{ key: "1" as FloorStyleKey, label: "2nd floor" }] : []),
    ...(s.installations.floor3 ? [{ key: "2" as FloorStyleKey, label: "3rd floor" }] : []),
    ...(s.installations.basement ? [{ key: "-1" as FloorStyleKey, label: "Basement" }] : []),
  ];
  if (!owned)
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-5xl">🎨</div>
        <h3 className="mt-2 text-xl font-black">Style Studio</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">Paint the walls, lay new floors, pick ceilings for every floor, restyle the kitchen and the shopfront. Install the app from the <b>Property</b> tab ({money(600000)}).</p>
        <div className="mt-3">
          <Button onClick={() => s.buyInstallation("styleApp")} disabled={s.money < 600000}>Install Style Studio · {money(600000)}</Button>
        </div>
      </div>
    );
  const cur = s.style.floors[floor];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm">
        {floors.map((f) => (
          <button key={f.key} onClick={() => setFloor(f.key)} className={`rounded-xl px-3 py-1.5 font-bold ${floor === f.key ? "bg-pink-400 text-slate-900" : "bg-white/10 hover:bg-white/20"}`}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">Floors you haven't unlocked yet appear here once built. Same-finish changes are free.</span>
      </div>

      <div>
        <h3 className="mb-2 font-black">🪵 Floor pattern</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FLOOR_PATTERNS.map((f) => (
            <Swatch key={f.id} color={f.swatch} label={f.name} kr={f.kr} price={f.price} active={cur.floor === f.id} onClick={() => s.setFloorStyle(floor, { floor: f.id })} disabled={cur.floor !== f.id && s.money < f.price} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-black">🖌️ Wall paint</h3>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {WALL_PAINTS.map((w) => (
            <Swatch key={w.id} color={w.hex} label={w.name} kr={w.kr} price={w.price} active={cur.wall === w.id} onClick={() => s.setFloorStyle(floor, { wall: w.id })} disabled={cur.wall !== w.id && s.money < w.price} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-black">🏠 Ceiling</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ROOF_STYLES.map((r) => (
            <Swatch key={r.id} color={r.hex} label={r.name} kr={r.kr} price={r.price} active={cur.ceiling === r.id} onClick={() => s.setFloorStyle(floor, { ceiling: r.id })} disabled={cur.ceiling !== r.id && s.money < r.price} />
          ))}
        </div>
      </div>
      <div className={`grid gap-4 ${s.installations.kitchen ? "md:grid-cols-2" : ""}`}>
        {s.installations.kitchen && (
          <div>
            <h3 className="mb-2 font-black">👨‍🍳 Kitchen look</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {KITCHEN_LOOKS.map((k) => (
                <Swatch key={k.id} color={k.hex} label={k.name} kr={k.kr} price={k.price} active={s.style.kitchen === k.id} onClick={() => s.setKitchenLook(k.id)} disabled={s.style.kitchen !== k.id && s.money < k.price} />
              ))}
            </div>
          </div>
        )}
        <div>
          <h3 className="mb-2 font-black">🏬 Shopfront paint <span className="text-xs font-normal text-slate-400">(2× paint price)</span></h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {WALL_PAINTS.map((w) => (
              <Swatch key={w.id} color={w.hex} label={w.name} kr={w.kr} price={w.price * 2} active={s.style.facade === w.id} onClick={() => s.setFacade(w.id)} disabled={s.style.facade !== w.id && s.money < w.price * 2} />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400">The Style Studio is colours, patterns and finishes only. Furniture, lamps, rugs, flowers and art are physical items — visit <b>Dalgona Living</b> on the plaza.</p>
    </div>
  );
}

const MUSIC: { id: MusicId; name: string; icon: string; blurb: string }[] = [
  { id: "classic", name: "Classical", icon: "🎻", blurb: "Bach and Brahms. Students write essays." },
  { id: "jazz", name: "Jazz", icon: "🎷", blurb: "Late-night Hongdae standard. Chet Baker on repeat." },
  { id: "pop", name: "K-Pop", icon: "🎤", blurb: "Current charts. Everyone knows the words." },
  { id: "lofi", name: "Lo-fi hip-hop", icon: "📻", blurb: "Beats to study to. Rain not included." },
  { id: "whiteNoise", name: "White noise", icon: "🌫️", blurb: "Pure café murmur. Concentrate." },
  { id: "off", name: "Off", icon: "🔇", blurb: "Just the espresso machine." },
];

function AmbienceTab() {
  const music = useGame((s) => s.music);
  const setMusic = useGame((s) => s.setMusic);
  const tvOwned = useGame((s) => s.placed.some((p) => p.item === "tv"));
  const speakerOwned = useGame((s) => s.placed.some((p) => p.item === "speaker") || s.placed.some((p) => p.item.startsWith("decor:") && (p.item.includes("vinyl") || p.item.includes("turntable") || p.item.includes("radio"))));
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Café culture: pick what plays. Needs a <b>speaker</b> (Hongdae Hardware) or the <b>wall TV</b> (Dalgona Living) placed in the café.
        Comfortable music makes customers linger a little longer — and review a little kinder.
      </p>
      {(!tvOwned && !speakerOwned) && <div className="rounded-xl border border-amber-400/40 bg-amber-900/30 p-3 text-sm text-amber-200">⚠️ No speaker or TV placed yet — buy one and place it, then the playlist goes live.</div>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MUSIC.map((m) => (
          <button key={m.id} onClick={() => setMusic(m.id)} className={`rounded-2xl border p-4 text-left transition ${music === m.id ? "border-sky-400 bg-sky-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            <div className="text-2xl">{m.icon}</div>
            <div className="mt-1 font-black">{m.name} {music === m.id && <span className="text-xs text-sky-300">· playing</span>}</div>
            <div className="text-xs text-slate-400">{m.blurb}</div>
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
        <div className="font-black">📺 On the TV</div>
        <div className="mt-1 text-xs text-slate-400">With a wall TV placed, the screen shows the playlist name and a slow visualiser; on weekend evenings (after 18:00) it switches to baseball on its own. Very Hongdae.</div>
      </div>
    </div>
  );
}

function Factor({ label, detail, value }: { label: string; detail: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2">
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-xs text-slate-400">{detail}</div>
      </div>
      <div className={`text-lg font-black tabular-nums ${value >= 1 ? "text-emerald-300" : "text-rose-300"}`}>×{value.toFixed(2)}</div>
    </div>
  );
}

function Bills() {
  const s = useGame();
  const season = getSeason(s.day);
  const rent = getRent(s.installations);
  const power = getPowerBreakdown(s, season);
  const daysToBill = DAYS_PER_SEASON - getSeasonDay(s.day) + 1;
  const projected = rent.total + s.electricAccrued + power.total * daysToBill;
  const payroll = staffWage(s.staff);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Next bill in" value={`${daysToBill} day${daysToBill > 1 ? "s" : ""}`} />
        <Stat label="Monthly rent" value={money(rent.total)} accent="text-amber-300" />
        <Stat label="Electricity so far" value={money(s.electricAccrued)} accent="text-sky-300" />
        <Stat label="Payroll / day" value={money(payroll)} accent="text-pink-300" />
        <Stat label="Projected bill" value={money(projected)} accent={projected > s.money ? "text-rose-300" : "text-emerald-300"} />
      </div>
      {s.staff.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-black">👥 Payroll · paid every night at closing</h3>
          <div className="mt-2 space-y-1 text-sm">
            {s.staff.map((m) => (
              <div key={m.id} className="flex justify-between">
                <span className="text-slate-300">{m.role ? ROLE_MAP[m.role].icon : "💤"} {m.name} · {m.role ? ROLE_MAP[m.role].name : "no role (still paid!)"}</span>
                <span className="font-bold">{money(m.wage)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-white/10 pt-1 text-xs text-slate-400"><span>Total paid so far</span><span>{money(s.stats.payrollTotal)}</span></div>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-black">🏠 Rent (every {DAYS_PER_SEASON} days)</h3>
          <div className="mt-2 space-y-1 text-sm">
            {rent.lines.map((l) => (
              <div key={l.name} className="flex justify-between">
                <span className="text-slate-300">{l.name}</span>
                <span className="font-bold">{money(l.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-black">⚡ Electricity · {money(power.total)}/day right now</h3>
          <div className="mt-2 space-y-1 text-sm">
            {power.lines.map((l) => (
              <div key={l.name} className="flex justify-between">
                <span className="text-slate-300">
                  {l.icon} {l.name}
                  {l.count > 1 ? ` ×${l.count}` : ""}
                </span>
                <span className="font-bold">{money(l.perDay)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Cooling appliances only draw power in summer, heating in winter. Pick up an appliance (F) and box it to stop paying for it.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-black">History</h3>
        {s.billHistory.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">No bills paid yet. The first one lands at the end of Spring 14.</p>
        ) : (
          <div className="mt-2 space-y-1 text-sm">
            {[...s.billHistory].reverse().map((b) => (
              <div key={b.day} className="flex justify-between rounded-lg bg-slate-950/40 px-3 py-1.5">
                <span className="text-slate-300">{formatDate(b.day)}</span>
                <span>
                  rent {money(b.rent)} + ⚡ {money(b.electric)} = <b>{money(b.total)}</b>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Property() {
  const installations = useGame((s) => s.installations);
  const moneyV = useGame((s) => s.money);
  const buy = useGame((s) => s.buyInstallation);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">Construction and services. Expansions open new rooms you can furnish (walk the boxes in) — and raise the monthly rent.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {INSTALLATIONS.map((u) => {
          const owned = !!installations[u.id];
          const locked = !!u.requires && !installations[u.requires];
          return (
            <div key={u.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${owned ? "border-emerald-400/30 bg-emerald-900/20" : "border-white/10 bg-white/5"}`}>
              <div className="flex gap-3">
                <div className="text-3xl">{u.icon}</div>
                <div>
                  <div className="font-bold">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.desc}</div>
                  <div className="mt-1 text-xs text-amber-300">
                    +{u.ambience} ambience{u.rent ? ` · rent +${money(u.rent)}/month` : ""}{u.power ? ` · ⚡ ${money(u.power)}/day` : ""}
                  </div>
                  {locked && <div className="text-xs text-rose-300">Requires {INSTALLATIONS.find((x) => x.id === u.requires)?.name}</div>}
                </div>
              </div>
              {owned ? <span className="shrink-0 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-sm font-bold text-emerald-300">Done</span> : <div className="shrink-0"><Button onClick={() => buy(u.id)} disabled={locked || moneyV < u.price}>{money(u.price)}</Button></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Street() {
  const s = useGame();
  const m = getMarket(s);
  const season = getSeason(s.day);
  const rows = [
    { id: "you", name: `${s.cafeName} (you)`, kr: "", color: "#ff7bd5", rating: m.rating, price: m.priceRatio, ambience: m.ambience, appeal: m.ourAppeal, share: m.share, note: m.need && m.comfort < 1 ? `comfort ${Math.round(m.comfort * 100)}%` : "" },
    ...COMPETITORS.map((def) => {
      const st = s.competitors.find((c) => c.id === def.id)!;
      const mc = m.competitors.find((c) => c.id === def.id)!;
      const boost = def.seasonBoost[season];
      return { id: def.id, name: def.name, kr: def.kr, color: def.color, rating: st.rating, price: def.priceRatio, ambience: def.ambience, appeal: mc.appeal, share: mc.share, note: [st.promoText, boost && boost !== 1 ? `${boost > 1 ? "strong" : "weak"} in ${season}` : ""].filter(Boolean).join(" · ") };
    }),
  ].sort((a, b) => b.share - a.share);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">About <b>{Math.round(m.traffic)}</b> café-goers walk this street every minute right now. Each picks a café in proportion to its appeal. Walk into the competition to see what you're up against.</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className={`rounded-2xl border p-3 ${r.id === "you" ? "border-pink-400/40 bg-pink-900/20" : "border-white/10 bg-white/5"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl" style={{ background: r.color }} />
                <div>
                  <div className="font-bold">{r.name} <span className="text-slate-400">{r.kr}</span></div>
                  <div className="text-xs text-slate-400">{r.rating.toFixed(1)}★ · prices {Math.round(r.price * 100)}% of fair · ambience {r.ambience}{r.note ? ` · ${r.note}` : ""}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black">{Math.round(r.share * 100)}%</div>
                <div className="text-[11px] text-slate-400">appeal {r.appeal.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-white/10">
              <div className="h-full" style={{ width: `${r.share * 100}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Prices() {
  const prices = useGame((s) => s.prices);
  const placed = useGame((s) => s.placed);
  const menuOn = useGame((s) => s.menuOn);
  const rep = useGame((s) => s.rep);
  const setPrice = useGame((s) => s.setPrice);
  const setMenu = useGame((s) => s.setMenu);
  const menu = getMenu({ placed, menuOn });
  const allProducts = PRODUCT_ORDER.map((id) => PRODUCTS[id]);
  const tol = priceTolerance(getRating(rep));
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Toggle items on/off the sales menu any time — staff can only make listed items (if stocked) and customers can only order listed ones. Set prices in ₩100 steps.{" "}
        At <b>{getRating(rep).toFixed(1)}★</b> customers tolerate up to ~<b>{Math.round(tol * 100)}%</b> of the fair price; over ~{Math.round(tol * 160)}% and they refuse or go elsewhere. Low prices are well received but earn less.
      </p>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2">On menu</th>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Fair</th>
              <th className="px-4 py-2">Your price</th>
              <th className="px-4 py-2">Demand</th>
            </tr>
          </thead>
          <tbody>
            {allProducts.map((p) => {
              const unlocked = menu.some((m) => m.id === p.id);
              const on = unlocked && menuOn[p.id] !== false;
              const price = prices[p.id];
              const demand = getPriceFactor(price / p.fair, getRating(rep));
              return (
                <tr key={p.id} className={`border-t border-white/5 ${on ? "" : "opacity-60"}`}>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => unlocked && setMenu(p.id, !on)}
                      disabled={!unlocked}
                      title={unlocked ? "Toggle on the sales menu" : "Needs the equipment for this item"}
                      className={`h-5 w-9 rounded-full p-0.5 transition ${on ? "bg-emerald-400" : "bg-white/15"} disabled:cursor-not-allowed`}
                    >
                      <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
                    </button>
                  </td>
                  <td className="px-4 py-2 font-bold">{p.icon} {p.name} <span className="text-xs font-normal text-slate-400">{p.kr}</span>{!unlocked && <span className="ml-1 text-[10px] font-normal text-slate-500">locked</span>}</td>
                  <td className="px-4 py-2 text-slate-400">{money(p.fair)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => setPrice(p.id, price - 500)}>−500</Button>
                      <Button variant="ghost" onClick={() => setPrice(p.id, price - 100)}>−</Button>
                      <span className="w-20 text-center font-black tabular-nums">{money(price)}</span>
                      <Button variant="ghost" onClick={() => setPrice(p.id, price + 100)}>+</Button>
                      <Button variant="ghost" onClick={() => setPrice(p.id, price + 500)}>+500</Button>
                    </div>
                  </td>
                  <td className="px-4 py-2"><span className={`font-bold ${demand >= 1 ? "text-emerald-300" : demand >= 0.6 ? "text-amber-300" : "text-rose-300"}`}>{Math.round(demand * 100)}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Quests() {
  const ctx = useQuestContext();
  const completed = useGame((s) => s.completedQuests);
  const day = useGame((s) => s.day);
  return (
    <div className="space-y-2">
      {QUESTS.filter((q) => q.fromDay <= day || completed[q.id]).map((q) => {
        const done = !!completed[q.id];
        const p = Math.min(q.goal, q.progress(ctx));
        const fmt = q.format ?? ((v: number) => String(v));
        return (
          <div key={q.id} className={`rounded-2xl border p-3 ${done ? "border-emerald-400/30 bg-emerald-900/20" : "border-white/10 bg-white/5"}`}>
            <div className="flex items-center justify-between">
              <div className="font-bold">{done ? "✅" : "⬜"} {q.title}</div>
              <div className="text-xs font-bold text-emerald-300">+{money(q.reward)}</div>
            </div>
            <div className="text-xs text-slate-400">{q.desc}</div>
            {!done && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
                  <div className="h-full bg-amber-400" style={{ width: `${(p / q.goal) * 100}%` }} />
                </div>
                <span className="text-[11px] tabular-nums text-slate-300">{fmt(p)} / {fmt(q.goal)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Reviews() {
  const reviews = useGame((s) => s.reviews);
  const rep = useGame((s) => s.rep);
  const repLog = useGame((s) => s.repLog);
  const repToday = useGame((s) => s.repToday);
  const stats = useGame((s) => s.stats);
  const rating = getRating(rep);
  const lp = levelProgress(rep);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-4xl font-black text-amber-300">{rating.toFixed(1)}</div>
          <div>
            <Stars rating={rating} size="text-xl" />
            <div className="text-xs text-slate-400">Level {lp.level} · {LEVEL_NAMES[lp.level - 1]} · {rep.toLocaleString()} reputation</div>
          </div>
          <div className="ml-auto text-right text-xs">
            <div className="text-emerald-300">+{repToday.gained} today</div>
            <div className="text-rose-300">−{repToday.lost} today</div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-white/10">
          <div className="h-full bg-gradient-to-r from-amber-400 to-pink-400" style={{ width: `${lp.pct * 100}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1 text-[10px] text-slate-400">
          {LEVEL_CAPS.map((cap, i) => (
            <div key={i} className={`rounded-md px-1 py-0.5 text-center ${lp.level === i + 1 ? "bg-white/10 text-white" : ""}`}>
              <div className="font-bold">Lv{i + 1}</div>
              <div>{i === 0 ? "start" : `${cap.toLocaleString()}+`}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Rep goes up with 4–5★ reviews (+9 / +18) and down with 1–2★ reviews, walk-outs, empty shelves and uncomfortable rooms. From <b>level {VIP_MIN_LEVEL}</b> there's a {Math.round(VIP_DAILY_CHANCE * 100)}% chance each day that a celebrity drops in: serve them fast and comfortably for <b>+500</b>, or lose <b>500</b> if they leave unhappy. Their posts bring a wave of extra customers.
          {stats.vipVisits ? ` Celebrity visits so far: ${stats.vipVisits} (${stats.vipHappy} happy).` : ""}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-black">📒 Reputation log</h3>
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {[...repLog].reverse().slice(0, 40).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg bg-slate-950/40 px-2 py-1 text-xs">
                <span className="truncate text-slate-300">{e.icon} {e.reason} <span className="text-slate-500">· {formatDate(e.day).split(" · ")[0]}</span></span>
                <span className={`ml-2 shrink-0 font-black ${e.delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{e.delta >= 0 ? "+" : ""}{e.delta}</span>
              </div>
            ))}
            {!repLog.length && <p className="text-xs text-slate-500">Nothing yet. Serve someone!</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-black">⭐ Latest reviews</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-400">No reviews yet. Serve people quickly, give them somewhere to sit, and they'll start talking about you on Naver Maps.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {reviews.slice(0, 30).map((r) => (
                <div key={r.id} className={`rounded-2xl border p-3 ${r.vip ? "border-pink-400/50 bg-pink-900/20" : r.stars <= 2 ? "border-rose-400/30 bg-rose-900/15" : "border-white/10 bg-white/5"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold">{r.vip ? "🌟 " : ""}{r.author}</div>
                    <div className="text-xs text-slate-400">{formatDate(r.day).split(" · ")[0]} · <span className={r.rep >= 0 ? "text-emerald-300" : "text-rose-300"}>{r.rep >= 0 ? "+" : ""}{r.rep}</span></div>
                  </div>
                  <div className="text-sm text-amber-300">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
                  <div className="text-sm text-slate-200">“{r.text}”</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
