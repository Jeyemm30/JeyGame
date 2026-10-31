// Dev-only end-to-end test (enabled with ?autotest). It plays through the story with direct calls and
// logs results with the AUTOTEST prefix. Open http://localhost:5173/?autotest and read the console.
import { MELEE } from './config.js';
import { profile } from './systems/Profile.js';
import { writeSlot, readSlot, loadGameInto } from './systems/Save.js';
import { STORY } from './story/missions.js';

const log = (...a) => console.log('AUTOTEST', ...a);

export function runAutotest(game) {
  window.addEventListener('error', (e) => log('UNCAUGHT', e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', (e) => log('REJECTION', String(e.reason)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const S = (k) => game.scene.getScene(k);
  const active = (k) => game.scene.isActive(k);

  // click through whatever dialogue is open, always taking the first available reply
  async function dialogue(maxMs = 8000) {
    const t0 = Date.now();
    let steps = 0;
    await wait(250);
    while (active('Dialogue') && Date.now() - t0 < maxMs) {
      const d = S('Dialogue');
      if (!d.node) { await wait(60); continue; }
      if (d.typing) d.finishTyping();
      else if (d.node.choices) d.choose(0);
      else d.advance();
      steps++;
      await wait(70);
    }
    await wait(150);
    return steps;
  }

  const tp = (gs, x, y) => { const p = gs.player; p.setPosition(x, y); p.body.reset(x, y); };

  async function playMission(gs, id) {
    const m = gs.missions;
    if (!m.active) {
      const def = STORY.find((q) => q.id === id);
      if (def.giver) { gs.talkTo(def.giver); await dialogue(); } // giver conversation starts it
      if (!m.active) m.start(id);
    }
    let guard = 0;
    while (m.active && m.id === id && guard++ < 40) {
      const o = m.obj;
      const t = m.target();
      let note = o.type;
      switch (o.type) {
        case 'event': gs.missionEvent(o.name); break;
        case 'goto': tp(gs, m.place(o).x, m.place(o).y); await wait(500); break;
        case 'talk': { const pos = gs.npcPos(o.npc); tp(gs, pos.x, pos.y + 24); await wait(300); gs.talkTo(o.npc); await dialogue(); break; }
        case 'collect': {
          const items = gs.items.filter((s) => s.mission || s.itemId === o.real);
          const it = items[0];
          if (!it) { log('  no item for', id, o.item || o.real); await wait(300); break; }
          tp(gs, it.x, it.y + 6); gs.doInteract({ kind: 'item', ref: it }); await wait(300); break;
        }
        case 'defeat': m.spawned.enemies.forEach((e) => { if (e.active) e.die(true); }); await wait(400); break;
        case 'observe': { const pl = m.place(o); tp(gs, pl.x - 120, pl.y); await wait(300); m.data.watch = o.ms + 10; await wait(400); break; }
        case 'script': await wait(500); break;
        case 'losewanted': gs.wanted.clear(); await wait(500); break;
        case 'choice': await dialogue(); break;
        case 'unlock': { const sd = gs.safeDoor; tp(gs, sd.x * 32 + 16, sd.y * 32 + 60); gs.doInteract({ kind: 'door', ref: sd }); await wait(400); break; }
        case 'tail': { const s = gs.shadeNpc; if (s) { tp(gs, s.x - 30, s.y); } await wait(500); await dialogue(); break; }
        case 'ending': await wait(600); if (active('Ending')) S('Ending').finish(); break;
        default: await wait(300);
      }
      await wait(200);
      if (note === 'goto' && !m.active) break;
    }
    await wait(300);
  }

  (async () => {
    try {
      await wait(1500);
      game.scene.getScene('Menu').scene.start('Character', { mode: 'new' });
      await wait(900);
      S('Character').start();
      await wait(3500);
      let gs = S('Game');
      const ui = S('UI');
      const p = gs.player;
      log('new game; m1 active:', gs.missions.id, 'money', profile.money, 'places', Object.keys(gs.places).length, 'storyNpcs', Object.keys(gs.storyNpcs).join(','));

      /* ---------------- vehicle controls ---------------- */
      const car = gs.vehicles.getChildren().find((v) => v.mode === 'parked' && v.vtype === 'sedan' && !v.locked);
      car.locked = false;
      tp(gs, car.x, car.y + 50);
      gs.enterVehicle(car);
      const x0 = car.x, y0 = car.y, f0 = car.fuel;
      gs.keys.W.isDown = true;
      await wait(700);
      const sp1 = Math.abs(car.speed);
      await wait(1500);
      const sp2 = Math.abs(car.speed);
      log('DRIVE accel: speed after 0.7s', Math.round(sp1), 'after 2.2s', Math.round(sp2), '(smooth ramp:', sp1 < sp2, ') dist', Math.round(Math.hypot(car.x - x0, car.y - y0)));
      const h0 = car.heading;
      gs.keys.D.isDown = true;
      await wait(700);
      gs.keys.D.isDown = false;
      log('DRIVE steer right: heading', h0.toFixed(2), '->', car.heading.toFixed(2), 'view', car.view, 'moving along heading:', Math.abs(Math.atan2(car.body.velocity.y, car.body.velocity.x) - car.heading) < 0.2);
      gs.keys.W.isDown = false;
      gs.keys.S.isDown = true;
      await wait(1800);
      log('DRIVE brake/reverse: speed', Math.round(car.speed));
      gs.keys.S.isDown = false;
      await wait(1200);
      car.speed = 0; car.setVelocity(0, 0);
      log('DRIVE coast to stop: speed', Math.round(car.speed), 'fuel', f0.toFixed(2), '->', car.fuel.toFixed(2));
      const exitOk = gs.findExitSpot(car);
      gs.exitVehicle();
      log('DRIVE exit: on foot', !p.vehicle, 'spot free of walls', !!exitOk && !gs.boxBlocked(p.x, p.y, 12, 12));
      // refuel + repair at a pump
      if (gs.pumps.length) {
        const pump = gs.pumps[0];
        const sp = gs.freeSpotNear(pump.x, pump.y + 40, 120);
        tp(gs, sp.x, sp.y); gs.enterVehicle(car); car.setPosition(sp.x, sp.y); car.body.reset(sp.x, sp.y);
        car.fuel = 10; car.hp = 60; profile.money = 100;
        gs.keys.F.isDown = true; await wait(900); gs.keys.F.isDown = false;
        log('REFUEL: fuel 10 ->', car.fuel.toFixed(1), 'money 100 ->', Math.round(profile.money));
        gs.exitVehicle(true);
      }
      // locked car break-in
      const lockedCar = gs.vehicles.getChildren().find((v) => v.mode === 'parked' && v.locked && !v.ownedId);
      if (lockedCar) {
        tp(gs, lockedCar.x, lockedCar.y + 45);
        gs.tryEnterVehicle(lockedCar); const a = !!p.vehicle;
        gs.tryEnterVehicle(lockedCar);
        log('LOCK: first E enters?', a, 'second E breaks in -> unlocked', !lockedCar.locked);
        if (lockedCar.locked === false) { gs.enterVehicle(lockedCar); gs.exitVehicle(true); }
      }
      profile.money = 150; gs.wanted.clear();

      /* ---------------- shop + progression ---------------- */
      profile.money = 3000;
      const r1 = gs.shopBuy({ kind: 'item', id: 'm_bat', label: 'Bat' }, 55, false);
      const r2 = gs.shopBuy({ kind: 'outfit', id: 'work', label: 'Workwear' }, 90, false);
      const r3 = gs.shopBuy({ kind: 'vehicle', id: 'sedan', label: 'Sedan' }, 600, false);
      log('SHOP:', r1.ok, r2.ok, r3.ok, 'owned vehicles', profile.ownedVehicles.length, 'outfits', profile.outfits.length, 'money', Math.round(profile.money));
      profile.money = 150;

      /* ---------------- story: all 15 missions ---------------- */
      profile.missions.completed = {};
      gs.missions.abort(true);
      gs.missions.start('m1');
      for (const def of STORY) {
        await playMission(gs, def.id);
        const done = !!profile.missions.completed[def.id];
        log(`STORY ${def.id} "${def.title}":`, done ? 'COMPLETE' : 'NOT COMPLETE (active ' + gs.missions.id + ' step ' + gs.missions.step + ')', '| money', Math.round(profile.money), 'rep', profile.rep);
        if (!done) { gs.missions.abort(true); }
        if (def.autoNext) await wait(4200);
        await wait(300);
      }
      log('ENDING:', profile.flags.ending, 'safehouse', profile.safehouse, 'flags', JSON.stringify({ final: profile.flags.final, deal: profile.flags.deal, dispute: profile.flags.dispute, locket: profile.flags.locket }));

      /* ---------------- side jobs ---------------- */
      for (const tpl of ['food', 'parcel', 'lost', 'supplies']) {
        const before = Math.round(profile.money);
        const prm = (await import('./story/side.js')).SIDE_TEMPLATES[tpl].make(gs);
        gs.missions.start('side_' + tpl + '_t', { tpl, params: prm });
        let g = 0;
        while (gs.missions.active && g++ < 12) {
          const o = gs.missions.obj;
          if (o.type === 'interactAt') { const a = gs.missions.place(o); tp(gs, a.x, a.y); gs.missions.doInteract(); }
          else if (o.type === 'goto') { const a = gs.missions.place(o); tp(gs, a.x, a.y); }
          else if (o.type === 'collect') { const it = gs.items.find((s) => s.mission); if (it) { tp(gs, it.x, it.y + 6); gs.doInteract({ kind: 'item', ref: it }); } }
          await wait(500);
        }
        log('SIDE', tpl, 'money', before, '->', Math.round(profile.money));
      }

      /* ---------------- save / load, no duplicates ---------------- */
      gs.missions.abort(true);
      const counts = () => ({ civ: gs.civilians.countActive(), veh: gs.vehicles.countActive(), en: gs.enemies.countActive(), owned: profile.ownedVehicles.length });
      const c1 = counts();
      const ok = writeSlot(1, gs);
      const saved = readSlot(1);
      log('SAVE ok', ok, 'slot summary', JSON.stringify(saved.summary), 'size', JSON.stringify(saved).length);
      const moneySaved = Math.round(profile.money);
      profile.money = 1;
      loadGameInto(S('Game'), saved);
      await wait(3500);
      gs = S('Game');
      const c2 = counts();
      log('LOAD: money', Math.round(profile.money), '(was', moneySaved, ') missions done', Object.keys(profile.missions.completed).length, 'counts before', JSON.stringify(c1), 'after', JSON.stringify(c2));
      log('LOAD duplicates?', c2.veh > c1.veh + 2 ? 'YES' : 'no', '| ui scenes running:', ['UI', 'Game'].map((k) => k + ':' + active(k)).join(' '));

      /* ---------------- map + missions menu ---------------- */
      S('UI').openMap(); await wait(600);
      const map = S('Map'); log('MAP open; waypoint-capable POIs', map.icons.length); map.close(); await wait(500);
      S('UI').openMissions(); await wait(600);
      const ms = S('Missions'); ms.setTab('COMPLETED'); log('MISSION LOG completed rows', ms.list.length); ms.close(); await wait(500);
      log('fps', Math.round(game.loop.actualFps));
      log('DONE');
    } catch (err) {
      log('FAILED', err && err.stack ? err.stack : String(err));
    }
  })();
}

// ?autostart[&show=map|missions|dialogue|inventory|shop|menu] boots straight into the game for screenshots
export function autostart(game, show) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    if (show === 'menu') return;
    await wait(1200);
    game.scene.getScene('Menu').scene.start('Character', { mode: 'new' });
    await wait(900);
    if (show === 'character') return;
    game.scene.getScene('Character').start();
    await wait(3500);
    const gs = game.scene.getScene('Game'), ui = game.scene.getScene('UI');
    if (show === 'map') ui.openMap();
    else if (show === 'missions') ui.openMissions();
    else if (show === 'inventory') ui.toggleInventory();
    else if (show === 'shop') gs.openShop('general', 'Grocery');
    else if (show === 'dialogue') { gs.missions.start('m1'); gs.talkTo('marla'); }
  })();
}
