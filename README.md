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
| W A S D | Move on foot (**W = up the screen at any camera angle**) · in a vehicle: **W** gas, **S** brake/reverse, **A/D** steer |
| **Q / E** | **Rotate the camera** left / right around the player (hold; continuous 360°) · or hold the **right mouse button** and drag · **V** (or click the compass) resets the angle |
| Mouse / left click | Aim / attack (swing the melee weapon or fire a gun) - aiming follows the cursor |
| Space | Melee swing (fists if a gun is out) · **handbrake** in a vehicle |
| Z · X · 1-6 | Cycle melee · cycle all weapons · gun class: **1** pistols, **2** SMGs, **3** rifles, **4** shotguns, **5** snipers, **6** heavy (press again to cycle inside the class) |
| F | Talk, pick up, search, open doors, enter / exit vehicles, take down an unaware enemy from behind |
| Shift · C | Sprint (noisy) · crouch (quiet) |
| R · H · G | Reload · medkit · armor plate (in a car at a gas station: **R** repair, hold **G** refuel; H = horn) |
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

## Atmosphere (day/night + weather)
A full day lasts 16 minutes. Dawn, dusk and night tint the world, streetlights and vehicle headlights glow after dark, and interiors are lit when you walk inside. Weather drifts between clear, cloudy, rain and fog. Dev shortcuts: **O** cycles the weather, **Y** skips 3 hours. Characters have idle/walk/run/crouch/hurt/sit/panic/fall poses; vehicles show brake and reverse lights; roofs have eaves, chimneys, AC units and vents.

## Visuals
- **Characters** have 18 pose frames per direction (idle, breathing idle, walk, run, crouch, hurt, pickup/search, sit, panic, three-stage death fall) with pixel outlines. Police and enemies crouch in cover and lean in to investigate; civilians gesture while talking, panic when fleeing, carry crates (workers) and lean in to open doors.
- **Buildings** have eaves + gutters, chimneys, rooftop AC units / vents, porches with steps, striped shop awnings, window flower boxes and shutters, apartment balconies, fenced backyards with gate posts. Roofs fade out when you walk inside.
- **Vehicles** show brake / reverse lights, headlights and tail glow at night, a swinging door when you get in or out, and outlined sprites. The fire stations have red fire engines.
- **Atmosphere**: a 16-minute day/night cycle (clock + weather on the HUD), streetlight glow, interior lighting, clear / cloudy / rain / fog, puddles and rain ripples. Dev keys: **O** weather, **Y** +3 hours.
- **Camera**: the player sits low on screen so you see more of the street ahead; look-ahead eases toward your movement / aim; wheel and +/- buttons zoom.
- **Environment**: bushes, flowers, rocks, leaves, bicycles, hydrants, bins, benches, trees of several sizes.

## World size
The city is 380 x 272 tiles (about 3x the original) and still one connected road network: 9 avenues x 7 streets, 21 named districts, an inner river with bridges, suburbs with driveways, a school and sports field, two shopping centres, apartment blocks, two fire stations, a second park, abandoned neighbourhoods and extra industrial / dock zones, plus the original hospital, police station and Fort Merrow. Trees, bushes and props are loaded in 512 px chunks around the camera and recycled from a pool, and roofs outside the view are hidden, so the bigger map costs about the same to draw. The world map and minimap are generated from the real world data, so they always match.

## Fixed angled 2.5D camera
The camera has **one fixed viewing angle** (camera rotation - Q / E, right-drag, V, the touch < > buttons and the rotation settings - was removed). It still follows the player, zooms with the wheel / + - buttons and respects the map bounds. The upright-billboard / extruded-wall rendering below is unchanged; it simply always runs at angle 0.

**Lower, angled view:** the camera looks at the world from a low angle (ground foreshortening `TILT = 0.62` at the top of `GameScene.js`; 1.0 would be straight top-down). The tilt is applied inside the camera transform *after* the rotation, so the ground recedes toward the top of the screen at every orbit angle, and every upright object is pre-stretched by 1 / TILT so it keeps its full height instead of being squashed. Walls are 40 px tall faces, roofs sit on top of them, furniture / fences stand up, shadows lie flat on the ground, and a roof or wall face turns see-through when it would hide the player standing behind it. This is still 2D art projected onto a tilted plane - not a real 3D camera.

