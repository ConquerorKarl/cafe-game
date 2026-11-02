import * as THREE from "three";
import { INGREDIENTS, ITEMS, PRODUCTS, WARMER_CAP, botchChance, canMake, roleForStation, skillForStation, warmerCount } from "./constants";
import { pick } from "./names";
import { PASS, POINTS, cashierSpot, counterBackYaw, getCounter, getSeats, pickupSpot, routeFromAlley, routeStaff, routeToAlley, v3, workSpot, type Installed } from "./layout";
import { groundAt } from "./registry";
import { useGame } from "./store";
import type { Customer, IngredientId, PlacedItem, Staff, StaffNpc, StationKind, StorageKind, Ticket } from "./types";

const tmp = new THREE.Vector3();
let adhocId = 500000;
let warnTimer = 0;
let warnedDay = -1;
const warned = new Set<string>();

function lerpAngle(a: number, b: number, t: number): number {
  const d = ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return a + d * Math.min(1, t);
}

function moveToward(n: StaffNpc, target: THREE.Vector3, dt: number): boolean {
  tmp.subVectors(target, n.pos);
  tmp.y = 0;
  const dist = tmp.length();
  const step = n.speed * dt;
  if (dist <= step || dist < 0.02) {
    n.pos.x = target.x;
    n.pos.z = target.z;
    n.moving = false;
    return true;
  }
  tmp.multiplyScalar(step / dist);
  n.pos.x += tmp.x;
  n.pos.z += tmp.z;
  n.yaw = lerpAngle(n.yaw, Math.atan2(tmp.x, tmp.z), dt * 10);
  n.moving = true;
  n.walkPhase += dt * 9 * (n.speed / 1.7);
  return false;
}

function followPath(n: StaffNpc, dt: number): boolean {
  while (n.path.length) {
    if (moveToward(n, n.path[0], dt)) {
      n.path.shift();
      continue;
    }
    return false;
  }
  n.moving = false;
  return true;
}

const say = (n: StaffNpc, text: string, t = 2) => {
  n.say = text;
  n.sayTimer = t;
};

function goTo(n: StaffNpc, target: THREE.Vector3, inst: Installed, state: StaffNpc["state"]) {
  n.path = routeStaff(n.pos, target, inst);
  n.state = state;
}

function faceToward(n: StaffNpc, x: number, z: number, dt: number) {
  n.yaw = lerpAngle(n.yaw, Math.atan2(x - n.pos.x, z - n.pos.z), dt * 8);
}

const stationsOfKind = (placed: PlacedItem[], kinds: StationKind[]) => placed.filter((p) => kinds.includes(ITEMS[p.item].station as StationKind));
const kindsForRole = (role: Staff["role"]): StationKind[] =>
  role === "barista" ? ["machine", "bingsu", "blender", "toastie"] :
  role === "cook" ? ["range"] :
  role === "baker" ? ["oven"] :
  role === "headChef" ? ["oven", "range"] :
  role === "waiter" || role === "office" ? ["toastie"] : [];

/** Someone whose job is to hand things over at the counter / tables. */
function deliverersOnDuty(staff: Staff[], npcs: StaffNpc[]) {
  const on = (role: string) => staff.some((s) => s.role === role && npcs.some((n) => n.id === s.id));
  return { cashier: on("cashier"), waiter: on("waiter") };
}

