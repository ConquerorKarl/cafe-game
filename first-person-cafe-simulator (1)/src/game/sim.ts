import * as THREE from "three";
import { DAY_MINUTES, DAY_SECONDS, LAST_ORDER_MINUTES, WEATHERS, isWeekend } from "./calendar";
const OPEN_MIN_FLOOR = 0;
import { BUSKING_EARLIEST, LUNCH_END, LUNCH_START, SCHOOL_END, SCHOOL_START, upcomingRush } from "./reputation";
import { PRODUCTS, getMarket, requiredIngredients } from "./constants";
import { counterFacingYaw, getCounter, getSeats, queueSlot } from "./layout";
import { pick } from "./names";
import { groundAt, simState } from "./registry";
import { sfx } from "./sfx";
import { staffTick } from "./staff";
import { pathToCompetitor, useGame } from "./store";
import type { WashingState } from "./types";
import { warmerCount } from "./constants";
import type { Customer } from "./types";

const tmp = new THREE.Vector3();
const slotV = new THREE.Vector3();
let waveTimer = 0;
let buskRollTimer = 0;
let kioskTimer = 0;
/** Exact remaining brew time per station — the store copy is only refreshed a few times a second. */
const brewLeft = new Map<number, number>();
let syncTimer = 0;

function lerpAngle(a: number, b: number, t: number): number {
  const d = ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return a + d * Math.min(1, t);
}

/** Moves the customer toward target (xz); returns true when arrived. */
function moveToward(c: Customer, target: THREE.Vector3, dt: number): boolean {
  tmp.subVectors(target, c.pos);
  tmp.y = 0;
  const dist = tmp.length();
  const step = c.speed * dt;
  if (dist <= step || dist < 0.02) {
    c.pos.x = target.x;
    c.pos.z = target.z;
    c.moving = false;
    return true;
  }
  tmp.multiplyScalar(step / dist);
  c.pos.x += tmp.x;
  c.pos.z += tmp.z;
  c.yaw = lerpAngle(c.yaw, Math.atan2(tmp.x, tmp.z), dt * 10);
  c.moving = true;
  c.walkPhase += dt * 9 * (c.speed / 1.7);
  return false;
}

function followPath(c: Customer, dt: number): boolean {
  while (c.path.length) {
    if (moveToward(c, c.path[0], dt)) {
      c.path.shift();
      continue;
    }
    return false;
  }
  c.moving = false;
  return true;
}