How it works (it is not a flat image spun in 2D): the ground plane - roads, grass, floors, roofs, shadows - rotates with the world; everything that stands up is a *billboard* that stays upright and is placed, depth-sorted and lifted along the **screen's** vertical axis: characters, vehicles, trees and props. Walls, windows and doors are real extruded faces: every exposed side that points toward the camera is drawn as one skewed, shaded panel (so a wall stays one continuous surface at any angle), wall tops lie flat, and glass towers get full extruded sides. Input is transformed too: W/A/S/D, the mouse aim, touch sticks and bullets all use the rotated frame, while collisions, AI and pathfinding keep working in world coordinates, so the camera cannot affect them.

Limits (needs extra art to do better): the sprites only have south / north / side drawings, so a character or car seen from an in-between angle uses the nearest drawing; furniture inside buildings is flat top-down art that simply rotates with the floor; the wall art is a single brick/window/door picture that is stretched onto every side. Four-sided sprite sheets for characters, vehicles and buildings would make the orbit look fully solid.

## Weapons & Kenny Aquiles' black market
- **17 firearms**: pistols (Glock 17, Desert Eagle, .357 Revolver, Suppressed Pistol), SMGs (Uzi, MP5, MAC-10), rifles (AK-47, M4A1, SCAR-L 3-round burst), shotguns (Pump, Double-Barrel, Tactical semi-auto), snipers (Bolt-Action, SVD Semi-Sniper), heavy (Light Machine Gun with a 100-round belt, Rocket Launcher with area damage - it hurts you too). **8 melee weapons** including the new Katana.
- Each has its own damage, fire rate, spread, range, magazine, reload time, price, ammo type (10 ammo types, each with its own cap), synthesised gun sound, muzzle flash / tracer, recoil, and reload animation (magazine, shell-by-shell, revolver cylinder, belt, rocket tube). Pump shotgun and bolt sniper rack after each shot, the suppressed pistol is nearly silent and flash-less, burst rifles fire timed bursts, heavy guns slow you down. Stats live in `WEAPONS` / `MELEE` / `AMMO_TYPES` in `src/config.js`.
- **Kenny Aquiles** (chubby, glasses, purple jacket) runs a hidden gang alley in the south-west (Southgate): look for the walled-in warehouse block, a gap in the fence flanked by dumpsters, and a lookout crew. Inside: graffiti walls, flickering bulbs, neon, a fire barrel, junk furniture, motorbikes, a weapon rack and a trading counter. The place appears on your map once you discover it.
- Talk to Kenny (**F**) for the shop: tabs for Pistols / SMGs / Rifles / Shotguns / Snipers / Heavy / Melee / Ammo / Sell, with damage, fire rate, reload time, magazine, ammo type and description for every item. Buying hands you a weapon plus one magazine, ammo can be topped up per pack, you can sell guns and blades back (40 % / 35 % of the price), you cannot buy the same weapon twice, and Kenny reacts differently to first visits, repeat visits, purchases, being broke and selling. Weapons and ammo are saved with the game.
- The gang (7 members: lookouts, guards, a leaner, a sitter, a patroller) ignores you until you point a drawn gun at them for a few seconds (one warning first) or attack one of them. Only the members near the incident turn hostile; far ones just get suspicious.

## WISE SOLE - streetwear & sneakers (Ezekiel Blackwell)
- A boutique at the west end of **Market Street** (the shopping block just north of the starting area): neon storefront sign with the tagline "Step Smart. Dress Sharp.", glass display windows, planters and poster boards outside; inside a sneaker wall, clothing racks, mannequins in full outfits, mirrors and a curtained fitting corner with try-on benches, a premium sneaker display case and the cashier counter. It has its own map icon (pink sneaker) and legend entry, and the shop lights glow at night.
- **Ezekiel Blackwell** (big, thick round glasses, blue mohawk, oversized orange tee, baggy pants, gold high-tops, gold chain and watch) stands behind the counter. Talk to him (**F**) to open the shop. He has his own idle breathing, talking, arms-up excitement and reaching animations, a dialogue for first visit / returning / every kind of purchase / not enough money / equipping / saving, and **Ask Ezekiel** recommends something based on what you are wearing right now.
- **75 items**: 15 shoe styles/colourways (classic, high-tops, runners, basketball, skate, boots, combat boots, casual, sandals), tees / oversized / polos / tanks, hoodies / jackets / leather jackets, jeans / cargo / joggers / shorts / baggy / tactical pants, caps, beanies, sunglasses, glasses, thick glasses, watches, chains, face masks and bandana, backpacks - plus 7 **complete outfits** (a bit cheaper than the parts) and 7 **limited editions** (one of each, rare + expensive). Some items are tagged NEW, RARE or LIMITED, and four items go **25 % off** (the sale changes every couple of visits).
- Clothes are **really worn**: styles live in the character renderer (`src/assets/wearArt.js`, drawn inside `drawChar`), so buying or equipping regenerates the actual player sprite sheet and every frame - idle, breathing, walk, run, sprint, crouch, hurt, pick-up, sit, panic, death fall, melee, shooting, vehicle enter/exit - carries the outfit, at the same proportions and angled-camera perspective, from front, side and back.
- Shop tabs: Shoes / Shirts / Jackets / Pants / Accessories / Outfits / Limited / Wardrobe. Each row has a pixel icon, price, description, OWNED / EQUIPPED state, **TRY ON** (previews on the left; rotate with < > and animate with WALK) and BUY / EQUIP / TAKE OFF. The **Wardrobe** saves up to 6 looks that you can wear again for free. Money, purchases, saved outfits and what you are wearing are saved with the game.