export function staffTick(dt: number) {
  const s = useGame.getState();
  const npcs = s.staffNpcs;
  if (!npcs.length) return;
  warnUnstaffed(dt);
  const inst = s.installations;
  const counter = getCounter(s.placed);
  const { cashier: hasCashier, waiter: hasWaiter } = deliverersOnDuty(s.staff, npcs);
  const claimedStations = new Set(npcs.filter((n) => n.targetUid !== null && (n.state === "toStation" || n.state === "working")).map((n) => n.targetUid));

  for (const n of npcs) {
    const member = s.staff.find((x) => x.id === n.id);
    if (!member || !member.role) continue;
    const role = member.role;
    n.timer -= dt;
    if (n.sayTimer > 0) n.sayTimer -= dt;
    const ticket = n.ticketId !== null ? s.tickets.find((t) => t.id === n.ticketId) ?? null : null;
    if (n.ticketId !== null && !ticket) {
      // ticket vanished (customer left / served by the player)
      n.ticketId = null;
      n.carrying = null;
      n.targetUid = null;
      n.state = "idle";
      n.path = [];
    }

    switch (n.state) {
      // ------------------------------------------------------------------ idle
      case "idle": {
        if (n.timer > 0) break;
        n.timer = 0.3 + Math.random() * 0.3;
        if (role === "cashier") cashierThink(n, member, counter, inst, s.customers, s.tickets, npcs);
        else if (role === "waiter") { if (!waiterThink(n, member, counter, inst, s.customers, s.tickets, npcs, hasCashier)) dishDuty(n, member, inst); }
        else if (role === "office") { if (!officeThink(n, member, inst)) dishDuty(n, member, inst); }
        else makerThink(n, member, counter, inst, s.customers, s.tickets, claimedStations);
        break;
      }
      // ------------------------------------------------------------- dishes
      case "toDishes": {
        if (followPath(n, dt)) {
          if (n.targetUid !== null && s.dirtyPiles.some((p) => p.id === n.targetUid)) {
            if (s.staffTakePile(n.targetUid, n.id)) {
              const sink = s.placed.find((p) => p.item === "sink" && p.floor === 0);
              if (sink) {
                n.targetUid = sink.uid;
                goTo(n, v3(workSpot(sink)), inst, "toDishesWash");
              } else {
                say(n, "No sink?!", 2.5);
                s.staffDropPile(n.id);
                n.state = "idle";
              }
            }
          } else n.state = "idle";
        }
        break;
      }
      case "toDishesWash": {
        if (followPath(n, dt)) {
          const sink = s.placed.find((p) => p.uid === n.targetUid);
          if (!sink) {
            s.staffDropPile(n.id);
            n.state = "idle";
            break;
          }
          const auto = s.placed.some((p) => ITEMS[p.item].autoWash && p.floor === 0);
          n.state = "washingDishes";
          s.startWash(auto, n.id);
          // keep the npc at the sink while washing
          n.timer = auto ? 1.5 : 5 * (1.5 - member.skills.speed * 0.08);
        }
        break;
      }
      case "washingDishes": {
        // washing state is driven by the sim; when it clears, go idle
        if (!s.washing || s.washing.staffId !== n.id) {
          if (!s.washing) {
            n.state = "idle";
            n.timer = 1;
          }
        }
        break;
      }
      // ------------------------------------------------------------- walking
      case "toSpot":
        if (followPath(n, dt)) n.state = "idle";
        break;
      case "toPos": {
        if (followPath(n, dt)) {
          n.state = "ringingUp";
          n.timer = Math.max(0.8, 3.2 - member.skills.service * 0.22 - member.skills.speed * 0.1);
        }
        break;
      }
      case "ringingUp": {
        const e = s.placed.find((p) => p.uid === n.targetUid);
        const c = s.customers.find((x) => x.id === n.ticketId);
        if (!e || !c || c.paid || c.state !== "ordering") {
          s.releasePos(n.targetUid ?? -1, n.id);
          n.targetUid = null;
          n.ticketId = null;
          n.state = "idle";
          break;
        }
        faceToward(n, e.x, e.z, dt);
        if (n.timer <= 0) {
          const ok = s.ringUpAt(e.uid, c.id, n.id); // operating the machine is just a timer
          s.releasePos(e.uid, n.id);
          n.targetUid = null;
          n.ticketId = null;
          n.state = "idle";
          if (ok) say(n, pick(["Next!", "Paid!", "감사합니다~"]), 1.5);
        }
        break;
      }
      case "wander":
        if (followPath(n, dt)) {
          n.state = "idle";
          n.timer = 1;
        }
        break;
      // ------------------------------------------------------------- making
      case "toStation": {
        if (!ticket) break;
        if (followPath(n, dt)) {
          const station = s.placed.find((p) => p.uid === n.targetUid);
          if (!station) {
            releaseTicket(n, ticket);
            break;
          }
          if (ITEMS[station.item].storage === "warmer") {
            if (!s.takeFromWarmer(ticket.product)) {
              releaseTicket(n, ticket);
              n.timer = 2;
              break;
            }
            n.carrying = ticket.product;
            n.targetUid = null;
            planDelivery(n, ticket, s.customers, counter, inst, hasCashier, hasWaiter);
            break;
          }
          if (ITEMS[station.item].storage === "display") {
            // bakery item: take it straight from the case
            if (!s.staffTakeDisplay(ticket.product)) {
              say(n, `We're out of ${PRODUCTS[ticket.product].name}!`, 2.5);
              releaseTicket(n, ticket);
              n.timer = 3;
              break;
            }
            n.carrying = ticket.product;
            n.targetUid = null;
            planDelivery(n, ticket, s.customers, counter, inst, hasCashier, hasWaiter);
            break;
          }
          const skill = member.skills[skillForStation(ITEMS[station.item].station as StationKind)];
          if (!s.staffStartBrew(station.uid, ticket.product, n.id, skill)) {
            // out of ingredients or busy — give it back and wait a bit
            say(n, canMake(s, PRODUCTS[ticket.product]) ? "It's in use…" : `No ${PRODUCTS[ticket.product].name} ingredients!`, 2.5);
            releaseTicket(n, ticket);
            n.timer = 2.5;
            break;
          }
          s.updateTicket(ticket.id, { status: "making", stationUid: station.uid, staffId: n.id });
          n.state = "working";
          n.timer = 0;
        }
        break;
      }
      case "working": {
        if (!ticket) break;
        const station = s.placed.find((p) => p.uid === n.targetUid);
        if (!station) {
          releaseTicket(n, ticket);
          break;
        }
        faceToward(n, station.x, station.z, dt);
        const st = s.stations[station.uid];
        if (!st || (!st.brewing && !st.ready)) {
          // the player took it, or it never started — retry
          releaseTicket(n, ticket);
          break;
        }
        if (st.ready) {
          if (st.ready !== ticket.product) {
            releaseTicket(n, ticket);
            break;
          }
          const skill = member.skills[skillForStation(ITEMS[station.item].station as StationKind)];
          if (Math.random() < botchChance(skill)) {
            s.staffTakeReady(station.uid);
            say(n, ["Oops… that's not right. Again.", "Ah, I burnt it!", "Wrong milk. Remaking."][Math.floor(Math.random() * 3)], 2.5);
            releaseTicket(n, ticket);
            n.timer = 1.5;
            break;
          }
          const got = s.staffTakeReady(station.uid);
          if (!got) break;
          n.carrying = got;
          n.targetUid = null;
          const isKitchen = role === "cook" || role === "baker" || role === "headChef";
          if (ticket.customerId < 0) {
            // batch cooking: into the warmer
            if (s.putInWarmer(got)) say(n, "Into the warmer.", 1.5);
            n.carrying = null;
            useGame.setState((st) => ({ tickets: st.tickets.filter((t) => t.id !== ticket.id) }));
            n.ticketId = null;
            n.state = "idle";
            break;
          }
          planDelivery(n, ticket, s.customers, counter, inst, hasCashier, hasWaiter, isKitchen);
        }
        break;
      }
      // ----------------------------------------------------------- delivery
      case "toPickup": {
        if (!ticket) break;
        if (followPath(n, dt)) {
          if (n.carrying) {
            // leave it on the pass (kitchen staff) or the counter (baristas) for front-of-house
            const onPass = n.targetUid === -1;
            s.updateTicket(ticket.id, { status: "pickup", staffId: null, stationUid: onPass ? -1 : null });
            n.carrying = null;
            n.ticketId = null;
            n.targetUid = null;
            n.state = "idle";
            if (onPass) say(n, ["Order up!", "나왔습니다~", "Pass!"][Math.floor(Math.random() * 3)], 1.5);
          } else {
            // collecting from the counter
            if (ticket.status !== "pickup") {
              n.ticketId = null;
              n.state = "idle";
              break;
            }
            n.carrying = ticket.product;
            s.updateTicket(ticket.id, { status: "carrying", staffId: n.id });
            const c = s.customers.find((x) => x.id === ticket.customerId);
            if (!c) {
              releaseTicket(n, ticket);
              break;
            }
            goTo(n, customerApproach(c), inst, "toCustomer");
          }
        }
        break;
      }
      case "toCustomer": {
        if (!ticket) break;
        const c = s.customers.find((x) => x.id === ticket.customerId);
        if (!c) {
          n.carrying = null;
          n.ticketId = null;
          n.state = "idle";
          break;
        }
        // customers still walking to their seat: wait at the counter end rather than chasing
        if (c.state === "toSeat") {
          if (!n.path.length) {
            n.moving = false;
            break;
          }
        }
        // re-route if the customer moved far from where we were heading
        const last = n.path[n.path.length - 1];
        if (last && c.state !== "toSeat" && last.distanceTo(customerApproach(c)) > 1.2) n.path = routeStaff(n.pos, customerApproach(c), inst);
        if (followPath(n, dt)) {
          if (c.state === "toSeat") break;
          faceToward(n, c.pos.x, c.pos.z, dt);
          if (n.pos.distanceTo(c.pos) < 1.6) {
            if (s.completeSale(c, { staffId: n.id, service: member.skills.service })) {
              n.carrying = null;
              n.ticketId = null;
              n.state = "idle";
              n.timer = 0.6;
              if (Math.random() < 0.3) say(n, ["Enjoy!", "맛있게 드세요~", "Here you go!"][Math.floor(Math.random() * 3)]);
            }
          } else n.path = routeStaff(n.pos, customerApproach(c), inst);
        }
        break;
      }
      // ------------------------------------------------------------- office
      case "toAlley": {
        if (followPath(n, dt)) {
          const box = s.boxes.find((b) => b.kind === "mart");
          if (!box) {
            n.path = routeFromAlley(v3(POINTS.staffIdle[2]));
            n.state = "toSpot";
            break;
          }
          n.box = { ...(box.contents ?? {}) };
          useGame.setState((st) => ({ boxes: st.boxes.filter((b) => b.uid !== box.uid) }));
          say(n, "Got it.", 1.5);
          const target = storageFor(n.box, s.placed);
          if (!target) {
            n.box = null;
            say(n, "Nowhere to put this!", 2.5);
            n.path = routeFromAlley(v3(POINTS.staffIdle[2]));
            n.state = "toSpot";
            break;
          }
          n.targetUid = target.uid;
          n.path = routeFromAlley(v3(workSpot(target)));
          n.state = "toStorage";
        }
        break;
      }
      case "toStorage": {
        if (followPath(n, dt)) {
          const target = s.placed.find((p) => p.uid === n.targetUid);
          if (!target || !n.box) {
            n.box = null;
            n.state = "idle";
            break;
          }
          const kind = ITEMS[target.item].storage as StorageKind;
          const before = Object.keys(n.box).length;
          n.box = s.staffUnpack(n.box, kind);
          const remaining = Object.keys(n.box).length;
          if (!remaining) {
            n.box = null;
            n.targetUid = null;
            n.state = "idle";
            n.timer = 0.5;
            say(n, "Stocked up.", 1.5);
            break;
          }
          const next = storageFor(n.box, s.placed, target.uid);
          if (!next || (next.uid === target.uid && remaining === before)) {
            say(n, "The storage is full!", 2.5);
            // leave the rest as a box next to the storage
            useGame.setState((st) => ({ boxes: [...st.boxes, { uid: adhocId++, kind: "mart", contents: n.box ?? {}, x: n.pos.x + 0.5, z: n.pos.z, floor: 0 }] }));
            n.box = null;
            n.targetUid = null;
            n.state = "idle";
            break;
          }
          n.targetUid = next.uid;
          n.path = routeStaff(n.pos, v3(workSpot(next)), inst);
        }
        break;
      }
    }
    // keep feet on floors and stairs
    const g = groundAt(n.pos.x, n.pos.z, n.pos.y);
    n.pos.y += (g - n.pos.y) * Math.min(1, dt * 12);
  }
}

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------
function releaseTicket(n: StaffNpc, t: Ticket) {
  useGame.getState().updateTicket(t.id, { status: "pending", staffId: null, stationUid: null });
  n.ticketId = null;
  n.targetUid = null;
  n.carrying = null;
  n.state = "idle";
  n.path = [];
}