export function tick(dt: number) {
  const s = useGame.getState();
  if (s.phase !== "playing" || s.modal !== "none" || !s.locked || s.pause !== "none") return;

  // --- clock -------------------------------------------------------------
  simState.clock += dt * (DAY_MINUTES / DAY_SECONDS);
  if (simState.clock >= DAY_MINUTES) {
    s.endDay(false);
    return;
  }
  const minute = Math.floor(simState.clock);
  const newMinute = minute !== s.clock;
  if (newMinute) s.setClock(minute);

  // --- self-order kiosks ring up customers without staff -----------------
  {
    const kiosks = s.placed.filter((p) => p.item === "kiosk" && p.floor === 0);
    if (kiosks.length) {
      kioskTimer -= dt;
      if (kioskTimer <= 0) {
        kioskTimer = Math.max(0.8, 2.2 / kiosks.length);
        const front = s.customers.filter((c) => c.state === "ordering" && !c.paid && c.order).sort((a, b) => a.queueIndex - b.queueIndex)[0];
        if (front) s.ringUpAt(kiosks[0].uid, front.id, null);
      }
    }
  }

  // --- scripted street life: rush warnings, waves, celebrity, busking -----
  const weekend = isWeekend(s.day);
  const rush = upcomingRush(s.day, s.clock);
  if (rush && !s.rushWarned[rush.kind]) {
    useGame.setState({ rushWarned: { ...s.rushWarned, [rush.kind]: true } });
    s.notify(rush.kind === "lunch" ? `🏢 Lunch rush in ${rush.inMinutes} min — the office tower empties onto the street at noon. Pre-brew, stock the warmer, man the counter.` : `🎒 School's out in ${rush.inMinutes} min — students pour out of Exit 9 at 16:00 wanting sweets, bingsu and iced drinks.`, "warn");
  }
  if (!weekend && s.day > 1) {
    const inLunch = s.clock >= LUNCH_START && s.clock < LUNCH_END;
    const inSchool = s.clock >= SCHOOL_START && s.clock < SCHOOL_END;
    if (inLunch && !s.events.some((e) => e.kind === "lunchRush")) s.pushEvent({ kind: "lunchRush", label: "🏢 Office lunch rush", until: LUNCH_END });
    if (inSchool && !s.events.some((e) => e.kind === "schoolOut")) s.pushEvent({ kind: "schoolOut", label: "🎒 School's out", until: SCHOOL_END });
    if (inLunch || inSchool) {
      waveTimer -= dt;
      if (waveTimer <= 0) {
        waveTimer = 9 + Math.random() * 8;
        s.spawnCrowdCustomers(inLunch ? "office" : "student");
      }
    }
  }
  if (s.vipToday && s.vipSpawnAt >= 0 && s.clock >= s.vipSpawnAt) s.spawnVip();
  if (s.buskingAt === null && s.day > 1 && s.clock >= BUSKING_EARLIEST && s.clock < LAST_ORDER_MINUTES) {
    buskRollTimer -= dt;
    if (buskRollTimer <= 0) {
      buskRollTimer = 20;
      if (Math.random() < (weekend ? 0.16 : 0.09)) s.startBusking();
    }
  }
  // buzz fades: a sighting cools off over ~60 game-minutes
  if (s.buzz > 0 && newMinute) s.setBuzz(Math.max(0, s.buzz - 0.014));
  if (s.events.length && s.events.some((e) => e.until <= s.clock)) useGame.setState({ events: s.events.filter((e) => e.until > s.clock) });

  // --- street traffic & competitor split --------------------------------
  if (simState.clock < LAST_ORDER_MINUTES && simState.clock >= OPEN_MIN_FLOOR) {
    simState.spawnTimer += dt;
    // day 1 guarantee: a few customers at least every 20 in-game minutes, whatever the market says
    // day 1 guarantee: a few customers at least every 20 in-game minutes while open
    const minGapHit = s.day === 1 && simState.clock - simState.lastSpawnClock > 20 && simState.clock < LAST_ORDER_MINUTES;
    if (simState.spawnTimer >= simState.nextSpawn || minGapHit) {
      simState.spawnTimer = 0;
      simState.lastSpawnClock = simState.clock;
      const m = getMarket(s);
      const traffic = Math.max(2, m.traffic);
      simState.nextSpawn = Math.min((60 / traffic) * (0.6 + Math.random() * 0.8), 25);
      if (Math.random() < m.share || minGapHit) s.spawnParty(minGapHit);
      else s.stolenCustomer();
    }
  }
  simState.stolenToastTimer += dt;
  if (simState.stolenToastTimer > 80) {
    simState.stolenToastTimer = 0;
    const m = getMarket(s);
    if (m.share < 0.3 && s.stats.stolenToday > 5) {
      const top = [...m.competitors].sort((a, b) => b.share - a.share)[0];
      s.notify(`👀 Most people on the street are heading to ${top.name} (${Math.round(top.share * 100)}% share). You have ${Math.round(m.share * 100)}%.`);
    }
  }

  // --- stations ----------------------------------------------------------
  syncTimer += dt;
  const sync = syncTimer >= 0.15;
  if (sync) syncTimer = 0;
  for (const [uidStr, st] of Object.entries(s.stations)) {
    const uid = Number(uidStr);
    if (!st.brewing) {
      brewLeft.delete(uid);
      continue;
    }
    // prep phase first (rolling dough / chopping) — machines already skipped it at start
    if (st.prepLeft && st.prepLeft > 0) {
      const pl = (brewLeft.get(uid) ?? st.prepLeft) - dt;
      brewLeft.set(uid, pl);
      if (pl <= 0) {
        brewLeft.delete(uid);
        s.setStation(uid, { ...st, prepLeft: 0 });
        if (st.batch && st.batch > 1) {
          const p0 = PRODUCTS[st.brewing];
          s.notify(`🥖 Batch of ${st.batch}× ${p0.name} going into the oven…`);
        }
      } else if (sync) s.setStation(uid, { ...st, prepLeft: pl });
      continue;
    }
    const left = (brewLeft.has(uid) ? brewLeft.get(uid)! : st.timeLeft) - dt;
    brewLeft.set(uid, left);
    if (left <= 0) {
      brewLeft.delete(uid);
      const batch = st.batch ?? 1;
      // consume ingredients for the finished batch
      const prod0 = PRODUCTS[st.brewing];
      const inv = { ...useGame.getState().inventory };
      for (const [ing, qty] of requiredIngredients(prod0, useGame.getState().placed)) inv[ing] = (inv[ing] ?? 0) - qty * batch;
      useGame.setState({ inventory: inv });
      s.setStation(uid, { brewing: null, timeLeft: 0, total: 0, ready: st.brewing, batch, readyCount: batch });
      sfx.ready();
      const p = PRODUCTS[st.brewing];
      s.notify(batch > 1 ? `🔥 ${batch}× ${p.name} baked! Grab them from the oven (or the warmer).` : `${p.icon} ${p.name} is ready — pick it up from the machine.`);
      if (batch > 1) {
        useGame.setState((x) => ({ stats: { ...x.stats, batches: x.stats.batches + 1 } }));
        void 0;
        // kitchen staff drop extras into the warmer automatically
        const warmer = s.placed.find((q) => q.item === "warmer");
        if (warmer) {
          let n = batch;
          while (n > 0 && warmerCount(useGame.getState().warmer) < 24) {
            if (useGame.getState().putInWarmer(st.brewing)) n--;
            else break;
          }
        }
      }
    } else if (sync) s.setStation(uid, { ...st, timeLeft: left });
  }

  // --- washing minigame timer (player scrubs with Space; staff just wait) ---
  if (s.washing) {
    const w = s.washing;
    if (w.source === "staff") {
      const left = (w as WashingState & { left?: number }).left ?? 5;
      const nl = left - dt;
      (w as WashingState & { left?: number }).left = nl;
      if (nl <= 0) {
        useGame.getState().staffDropPile(w.staffId!);
        useGame.getState().finishWash();
      } else if (sync) useGame.setState({ washing: { ...w } });
    } else {
      w.marker += w.dir * dt * 0.9;
      if (w.marker >= 1) {
        w.marker = 1;
        w.dir = -1;
      } else if (w.marker <= 0) {
        w.marker = 0;
        w.dir = 1;
      }
      if (sync) useGame.setState({ washing: { ...w } });
    }
  }

  // --- staff ---------------------------------------------------------------
  staffTick(dt);

  // --- customers ---------------------------------------------------------
  const wd = WEATHERS[s.weather];
  const counter = getCounter(s.placed);
  const faceYaw = counter ? counterFacingYaw(counter) : Math.PI;
  let structural = false;
  for (const c of [...s.customers]) {
    c.stateTime += dt;
    if (c.sayTimer > 0) c.sayTimer -= dt;
    switch (c.state) {
      case "entering":
        if (followPath(c, dt)) {
          if (!counter) {
            s.customerLeaves(c, "noCounter");
            break;
          }
          if (!c.order) c.order = s.chooseOrder(c.kid);
          if (!c.order || !s.revalidateOrder(c)) {
            s.customerLeaves(c, "noMenu");
            break;
          }
          c.state = "queueing";
          c.stateTime = 0;
          if (!c.say && Math.random() < 0.5) {
            c.say = pick(wd.lines);
            c.sayTimer = 3;
          } else if (c.say) c.sayTimer = 3;
          structural = true;
        }
        break;

      case "queueing": {
        if (!counter) {
          s.customerLeaves(c, "noCounter");
          break;
        }
        // delivery riders don't queue at the POS — they pay on pickup
        if (c.rider && !c.paid) {
          s.ringUpAt(-1, c.id, null);
          break;
        }
        const slot = queueSlot(counter, c.queueIndex);
        slotV.set(slot[0], 0, slot[1]);
        const arrived = moveToward(c, slotV, dt);
        c.patience -= dt;
        c.waited += dt;
        if (arrived) {
          c.yaw = lerpAngle(c.yaw, faceYaw, dt * 8);
          if (c.queueIndex === 0) {
            if (!s.revalidateOrder(c)) {
              s.customerLeaves(c, "noMenu");
              break;
            }
            c.state = "ordering";
            c.stateTime = 0;
            structural = true;
            // delivery riders pay on pickup — no EFTPOS needed
            if (c.rider && !c.paid) s.ringUpAt(-1, c.id, null);
          } else if (c.rider && !c.paid) s.ringUpAt(-1, c.id, null);
        }
        if (c.patience <= 0) s.customerLeaves(c, "impatient");
        break;
      }

      case "ordering":
        if (!counter) {
          s.customerLeaves(c, "noCounter");
          break;
        }
        if (c.rider && !c.paid) s.ringUpAt(-1, c.id, null);
        {
          const slot = queueSlot(counter, 0);
          slotV.set(slot[0], 0, slot[1]);
          moveToward(c, slotV, dt);
        }
        c.patience -= dt * (c.awaiting ? 0.6 : 1);
        c.waited += dt;
        c.yaw = lerpAngle(c.yaw, faceYaw, dt * 8);
        if (c.patience <= 0) s.customerLeaves(c, "impatient");
        break;

      case "waiting": {
        // order taken; standing at the pickup end until someone brings it
        if (followPath(c, dt)) c.yaw = lerpAngle(c.yaw, faceYaw, dt * 6);
        c.patience -= dt * 0.7;
        c.waited += dt;
        if (c.patience <= 0) s.customerLeaves(c, "impatient");
        break;
      }

      case "toSeat":
        if (followPath(c, dt)) {
          c.state = "sitting";
          c.stateTime = 0;
          const seat = getSeats(s.placed, s.installations).find((x) => x.key === c.seat);
          if (seat) c.yaw = seat.yaw;
          else {
            s.customerLeaves(c, "done");
            break;
          }
          structural = true;
        }
        break;

      case "sitting": {
        c.moving = false;
        const seatStillThere = s.placed.some((p) => String(p.uid) === c.seat?.split(":")[0]);
        if (!seatStillThere) {
          s.customerLeaves(c, "done");
          break;
        }
        if (c.awaiting) {
          // seated, waiting for the waiter
          c.patience -= dt * 0.5;
          c.waited += dt;
          if (c.patience <= 0) s.customerLeaves(c, "impatient");
          break;
        }
        c.sitTimer -= dt;
        if (c.sitTimer <= 0) s.finishSitting(c);
        break;
      }

      case "leaving":
        if (followPath(c, dt)) s.removeCustomer(c.id);
        break;

      case "browsing":
        if (followPath(c, dt)) {
          c.yaw = lerpAngle(c.yaw, Math.PI, dt * 6);
          if (c.stateTime > 0.3 && c.sayTimer <= 0 && !c.moving && c.say) c.sayTimer = 2.6;
          if (c.stateTime > 2.4) {
            c.state = "defecting";
            c.stateTime = 0;
            c.path = pathToCompetitor(c.pos, c.target ?? "giga");
            structural = true;
          }
        } else c.stateTime = 0;
        break;

      case "defecting":
        if (followPath(c, dt)) s.removeCustomer(c.id);
        break;
    }
    // vertical position follows stairs / floors
    const g = groundAt(c.pos.x, c.pos.z, c.pos.y);
    c.pos.y += (g - c.pos.y) * Math.min(1, dt * 12);
  }
  if (structural) s.bumpCustomers();
}
