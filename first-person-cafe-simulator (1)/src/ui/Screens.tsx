import { useState } from "react";
import { SEASON_INFO, WEATHERS, formatDate, getSeason, getSeasonDay, nextSeasonOf } from "@/game/calendar";
import { DEFAULT_CAFE_NAME, ITEMS, STARTING_MONEY, getRating, money } from "@/game/constants";
import { lockPointer } from "@/game/registry";
import { useGame } from "@/game/store";
import { Key, Stars } from "./HUD";

function QualityToggle() {
  const quality = useGame((s) => s.quality);
  const setQuality = useGame((s) => s.setQuality);
  const fps = useGame((s) => s.fpsCap);
  const setFps = useGame((s) => s.setFpsCap);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
      <span>FPS cap</span>
      <div className="flex overflow-hidden rounded-lg border border-white/15">
        {[30, 45, 60].map((f) => (
          <button
            key={f}
            onClick={(e) => {
              e.stopPropagation();
              setFps(f);
            }}
            className={`px-2.5 py-1 font-bold ${fps === f ? "bg-sky-400 text-slate-900" : "bg-white/5 hover:bg-white/15"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <span className="ml-2">Graphics</span>
      <div className="flex overflow-hidden rounded-lg border border-white/15">
        {(["high", "low"] as const).map((q) => (
          <button
            key={q}
            onClick={(e) => {
              e.stopPropagation();
              setQuality(q);
            }}
            className={`px-2.5 py-1 font-bold ${quality === q ? "bg-sky-400 text-slate-900" : "bg-white/5 hover:bg-white/15"}`}
          >
            {q === "high" ? "Fancy (bloom, shadows)" : "Fast"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StartScreen() {
  const startGame = useGame((s) => s.startGame);
  const newGame = useGame((s) => s.newGame);
  const hasSave = useGame((s) => s.hasSave);
  const day = useGame((s) => s.day);
  const moneyV = useGame((s) => s.money);
  const reviews = useGame((s) => s.reviews.length);
  const savedName = useGame((s) => s.cafeName);
  const rep = useGame((s) => s.rep);
  const [name, setName] = useState(hasSave ? "" : DEFAULT_CAFE_NAME);
  const [showNew, setShowNew] = useState(!hasSave);
  const begin = (fresh: boolean) => {
    if (fresh) newGame(name);
    else startGame();
    lockPointer();
  };
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-pink-950/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-white shadow-2xl">
        <div className="text-sm font-bold uppercase tracking-[0.3em] text-pink-300">Hongdae · 홍대 · Seoul</div>
        <h1 className="mt-1 text-4xl font-black leading-tight">☕ Your café on the walking street</h1>
        <p className="mt-3 text-slate-300">
          You've signed the lease on the ground floor of an old apartment block on Hongdae's walking street. There's a bedroom in the back, a delivery spot in the alley, and three cafés
          that already own the neighbourhood. Buy equipment, carry the boxes in, place everything where you like — then earn the street back one americano at a time.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {(["spring", "summer", "autumn", "winter"] as const).map((s) => (
            <div key={s} className="rounded-2xl bg-white/5 p-3">
              <div className="text-2xl">{SEASON_INFO[s].icon}</div>
              <div className="mt-1 font-bold">
                {SEASON_INFO[s].name} <span className="text-slate-400">{SEASON_INFO[s].kr}</span>
              </div>
              <div className="text-xs text-slate-400">{s === "summer" ? "Needs cooling" : s === "winter" ? "Needs heating" : "Mild"}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
          <span><Key k="WASD" small /> move</span>
          <span><Key k="Space" small /> jump</span>
          <span><Key k="E" small /> use / place</span>
          <span><Key k="F" small /> pick up furniture</span>
          <span><Key k="Q" small /> put box down</span>
          <span><Key k="R" small /> rotate</span>
          <span><Key k="Esc" small /> close / menu</span>
        </div>

        {showNew && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Name your café (appears on the sign)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              placeholder={DEFAULT_CAFE_NAME}
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-lg font-bold text-white outline-none focus:border-pink-400"
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {["카페 달빛 · Café Dalbit", "Hongdae Roasters 홍대 로스터스", "Café Yeonnam 연남", "Moon & Bean 문앤빈"].map((n) => (
                <button key={n} onClick={() => setName(n)} className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20">
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="text-sm text-slate-400">
              {hasSave ? (
                <>
                  Saved: <b className="text-white">{savedName}</b> · {formatDate(day)} · <b className="text-emerald-300">{money(moneyV)}</b> · <b className="text-amber-300">{getRating(rep).toFixed(1)}★</b> <span className="text-slate-500">({reviews} reviews)</span>
                </>
              ) : (
                <>
                  Starting funds: <b className="text-emerald-300">{money(STARTING_MONEY)}</b> · first month's rent &amp; power are already paid · Spring 1 (quiet tutorial day)
                </>
              )}
            </div>
            <QualityToggle />
          </div>
          <div className="flex gap-2">
            {hasSave && !showNew && (
              <button onClick={() => setShowNew(true)} className="rounded-2xl bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/20">
                New game
              </button>
            )}
            {hasSave && showNew && (
              <button onClick={() => setShowNew(false)} className="rounded-2xl bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/20">
                Back
              </button>
            )}
            {showNew ? (
              <button onClick={() => begin(true)} className="rounded-2xl bg-pink-400 px-6 py-3 text-lg font-black text-slate-900 shadow-lg shadow-pink-500/30 transition hover:bg-pink-300">
                Open the café →
              </button>
            ) : (
              <button onClick={() => begin(false)} className="rounded-2xl bg-pink-400 px-6 py-3 text-lg font-black text-slate-900 shadow-lg shadow-pink-500/30 transition hover:bg-pink-300">
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PauseOverlay() {
  const pause = useGame((s) => s.pause);
  const dragLook = useGame((s) => s.dragLook);
  const setPause = useGame((s) => s.setPause);
  const save = useGame((s) => s.save);
  const notify = useGame((s) => s.notify);
  const cafeName = useGame((s) => s.cafeName);
  const addMoney = useGame((s) => s.devAddMoney);
  const resume = () => {
    setPause("none");
    lockPointer();
  };
  if (pause !== "menu") {
    return (
      <div className="pointer-events-auto absolute inset-0 z-40 flex cursor-pointer items-end justify-center pb-24" onClick={resume}>
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-3 text-center text-white shadow-2xl backdrop-blur">
          <div className="font-bold">Click to continue</div>
          <div className="text-xs text-slate-400">{dragLook ? "Drag to look around" : "The browser released the mouse — one click grabs it back"}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 p-8 text-center text-white shadow-2xl">
        <div className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Paused</div>
        <div className="mt-1 text-2xl font-black">{cafeName}</div>
        <div className="mt-5 grid gap-2">
          <button onClick={resume} className="rounded-2xl bg-pink-400 px-6 py-3 text-lg font-black text-slate-900 hover:bg-pink-300">
            Resume
          </button>
          <button
            onClick={() => {
              save();
              notify("💾 Game saved.", "good");
            }}
            className="rounded-2xl bg-white/10 px-6 py-2.5 font-bold hover:bg-white/20"
          >
            💾 Save game
          </button>
        </div>
        <div className="mt-4 flex justify-center">
          <QualityToggle />
        </div>
        <button onClick={() => { addMoney(10_000_000); notify("🧪 +₩10,000,000 (testing)", "good"); }} className="mt-3 rounded-xl border border-dashed border-white/20 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
          🧪 Testing: add ₩10,000,000
        </button>
        <div className="mt-4 space-y-1 text-left text-xs text-slate-400">
          <div><Key k="E" small /> use · place box · talk · serve</div>
          <div><Key k="F" small /> pick up furniture into a box</div>
          <div><Key k="Q" small /> put the box down · <Key k="R" small /> rotate</div>
          <div><Key k="Space" small /> jump · <Key k="Shift" small /> run</div>
          <div><Key k="Esc" small /> closes menus first, then opens this</div>
        </div>
      </div>
    </div>
  );
}

export function DaySummaryScreen() {
  const summary = useGame((s) => s.daySummary);
  const next = useGame((s) => s.continueFromSummary);
  const boxes = useGame((s) => s.boxes.length);
  if (!summary) return null;
  const go = () => {
    next();
  };
  const delta = summary.rating - summary.ratingBefore;
  const wd = WEATHERS[summary.weather];
  const fc = WEATHERS[summary.forecast];
  const info = SEASON_INFO[summary.season];
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-8 text-white shadow-2xl">
        <div className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">{summary.slept ? "Good night · 안녕히 주무세요" : "Closing time · 영업 종료"}</div>
        <h2 className="mt-1 text-3xl font-black">
          {info.icon} {info.name} {getSeasonDay(summary.day)} is done
        </h2>
        <div className="mt-1 text-sm text-slate-400">
          {wd.icon} {wd.name}, high of {summary.tempHigh}°C · 💾 saved
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">Sales</div>
            <div className="text-2xl font-black text-emerald-300">{money(summary.earned)}</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">Electricity · payroll</div>
            <div className="text-2xl font-black text-sky-300">
              {money(summary.electricToday)} <span className="text-base text-pink-300">· {money(summary.payroll)}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">Customers served</div>
            <div className="text-2xl font-black">
              {summary.served} {summary.staffServed > 0 && <span className="text-base text-slate-400">· {summary.staffServed} by staff</span>}
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">Walked out / went elsewhere</div>
            <div className="text-2xl font-black">
              <span className={summary.lost ? "text-rose-300" : ""}>{summary.lost}</span> <span className="text-slate-500">/</span> <span className="text-slate-300">{summary.stolen}</span>
            </div>
          </div>
        </div>
        {summary.bill && (
          <div className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-900/30 p-4 text-sm">
            <div className="font-black">🧾 Monthly bills paid</div>
            <div className="text-slate-200">
              Rent {money(summary.bill.rent)} + electricity {money(summary.bill.electric)} = <b>{money(summary.bill.total)}</b>
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/5 p-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Reputation · level {summary.level} · {summary.reviews} new reviews</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black">{summary.rating.toFixed(1)}</span>
              <Stars rating={summary.rating} />
            </div>
          </div>
          <div className="text-right text-sm font-bold">
            <div className="text-emerald-300">+{summary.repGained} rep</div>
            {summary.repLost > 0 && <div className="text-rose-300">−{summary.repLost} rep</div>}
            {delta !== 0 && <div className={`text-xs ${delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}★</div>}
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-sky-900/30 p-4 text-sm">
          📺 Tomorrow: <b>{fc.icon} {fc.name}</b> <span className="text-slate-400">{fc.kr}</span>
          {boxes > 0 && <div className="mt-1 text-amber-300">📦 {boxes} box{boxes > 1 ? "es" : ""} still waiting in the alley.</div>}
          {summary.nextSeason && (
            <div className="mt-1 font-bold text-amber-300">
              {SEASON_INFO[summary.nextSeason].icon} {SEASON_INFO[summary.nextSeason].name} begins tomorrow!
            </div>
          )}
        </div>
        <button onClick={go} className="mt-6 w-full rounded-2xl bg-amber-400 px-6 py-3 text-lg font-black text-slate-900 transition hover:bg-amber-300">
          {summary.nextSeason ? `On to ${SEASON_INFO[summary.nextSeason].name} →` : `Start ${formatDate(summary.day + 1)} →`}
        </button>
      </div>
    </div>
  );
}

export function SeasonScreen() {
  const day = useGame((s) => s.day);
  const nextDay = useGame((s) => s.nextDay);
  const placed = useGame((s) => s.placed);
  const installations = useGame((s) => s.installations);
  const season = nextSeasonOf(getSeason(day));
  const info = SEASON_INFO[season];
  const hasCool = placed.some((p) => (ITEMS[p.item].cool ?? 0) > 0);
  const hasHeat = placed.some((p) => (ITEMS[p.item].heat ?? 0) > 0) || installations.floorHeat;
  const warning = season === "summer" && !hasCool ? "You have no cooling. Buy fans or an air conditioner at Hongdae Hardware before customers start melting." : season === "winter" && !hasHeat ? "You have no heating. Buy heaters at Hongdae Hardware (or ondol from CaféOS) — nobody sits in a freezing café." : null;
  const bg = { spring: "from-pink-900/80 to-slate-950/90", summer: "from-sky-800/80 to-slate-950/90", autumn: "from-orange-900/80 to-slate-950/90", winter: "from-slate-700/80 to-slate-950/90" }[season];
  return (
    <div className={`pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bg} p-6 backdrop-blur-sm`}>
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center text-white shadow-2xl">
        <div className="text-7xl">{info.icon}</div>
        <div className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-slate-400">A new season</div>
        <h2 className="text-4xl font-black">
          {info.name} <span className="text-slate-400">{info.kr}</span>
        </h2>
        <p className="mt-3 text-slate-300">{info.blurb}</p>
        <ul className="mt-4 space-y-1 text-left text-sm text-slate-300">
          {info.tips.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
        {warning && <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-900/40 p-3 text-sm font-semibold text-rose-200">⚠️ {warning}</div>}
        <button onClick={nextDay} className="mt-6 w-full rounded-2xl bg-amber-400 px-6 py-3 text-lg font-black text-slate-900 transition hover:bg-amber-300">
          Begin {info.name} 1 →
        </button>
      </div>
    </div>
  );
}