function customerApproach(c: Customer): THREE.Vector3 {
  // stand just in front of the customer (toward where they face), at their floor height
  const dx = Math.sin(c.yaw);
  const dz = Math.cos(c.yaw);
  return new THREE.Vector3(c.pos.x + dx * 0.9, c.pos.y, c.pos.z + dz * 0.9);
}

function planDelivery(n: StaffNpc, ticket: Ticket, customers: Customer[], counter: PlacedItem | null, inst: Installed, hasCashier: boolean, hasWaiter: boolean, kitchenRole = false) {
  const s = useGame.getState();
  const c = customers.find((x) => x.id === ticket.customerId);
  if (!c) {
    n.carrying = null;
    n.ticketId = null;
    n.state = "idle";
    return;
  }
  const seated = !!c.seat;
  const someoneElse = seated ? hasWaiter : hasCashier || hasWaiter;
  if (kitchenRole && s.installations.kitchen) {
    // kitchen staff never leave the kitchen: food goes on the pass under the window
    s.updateTicket(ticket.id, { status: "carrying", staffId: n.id });
    n.path = routeStaff(n.pos, v3(PASS.kitchenSide), inst);
    n.state = "toPickup";
    n.targetUid = -1;
    return;
  }
  if (someoneElse && counter) {
    const spot = pickupSpot(counter).staff;
    s.updateTicket(ticket.id, { status: "carrying", staffId: n.id });
    goTo(n, new THREE.Vector3(spot[0], 0, spot[1]), inst, "toPickup");
  } else {
    s.updateTicket(ticket.id, { status: "carrying", staffId: n.id });
    goTo(n, customerApproach(c), inst, "toCustomer");
  }
}

