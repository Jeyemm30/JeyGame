# JeyGame – Top-Down Pixel Survival Shooter

Phaser 3 + Vite. All art is generated in code at start-up (no external assets, no online services), so the game runs fully offline once `npm install` has finished.

## Install & run (Windows PowerShell)

```powershell
cd "$env:USERPROFILE\Downloads\Game"
npm install
npm run dev
```

Open **http://localhost:5173** (Vite uses strict port 5173; if it is busy it will tell you instead of switching).

Production build (optional): `npm run build` then `npm run preview`.

## Play on a phone / tablet (same Wi-Fi)

```powershell
npm run dev:phone
```

Vite prints a **Network** address such as `http://192.168.1.20:5173`. Open it in your phone's browser (landscape), allow Node through the Windows firewall if asked. Touch controls appear automatically: **left side = move**, **right side = aim (push the stick far to fire)**, buttons on the right edge for USE / RELOAD / CROUCH / RUN / SWAP / MED / ARMOR, and a top bar for pause, bag, zoom and fullscreen. Use Settings → Touch Controls (AUTO / ON / OFF) to override detection; `?touch=1` in the URL forces them on.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Aim |
| Left click | Shoot (hold for auto weapons) |
| R | Reload |
| Shift | Sprint (uses stamina, noisy, inaccurate) |
| C | Crouch / sneak (slow, silent, harder to spot) |
| E | Loot items (hold to vacuum up), search furniture / cars / bins, open crates, open & close doors, **silent takedown** of an unaware enemy from behind |
| 1-4 / Q | Switch weapon (pistol, rifle, shotgun, sniper) / cycle |
| H | Use medkit |
| F | Use armor plate |
| Tab (or I) | Inventory (click a weapon to equip, buttons to use supplies) |
| Mouse wheel | Zoom |
| ESC | Pause |

## What's in the game

- **Angled 3/4 top-down view** with tall walls, y-sorted trees/props/characters, ground shadows, sidewalks, road markings, vehicles, street lights, signs, bins, bushes and tall grass.
- **Character creation** (Play → Character screen): hair, skin, hat, shirt, pants, shoes, backpack and colours with a live, rotatable preview, a randomize button and confirm. The look is used in-game and kept for the session (also across restarts).
- **Houses** with random multi-room layouts (living room, kitchen, bedrooms, bathroom, storage), furniture (beds, tables, chairs, sofas, fridges, cabinets, shelves, dressers, toilets, stoves), windows, doors, roofs that fade away when you step inside, and abandoned variants (broken windows, holes, rubble). Cabinets, fridges, dressers, shelves, medicine cabinets, car trunks and trash bins are searchable.
- **Walls block movement, sight and bullets.** Windows and low furniture let sight/bullets through.
- **Enemy AI with real vision**: each enemy has a facing direction, a limited vision cone and range, can't see through walls and can't see behind itself. An awareness meter fills while you're in view (faster when close, running or in the open; slower when crouching or standing still). States: idle, patrol, suspicious (`?`), alert (`!`), attack, search and cover. Enemies have a reaction delay, slow movement, low accuracy and long gaps between shots, hear gunshots/sprinting (walls muffle sound), investigate, and give up when you slip away.
- Military camps with fences, sandbags and trucks, checkpoints, barricades, hidden forest stashes (not on the minimap), reinforcements every 45 s.
- Existing systems kept: health/armor/stamina, 4 weapons with reloading and recoil/reload animations, ammo caps and backpacks, inventory, minimap, kill counter, settings, pause and game-over/restart.

## Project layout

```
index.html
package.json / vite.config.js
src/main.js              Phaser bootstrap
src/config.js            weapons, ammo, constants
src/assets/textures.js   procedural pixel-art (tiles, props, character generator, roofs)
src/scenes/              Boot, Menu, Character, Game, UI (HUD/inventory), Pause, GameOver, Settings
src/entities/            Player, Enemy (vision-based AI)
src/systems/             WorldGen, Combat, Loot, Audio, Settings, Rng
src/ui/widgets.js        buttons / labels / controls panel
src/autotest.js          dev smoke test (open http://localhost:5173/?autotest)
```
