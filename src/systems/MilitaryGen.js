/* Fort Merrow (the military camp) and the military checkpoint, on the right side of the map (block columns 10 and 11 of block row 4).
   The builders get the world generator's helpers in `C` and work on its tile grids. Layout notes:
   - The camp is a 35 x 31 walled compound filling the east block: concrete walls north and south, fences east and west, four open watchtowers, a main gate in the south wall
     (a 3-tile gate onto the main road, closed during a manhunt) and a personnel door in the north wall.
   - Inside: three rows of buildings on three paved streets, joined by a north-south road from the gate: Barracks / Armory / Medical (north), Headquarters / Administration / Briefing
     (middle), Vehicle garage / Supply warehouse / training grounds (south), vehicle bays along the south street.
   - The checkpoint is a compound in the south-east of the west block, next to the same public road, with entry and exit lanes behind boom gates, a guard booth, an observation tower,
     concrete barriers, floodlights, signs and parked military vehicles. */
export function makeMilitary(C) {
  const { T, TILE, obj, ground, occ, out, inb, px, fillBuildingShell, addDoorTile, placeWindows, registerBuilding, civ, enemy, vehicle, addPoi, mark, ri } = C;

  const put = (tx, ty, t) => { if (inb(tx, ty) && obj[ty][tx] === -1) { obj[ty][tx] = t; return true; } return false; };
  const paint = (x0, y0, x1, y1, g) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y) && obj[y][x] === -1) { ground[y][x] = g; occ[y][x] = true; } };
  const skinWall = (tx, ty, t) => out.policeSkin.walls.push({ tx, ty, t });
  const skinDoor = (tx, ty, c, o) => out.policeSkin.doors.push({ tx, ty, c, o });
  const deco = (key, tx, ty, sy, dz = 40, cx = 0.5) => out.policeDecor.push({ key, x: (tx + cx) * TILE, y: ty * TILE + 16, sy, dz });
  const autoDoor = (tx, ty, lock = false) => out.policeDoors.push({ tx, ty, lock });
  const clear = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) { obj[y][x] = -1; } };

  /* A small building with a steel door in its south wall (dw tiles wide, starting at column dc), mesh windows, olive roof and its own sign.
     fill(P, X, Y) places the interior: P(c, r, tile) uses interior-relative coordinates (c 1.., r 1..). */
  function building(x, y, w, h, o) {
    fillBuildingShell(x, y, w, h, T.wall2, o.floor ?? T.concrete);
    const dw = o.dw || 1;
    for (let k = 0; k < dw; k++) { addDoorTile(x + o.dc + k, y + h - 1, false); skinDoor(x + o.dc + k, y + h - 1, T.milDoor, T.milDoorOpen); autoDoor(x + o.dc + k, y + h - 1, !!o.lock); }
    placeWindows(x, y, w, h, { windowChance: o.windows ?? 0.55 });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if ((yy === y || yy === y + h - 1 || xx === x || xx === x + w - 1) && obj[yy][xx] === T.window) obj[yy][xx] = T.winHardware;
    registerBuilding(x, y, w, h, o.roof || 'hq', { kind: o.kind || 'hq', colorIdx: 1, tint: o.tint || 0xb4c29a, facade: T.milFacade });
    for (let k = 0; k < dw; k++) { const tx = x + o.dc + k, ty = y + h; if (inb(tx, ty) && obj[ty][tx] === -1) { ground[ty][tx] = T.plaza; } }
    deco(o.sign, x + o.dc + (dw - 1) / 2, y + h - 1, -46, 60);
    if (o.fill) o.fill((c, r, t) => put(x + c, y + r, t), (c) => x + c, (r) => y + r);
    return { x, y, w, h };
  }

  /* An open watchtower: a ring of tall wall around a small yard with the entrance on the south side; the sentry stands inside, floodlight and camera on top. */
  function tower(x, y, side = 'S') {
    for (let yy = y; yy < y + 3; yy++) for (let xx = x; xx < x + 3; xx++) {
      const edge = xx === x || xx === x + 2 || yy === y || yy === y + 2;
      ground[yy][xx] = T.concrete; occ[yy][xx] = true;
      obj[yy][xx] = edge ? T.wall2 : -1;
    }
    obj[y + 2][x + 1] = -1;                                                                           // the entrance (south side)
    registerBuilding(x, y, 3, 3, 'hq', { kind: 'tower', colorIdx: 1, tall: true, noRoof: true, facade: T.milWall });
    deco('mil_flood', x + 1, y + 2, -76, 70);
    deco('pd_cam', x + 2, y + 2, -64, 70);
    enemy(x + 1, y + 1, 'msniper', 'sniper', 'guard', 14);
  }

  const bays = (x0, y0, n, wTiles, vehicles, d = 2) => {                                               // painted nose-in bays d rows deep, vehicles parked in them
    for (let k = 0; k <= n; k++) for (let r = 0; r < d; r++) if (inb(x0 + k * wTiles, y0 + r)) ground[y0 + r][x0 + k * wTiles] = T.parking;
    for (let k = 0; k < n; k++) for (let r = 0; r < d; r++) for (let c = 1; c < wTiles; c++) if (inb(x0 + k * wTiles + c, y0 + r) && obj[y0 + r][x0 + k * wTiles + c] === -1) ground[y0 + r][x0 + k * wTiles + c] = T.concrete;
    vehicles.forEach((v, k) => { if (v) vehicle(v[0], v[1] || 0, (x0 + k * wTiles + wTiles / 2) * TILE, (y0 + d / 2) * TILE, -Math.PI / 2, 'parked'); });
  };

  /* ===================================================================== FORT MERROW */
  function fort(b) {
    const X0 = b.x0 + 1, Y0 = b.y0 + 1, W = 35, H = 31;                                                // wall rectangle (x 424-458, y 132-162)
    const X = (u) => X0 + u, Y = (v) => Y0 + v;
    const DD = (key, u, v, sy, dz, cx) => deco(key, X(u), Y(v), sy, dz, cx);
    clear(X0 - 1, Y0 - 1, X0 + W, Y0 + H);
    paint(X(0), Y(0), X(W - 1), Y(H - 1), T.concrete);
    mark(X0 - 1, Y0 - 1, W + 2, H + 2, 0);
    // ---- perimeter: concrete walls north and south, fences east and west, with a concrete base (the wall skin), barbed wire and warning signs
    for (let u = 0; u < W; u++) { obj[Y(0)][X(u)] = T.wall2; obj[Y(H - 1)][X(u)] = T.wall2; skinWall(X(u), Y(0), T.milWall); skinWall(X(u), Y(H - 1), T.milWall); }
    for (let v = 1; v < H - 1; v++) { obj[Y(v)][X(0)] = T.fence; obj[Y(v)][X(W - 1)] = T.fence; }
    for (let u = 1; u < W - 1; u += 2) { DD('mil_barb', u, 0, -38, 30, 1); DD('mil_barb', u, H - 1, -38, 60, 1); }
    // main gate (south wall, 3 tiles, onto the road) and the personnel door (north wall)
    for (let u = 2; u <= 4; u++) { obj[Y(H - 1)][X(u)] = T.doorClosed; out.doors.push({ x: X(u), y: Y(H - 1) }); skinDoor(X(u), Y(H - 1), T.milGate, T.milGateOpen); autoDoor(X(u), Y(H - 1), true); }
    obj[Y(0)][X(16)] = T.doorClosed; out.doors.push({ x: X(16), y: Y(0) }); skinDoor(X(16), Y(0), T.milDoor, T.milDoorOpen); autoDoor(X(16), Y(0), true);
    DD('mil_sign_gate', 3, H - 1, -52, 70); DD('mil_sign_zone', 9, H - 1, -8, 70); DD('mil_sign_zone', 27, H - 1, -8, 70); DD('mil_sign_zone', 20, 0, -8, 30);
    DD('pd_cam', 1, H - 1, -44, 70); DD('pd_cam', 5, H - 1, -44, 70);
    // ---- streets: north-south road u2-u4 from the gate, three east-west streets
    paint(X(2), Y(5), X(4), Y(H - 2), T.road);
    [[9, 10], [18, 19], [27, 29]].forEach(([v0, v1]) => paint(X(2), Y(v0), X(W - 2), Y(v1), T.road));
    for (let v = 6; v <= H - 2; v += 2) if (obj[Y(v)][X(3)] === -1) ground[Y(v)][X(3)] = T.roadDashV;
    [[9, 10], [18, 19], [27, 29]].forEach(([v0, v1]) => { const m = v0 === 27 ? 28 : v0; for (let u = 6; u <= W - 3; u += 2) if (obj[Y(m)][X(u)] === -1 && v0 !== 9 && v0 !== 18) ground[Y(m)][X(u)] = T.roadDash; });
    // ---- buildings
    const sgn = (k) => 'mil_sign_' + k;
    building(X(6), Y(2), 9, 7, { dc: 4, sign: sgn('barracks'), kind: 'hq', fill: (P, XX, YY) => {            // BARRACKS: rows of bunks, lockers, benches
      [1, 2, 3, 5, 6, 7].forEach((c) => P(c, 1, T.milBunk)); [2, 3].forEach((r) => { P(1, r, T.locker); P(7, r, T.locker); }); [2, 3, 5, 6].forEach((c) => P(c, 4, T.bench)); P(3, 3, T.table); P(5, 3, T.table);
      deco('mil_p_board', XX(4), YY(0) + 0, -2, 40, 0.5);
    } });
    building(X(16), Y(2), 6, 7, { dc: 2, sign: sgn('armory'), kind: 'hq', lock: true, fill: (P, XX, YY) => {      // ARMORY: weapon racks, a service counter, ammunition and gear lockers
      [1, 2, 3, 4].forEach((c) => P(c, 1, T.weaponRack)); [1, 3, 4].forEach((c) => P(c, 3, T.ctrInd)); P(1, 4, T.ammoCrate); P(4, 4, T.ammoCrate); P(1, 5, T.locker); P(4, 5, T.locker);
      civ(XX(2), YY(2), 'patron', { role: 'military', act: 'cashier', face: Math.PI / 2 });
    } });
    building(X(23), Y(2), 6, 7, { dc: 2, sign: sgn('medical'), kind: 'hq', fill: (P, XX, YY) => {              // MEDICAL: beds, first-aid cabinets and supply shelves, a medic
      [1, 2, 4].forEach((c) => P(c, 1, T.hospBed)); P(1, 3, T.medCab); P(4, 3, T.medCab); P(1, 4, T.medSh); P(4, 4, T.medSh); P(4, 5, T.fridge);
      civ(XX(2), YY(3), 'medic');
    } });
    building(X(6), Y(11), 10, 7, { dc: 5, sign: sgn('hq'), kind: 'hq', roof: 'hq', fill: (P, XX, YY) => {          // HEADQUARTERS: command desks, radio consoles, a meeting table, the wall map
      [1, 2, 8].forEach((c) => P(c, 1, T.desk)); [3, 4, 6, 7].forEach((c) => P(c, 1, T.milConsole)); [2, 3, 4, 6, 7].forEach((c) => P(c, 3, T.table)); [2, 3, 4, 6, 7].forEach((c) => { P(c, 2, T.chair); P(c, 4, T.chair); });
      P(1, 5, T.cabinet); P(8, 5, T.cabinet); P(1, 4, T.cabinet); P(8, 4, T.cabinet);
      deco('pd_p_map', XX(4), YY(0), -2, 40, 0.5); deco('pd_p_map', XX(7), YY(0), -2, 40, 0.5); deco('pd_p_sched', XX(1), YY(0), -2, 40, 0.5);
      civ(XX(1), YY(2), 'patron', { role: 'military', act: 'cashier', face: Math.PI / 2, sit: true }); civ(XX(8), YY(2), 'patron', { role: 'military', act: 'cashier', face: Math.PI / 2, sit: true });
      enemy(XX(5), YY(2), 'military', 'rifle', 'guard', 20);
    } });
    building(X(17), Y(11), 7, 7, { dc: 3, sign: sgn('admin'), kind: 'hq', fill: (P, XX, YY) => {              // ADMINISTRATION: desks, filing, a supply shelf
      [1, 2, 4, 5].forEach((c) => P(c, 1, T.desk)); P(1, 3, T.cabinet); P(5, 3, T.cabinet); P(1, 4, T.cabinet); P(5, 4, T.shelf); P(1, 5, T.cabinet);
      civ(XX(2), YY(2), 'patron', { role: 'military', act: 'cashier', face: Math.PI / 2, sit: true });
    } });
    building(X(25), Y(11), 8, 7, { dc: 3, sign: sgn('briefing'), kind: 'hq', fill: (P, XX, YY) => {            // BRIEFING: a podium under the wall map, rows of tables and chairs
      P(3, 1, T.desk); P(4, 1, T.desk); [1, 2, 5, 6].forEach((c) => { P(c, 3, T.table); P(c, 4, T.chair); });
      deco('pd_p_map', XX(3), YY(0), -2, 40, 1); deco('pd_p_board', XX(6), YY(0), -2, 40, 0.5);
      civ(XX(4), YY(2), 'patron', { role: 'military', act: 'chat', face: Math.PI / 2 });
    } });
    const garage = building(X(6), Y(20), 10, 7, { dc: 4, dw: 2, sign: sgn('garage'), kind: 'warehouse', roof: 'metal', fill: (P, XX, YY) => {       // VEHICLE GARAGE: tool boards, workbenches, a jeep in the bay
      for (let c = 1; c <= 8; c++) P(c, 1, T.toolWall); [1, 2, 7, 8].forEach((c) => P(c, 2, T.workbench)); P(1, 4, T.indRack); P(8, 4, T.indRack); P(1, 5, T.cabinet); P(8, 5, T.cabinet);
      civ(XX(2), YY(3), 'patron', { role: 'worker', act: 'cashier', face: Math.PI / 2 }); civ(XX(7), YY(3), 'patron', { role: 'worker', act: 'cashier', face: Math.PI / 2 });
      vehicle('jeep', 0, (XX(4) + 1) * TILE, (YY(4) + 0.5) * TILE, 0, 'parked');
    } });
    building(X(17), Y(20), 8, 7, { dc: 3, sign: sgn('supply'), kind: 'warehouse', roof: 'metal', fill: (P, XX, YY) => {  // SUPPLY WAREHOUSE: shelving sections, crates, ammunition
      for (let c = 1; c <= 6; c++) P(c, 1, T.evShelf); [1, 2, 5, 6].forEach((c) => P(c, 2, T.indRack)); P(1, 4, T.ammoCrate); P(6, 4, T.ammoCrate); P(1, 5, T.crates); P(2, 5, T.crates); P(5, 5, T.crates); P(6, 5, T.crates);
      enemy(XX(3), YY(4), 'military', 'rifle', 'guard', 14);
    } });
    // ---- training grounds (u26-u33, v20-v26): packed dirt, a low obstacle wall course, sandbags, tyres, monkey bars, targets, soldiers drilling
    paint(X(26), Y(20), X(33), Y(26), T.dirt);
    for (let u = 27; u <= 32; u++) if (u !== 29) put(X(u), Y(23), T.barricade);
    [[27, 25], [28, 25], [31, 25], [32, 25]].forEach(([u, v]) => put(X(u), Y(v), T.sandbag));
    DD('mil_tires', 28, 21, 0, 10, 0.5); DD('mil_tires', 31, 21, 0, 10, 0.5); DD('mil_bars', 30, 22, 0, 10, 0.5);
    [27, 29, 31, 33].forEach((u) => out.decor.push({ kind: 'mil_target', x: px(X(u)), y: Y(20) * TILE + 30 }));
    [[28, 24], [30, 24], [32, 24], [29, 26]].forEach(([u, v], k) => civ(X(u), Y(v), 'patron', { role: 'military', act: 'drill', face: -Math.PI / 2, seed: k + 1 }));
    DD('mil_sign_train', 30, 26, -30, 40);
    // ---- vehicle bays along the south street: jeeps, a patrol car, a transport truck and an armoured carrier
    bays(X(18), Y(27), 3, 4, [['jeep', 0], ['truck', 0], ['apc', 0]], 3);
    // ---- floodlights along the streets
    [[8, 9], [16, 9], [26, 9], [8, 18], [16, 18], [26, 18], [10, 29], [30, 29]].forEach(([u, v]) => { if (obj[Y(v)][X(u)] === -1) { obj[Y(v)][X(u)] = T.prop; out.props.push({ kind: 'lamp', x: px(X(u)), y: Y(v) * TILE + 30 }); } });
    // ---- towers: NW, NE, SE and beside the gate
    tower(X(1), Y(1)); tower(X(31), Y(1)); tower(X(31), Y(26)); tower(X(1), Y(24));
    // ---- the people on duty
    enemy(X(1), Y(H - 3), 'military', 'rifle', 'guard', 24); enemy(X(5), Y(H - 3), 'military', 'rifle', 'guard', 24);              // gate guards (inside)
    enemy(X(3), Y(H - 5), 'mheavy', 'heavy', 'guard', 20);
    enemy(X(12), Y(9), 'military', 'rifle', 'guard', 40); enemy(X(22), Y(10), 'military', 'shotgun', 'guard', 40);
    enemy(X(10), Y(26) + 0, 'military', 'rifle', 'guard', 30);
    enemy(X(14), Y(5), 'military', 'rifle', 'guard', 20);                                                                                // barracks
    const rt1 = [[7, 1], [W - 4, 1], [W - 4, H - 3], [7, H - 3]].map(([u, v]) => ({ x: px(X(u)), y: px(Y(v)) }));
    const rt2 = [[5, 10], [W - 3, 10], [W - 3, 19], [5, 19]].map(([u, v]) => ({ x: px(X(u)), y: px(Y(v)) }));
    enemy(X(7), Y(1), 'military', 'rifle', 'patrol', 0, rt1); enemy(X(W - 3), Y(10), 'military', 'rifle', 'patrol', 0, rt2); enemy(X(5), Y(28), 'mheavy', 'heavy', 'patrol', 0, rt1.slice().reverse());
    enemy(X(28), Y(9), 'military', 'rifle', 'guard', 30);
    // ---- zone, camp record, map marker
    out.zones.push({ x0: X0 * TILE, y0: Y0 * TILE, x1: (X0 + W) * TILE, y1: (Y0 + H) * TILE, name: 'Fort Merrow' });
    out.camps.push({ kind: 'camp', x: X0, y: Y0, w: W, h: H });
    addPoi('military', 'Fort Merrow', X0, Y0, W, H);
    out.fortGate = { x: px(X(3)), y: (Y(H - 1) + 2) * TILE };
  }

  /* ===================================================================== MILITARY CHECKPOINT */
  function checkpoint(b) {
    const X0 = b.x1 - 21, Y0 = b.y1 - 15, W = 21, H = 15;                                               // x 398-418, y 148-162 (the south-east corner of the west block)
    const X = (u) => X0 + u, Y = (v) => Y0 + v;
    const DD = (key, u, v, sy, dz, cx) => deco(key, X(u), Y(v), sy, dz, cx);
    // Dedicate the entire city block (b.x0..b.x1, b.y0..b.y1) to the Military Checkpoint & Staging Reserve
    clear(b.x0 + 1, b.y0 + 1, b.x1 - 1, b.y1 - 1);
    mark(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, 0);
    for (let y = b.y0 + 1; y <= b.y1 - 1; y++) for (let x = b.x0 + 1; x <= b.x1 - 1; x++) {
      if (inb(x, y)) { ground[y][x] = (x + y) % 3 === 0 ? T.grass2 : T.grass1; occ[y][x] = true; }
    }
    // North-south military logistics road connecting the north avenue (b.y0) to the checkpoint lanes
    paint(X(10), b.y0, X(14), Y0 - 1, T.road);
    for (let y = b.y0 + 2; y < Y0; y += 2) if (inb(X(12), y)) ground[y][X(12)] = T.roadDashV;
    // West military staging pad & reserve motor pool (x = b.x0 + 3 .. X0 - 3, y = Y0 + 1 .. b.y1 - 2)
    const sx0 = b.x0 + 3, sx1 = X0 - 3, sy0 = Y0 + 1, sy1 = b.y1 - 2;
    paint(sx0, sy0, sx1, sy1, T.concrete);
    for (let x = sx0; x <= sx1; x++) { put(x, sy0, T.fence); if (x < sx0 + 4 || x > sx1 - 4) put(x, sy1, T.fence); }
    for (let y = sy0; y <= sy1; y++) { put(sx0, y, T.fence); put(sx1, y, T.fence); }
    for (let x = sx0 + 4; x <= sx1 - 4; x++) if (inb(x, b.y1)) ground[b.y1][x] = T.concrete;
    bays(sx0 + 2, sy0 + 2, 2, 4, [['truck', 0], ['jeep', 0]]);
    // Landscaped military buffer trees & warning signs in the north/west lawn
    for (let x = b.x0 + 3; x <= b.x1 - 3; x += 5) {
      if (x >= X(8) && x <= X(16)) continue;
      if (inb(x, b.y0 + 3) && obj[b.y0 + 3][x] === -1) obj[b.y0 + 3][x] = T.tree;
      if (x < X0 - 2 && inb(x, b.y0 + 9) && obj[b.y0 + 9][x] === -1) obj[b.y0 + 9][x] = T.tree;
    }
    deco('mil_sign_zone', b.x0 + 6, b.y1 - 1, -8, 70);
    deco('mil_sign_zone', X(8), b.y0 + 2, -8, 40);

    clear(X0 - 1, Y0 - 1, X0 + W, Y0 + H);
    paint(X(0), Y(0), X(W - 1), Y(H - 1), T.concrete);
    mark(X0 - 1, Y0 - 1, W + 2, H + 1, 0);
    // ---- the enclosure: a south wall with the lane gates, concrete barriers west and north, a fence on the road side
    for (let u = 0; u < W; u++) { obj[Y(H - 1)][X(u)] = T.wall2; skinWall(X(u), Y(H - 1), T.milWall); if (u < 10 || u > 14) put(X(u), Y(0), T.jersey); }
    for (let v = 1; v < H - 1; v++) { put(X(0), Y(v), T.jersey); obj[Y(v)][X(W - 1)] = T.fence; }
    // entry lane (u10-u11) and exit lane (u13-u14), a concrete median between them (u12); a boom gate on each lane in the south wall
    [10, 11].forEach((u) => { obj[Y(H - 1)][X(u)] = T.doorClosed; out.doors.push({ x: X(u), y: Y(H - 1) }); skinDoor(X(u), Y(H - 1), T.milBoom, T.milBoomOpen); autoDoor(X(u), Y(H - 1), true); });
    [13, 14].forEach((u) => { obj[Y(H - 1)][X(u)] = T.doorClosed; out.doors.push({ x: X(u), y: Y(H - 1) }); skinDoor(X(u), Y(H - 1), T.milBoom, T.milBoomOpen); autoDoor(X(u), Y(H - 1), true); });
    paint(X(10), Y(0), X(14), Y(H - 2), T.road);
    for (let v = 0; v <= H - 2; v++) { ground[Y(v)][X(12)] = T.concrete; if (v >= 7) put(X(12), Y(v), T.jersey); }
    put(X(12), Y(H - 2), T.jersey);
    for (let v = 7; v <= H - 3; v += 3) { out.rugs.push({ key: 'mil_arrow_up', x: (X(10) + 1) * TILE, y: Y(v) * TILE + 16 }); out.rugs.push({ key: 'mil_arrow_down', x: (X(13) + 1) * TILE, y: Y(v) * TILE + 16 }); }
    for (let u = 9; u <= 15; u++) if (inb(X(u), Y(H))) { ground[Y(H)][X(u)] = T.concrete; }          // the apron on the sidewalk row in front of the gates
    // chicane barriers in the lanes
    put(X(10), Y(9), T.jersey); put(X(14), Y(11), T.jersey);
    // ---- guard booth (8 x 6) with its own interior: desk and computer, radio and monitors, a filing cabinet, two guards
    building(X(2), Y(5), 8, 6, { dc: 3, sign: 'mil_sign_booth', kind: 'hq', roof: 'hq', fill: (P, XX, YY) => {
      P(1, 1, T.desk); P(2, 1, T.desk); P(3, 1, T.milConsole); P(4, 1, T.milConsole); P(6, 1, T.cabinet); P(6, 2, T.cabinet); P(1, 3, T.chair);
      deco('pd_p_sched', XX(5), YY(0), -2, 40, 0.5);
      enemy(XX(2), YY(2), 'military', 'rifle', 'guard', 16); enemy(XX(5), YY(3), 'military', 'rifle', 'guard', 16);
    } });
    // ---- observation tower, floodlights, cameras, signs
    tower(X(16), Y(2));
    [[9, 5], [15, 5], [9, 13], [15, 13]].forEach(([u, v]) => { if (obj[Y(v)][X(u)] === -1) { obj[Y(v)][X(u)] = T.prop; out.props.push({ kind: 'lamp', x: px(X(u)), y: Y(v) * TILE + 30 }); } });
    DD('mil_sign_cp', 12, H - 1, -50, 70); DD('mil_sign_arrow_in', 10, H - 1, -14, 70, 1); DD('mil_sign_arrow_out', 14, H - 1, -14, 70, 0);
    DD('pd_cam', 9, H - 1, -42, 70); DD('pd_cam', 15, H - 1, -42, 70);
    out.decor.push({ kind: 'mil_sign_stop', x: px(X(10)) - 12, y: Y(H - 3) * TILE + 30 });
    // ---- military vehicles parked beside the checkpoint (west pad), clear of the lanes
    bays(X(2), Y(12), 2, 4, [['jeep', 0], ['pickup', 0]]);
    vehicle('apc', 0, X(17) * TILE + 16, (Y(12) + 1) * TILE, -Math.PI / 2, 'parked');
    // ---- soldiers on the lanes
    enemy(X(9), Y(H - 4), 'military', 'rifle', 'guard', 18); enemy(X(15), Y(H - 4), 'military', 'rifle', 'guard', 18); enemy(X(12), Y(4), 'military', 'shotgun', 'guard', 20);
    out.zones.push({ x0: X0 * TILE, y0: Y0 * TILE, x1: (X0 + W) * TILE, y1: (Y0 + H) * TILE, name: 'Military Checkpoint' });
    out.camps.push({ kind: 'camp', x: X0, y: Y0, w: W, h: H });
    addPoi('military', 'Military Checkpoint', X0, Y0, W, H);
  }

  return { fort, checkpoint };
}