function cashierThink(n: StaffNpc, _member: Staff, counter: PlacedItem | null, inst: Installed, customers: Customer[], tickets: Ticket[], npcs: StaffNpc[]): void {
  void _member;
  const s = useGame.getState();
  if (!counter) return;
  const eftposes = s.placed.filter((p) => (p.item === "eftpos" || p.item === "kiosk") && p.floor === 0);
  const kiosks = s.placed.filter((p) => p.item === "kiosk" && p.floor === 0);
  const cashiers = npcs.filter((o) => s.staff.find((x) => x.id === o.id)?.role === "cashier");
  const mySlot = Math.max(0, cashiers.findIndex((o) => o.id === n.id));
  void 0;

  // 1) hand over anything waiting on the counter / pass for a counter-waiting customer
  const pickup = tickets.find((t) => t.status === "pickup" && !npcs.some((o) => o.ticketId === t.id) && customers.some((c) => c.id === t.customerId && !c.seat));
  if (pickup) {
    n.ticketId = pickup.id;
    const ps = pickup.stationUid === -1 ? [PASS.frontSide[0], PASS.frontSide[2]] : pickupSpot(counter).staff;
    goTo(n, new THREE.Vector3(ps[0], 0, ps[1]), inst, "toPickup");
    return;
  }
  if (claimWarmerTicket(n, inst, tickets, npcs)) return;
  if (claimDisplayTicket(n, inst, tickets, npcs)) return;

  // 2) ring up an unpaid customer at a free EFTPOS (kiosks ring themselves up, so cashiers only use real terminals)
  if (eftposes.length - kiosks.length > 0 && kiosks.length === 0 || eftposes.some((e) => e.item === "eftpos")) {
    const terminals = eftposes.filter((e) => e.item === "eftpos");
    if (terminals.length) {
      const unpaid = customers
        .filter((c) => c.state === "ordering" && !c.paid && c.order)
        .sort((a, b) => a.queueIndex - b.queueIndex);
      const mine = unpaid.filter((c) => terminals.length === 1 || c.queueIndex % terminals.length === mySlot % terminals.length);
      const targetC = (mine[0] ?? unpaid[0]);
      if (targetC) {
        const freeE = terminals.find((e) => !s.posBusy[e.uid] && !npcs.some((o) => o.targetUid === e.uid && (o.state === "toPos" || o.state === "ringingUp")));
        if (freeE) {
          if (n.state === "ringingUp" && n.targetUid === freeE.uid) return; // already working it
          if (s.claimPos(freeE.uid, n.id)) {
            n.targetUid = freeE.uid;
            n.ticketId = targetC.id;
            goTo(n, v3(workSpot(freeE)), inst, "toPos");
            n.timer = 0.4;
          }
        }
        return;
      }
    }
  }

  // 3) nothing to ring up: stand at the till, facing the queue
  const spot = cashierSpot(counter, mySlot);
  if (Math.hypot(n.pos.x - spot[0], n.pos.z - spot[1]) > 0.7 || Math.abs(n.pos.y) > 0.3) goTo(n, new THREE.Vector3(spot[0], 0, spot[1]), inst, "toSpot");
  else n.yaw = lerpAngle(n.yaw, counterBackYaw(counter), 0.2);
}

