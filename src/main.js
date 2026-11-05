import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import CharacterScene from './scenes/CharacterScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import MapScene from './scenes/MapScene.js';
import DialogueScene from './scenes/DialogueScene.js';
import MissionsScene from './scenes/MissionsScene.js';
import ShopScene from './scenes/ShopScene.js';
import ArmsScene from './scenes/ArmsScene.js';
import WiseScene from './scenes/WiseScene.js';
import CasinoScene from './scenes/CasinoScene.js';
import AtmScene from './scenes/AtmScene.js';
import VaultScene from './scenes/VaultScene.js';
import GangScene from './scenes/GangScene.js';
import SaveLoadScene from './scenes/SaveLoadScene.js';
import CreditsScene from './scenes/CreditsScene.js';
import EndingScene from './scenes/EndingScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import IntroScene from './scenes/IntroScene.js';
import StoreScene from './scenes/StoreScene.js';
import { VIEW_W, VIEW_H } from './config.js';
import { initTouch, touch } from './systems/Touch.js';

initTouch();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0b0f0b',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
  // phones get a lower physics rate (60 Hz), desktops 90 Hz (was 120: twice the collision work per frame; the fastest bullet, 1300 px/s, still moves < 15 px per step, less than an NPC is wide); everything is delta-time based so gameplay is unchanged
  physics: { default: 'arcade', arcade: { fps: touch.detected ? 60 : 90, gravity: { x: 0, y: 0 } } },
  render: { antialias: false, powerPreference: 'high-performance', batchSize: 4096 },
  fps: { target: 60, smoothStep: true },
  input: { activePointers: 4 },
  // Order matters: later scenes render on top of earlier ones.
  scene: [BootScene, MenuScene, CharacterScene, GameScene, UIScene, PauseScene, GameOverScene, MapScene, MissionsScene, ShopScene, ArmsScene, WiseScene, CasinoScene, AtmScene, VaultScene, GangScene, DialogueScene, EndingScene, SaveLoadScene, CreditsScene, SettingsScene, IntroScene, StoreScene]
};

window.__game = new Phaser.Game(config);

// keep the canvas fitted when the phone rotates or the browser toolbar shows / hides
const refit = () => window.__game && window.__game.scale.refresh();
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => setTimeout(refit, 250));
if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);

// Developer smoke test: open http://localhost:5173/?autotest to exercise the game automatically.
if (location.search.includes('autotest')) import('./autotest.js').then((m) => m.runAutotest(window.__game));
if (location.search.includes('autostart')) import('./autotest.js').then((m) => m.autostart(window.__game, new URLSearchParams(location.search).get('show')));
