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
import LockpickScene from './scenes/LockpickScene.js';
import { VIEW_W, VIEW_H } from './config.js';
import { initTouch, touch } from './systems/Touch.js';

initTouch();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#080a0f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: VIEW_W,
    height: VIEW_H
  },
  // phones get a lower physics rate (60 Hz), desktops 90 Hz
  physics: { default: 'arcade', arcade: { fps: touch.detected ? 60 : 90, gravity: { x: 0, y: 0 } } },
  render: { antialias: false, batchSize: 4096 },
  fps: { target: 60, smoothStep: true },
  input: { activePointers: 4 },
  // Order matters: later scenes render on top of earlier ones.
  scene: [BootScene, MenuScene, CharacterScene, GameScene, UIScene, PauseScene, GameOverScene, MapScene, MissionsScene, ShopScene, ArmsScene, WiseScene, CasinoScene, AtmScene, VaultScene, GangScene, DialogueScene, EndingScene, SaveLoadScene, CreditsScene, SettingsScene, IntroScene, StoreScene, LockpickScene]
};

window.__game = new Phaser.Game(config);

// Responsive canvas refitting when rotating or resizing
const refit = () => {
  if (!window.__game || !window.__game.scale) return;
  const gameDiv = document.getElementById('game');
  if (gameDiv) {
    gameDiv.style.removeProperty('width');
    gameDiv.style.removeProperty('height');
  }
  window.__game.scale.refresh();
};

const triggerRefit = () => {
  requestAnimationFrame(refit);
  setTimeout(refit, 50);
  setTimeout(refit, 150);
  setTimeout(refit, 300);
  setTimeout(refit, 600);
  setTimeout(refit, 1000);
};

window.addEventListener('resize', triggerRefit);
window.addEventListener('orientationchange', triggerRefit);
if (window.screen && window.screen.orientation) {
  window.screen.orientation.addEventListener('change', triggerRefit);
}
if (window.visualViewport) window.visualViewport.addEventListener('resize', triggerRefit);

// Handle WebGL context recovery on mobile GPUs during rotation
window.__game.events.once('ready', () => {
  const canvas = window.__game.canvas;
  if (canvas) {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      if (window.__game && window.__game.scale) {
        window.__game.scale.refresh();
      }
    }, false);
  }
});

// Developer smoke test: open http://localhost:5173/?autotest to exercise the game automatically.
if (location.search.includes('autotest')) import('./autotest.js').then((m) => m.runAutotest(window.__game));
if (location.search.includes('autostart')) import('./autotest.js').then((m) => m.autostart(window.__game, new URLSearchParams(location.search).get('show')));
