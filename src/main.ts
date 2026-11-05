import './style.css';
import { Game, GameModeState } from './core/Game';
import { ScoreManager } from './core/ScoreManager';
import { StorageService } from './services/StorageService';
import { LeaderboardClient } from './services/LeaderboardClient';
import { SoundSynthesizer } from './audio/SoundSynthesizer';
import { createPlayerShip, DEFAULT_PLAYER_CONFIG } from './components/PlayerComponents';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { EnemyPool } from './ecs/EnemyPool';
import { EnemySystem } from './systems/EnemySystem';
import { WaveSpawnSystem } from './systems/WaveSpawnSystem';
import { HealthSystem } from './systems/HealthSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { PowerUpPool } from './components/PowerUp';
import { DropSystem } from './systems/DropSystem';
import { RenderSystem } from './systems/RenderSystem';
import { VFXSystem } from './systems/VFXSystem';
import { HUD } from './ui/HUD';
import { GameOverScreen } from './ui/GameOverScreen';
import { SettingsModal } from './ui/SettingsModal';

/**
 * STAR VANGUARD - Application Entry Point & Full Game Lifecycle Orchestration (T043).
 * Wires all ECS systems, object pools, audio synthesizer, leaderboard client, and UI overlays.
 */
export function bootstrapGame(canvasElement?: HTMLCanvasElement): Game {
  const canvas =
    canvasElement ??
    (document.getElementById('game-canvas') as HTMLCanvasElement | null);
  if (!canvas) {
    throw new Error('Không tìm thấy phần tử #game-canvas để khởi tạo trò chơi.');
  }

  const game = new Game(canvas);
  game.setState(GameModeState.TITLE);
  const { entities, eventBus, spatialGrid } = game;

  // 1. Persistence, Leaderboard & Audio Services
  const storage = new StorageService();
  const leaderboardClient = new LeaderboardClient(storage);
  const scoreManager = new ScoreManager(eventBus, storage);
  const initialSettings = storage.loadSettings();
  const soundSynth = new SoundSynthesizer(eventBus, initialSettings.masterVolume);

  // 2. Create Player Ship Entity
  const playerId = createPlayerShip(entities, DEFAULT_PLAYER_CONFIG);

  // 3. Core Gameplay ECS Systems & Object Pools
  const inputSystem = new InputSystem(entities, eventBus, playerId, () => {
    const state = game.getState();
    if (state === GameModeState.PLAYING) {
      game.setState(GameModeState.PAUSED);
    } else if (state === GameModeState.PAUSED) {
      game.setState(GameModeState.PLAYING);
    }
  });
  const movementSystem = new MovementSystem(entities, playerId);
  const weaponSystem = new WeaponSystem(
    entities,
    eventBus,
    inputSystem,
    playerId
  );
  weaponSystem.onPlayerFire = (tier) => soundSynth.playLaser(tier);

  const enemyPool = new EnemyPool(entities);
  const enemySystem = new EnemySystem(entities, weaponSystem, playerId);
  const waveSpawnSystem = new WaveSpawnSystem(enemyPool, enemySystem, eventBus);

  // 4. Visual Renderer, VFX Particle Pool & Overlays
  const renderSystem = new RenderSystem(entities, playerId);
  const vfxSystem = new VFXSystem(eventBus, renderSystem, playerId);
  vfxSystem.setAccessibilityPreferences(
    initialSettings.screenShakeIntensity,
    initialSettings.reducedFlash,
    initialSettings.qualityPreset
  );

  let activeSessionToken = '';
  let runStartTimeMs = Date.now();
  let previousHighScore = storage.loadRecord().highScore;

  const gameOverScreen = new GameOverScreen(
    scoreManager,
    () => game.getState(),
    () => leaderboardClient.getTopScores(5)
  );

  const healthSystem = new HealthSystem(
    entities,
    eventBus,
    enemyPool,
    weaponSystem,
    playerId,
    () => {
      // Transition to GAME_OVER when all 3 lives are exhausted (FR-012)
      game.setState(GameModeState.GAME_OVER);
      const scoreState = scoreManager.getState();
      gameOverScreen.isNewRecordOnLastRun =
        scoreState.currentScore > 0 &&
        scoreState.currentScore >= previousHighScore;
      scoreManager.persistRecord();

      const settings = storage.loadSettings();
      const durationSeconds = Math.max(
        2,
        (Date.now() - runStartTimeMs) / 1000
      );

      if (activeSessionToken && scoreState.currentScore > 0) {
        try {
          const result = leaderboardClient.submitScore({
            sessionToken: activeSessionToken,
            playerName: settings.playerName,
            department: settings.department,
            score: scoreState.currentScore,
            highestWave: scoreState.currentWave,
            durationSeconds,
            enemiesDefeated: scoreState.enemiesDefeatedCount
          });
          gameOverScreen.lastSubmittedRank = result.rank;
        } catch {
          gameOverScreen.lastSubmittedRank = null;
        }
      } else {
        gameOverScreen.lastSubmittedRank = null;
      }
    }
  );

  const collisionSystem = new CollisionSystem(
    entities,
    spatialGrid,
    eventBus,
    weaponSystem,
    healthSystem,
    playerId
  );

  const powerUpPool = new PowerUpPool(entities);
  const dropSystem = new DropSystem(
    entities,
    eventBus,
    powerUpPool,
    weaponSystem,
    collisionSystem,
    Game.LOGICAL_HEIGHT,
    (bonusPoints) => scoreManager.addPoints(bonusPoints)
  );

  const hud = new HUD(entities, playerId, {
    getCurrentScore: () => scoreManager.getState().currentScore,
    getHighScore: () => scoreManager.getState().sessionHighScore,
    getCurrentWave: () => waveSpawnSystem.currentWaveIndex || 1,
    getWaveBannerTimer: () => waveSpawnSystem.waveBannerTimer,
    getGameState: () => game.getState(),
    getDebugStats: () => {
      const bulletMetrics = weaponSystem.getPoolMetrics();
      return {
        enabled: game.debugOverlayEnabled,
        fps: game.getFps(),
        frameTimeMs: game.lastFrameDurationMs,
        pools: [
          { name: 'PlayerBlt', metrics: bulletMetrics.playerBullets },
          { name: 'EnemyBlt', metrics: bulletMetrics.enemyBullets },
          { name: 'Enemy', metrics: enemyPool.getMetrics() },
          { name: 'Particle', metrics: vfxSystem.getMetrics() },
          { name: 'PowerUp', metrics: powerUpPool.getMetrics() }
        ]
      };
    }
  });

  // 5. Register Systems in Deterministic Execution Order
  // RenderSystem runs first in render pass, followed by VFXSystem, HUD, and GameOverScreen
  game.addSystem({
    update(dt: number) {
      if (game.getState() === GameModeState.PLAYING) {
        inputSystem.update(dt);
        movementSystem.update(dt);
        weaponSystem.update(dt);
        waveSpawnSystem.update(dt);
        enemySystem.update(dt);
        dropSystem.update(dt);
        healthSystem.update(dt);
        collisionSystem.update(dt);
      }
      renderSystem.update(dt);
      vfxSystem.update(dt);
      hud.update(dt);
      gameOverScreen.update(dt);
    },
    render(ctx: CanvasRenderingContext2D) {
      renderSystem.render(ctx);
      vfxSystem.render(ctx);
      hud.render(ctx);
      gameOverScreen.render(ctx);
    }
  });

  // 6. Start / Restart Run Lifecycle Handler
  const startNewRun = (): void => {
    inputSystem.clearInputs();

    // Reset pools & entities
    weaponSystem.releaseAllBullets();
    powerUpPool.releaseAll();
    waveSpawnSystem.reset();
    vfxSystem.particlePool.releaseAll();

    // Restore Player Ship state (100 HP, 3 Lives, Tier 1 Weapon, Bottom-Center)
    entities.setEntityActive(playerId, true);
    const t = entities.transforms.get(playerId);
    if (t) {
      t.x = DEFAULT_PLAYER_CONFIG.startX;
      t.y = DEFAULT_PLAYER_CONFIG.startY;
      t.vx = 0;
      t.vy = 0;
    }

    const h = entities.healths.get(playerId);
    if (h) {
      h.currentHealth = DEFAULT_PLAYER_CONFIG.maxHealth;
      h.maxHealth = DEFAULT_PLAYER_CONFIG.maxHealth;
      h.livesRemaining = DEFAULT_PLAYER_CONFIG.initialLives;
      h.invulnerableTimer = 1.0;
    }

    weaponSystem.resetPlayerWeaponTier();
    previousHighScore = storage.loadRecord().highScore;
    scoreManager.resetRun();

    const session = leaderboardClient.startSession();
    activeSessionToken = session.sessionToken;
    runStartTimeMs = Date.now();
    gameOverScreen.isNewRecordOnLastRun = false;
    gameOverScreen.lastSubmittedRank = null;

    waveSpawnSystem.startWave(1);
    game.setState(GameModeState.PLAYING);
  };

  // 7. Settings Modal & UI Button Wiring
  const settingsModal = new SettingsModal(storage, (updated) => {
    soundSynth.setVolume(updated.masterVolume);
    vfxSystem.setAccessibilityPreferences(
      updated.screenShakeIntensity,
      updated.reducedFlash,
      updated.qualityPreset
    );
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (settingsModal.isOpen()) return;

      // Toggle runtime pool & FPS debug overlay with F3 or Backquote (`) (T046, Principle IV)
      if (e.code === 'F3' || e.code === 'Backquote') {
        e.preventDefault();
        game.debugOverlayEnabled = !game.debugOverlayEnabled;
        renderSystem.showCoreHitboxDebug = game.debugOverlayEnabled;
        return;
      }

      const state = game.getState();
      if (
        state === GameModeState.TITLE &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        startNewRun();
      } else if (
        state === GameModeState.GAME_OVER &&
        (e.code === 'Enter' || e.code === 'KeyR')
      ) {
        e.preventDefault();
        startNewRun();
      }
    });

    const btnSettings = document.getElementById('btn-settings');
    btnSettings?.addEventListener('click', () => {
      if (game.getState() === GameModeState.PLAYING) {
        game.setState(GameModeState.PAUSED);
      }
      settingsModal.open();
    });

    const btnLeaderboard = document.getElementById('btn-leaderboard');
    btnLeaderboard?.addEventListener('click', () => {
      const state = game.getState();
      if (state === GameModeState.PLAYING) {
        game.setState(GameModeState.PAUSED);
      } else if (state === GameModeState.PAUSED) {
        game.setState(GameModeState.PLAYING);
      }
    });
  }

  game.start();
  return game;
}

// Auto-bootstrap when mounted in browser DOM
if (typeof document !== 'undefined' && document.getElementById('game-canvas')) {
  bootstrapGame();
}