## The Casino (Sean Whitlock & Jiro Kurogane)
- A landmark casino on the **east bank of the river** (Civic row, just north of the road at the foot of the east bridge): illuminated CASINO sign, neon, glass front with an automatic double door, red carpet with velvet ropes, a **valet stand with three luxury cars**, palms, cafe tables, posters and two suited guards at the entrance. Visitors walk in and out, others smoke or chat out front. It has a map icon and a legend entry ("Casino").
- **Interior** (works with the rotating angled camera, depth sorting, roof X-ray and lighting): marble lobby and **reception**, main **gambling floor** (12 slot machines, 2 blackjack tables, 2 poker-dice tables), **lounge** with sofas, **bar** with stools, bottle shelf and a bartender, **cashier** cage, chandeliers, neon signs (SLOTS / CARDS / WC / VIP / CASHIER / BAR / LOUNGE), a **security office**, **restrooms** and a **VIP room** (poker table, sofa, seated high rollers and a dealer) behind a gate that only VIP members can open. About 39 guests and staff keep the room alive: they pull slot levers, place chips, cheer, drink, chat and walk the floor, each on its own timing.
- **Sean Whitlock** (slim in every sprite and animation, brow / nose / lip piercings, silver swept haircut, leather jacket, chain, rings, stud earring) greets you at reception; **Jiro Kurogane** (big and tall, long black hair, long dark coat, rings, dangling earrings) stands at the card tables next to the VIP gate. Each has their own idle, talking, gesturing (Sean opens his arms, counts chips) and thinking / card-shuffling (Jiro) animations plus their own lines. Talk to either one (**F**) to open the casino.
- **Games** (F at a machine or table, or from the lobby): **Slots** (3 reels; cherry, bell, seven, diamond, star, horseshoe; weighted reels, exact return 87.9%, jackpot x100 on 7-7-7 at about 0.02%), **Blackjack** (6-deck shoe, hit / stand, dealer hits to 16 and stands on every 17, blackjack pays 3:2, win 1:1, push returns the bet, animated deal, flip and totals) and **Poker Dice** (five dice, hold by click or keys 1-5, two re-rolls; Five of a Kind x15, Four x1.5, Straight x1.25, Full House x0.75, Three x0.25, Two Pair x0.15, One Pair x0.1; about 91% return with a simple strategy).
- **Betting**: $10 minimum, $500 maximum ($5,000 for VIPs); +/-, MIN, MAX and chip buttons; bets are clamped to your balance; the stake is taken when a round starts, the result is drawn from a `crypto.getRandomValues` RNG before the animation, payouts happen once, only one round can run at a time, the bet is locked while it runs. Nothing looks at your history, so there is no hidden "luck" adjustment. Leaving a blackjack / dice round forfeits the stake (the first ESC warns you); a slot spin that is already drawn is settled. Loading a save never restores a half-played round, so a bet cannot be refunded or duplicated.
- **VIP and reputation**: reputation grows with every bet (titles Newcomer / Regular / High Roller / Whale). VIP comes from buying it at the cashier ($5,000) or automatically at 150 reputation: higher max bet, the VIP room, and free **cosmetic rewards** (Lucky Horseshoe Chain, Black Tuxedo, High Roller Shades, Diamond Rings, High Roller Coat) that you can WEAR on your character. Nothing in the story needs the casino.
- **Security**: guards patrol the floor and watch the doors. Point a drawn gun at the crew and one guard walks up to warn you; keep it up and the nearby crew turns hostile. Attacking guards or guests is a normal crime.
- Real money is not involved anywhere: it is the game's own money only. Saved in the normal save file under `profile.flags.casino` (balance, VIP, reputation, rewards, stats, last rounds).
- Code: `src/systems/Casino.js` (rules + bookkeeping, unit-tested), `src/scenes/CasinoScene.js` (screens), `src/assets/casinoArt.js` (art), `src/story/casinoTalk.js` (dialogue), `casino()` in `src/systems/WorldGen.js`, patrons in `src/entities/Civilian.js`.

