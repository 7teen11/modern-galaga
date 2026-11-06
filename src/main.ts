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
import { ParallaxSystem } from './systems/ParallaxSystem';
import { RenderSystem } from './systems/RenderSystem';
import { VFXSystem } from './systems/VFXSystem';
import { HUD } from './ui/HUD';
import { GameOverScreen } from './ui/GameOverScreen';
import { SettingsModal } from './ui/SettingsModal';

// Feature 002: Modular Hell Mode & Localization Imports
import { i18n } from './i18n';
import { HellDirector } from './modes/hell/HellDirector';
import { HellDamageSystem } from './modes/hell/HellDamageSystem';
import { HellWaveSystem } from './modes/hell/HellWaveSystem';
import { HellBossPool } from './modes/hell/HellBossPool';
import { HellBossSystem } from './modes/hell/HellBossSystem';
import { HellLeaderboardClient } from './modes/hell/HellLeaderboardClient';
import { ModeSelectorUI } from './modes/hell/ui/ModeSelectorUI';
import { HellHUDTheme } from './modes/hell/ui/HellHUDTheme';
import { HellVictoryScreen } from './modes/hell/ui/HellVictoryScreen';
import { HellLeaderboardModal } from './modes/hell/ui/HellLeaderboardModal';

/**
 * STAR VANGUARD - Application Entry Point & Modular Game Lifecycle Orchestration.
 * Integrates Standard Campaign and modular Hell Mode (Danmaku Climax Boss & Bilingual UI).
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
  const hellLeaderboardClient = new HellLeaderboardClient();
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

  // 4. Feature 002: Modular Hell Mode Subsystems
  const hellDirector = new HellDirector(eventBus);
  const hellDamageSystem = new HellDamageSystem(
    entities,
    eventBus,
    hellDirector,
    weaponSystem,
    playerId
  );
  const hellWaveSystem = new HellWaveSystem(
    enemyPool,
    enemySystem,
    eventBus,
    hellDirector
  );
  const hellBossPool = new HellBossPool(entities, 160);
  const hellBossSystem = new HellBossSystem(
    entities,
    eventBus,
    hellDirector,
    hellBossPool,
    enemyPool,
    playerId
  );
  const hellHUDTheme = new HellHUDTheme(hellDirector, () => game.getState(), i18n);
  const hellVictoryScreen = new HellVictoryScreen(i18n, () => {
    game.setState(GameModeState.TITLE);
  });
  const hellLeaderboardModal = new HellLeaderboardModal(
    canvas,
    leaderboardClient,
    hellLeaderboardClient,
    i18n
  );

  let isSettingsOpen = false;
  const modeSelectorUI = new ModeSelectorUI(
    canvas,
    hellDirector,
    () => game.getState(),
    i18n,
    {
      getStandardTopScores: () => leaderboardClient.getTopScores(5),
      getHellTopScores: () => hellLeaderboardClient.getTopScores(5),
      isModalOpen: () =>
        isSettingsOpen ||
        hellLeaderboardModal.isOpen() ||
        hellVictoryScreen.isOpen(),
    }
  );

  // Connect Hell Boss Trigger & Victory handlers
  hellWaveSystem.onBossTriggered = () => {
    hellBossSystem.spawnBoss();
  };

  hellBossSystem.onBossDefeated = () => {
    scoreManager.addPoints(10000); // 10,000 pts boss clear bonus
    hellDirector.stopRun();
    weaponSystem.releaseAllBullets();
    enemyPool.releaseAll();
    hellBossPool.releaseAll();
    const finalScore = scoreManager.getState().currentScore;
    const clearTimeMs = hellDirector.getClearTimeMs();
    const clearTimeFormatted = hellDirector.getFormattedClearTime();

    // Auto submit to Hell Rankings
    try {
      const session = hellLeaderboardClient.startSession();
      const settings = storage.loadSettings();
      hellLeaderboardClient.submitScore({
        sessionToken: session.sessionToken,
        playerName: settings.playerName,
        department: settings.department,
        score: finalScore,
        isVictory: true,
        durationSeconds: Math.max(1, clearTimeMs / 1000),
        clearTimeMs,
        livesRemaining: entities.healths.get(playerId)?.livesRemaining ?? 1,
      });
    } catch {
      // Ignore submission errors
    }

    hellVictoryScreen.show({
      clearTimeFormatted,
      score: finalScore,
    });
  };

  // Register Hell subsystems into Director
  hellDirector.registerSubSystem(hellDamageSystem);
  hellDirector.registerSubSystem(hellWaveSystem);
  hellDirector.registerSubSystem(hellBossSystem);
  hellDirector.registerSubSystem(hellHUDTheme);

  // 5. Visual Renderer, 3-Layer Parallax Starfield, VFX Particle Pool & Overlays
  const parallaxSystem = new ParallaxSystem(Game.LOGICAL_WIDTH, Game.LOGICAL_HEIGHT);
  const renderSystem = new RenderSystem(
    entities,
    playerId,
    Game.LOGICAL_WIDTH,
    Game.LOGICAL_HEIGHT,
    parallaxSystem
  );
  const vfxSystem = new VFXSystem(eventBus, renderSystem, playerId);
  vfxSystem.setAccessibilityPreferences(
    initialSettings.screenShakeIntensity,
    initialSettings.reducedFlash,
    initialSettings.qualityPreset
  );

  // Tactile recoil & micro screen-shake on Tier 4 / Tier 5 firing (FR-003, T025)
  weaponSystem.onHighTierFireRecoil = (recoilPx, shakeMag, shakeDurSec) => {
    renderSystem.triggerPlayerRecoil(recoilPx);
    if (shakeMag > 0 && shakeDurSec > 0) {
      vfxSystem.triggerMicroShake(shakeMag, shakeDurSec);
    }
  };

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
      hellDirector.stopRun();
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

      if (hellDirector.isHellMode()) {
        if (scoreState.currentScore > 0) {
          try {
            const session = hellLeaderboardClient.startSession();
            const result = hellLeaderboardClient.submitScore({
              sessionToken: session.sessionToken,
              playerName: settings.playerName,
              department: settings.department,
              score: scoreState.currentScore,
              isVictory: false,
              durationSeconds,
              clearTimeMs: hellDirector.getClearTimeMs(),
              livesRemaining: 0,
            });
            gameOverScreen.lastSubmittedRank = result.rank;
          } catch {
            gameOverScreen.lastSubmittedRank = null;
          }
        }
      } else {
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

  // Wire WeaponSystem and HealthSystem into HellBossSystem so player bullets damage Boss and Boss Danmaku resolves life loss
  hellBossSystem.setCombatSystems(weaponSystem, healthSystem);

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
    getCurrentWave: () => {
      if (hellDirector.isHellMode()) {
        return hellWaveSystem.isBossPhase ? 3 : hellWaveSystem.currentWaveIndex || 1;
      }
      return waveSpawnSystem.currentWaveIndex || 1;
    },
    getWaveBannerTimer: () => {
      if (hellDirector.isHellMode()) {
        return hellWaveSystem.waveBannerTimer;
      }
      return waveSpawnSystem.waveBannerTimer;
    },
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
          { name: 'PowerUp', metrics: powerUpPool.getMetrics() },
          { name: 'BossBlt', metrics: hellBossPool.getMetrics() }
        ]
      };
    }
  });

  // Trigger "+2,000 OVERCHARGE" HUD banner & 80px radial energy wave ring on max-tier pickup (US1/AC3)
  eventBus.on('WEAPON_UPGRADED', (payload) => {
    if (payload.isMaxTierBonus) {
      const pt = entities.transforms.get(playerId);
      renderSystem.triggerOverchargePulse(pt ? pt.x : 300, pt ? pt.y : 700);
      hud.triggerOverchargeBanner();
    }
  });

  // 6. Register Systems in Deterministic Execution Order
  game.addSystem({
    update(dt: number) {
      if (game.getState() === GameModeState.PLAYING && !hellVictoryScreen.isOpen()) {
        inputSystem.update(dt);
        movementSystem.update(dt);
        weaponSystem.update(dt);

        if (hellDirector.isHellMode()) {
          hellDirector.update(dt);
        } else {
          waveSpawnSystem.update(dt);
        }

        enemySystem.update(dt);
        dropSystem.update(dt);
        healthSystem.update(dt);
        collisionSystem.update(dt);
      }
      renderSystem.update(dt);
      vfxSystem.update(dt);
      hud.update(dt);
      gameOverScreen.update(dt);
      modeSelectorUI.update(dt);
      hellVictoryScreen.update(dt);
      hellLeaderboardModal.update(dt);
    },
    render(ctx: CanvasRenderingContext2D) {
      renderSystem.render(ctx);
      vfxSystem.render(ctx);
      hud.render(ctx);
      gameOverScreen.render(ctx);

      // Render Hell Mode Overlays
      if (hellDirector.isHellMode()) {
        hellDirector.render(ctx);
      }

      modeSelectorUI.render(ctx);
      hellVictoryScreen.render(ctx);
      hellLeaderboardModal.render(ctx);
    }
  });

  // 7. Start / Restart Run Lifecycle Handler
  const startNewRun = (): void => {
    inputSystem.clearInputs();

    // Reset pools & entities
    weaponSystem.releaseAllBullets();
    enemyPool.releaseAll();
    powerUpPool.releaseAll();
    hellBossPool.releaseAll();
    hellBossSystem.reset();
    waveSpawnSystem.reset();
    hellWaveSystem.reset();
    vfxSystem.particlePool.releaseAll();
    hellVictoryScreen.hide();

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

    runStartTimeMs = Date.now();
    gameOverScreen.isNewRecordOnLastRun = false;
    gameOverScreen.lastSubmittedRank = null;

    if (hellDirector.isHellMode()) {
      hellDirector.startRun();
      hellWaveSystem.startCampaign();
    } else {
      hellDirector.stopRun();
      const session = leaderboardClient.startSession();
      activeSessionToken = session.sessionToken;
      waveSpawnSystem.startWave(1);
    }

    game.setState(GameModeState.PLAYING);
  };

  // 8. Settings Modal & UI Button Wiring
  const settingsModal = new SettingsModal(storage, (updated) => {
    isSettingsOpen = false;
    soundSynth.setVolume(updated.masterVolume);
    vfxSystem.setAccessibilityPreferences(
      updated.screenShakeIntensity,
      updated.reducedFlash,
      updated.qualityPreset
    );
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      isSettingsOpen = settingsModal.isOpen();
      if (isSettingsOpen || hellLeaderboardModal.isOpen() || hellVictoryScreen.isOpen()) {
        return;
      }

      // Toggle runtime pool & FPS debug overlay with F3 or Backquote (`)
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
      hellLeaderboardModal.close();
      if (game.getState() === GameModeState.PLAYING) {
        game.setState(GameModeState.PAUSED);
      }
      settingsModal.open();
      isSettingsOpen = true;
    });

    const btnLeaderboard = document.getElementById('btn-leaderboard');
    btnLeaderboard?.addEventListener('click', () => {
      settingsModal.close();
      isSettingsOpen = false;
      if (game.getState() === GameModeState.PLAYING) {
        game.setState(GameModeState.PAUSED);
      }
      hellLeaderboardModal.open(hellDirector.isHellMode() ? 'HELL' : 'STANDARD');
    });
  }

  game.start();
  return game;
}

// Auto-bootstrap when mounted in browser DOM
if (typeof document !== 'undefined' && document.getElementById('game-canvas')) {
  bootstrapGame();
}