function waiterThink(n: StaffNpc, member: Staff, counter: PlacedItem | null, inst: Installed, customers: Customer[], tickets: Ticket[], npcs: StaffNpc[], hasCashier: boolean): boolean {
  void member;
  // deliver anything on the counter for a seated customer (or anyone, if there's no cashier)
  const pickup = tickets.find((t) => t.status === "pickup" && !npcs.some((o) => o.ticketId === t.id) && customers.some((c) => c.id === t.customerId && (c.seat || !hasCashier)));
  if (pickup && counter) {
    n.ticketId = pickup.id;
    const ps = pickup.stationUid === -1 ? [PASS.frontSide[0], PASS.frontSide[2]] : pickupSpot(counter).staff;
    goTo(n, new THREE.Vector3(ps[0], 0, ps[1]), inst, "toPickup");
    return true;
  }
  if (claimWarmerTicket(n, inst, tickets, npcs)) return true;
  // no cashier? the waiter also fetches bakery items
  if (!hasCashier && claimDisplayTicket(n, inst, tickets, npcs)) return true;
  // otherwise drift between tables (clearing), staying near the counter end
  n.wanderTimer -= 0.5;
  if (n.wanderTimer <= 0) {
    n.wanderTimer = 6 + Math.random() * 8;
    const seats = getSeats(useGame.getState().placed, inst).filter((st) => st.floor === 0);
    const home = counter ? pickupSpot(counter).staff : [0, 0];
    const target = seats.length && Math.random() < 0.5 ? seats[Math.floor(Math.random() * seats.length)].pos : [home[0] + (Math.random() - 0.5) * 2, 0, home[1] + 1.5 + Math.random()];
    goTo(n, new THREE.Vector3(target[0], 0, target[2]), inst, "wander");
  }
  return false;
}

