import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../src/core/Game';
import { EventBus } from '../../src/core/EventBus';
import { EntityManager } from '../../src/ecs/Entity';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { InputSystem } from '../../src/systems/InputSystem';
import { EnemySystem } from '../../src/systems/EnemySystem';
import { HellDirector } from '../../src/modes/hell/HellDirector';
import { HellWaveSystem } from '../../src/modes/hell/HellWaveSystem';
import { HellBossPool } from '../../src/modes/hell/HellBossPool';
import { HellBossSystem } from '../../src/modes/hell/HellBossSystem';
import { HellLeaderboardClient } from '../../src/modes/hell/HellLeaderboardClient';
import { createPlayerShip, DEFAULT_PLAYER_CONFIG } from '../../src/components/PlayerComponents';

describe('Hell Mode Full Campaign & Danmaku Performance (T023)', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let director: HellDirector;
  let enemyPool: EnemyPool;
  let weaponSystem: WeaponSystem;
  let enemySystem: EnemySystem;
  let waveSystem: HellWaveSystem;
  let bossPool: HellBossPool;
  let bossSystem: HellBossSystem;
  let hellLeaderboard: HellLeaderboardClient;
  let playerId: number;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    director = new HellDirector(eventBus);
    director.setMode('HELL');

    playerId = createPlayerShip(entities, DEFAULT_PLAYER_CONFIG);
    const inputSystem = new InputSystem(entities, eventBus, playerId);
    weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId);
    enemyPool = new EnemyPool(entities);
    enemySystem = new EnemySystem(entities, weaponSystem, playerId);

    waveSystem = new HellWaveSystem(
      enemyPool,
      enemySystem,
      eventBus,
      director
    );

    bossPool = new HellBossPool(entities, 160);
    bossSystem = new HellBossSystem(
      entities,
      eventBus,
      director,
      bossPool,
      enemyPool,
      playerId
    );

    hellLeaderboard = new HellLeaderboardClient();

    director.registerSubSystem(waveSystem);
    director.registerSubSystem(bossSystem);
  });

  it('progresses through 3 Hell waves and triggers Climax Boss phase', () => {
    let bossTriggered = false;
    waveSystem.onBossTriggered = () => {
      bossTriggered = true;
      bossSystem.spawnBoss();
    };

    waveSystem.startCampaign();
    expect(waveSystem.currentWaveIndex).toBe(1);
    expect(waveSystem.isWaveInProgress).toBe(true);

    // Wave 1 -> Wave 2
    waveSystem.startWave(2);
    expect(waveSystem.currentWaveIndex).toBe(2);

    // Wave 2 -> Wave 3
    waveSystem.startWave(3);
    expect(waveSystem.currentWaveIndex).toBe(3);

    // Wave 3 completed -> Triggers Climax Boss
    waveSystem.startWave(4);
    expect(bossTriggered).toBe(true);
    expect(waveSystem.isBossPhase).toBe(true);
    expect(bossSystem.isBossActive()).toBe(true);
  });

  it('simulates Boss battle, Phase 2 Enrage, Escorts, and Victory resolution', () => {
    let stageWon = false;
    bossSystem.onBossDefeated = () => {
      stageWon = true;
    };

    director.startRun();
    bossSystem.spawnBoss();
    bossSystem.forcePhase1();

    // Player damages Boss down to 50% (Phase 2 Enrage)
    bossSystem.applyBossDamage(600);
    expect(bossSystem.isEnraged()).toBe(true);
    expect(bossSystem.getEscortsSpawnedCount()).toBe(2);

    // Player destroys Boss
    bossSystem.applyBossDamage(600);
    expect(bossSystem.getCurrentHealth()).toBe(0);
    expect(bossSystem.getState()).toBe('DYING');

    // Simulate death explosion timer
    bossSystem.update(2.6);
    expect(stageWon).toBe(true);
    expect(bossSystem.getState()).toBe('DEFEATED');

    // Submit Hell victory record
    const session = hellLeaderboard.startSession();
    const result = hellLeaderboard.submitScore({
      sessionToken: session.sessionToken,
      playerName: 'HeroPilot',
      department: 'Fleet Command',
      score: 110000,
      isVictory: true,
      durationSeconds: 150,
      clearTimeMs: director.getClearTimeMs() || 150000,
      livesRemaining: 3,
    });

    expect(result.rank).toBe(1);
  });

  it('satisfies 60 FPS Danmaku frame budget (< 16.6 ms per step with 100+ active bullets)', () => {
    bossSystem.spawnBoss();
    bossSystem.forcePhase1();

    // Fill pool with 120 Danmaku bullets
    for (let i = 0; i < 8; i++) {
      bossSystem.fireRadialRing(16);
    }
    expect(bossPool.getActiveCount()).toBeGreaterThanOrEqual(100);

    // Benchmark 100 consecutive physics and collision simulation steps
    const start = performance.now();
    for (let step = 0; step < 100; step++) {
      bossSystem.update(Game.FIXED_DT);
    }
    const totalTimeMs = performance.now() - start;
    const avgStepMs = totalTimeMs / 100;

    // Must be well within the 16.6ms 60Hz frame budget
    expect(avgStepMs).toBeLessThan(8.0);
  });
});
