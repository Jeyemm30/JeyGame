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

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Aim |
| Left click | Shoot (hold for auto weapons) |
| R | Reload |
| Shift | Sprint (uses stamina, louder, less accurate) |
| E | Loot items, open crates / supply boxes, open & close doors |
| 1-4 / Q | Switch weapon (pistol, rifle, shotgun, sniper) / cycle |
| H | Use medkit |
| F | Use armor plate |
| Tab (or I) | Inventory (click a weapon to equip, buttons to use supplies) |
| Mouse wheel | Zoom |
| ESC | Pause |

## Gameplay notes

- Large 120x120-tile map: river with bridges, roads with barricades, forests, houses, abandoned buildings, warehouses and four fenced military camps plus a checkpoint near your spawn.
- Enemies patrol or guard, hear gunshots, chase, shoot, take cover behind walls/barricades and open doors. They drop weapons, ammo, medkits, armor and backpacks.
- Forest clearings hide supply stashes (not shown on the minimap) with the best loot.
- Backpacks (max 2) raise ammo, medkit and plate capacity.
- Reinforcements hunt you every 40 seconds.

## Project layout

```
index.html
package.json / vite.config.js
src/main.js              Phaser bootstrap
src/config.js            weapons, ammo, constants
src/assets/textures.js   procedural pixel-art generation
src/scenes/              Boot, Menu, Game, UI (HUD/inventory), Pause, GameOver, Settings
src/entities/            Player, Enemy
src/systems/             WorldGen, Combat, Loot, Audio, Settings, Rng
src/ui/widgets.js        buttons / labels / controls panel
```