## House interiors & the bigger WISE SOLE
- **Every house has its own theme**: modern, simple family home, luxury, old-fashioned, poor, cozy, large family residence, apartment-style, and abandoned (wrecked). The theme is chosen per house (from its position, so it never changes between games) and sets the floor types, furniture styles and colours (6 palettes), TV / lamp / sofa / bed models, rugs (rectangular, small, round), curtains, plants, clocks, family photographs, bookshelves, pianos, fireplaces, aquariums, kids' rooms with toys, desks with computers, some tidy and some messy rooms.
- **Furniture is real pixel-art objects, not coloured boxes**: sofas with cushions, beds with pillows and blankets, wardrobes, dressers, nightstands with lamps, fridges, stoves, kitchen cabinets with appliances, sinks, dining tables set with plates, toilets, vanities with mirrors, bathtubs, showers, towels, shoes and a coat rack at the front door, trash bins, storage shelves and boxes, ceiling lights, wall pictures. Each piece has a shadow and keeps correct depth sorting.
- The original furniture placement and **every loot container are kept in exactly the same place** (they are converted into the detailed furniture), so the world, saves and loot are unchanged. New decoration is placed last, on its own random stream, never on a pickup, crate, container or NPC spawn, and each piece is checked so no room is cut off from the front door and no container is boxed in. Tall furniture still blocks line of sight like before.
- **WISE SOLE** is now 14 x 13 (was 14 x 10) with: entrance and welcome area (branded rug), a **sneaker wall** and **shoe islands** with individually drawn sneakers (different models and colours), glass **limited-edition** cases, try-on benches with seating, **clothing racks** (hoodies, jackets, jeans, tees) and folded-clothes shelves, a **caps / beanies / sunglasses / watches / necklaces / backpacks** accessory wall with glass cases, five mannequins in different outfits, a **checkout counter** (register, monitor, shopping bags, shoe boxes), a curtained **fitting room** with mirrors, a **backroom** with stock shelves, a WISE SOLE logo wall, posters, plants, track lights and spotlights. Ezekiel Blackwell stands at the end of the counter and the whole shop (browse, preview, buy, equip, save) works as before. About eight customers browse sneakers, try shoes on, look through the racks, pay, and walk in and out.
- Code: `src/assets/homeArt.js` and `src/assets/wiseStoreArt.js` (art), `decorateHome()` and `wiseSole()` in `src/systems/WorldGen.js`.

## The four street gangs (Red Dogs, Cobalt Wolves, Violet Vultures, Emerald Vipers)
- **Four gangs, one per corner of the map**, each with a boss, a hideout, a territory, a colour, its own look, vehicles and weapon pool. Press **K** for the gang overview (colours, bosses, your standing, allies/rivals, current contract, gang news).

  | Gang | Colour | Boss | Hideout | Weapons |
  |---|---|---|---|---|
  | **Red Dogs** | red | Kenny Aquiles (unchanged, still sells weapons) | Kenny's hidden alley, south-west | pistols, revolvers, SMGs, bats, pipes, knives |
  | **Cobalt Wolves** | blue | Dante "Frost" Reyes (slim, sunglasses, silver quiff, leather jacket) | warehouse yard, north-east | SMGs and assault rifles |
  | **Violet Vultures** | purple | Lilith "Madame" Vex (hat, round glasses, gold jewellery) | open-bay garage, south-east | pistols, shotguns, crowbars, machetes |
  | **Emerald Vipers** | green | Tomas "Moss" Okafor (big, bald, cowboy hat) | fenced shack compound, north-west | a bit of everything |

  The corner hideouts are built on empty forest land, never over existing buildings. Each has graffiti in the gang colour, flags, tables with sitting members, crates (lootable), fire barrels, a boss area (couch, rug, weapon rack, neon sign), bodyguards, gate guards, an inside patrol, lights, and parked gang cars. Hideouts are found by walking up to them (then they appear on the map).