function makerThink(n: StaffNpc, member: Staff, counter: PlacedItem | null, inst: Installed, customers: Customer[], tickets: Ticket[], claimed: Set<number | null>) {
  const s = useGame.getState();
  const kinds = kindsForRole(member.role);
  const stations = stationsOfKind(s.placed, kinds).filter((p) => !claimed.has(p.uid) && !(s.stations[p.uid]?.brewing || s.stations[p.uid]?.ready));
  if (!stations.length) {
    // nothing to work at: kitchen staff wait in the kitchen, baristas by the counter
    const kitchenRole = member.role === "cook" || member.role === "baker" || member.role === "headChef";
    const home = kitchenRole && s.installations.kitchen ? v3([3.8, 0, -8.6]) : v3(POINTS.staffIdle[0]);
    if (Math.hypot(n.pos.x - home.x, n.pos.z - home.z) > 1.0) goTo(n, home, inst, "toSpot");
    if (n.wanderTimer <= 0) {
      n.wanderTimer = 40;
      const need = member.role === "baker" ? "an oven" : member.role === "cook" ? "a range" : member.role === "headChef" ? "an oven or range" : "an espresso machine";
      say(n, `I need ${need} to work with…`, 3);
      if (!stationsOfKind(s.placed, kinds).length) s.notify(`${member.name} (${member.role}) has nothing to work at — buy ${need} at the appliance store${kitchenRole ? " and place it in the kitchen" : ""}.`, "warn");
    } else n.wanderTimer -= 0.5;
    return;
  }
  // a) open tickets for our station kinds
  const pending = tickets.filter((t) => t.status === "pending" && kinds.includes(PRODUCTS[t.product].station as StationKind) && canMake(s, PRODUCTS[t.product])).sort((a, b) => a.created - b.created);
  let ticket = pending[0] ?? null;
  // b) no ticket system running (no cashier)? pre-make the front customer's drink
  if (!ticket) {
    const front = customers.find((c) => c.state === "ordering" && !c.awaiting && c.order && kinds.includes(PRODUCTS[c.order].station as StationKind) && !tickets.some((t) => t.customerId === c.id));
    if (front && front.order && canMake(s, PRODUCTS[front.order])) {
      const t: Ticket = { id: -1, customerId: front.id, product: front.order, status: "pending", stationUid: null, staffId: null, created: s.clock };
      // create a real ticket without moving the customer (they stay at the counter until handed the item)
      const id = adhocId++;
      useGame.setState((st) => ({ tickets: [...st.tickets, { ...t, id }] }));
      ticket = { ...t, id };
      front.awaiting = true;
    }
  }
  // c) kitchen staff with nothing to do: batch-cook popular items into the warmer
  if (!ticket && (member.role === "cook" || member.role === "baker" || member.role === "headChef") && s.placed.some((p) => p.item === "warmer") && warmerCount(s.warmer) < WARMER_CAP - 2) {
    const menu = s.placed.length ? kinds.flatMap((k) => PRODUCTS && Object.values(PRODUCTS).filter((p) => p.station === k && canMake(s, p))) : [];
    const underStocked = menu.filter((p) => (s.warmer[p.id] ?? 0) < 3);
    if (underStocked.length) {
      const p = underStocked[Math.floor(Math.random() * underStocked.length)];
      const id = adhocId++;
      useGame.setState((st) => ({ tickets: [...st.tickets, { id, customerId: -1, product: p.id, status: "pending", stationUid: null, staffId: null, created: s.clock }] }));
      ticket = s.tickets.find((t) => t.id === id) ?? { id, customerId: -1, product: p.id, status: "pending", stationUid: null, staffId: null, created: s.clock };
    }
  }
  if (!ticket) {
    // idle at the nearest station
    const st = stations[0];
    const ws = workSpot(st);
    if (Math.hypot(n.pos.x - ws[0], n.pos.z - ws[2]) > 0.8) goTo(n, v3(ws), inst, "toSpot");
    else faceToward(n, st.x, st.z, 1);
    return;
  }
  // pick the nearest free station that can make it
  const kind = PRODUCTS[ticket.product].station as StationKind;
  const d2 = (p: PlacedItem) => (p.x - n.pos.x) ** 2 + (p.z - n.pos.z) ** 2 + (Math.abs(p.floor * 3.6 - n.pos.y) > 1 ? 400 : 0);
  const usable = stations.filter((p) => ITEMS[p.item].station === kind && roleForStation(kind).includes(member.role!)).sort((a, b) => d2(a) - d2(b));
  const station = usable[0];
  if (!station) return;
  n.ticketId = ticket.id;
  n.targetUid = station.uid;
  claimed.add(station.uid);
  s.updateTicket(ticket.id, { status: "making", staffId: n.id, stationUid: station.uid });
  goTo(n, v3(workSpot(station)), inst, "toStation");
  void counter;
}

