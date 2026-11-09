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
  physics: { default: 'arcade', arcade: { fps: touch.detected ? 60 : 90, gravity: { x: 0, y: 0 } } },
  render: { antialias: false, batchSize: 4096 },
  fps: { target: 60, smoothStep: true },
  input: { activePointers: 4 },
  scene: [BootScene, MenuScene, CharacterScene, GameScene, UIScene, PauseScene, GameOverScene, MapScene, MissionsScene, ShopScene, ArmsScene, WiseScene, CasinoScene, AtmScene, VaultScene, GangScene, DialogueScene, EndingScene, SaveLoadScene, CreditsScene, SettingsScene, IntroScene, StoreScene, LockpickScene]
};

window.__game = new Phaser.Game(config);

// Responsive canvas refitting when rotating or resizing on mobile (Android & iOS)
const refit = () => {
  if (!window.__game || !window.__game.scale) return;
  const gameEl = document.getElementById('game');
  const w = window.visualViewport ? Math.round(window.visualViewport.width) : (window.innerWidth || document.documentElement.clientWidth);
  const h = window.visualViewport ? Math.round(window.visualViewport.height) : (window.innerHeight || document.documentElement.clientHeight);
  
  if (w > 0 && h > 0) {
    if (gameEl) {
      gameEl.style.width = w + 'px';
      gameEl.style.height = h + 'px';
    }
    window.__game.scale.setParentSize(w, h);
  }
  window.__game.scale.refresh();
};

const triggerRefit = () => {
  refit();
  requestAnimationFrame(refit);
  setTimeout(refit, 50);
  setTimeout(refit, 150);
  setTimeout(refit, 300);
  setTimeout(refit, 600);
  setTimeout(refit, 1000);
};

// Immediate and lifecycle triggers
triggerRefit();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', triggerRefit);
}
window.addEventListener('load', triggerRefit);
window.addEventListener('resize', triggerRefit);
window.addEventListener('orientationchange', triggerRefit);
if (window.screen && window.screen.orientation) {
  window.screen.orientation.addEventListener('change', triggerRefit);
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', triggerRefit);
  window.visualViewport.addEventListener('scroll', triggerRefit);
}

// Developer smoke test: open http://localhost:5173/?autotest to exercise the game automatically.
if (location.search.includes('autotest')) import('./autotest.js').then((m) => m.runAutotest(window.__game));
if (location.search.includes('autostart')) import('./autotest.js').then((m) => m.autostart(window.__game, new URLSearchParams(location.search).get('show')));
