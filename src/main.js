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
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
  // phones get a lower physics rate (60 Hz), desktops 90 Hz (was 120: twice the collision work per frame; the fastest bullet, 1300 px/s, still moves < 15 px per step, less than an NPC is wide); everything is delta-time based so gameplay is unchanged
  physics: { default: 'arcade', arcade: { fps: touch.detected ? 60 : 90, gravity: { x: 0, y: 0 } } },
  render: { antialias: false, powerPreference: 'high-performance', batchSize: 4096 },
  fps: { target: 60, smoothStep: true },
  input: { activePointers: 4 },
  // Order matters: later scenes render on top of earlier ones.
  scene: [BootScene, MenuScene, CharacterScene, GameScene, UIScene, PauseScene, GameOverScene, MapScene, MissionsScene, ShopScene, ArmsScene, WiseScene, CasinoScene, AtmScene, VaultScene, GangScene, DialogueScene, EndingScene, SaveLoadScene, CreditsScene, SettingsScene, IntroScene, StoreScene, LockpickScene]
};

window.__game = new Phaser.Game(config);

// Responsive canvas refitting and orientation handling
const checkOrientation = () => {
  const prompt = document.getElementById('rotate-prompt');
  if (!prompt) return;

  const w = window.innerWidth || document.documentElement.clientWidth;
  const h = window.innerHeight || document.documentElement.clientHeight;
  const isLandscape = (w > h)
    || (window.screen && window.screen.orientation && window.screen.orientation.type && window.screen.orientation.type.includes('landscape'))
    || (typeof window.orientation === 'number' && Math.abs(window.orientation) === 90);

  if (isLandscape) {
    prompt.style.setProperty('display', 'none', 'important');
  } else {
    if (!prompt.classList.contains('dismissed')) {
      prompt.style.removeProperty('display');
    }
  }
};

const refit = () => {
  checkOrientation();
  if (!window.__game || !window.__game.scale) return;
  const gameDiv = document.getElementById('game');
  const w = window.innerWidth || document.documentElement.clientWidth;
  const h = window.innerHeight || document.documentElement.clientHeight;
  if (gameDiv) {
    gameDiv.style.width = w + 'px';
    gameDiv.style.height = h + 'px';
  }
  window.__game.scale.refresh();
};

const triggerRefit = () => {
  refit();
  setTimeout(refit, 50);
  setTimeout(refit, 150);
  setTimeout(refit, 300);
  setTimeout(refit, 600);
};

window.addEventListener('resize', triggerRefit);
window.addEventListener('orientationchange', triggerRefit);
if (window.screen && window.screen.orientation) {
  window.screen.orientation.addEventListener('change', triggerRefit);
}
if (window.visualViewport) window.visualViewport.addEventListener('resize', triggerRefit);

// Setup portrait helper buttons (Play in Fullscreen vs Play in Portrait)
function setupOrientationPrompt() {
  const prompt = document.getElementById('rotate-prompt');
  const btnFs = document.getElementById('btn-fullscreen-landscape');
  const btnDismiss = document.getElementById('btn-portrait-dismiss');
  if (!prompt) return;

  checkOrientation();

  if (btnFs) {
    btnFs.addEventListener('click', async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.body.requestFullscreen) {
          await document.body.requestFullscreen().catch(() => {});
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) { /* ignored */ }
      prompt.classList.add('dismissed');
      prompt.style.setProperty('display', 'none', 'important');
      triggerRefit();
    });
  }

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      prompt.classList.add('dismissed');
      prompt.style.setProperty('display', 'none', 'important');
      triggerRefit();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupOrientationPrompt);
} else {
  setupOrientationPrompt();
}

// Developer smoke test: open http://localhost:5173/?autotest to exercise the game automatically.
if (location.search.includes('autotest')) import('./autotest.js').then((m) => m.runAutotest(window.__game));
if (location.search.includes('autostart')) import('./autotest.js').then((m) => m.autostart(window.__game, new URLSearchParams(location.search).get('show')));