- **Recognisable members**: 6 looks per gang in the gang colour (bandanas, jackets, hoodies, caps, shoes, armband, accessories), different combinations so nobody is identical. Gang cars are painted in the gang colour with a stripe and cruise their own streets.
- **Weapons**: every member gets a weapon from the gang's pool (real stats from the weapon table: damage, fire rate, spread, range, burst) or a melee weapon (bat, pipe, knife, crowbar, machete) with a real melee AI. Bosses and bodyguards get better gear (SCAR, Desert Eagle, tactical shotgun ...). The gun they hold is the gun they fire.
- **Relationships** (configurable in src/story/gangs.js): Red-Blue and Blue-Purple are rivals, Red-Green and Purple-Green are allies, the rest neutral. They decide how your reputation ripples: hurting a gang also upsets its allies and slightly pleases its rivals. Gangs only ever react to the PLAYER: NPC-vs-NPC fights (gang vs gang, police vs gang) and sudden raids/shootouts are switched OFF (FACTION_WARS in src/entities/GangAI.js); the code is kept for later.
- **Gangs and police**: they behave independently. Gang fights never involve the police or change the wanted level unless you start something.
- **City life**: members patrol the streets of their territory, gather around their boss, sit at tables and guard gates; killed hideout members are replaced out of sight (never in view); a killed boss stays away for 20 game minutes. Occasionally a few members walk to their boss to gather. There are no random gang wars or police raids.
- **Reputation** per gang (Hostile / Neutral / Friendly), saved with the game: hurting a gang costs standing with it, its allies dislike you and its rivals like you a little. Hostile standing means members shoot on sight around their turf, neutral means a warning first when you point a gun at them, friendly means they leave you alone. Bosses talk to you (F) unless hostile: ask for a **contract** (put down 3 members of an enemy gang, $300 + standing), ask about their turf and enemies, or pay respects ($200). Joining a gang is never required.
- Code: `src/story/gangs.js` (data + reputation), `src/entities/GangAI.js` (faction fights), `src/systems/GangEvents.js` (events), `src/assets/gangArt.js`, `src/scenes/GangScene.js`, hideouts in `src/systems/WorldGen.js` (built last with their own random stream, so the rest of the city is unchanged).

## Hideout rooms, boss behavior, dialogue UI
- Each gang hideout (Wolves, Vultures, Vipers) now has a different multi-room interior: meeting hall / garage floor, boss room, weapon storage (with a back door), guard room and sleeping room, with real doors that the crew opens, furniture, lights and collision.
- Bosses live in their private room: they sit, stand, work the desk, check weapons and talk to guards, and never wander outside. When attacked they fight, badly hurt ones escape through the inner door, and afterwards they walk back to the room. Members have posts in rooms, halls and the yard.
- Entering a private room (boss room, weapon storage) without respect gives a warning first, then the crew turns hostile.
- The dialogue window now fits any window size; the header and portrait stay fixed and only the replies scroll (wheel, drag, arrows, PageUp/PageDown, or number keys).

## Gang progression: reputation, gates, jobs, boss respawn
- **Reputation tiers** (per gang, independent; thresholds live in `GANG_CFG` in `src/story/gangs.js`): Unknown, Recognized (15), Trusted (40), Respected (70), plus Hostile (-30 or lower). Rivals and allies only get small side effects (hurting the Wolves makes their rivals like you a little).
- **Named gate guards** (Pit - Red Dogs, Wire - Cobalt Wolves, Dolly - Violet Vultures, Gator - Emerald Vipers): unkillable, immovable, never leave the gate. The Wolves, Vultures and Vipers hideouts are fenced with one real gate (a barrier that blocks you on foot and in a car) that opens at **Trusted** and closes again if your standing drops. Kenny's alley has a guard but no barrier (the weapon shop stays open). Hurting a guard costs reputation and raises hideout security.
- **Jobs** (talk to the guard, F): delivery, territory patrol, recovery, rival investigation, protection, gang defense; **boss assignments** from the boss at Respected. Each gang has its own texts, characters and rewards; jobs show in the mission panel with waypoints, have time limits, cooldowns and consequences for failing or dropping them. "Make amends" ($300) lets a hostile standing recover.
- **Boss defeat**: a beaten boss surrenders (unique lines per boss), the crew defends / retreats / gives up, and the boss is carried off. He respawns in his private room after 10 **real** minutes (timestamp saved in the save and mirrored in the browser, so a refresh does not reset it). Beating a boss costs reputation instead of giving it.
- **Memory**: gangs remember attacks on their people, guard assaults, betrayals, boss defeats and finished jobs (their dialogue changes). Wearing a rival gang's colours (two pieces) near a hideout makes them suspicious. The boss room and weapon store are private unless you are Respected.
