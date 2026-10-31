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
import SaveLoadScene from './scenes/SaveLoadScene.js';
import CreditsScene from './scenes/CreditsScene.js';
import EndingScene from './scenes/EndingScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import { VIEW_W, VIEW_H } from './config.js';
import { initTouch } from './systems/Touch.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0b0f0b',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
  physics: { default: 'arcade', arcade: { fps: 120, gravity: { x: 0, y: 0 } } },
  input: { activePointers: 4 },
  // Order matters: later scenes render on top of earlier ones.
  scene: [BootScene, MenuScene, CharacterScene, GameScene, UIScene, PauseScene, GameOverScene, MapScene, MissionsScene, ShopScene, DialogueScene, EndingScene, SaveLoadScene, CreditsScene, SettingsScene]
};

initTouch();
window.__game = new Phaser.Game(config);

// Developer smoke test: open http://localhost:5173/?autotest to exercise the game automatically.
if (location.search.includes('autotest')) import('./autotest.js').then((m) => m.runAutotest(window.__game));
