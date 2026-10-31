# JeyGame – Open-World City Story (2D pixel art)

Phaser 3 + Vite. All art and sound are generated in code (no external assets, no online services), so the game runs fully offline once `npm install` has finished. Angled top-down 2D – no 3D.

## Install & run (Windows PowerShell)

```powershell
cd "$env:USERPROFILE\Downloads\Game"
npm install
npm run dev
```

Open **http://localhost:5173**. Phone / tablet on the same Wi-Fi: `npm run dev:phone`.
Production build: `npm run build` (output `dist/`). **Vercel**: import the repo – the Vite preset works as-is (build `npm run build`, output `dist`).

## Playing

Main menu: **Continue** (loads your newest save, including the autosave), **New Game**, **Load Game**, **Story Missions** / **Side Missions** (read-only log of your latest save), **Character** (customise your look), **Settings**, **Credits**.

| Key | Action |
| --- | --- |
| W A S D | Move on foot · in a vehicle: **W** gas, **S** brake/reverse, **A/D** steer |
| Mouse / left click | Aim / attack (swing the melee weapon or fire a gun) |
| Space | Melee swing (fists if a gun is out) · **handbrake** in a vehicle |
| Z · Q · 1-4 | Cycle melee · cycle all weapons · pick a firearm |
| E | Talk, pick up, search, open doors, enter / exit vehicles, take down an unaware enemy from behind |
| Shift · C | Sprint (noisy) · crouch (quiet) |
| R · H · F | Reload · medkit · armor plate (in a car at a gas station: **R** repair, hold **F** refuel; H = horn) |
| L | Lock / unlock a vehicle you own |
| J | Mission log & job board |
| M or minimap click | World map (drag, zoom, markers, waypoints) |
| Tab / I · Esc | Inventory · pause (save / load / missions) |

Touch controls appear automatically (left = move, right = aim; buttons for USE, HIT, RUN, CROUCH, RELOAD, SWAP, MED, ARMOR, FUEL, FIX, HORN, and a top bar for pause / bag / map / jobs / zoom). On phones the HUD moves out of the way of your thumbs, text and tap targets are enlarged (menus, inventory, shop, mission log, dialogue replies), the first tap requests fullscreen + landscape (Android), physics runs at 60 Hz and far-away NPCs/vehicles stop simulating sooner. Portrait shows a "rotate your device" screen. Settings → Touch Controls (AUTO / ON / OFF) overrides detection; `?touch=1` forces it on for testing in a desktop browser.

## Story mode (15 missions, 3 chapters)

Talk to characters marked with a gold **!** (their location is also a waypoint). Missions show a *CURRENT MISSION* tracker with objectives, a distance readout, on-screen/edge-of-screen waypoint arrows, a minimap diamond and a map marker. Start banners, completion banners (with rewards) and failure banners are shown; failed or finished missions can be **retried / replayed** from the mission log (replays pay half and don't change story choices).

1. **A New Beginning** – Welcome to the City (tutorial) · First Contact · Finding Work · A Small Favor · Trouble Nearby
2. **City Problems** – The Missing Package · Unwanted Attention (escape a police pursuit) · Old Connections · The Safehouse · A Dangerous Deal
3. **The Bigger Picture** – Neighborhood Conflict · Under Surveillance · The Truth · Final Decision · New Beginnings

Your decisions carry over: the locket you return or sell, whether you trust Rico, who gets the ledger, how you settle the park dispute, whether you take Detective Hale's bribe – all change later dialogue and the **five endings** (A Clean City, The Bitter Truth, The New Order, Betrayed, A Fresh Start). Dialogue boxes have portraits, names, a typewriter effect and numbered replies (1-4 or click).

## Side jobs & events
Open the **Job board** (J → JOBS): food delivery, package delivery, taxi rides (stop next to the passenger in any vehicle), lost-item recovery, stolen-van recovery, shop supplies. All repeat and pay more for longer trips. Random events appear while exploring: a mugging you can stop, a dropped wallet (keep it or hand it in), police roadside stops.

## Economy, reputation, vehicles
- **Money** and **reputation** (Newcomer → Legend) are shown on the HUD; 30+ reputation gives a 10 % shop discount and unlocks better clothes/vehicles.
- **Shops**: talk to shopkeepers (E) – general stores, hardware (melee weapons), pharmacy, clothing (outfits are permanent unlocks), and **Gordy's Used Cars** (buy a motorcycle, sedan, van or truck; it stays yours, locks with L and is saved).
- **Safehouse** (unlocked in mission 9): rest to heal and save.
- **Driving**: smooth acceleration, speed-dependent steering, proper reverse, handbrake, rectangular collision footprints so cars can't clip into walls, safe exits (never inside walls; refuses when there is no room), fuel (gas stations: hold F), damage with smoke/fire/wrecks, repairs (R at a gas station), locked cars (press E twice to break in – a crime if seen), engine/horn/siren sounds. Movement uses elapsed time, so speed does not depend on FPS.

## Saving
Pause → **Save Game** (3 slots) or sleep at the safehouse. An **autosave** is written after every mission. Saves (localStorage) include appearance, position, health/stamina, money, reputation, inventory and weapons, owned vehicles, missions (completed / active step / failed), story choices, opened containers and defeated enemies. Loading rebuilds the world once, so NPCs, vehicles and items are never duplicated.

## Project layout
```
src/main.js, config.js
src/assets/      textures.js, cityArt.js (procedural art)
src/scenes/      Boot, Menu, Character, Game, UI, Pause, GameOver, Map, Missions, Shop, Dialogue, Ending, SaveLoad, Credits, Settings
src/entities/    Player, Enemy (armed NPCs / police), Civilian (+ story characters), Vehicle
src/systems/     WorldGen, Combat, Loot, Wanted, Missions (engine), Dialogue, Events (random events), Profile, Save, Audio, Settings, Touch
src/story/       missions.js (15 story missions), side.js (job templates), dialogues.js, npcs.js, places.js
src/autotest.js  dev end-to-end test: open http://localhost:5173/?autotest and read the console
```
