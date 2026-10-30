// Dev-only smoke test (enabled with ?autotest). Logs results with the AUTOTEST prefix.
const log = (...a) => console.log('AUTOTEST', ...a);

export function runAutotest(game) {
  window.addEventListener('error', (e) => log('UNCAUGHT', e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', (e) => log('REJECTION', String(e.reason)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    try {
      await wait(1500);
      const menu = game.scene.getScene('Menu');
      menu.scene.start('Character');
      await wait(800);
      const ch = game.scene.getScene('Character');
      ch.rotate(1); ch.changeStyle({ style: 'hat', color: 'hatColor', colors: [1] }, 1); ch.app = (await import('./assets/textures.js')).randomAppearance(); ch.refresh();
      log('character screen ok');
      await wait(500);
      ch.start();
      await wait(2500);
      const gs = game.scene.getScene('Game');
      const ui = game.scene.getScene('UI');
      const p = gs.player;
      log('game running; enemies', gs.enemies.countActive(), 'containers', gs.containers.length, 'roofs', gs.roofs.length);

      const tmod = await import('./systems/Touch.js');
      if (tmod.touchEnabled()) {
        log('TOUCH mode on; ui touchMode', ui.touchMode, 'sticks', !!ui.sticks);
        const x0 = p.x, mag0 = p.ws.mag;
        Object.assign(ui.sticks.move, { id: 7, ox: 100, oy: 500, x: 170, y: 500 });
        await wait(900);
        log('TOUCH moved dx', Math.round(p.x - x0));
        ui.sticks.move.id = -1;
        Object.assign(ui.sticks.aim, { id: 8, ox: 1000, oy: 500, x: 1060, y: 500 });
        await wait(700);
        log('TOUCH firing flag', tmod.touch.firing, 'aiming', tmod.touch.aiming);
        ui.sticks.aim.id = -1;
        log('TOUCH fired, mag', mag0, '->', p.ws.mag);
        tmod.touch.actions.add('reload'); tmod.touch.actions.add('crouch');
        await wait(300);
        log('TOUCH actions: crouching', p.crouching, 'reloading', p.reloading);
        p.crouching = false;
      }
      // movement + shooting + reload
      p.tryShoot(gs.gt, gs.combat, true);
      p.startReload(gs.gt);
      ui.toggleInventory(); await wait(300); ui.toggleInventory();
      log('inventory toggle ok');

      // enter a house: roof must fade
      const b = gs.wd.buildings[0];
      p.setPosition((b.x + 2) * 32 + 16, (b.y + b.h - 2) * 32 + 16);
      await wait(900);
      log('roof alpha inside', gs.roofs[0].alpha.toFixed(2), 'currentBuilding', gs.currentBuilding());
      p.setPosition((b.x - 3) * 32, (b.y + b.h + 3) * 32);
      await wait(900);
      log('roof alpha outside', gs.roofs[0].alpha.toFixed(2));

      // containers + doors + crates
      const c = gs.containers.find((x) => x.name !== 'Trash bin') || gs.containers[0];
      p.setPosition(c.x, c.y + 30);
      gs.searchContainer(c);
      const d = gs.wd.doors[0];
      gs.setDoor(d.x, d.y, true); gs.setDoor(d.x, d.y, false);
      log('search/door ok; ground items', gs.items.length);

      // vision test: enemy facing player in plain sight vs. from behind
      const e = [...gs.enemies.getChildren()].find((q) => q.kind === 'rifle');
      e.ai = 'idle'; e.awareness = 0;
      p.setPosition(e.x + 140, e.y);
      e.face = 0; e.faceGoal = 0;
      await wait(300);
      log('LOS', gs.hasLOS(e.x, e.y, p.x, p.y), 'enemy ai at +0.3s', e.ai, 'aw', e.awareness.toFixed(2));
      await wait(4000);
      log('in front, after 4s: ai', e.ai, 'aw', e.awareness.toFixed(2));
      e.ai = 'idle'; e.awareness = 0; e.face = Math.PI; e.faceGoal = Math.PI; e.stop();
      p.crouching = true;
      p.setPosition(e.x + 120, e.y); // behind the enemy (it faces west)
      await wait(3000);
      log('behind+crouch after 3s: ai', e.ai, 'aw', e.awareness.toFixed(2));

      // let the fight run for a while
      p.crouching = false;
      p.setPosition(e.x + 140, e.y);
      e.face = 0;
      await wait(8000);
      log('fight: enemy ai', e.ai, 'player hp', p.hp.toFixed(0), 'bullets', gs.combat.bullets.countActive());
      log('DONE');
    } catch (err) {
      log('FAILED', err && err.stack ? err.stack : String(err));
    }
  })();
}
