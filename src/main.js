import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import { VIEW_W, VIEW_H } from './config.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0b0f0b',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { fps: 120, gravity: { x: 0, y: 0 } } },
  input: { activePointers: 2 },
  // Order matters: later scenes render on top of earlier ones.
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, GameOverScene, SettingsScene]
};

window.__game = new Phaser.Game(config);