function claimDisplayTicket(n: StaffNpc, inst: Installed, tickets: Ticket[], npcs: StaffNpc[]): boolean {
  const s = useGame.getState();
  const display = s.placed.find((p) => ITEMS[p.item].storage === "display");
  if (!display) return false;
  const t = tickets.filter((x) => x.status === "pending" && PRODUCTS[x.product].station === "display" && canMake(s, PRODUCTS[x.product]) && !npcs.some((o) => o.ticketId === x.id)).sort((a, b) => a.created - b.created)[0];
  if (!t) return false;
  n.ticketId = t.id;
  n.targetUid = display.uid;
  s.updateTicket(t.id, { status: "making", staffId: n.id, stationUid: display.uid });
  goTo(n, v3(workSpot(display)), inst, "toStation");
  return true;
}

function claimWarmerTicket(n: StaffNpc, inst: Installed, tickets: Ticket[], npcs: StaffNpc[]): boolean {
  const s = useGame.getState();
  const warmer = s.placed.find((p) => p.item === "warmer");
  if (!warmer) return false;
  const t = tickets.filter((x) => x.status === "pending" && x.customerId > 0 && (s.warmer[x.product] ?? 0) > 0 && !npcs.some((o) => o.ticketId === x.id)).sort((a, b) => a.created - b.created)[0];
  if (!t) return false;
  n.ticketId = t.id;
  n.targetUid = warmer.uid;
  s.updateTicket(t.id, { status: "making", staffId: n.id, stationUid: warmer.uid });
  goTo(n, v3(workSpot(warmer)), inst, "toStation");
  return true;
}

