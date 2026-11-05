import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { ScoreManager } from '../../src/core/ScoreManager';
import { StorageService } from '../../src/services/StorageService';
import { LeaderboardClient } from '../../src/services/LeaderboardClient';
import { EntityManager } from '../../src/ecs/Entity';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { EnemySystem } from '../../src/systems/EnemySystem';
import { WaveSpawnSystem } from '../../src/systems/WaveSpawnSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { InputSystem } from '../../src/systems/InputSystem';
import { RenderSystem } from '../../src/systems/RenderSystem';
import { VFXSystem } from '../../src/systems/VFXSystem';
import { CollisionSystem } from '../../src/systems/CollisionSystem';
import { HealthSystem } from '../../src/systems/HealthSystem';
import { DropSystem } from '../../src/systems/DropSystem';
import { PowerUpPool } from '../../src/components/PowerUp';
import { SpatialGrid } from '../../src/core/SpatialGrid';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { Spline } from '../../src/utils/Spline';

describe('Scoring, Endless Wave Scaling, Leaderboard & Peak-Load Performance (US5 & Phase 8)', () => {
  let eventBus: EventBus;
  let storageService: StorageService;
  let scoreManager: ScoreManager;
  let leaderboardClient: LeaderboardClient;

  beforeEach(() => {
    eventBus = new EventBus();
    storageService = new StorageService();
    scoreManager = new ScoreManager(eventBus, storageService);
    leaderboardClient = new LeaderboardClient(storageService);
  });

  it('accumulates points from enemy kills, wave completion bonuses, and persists personal high score (FR-009, FR-010)', () => {
    scoreManager.resetRun();

    // Defeat 1 Scout (100), 1 Fighter (200), 1 Commander (400) = 700 pts
    eventBus.emit('ENEMY_DESTROYED', {
      enemyId: 1,
      archetype: 'SCOUT',
      x: 100,
      y: 100,
      pointsAwarded: 100,
      droppedPowerUp: null
    });
    eventBus.emit('ENEMY_DESTROYED', {
      enemyId: 2,
      archetype: 'FIGHTER',
      x: 150,
      y: 100,
      pointsAwarded: 200,
      droppedPowerUp: null
    });
    eventBus.emit('ENEMY_DESTROYED', {
      enemyId: 3,
      archetype: 'COMMANDER',
      x: 200,
      y: 100,
      pointsAwarded: 400,
      droppedPowerUp: 'WEAPON_UPGRADE'
    });

    expect(scoreManager.getState().currentScore).toBe(700);
    expect(scoreManager.getState().enemiesDefeatedCount).toBe(3);

    // Clear Wave 1 (+500 wave clear bonus) -> 1,200 pts
    eventBus.emit('WAVE_COMPLETED', {
      completedWaveIndex: 1,
      bonusPoints: 500,
      nextWaveIndex: 2
    });

    const state = scoreManager.getState();
    expect(state.currentScore).toBe(1200);
    expect(state.currentWave).toBe(2);
    expect(state.sessionHighScore).toBe(1200);

    // Verify persistence in StorageService
    scoreManager.persistRecord();
    const record = storageService.loadRecord();
    expect(record.highScore).toBe(1200);
    expect(record.highestWave).toBe(2);
  });

  it('scales endless wave difficulty by +10% per cleared wave (FR-005, User Story 5)', () => {
    const entities = new EntityManager();
    const playerId = createPlayerShip(entities);
    const input = new InputSystem(entities, eventBus, playerId);
    const weaponSystem = new WeaponSystem(entities, eventBus, input, playerId);
    const enemyPool = new EnemyPool(entities);
    const enemySystem = new EnemySystem(entities, weaponSystem, playerId);
    const waveSpawner = new WaveSpawnSystem(enemyPool, enemySystem, eventBus);

    waveSpawner.startWave(1);
    expect(waveSpawner.currentWaveIndex).toBe(1);
    expect(waveSpawner.difficultyMultiplier).toBeCloseTo(1.0, 5);

    waveSpawner.startWave(2);
    expect(waveSpawner.currentWaveIndex).toBe(2);
    expect(waveSpawner.difficultyMultiplier).toBeCloseTo(1.1, 5);

    waveSpawner.startWave(5);
    expect(waveSpawner.currentWaveIndex).toBe(5);
    expect(waveSpawner.difficultyMultiplier).toBeCloseTo(1.4, 5);
  });

  it('validates session tokens and ranks employee scores on the internal company leaderboard', () => {
    const session = leaderboardClient.startSession();
    expect(session.sessionToken).toContain('tok_');

    const result = leaderboardClient.submitScore({
      sessionToken: session.sessionToken,
      playerName: 'Minh-QA',
      department: 'Platform',
      score: 99500,
      highestWave: 12,
      durationSeconds: 180,
      enemiesDefeated: 210
    });

    expect(result.rank).toBe(1);
    expect(result.isPersonalBest).toBe(true);
    expect(result.isNewHighScore).toBe(true);

    const top = leaderboardClient.getTopScores(5);
    expect(top[0].playerName).toBe('Minh-QA');
    expect(top[0].score).toBe(99500);

    // Rejects impossible anti-cheat score rate (>4500 pts/sec)
    expect(() =>
      leaderboardClient.submitScore({
        sessionToken: session.sessionToken,
        playerName: 'Cheater',
        department: 'Unknown',
        score: 500000,
        highestWave: 20,
        durationSeconds: 5,
        enemiesDefeated: 10
      })
    ).toThrow(/ANTI_CHEAT_REJECTED/);
  });

  it('bounds micro screen-shake strictly below 0.2s and disables shake when intensity is 0% (FR-016, SC-007)', () => {
    const entities = new EntityManager();
    const playerId = createPlayerShip(entities);
    const renderSystem = new RenderSystem(entities, playerId);
    const vfxSystem = new VFXSystem(eventBus, renderSystem);

    // Trigger explosion -> spawns pooled particles and micro-shake
    eventBus.emit('VFX_SPAWN_TRIGGERED', {
      type: 'EXPLOSION',
      x: 300,
      y: 400,
      particleCount: 25,
      color: '#ff1e8a'
    });

    expect(vfxSystem.getMetrics().activeCount).toBe(25);
    expect(vfxSystem.getMetrics().recycleOverflowCount).toBe(0);

    // Advance 0.10s -> shake is active
    vfxSystem.update(0.10);
    // Advance another 0.10s (total 0.20s) -> shake must have completely decayed to 0
    vfxSystem.update(0.10);
    expect(renderSystem.screenShakeOffsetX).toBe(0);
    expect(renderSystem.screenShakeOffsetY).toBe(0);

    // Disable screen shake via accessibility preference (0%) and verify reducedFlash + PERFORMANCE preset (T045, T047)
    vfxSystem.setAccessibilityPreferences(0, true, 'PERFORMANCE');
    expect(renderSystem.reducedFlash).toBe(true);
    expect(renderSystem.qualityPreset).toBe('PERFORMANCE');

    // PERFORMANCE preset halves particle burst density (20 -> 10)
    vfxSystem.particlePool.releaseAll();
    vfxSystem.spawnBurst(300, 400, 20, '#00f0ff');
    expect(vfxSystem.getMetrics().activeCount).toBe(10);

    vfxSystem.triggerMicroShake(8.0, 0.15);
    vfxSystem.update(0.016);
    expect(renderSystem.screenShakeOffsetX).toBe(0);
    expect(renderSystem.screenShakeOffsetY).toBe(0);

    // Re-enable shake and verify non-lethal player damage (ENTITY_DAMAGED) triggers micro-shake (T047)
    vfxSystem.setAccessibilityPreferences(1.0, false, 'HIGH');
    eventBus.emit('ENTITY_DAMAGED', {
      targetId: playerId,
      damageAmount: 20,
      remainingHealth: 80,
      sourceId: 99
    });
    vfxSystem.update(0.05);
    // Shake decays cleanly within < 0.2s
    vfxSystem.update(0.15);
    expect(renderSystem.screenShakeOffsetX).toBe(0);
    expect(renderSystem.screenShakeOffsetY).toBe(0);
  });

  it('maintains <16.7ms frame step budget under peak load: 40 enemies, 150 bullets, 300 particles (SC-002, T044)', () => {
    const entities = new EntityManager();
    const spatialGrid = new SpatialGrid(600, 800, 64);
    const playerId = createPlayerShip(entities);
    const input = new InputSystem(entities, eventBus, playerId);
    const weaponSystem = new WeaponSystem(entities, eventBus, input, playerId);
    const enemyPool = new EnemyPool(entities);
    const enemySystem = new EnemySystem(entities, weaponSystem, playerId);
    const healthSystem = new HealthSystem(entities, eventBus, enemyPool, weaponSystem, playerId);
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
      collisionSystem
    );
    const renderSystem = new RenderSystem(entities, playerId);
    const vfxSystem = new VFXSystem(eventBus, renderSystem);

    // Spawn 40 active enemies
    const splinePath = Spline.createSwoopEntryPath('left', 300, 200, 600, 800);
    for (let i = 0; i < 40; i++) {
      enemyPool.spawn({
        archetype: i % 3 === 0 ? 'COMMANDER' : i % 2 === 0 ? 'FIGHTER' : 'SCOUT',
        gridCol: i % 8,
        gridRow: Math.floor(i / 8),
        targetSlotX: 100 + (i % 8) * 55,
        targetSlotY: 100 + Math.floor(i / 8) * 45,
        splinePath,
        difficultyMultiplier: 1.2
      });
    }

    // Spawn 50 player bullets + 100 enemy bullets = 150 active bullets
    for (let i = 0; i < 50; i++) {
      weaponSystem.spawnPlayerBullet(50 + (i * 10) % 500, 600 - (i * 8) % 400, 0, -760, 25);
    }
    for (let i = 0; i < 100; i++) {
      weaponSystem.spawnEnemyBullet(40 + (i * 7) % 520, 150 + (i * 5) % 400, 0, 280, 20);
    }

    // Spawn 300 active particles (full pool capacity)
    for (let i = 0; i < 10; i++) {
      vfxSystem.spawnBurst(300, 400, 30, '#00f0ff', 200);
    }
    expect(vfxSystem.getMetrics().activeCount).toBe(300);

    // Simulate 60 fixed-step frames (1 second of peak gameplay) and measure step latency
    const dt = 1 / 60;
    const startMs = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      weaponSystem.update(dt);
      enemySystem.update(dt);
      dropSystem.update(dt);
      healthSystem.update(dt);
      collisionSystem.update(dt);
      renderSystem.update(dt);
      vfxSystem.update(dt);
    }
    const elapsedMs = performance.now() - startMs;
    const avgFrameMs = elapsedMs / 60;

    // Constitution Principle II requires <16.7ms per frame; in practice our pooled ECS runs in <2ms
    expect(avgFrameMs).toBeLessThan(16.7);
    expect(enemyPool.getMetrics().capacity).toBe(60);
    expect(weaponSystem.getPoolMetrics().playerBullets.capacity).toBe(50);
    expect(weaponSystem.getPoolMetrics().enemyBullets.capacity).toBe(150);
    expect(vfxSystem.getMetrics().capacity).toBe(300);
  });
});