/** Once in a while, tell the player about tickets nobody on shift can make. */
function warnUnstaffed(dt: number) {
  const s = useGame.getState();
  if (warnedDay !== s.day) {
    warnedDay = s.day;
    warned.clear();
  }
  warnTimer -= dt;
  if (warnTimer > 0) return;
  warnTimer = 6;
  const onDuty = new Set(s.staff.filter((m) => m.role && s.staffNpcs.some((n) => n.id === m.id)).map((m) => m.role));
  const covered = (st: string) =>
    st === "display" ? onDuty.has("cashier") || onDuty.has("waiter") : st === "machine" || st === "bingsu" ? onDuty.has("barista") : st === "oven" ? onDuty.has("baker") || onDuty.has("headChef") : onDuty.has("cook") || onDuty.has("headChef");
  for (const t of s.tickets) {
    if (t.status !== "pending" || t.customerId < 0 || s.clock - t.created < 12) continue;
    if ((s.warmer[t.product] ?? 0) > 0) continue;
    const st = PRODUCTS[t.product].station;
    if (covered(st) || warned.has(st)) continue;
    warned.add(st);
    const where = st === "display" ? "the display case" : st === "oven" ? "the oven" : st === "range" ? "the range" : st === "bingsu" ? "the bingsu shaver" : "the espresso machine";
    const who = st === "display" ? "a cashier" : st === "oven" ? "a baker" : st === "range" ? "a cook" : "a barista";
    s.notify(`🧾 Open ticket for ${PRODUCTS[t.product].name} but nobody on shift works ${where}. Make it yourself and hand it over, or hire ${who}.`, "warn");
  }
}

/** Waiters and the office worker wash dishes when they have nothing better to do. Returns true if they went off to do it. */
function dishDuty(n: StaffNpc, _member: Staff, inst: Installed): boolean {
  const s = useGame.getState();
  if (s.washing) return false; // one wash at a time
  if (!s.placed.some((p) => p.item === "sink")) return false;
  const pile = s.dirtyPiles.filter((p) => !p.assigned && !useGame.getState().staffNpcs.some((o) => o.targetUid === p.id)).sort((a, b) => (Object.values(a.counts).reduce((x, y) => x + y, 0)) - (Object.values(b.counts).reduce((x, y) => x + y, 0)))[0];
  if (!pile) return false;
  if (s.claimPile(pile.id, n.id)) {
    n.targetUid = pile.id;
    goTo(n, new THREE.Vector3(pile.x, 0, pile.z), inst, "toDishes");
    return true;
  }
  return false;
}

function officeThink(n: StaffNpc, member: Staff, inst: Installed): boolean {
  const s = useGame.getState();
  // 1) boxes of supplies in the alley → fetch
  if (s.boxes.some((b) => b.kind === "mart")) {
    n.path = routeToAlley(n.pos);
    n.state = "toAlley";
    say(n, "Delivery's here.", 1.5);
    return true;
  }
  // 2) low stock → order (not more than once a minute)
  if (n.wanderTimer <= 0) {
    n.wanderTimer = 45;
    if (s.officeOrder(member.skills.organising)) say(n, "Ordered more stock.", 2.5);
  } else n.wanderTimer -= 0.5;
  // 3) idle near the pantry / fridge — but do dishes first if a pile is waiting
  if (s.dirtyPiles.some((p) => !p.assigned) && !s.washing) return dishDuty(n, member, inst);
  const storage = s.placed.find((p) => ITEMS[p.item].storage === "pantry") ?? s.placed.find((p) => ITEMS[p.item].storage === "fridge") ?? s.placed.find((p) => ITEMS[p.item].storage === "freezer");
  const home = storage ? workSpot(storage) : POINTS.staffIdle[2];
  if (Math.hypot(n.pos.x - home[0], n.pos.z - home[2]) > 0.9) goTo(n, v3(home), inst, "toSpot");
  return false;
}

function storageFor(contents: Partial<Record<IngredientId, number>>, placed: PlacedItem[], exceptUid?: number): PlacedItem | null {
  const kinds = new Set<StorageKind>();
  for (const k of Object.keys(contents) as IngredientId[]) kinds.add(INGREDIENTS[k].storage);
  // freezer goods must go to the freezer, everything else to its own kind — the stockist knows the rules
  const order = [...kinds].sort((a, b) => (a === "freezer" ? -1 : b === "freezer" ? 1 : 0));
  for (const kind of order) {
    const p = placed.find((x) => ITEMS[x.item].storage === kind && x.uid !== exceptUid);
    if (p) return p;
  }
  return null;
}
