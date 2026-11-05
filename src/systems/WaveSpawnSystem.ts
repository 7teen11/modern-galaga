import { EnemyPool, EnemySpawnParams } from '../ecs/EnemyPool';
import { EnemySystem } from './EnemySystem';
import { EventBus, EnemyArchetype } from '../core/EventBus';
import { Spline } from '../utils/Spline';
import { Game, GameSystem } from '../core/Game';

interface QueuedSpawn {
  delayTimer: number;
  params: EnemySpawnParams;
}

/**
 * Endless Wave Sequencer & Bézier Squad Spawner (FR-005, FR-013, FR-015).
 * Spawns enemy squads of 4–6 units along curved entry paths and scales
 * difficulty by +10% per cleared wave.
 */
export class WaveSpawnSystem implements GameSystem {
  public static readonly DIFFICULTY_STEP_PER_WAVE = 0.10; // +10% per wave (FR-005, User Story 5)
  public static readonly WAVE_CLEAR_BONUS_BASE = 500;

  private readonly enemyPool: EnemyPool;
  private readonly enemySystem: EnemySystem;
  private readonly eventBus: EventBus;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;

  public currentWaveIndex = 0;
  public difficultyMultiplier = 1.0;
  public waveBannerTimer = 0;

  private readonly spawnQueue: QueuedSpawn[] = [];
  private isWaitingForNextWave = false;
  private nextWaveDelayTimer = 0;

  constructor(
    enemyPool: EnemyPool,
    enemySystem: EnemySystem,
    eventBus: EventBus,
    canvasWidth = Game.LOGICAL_WIDTH,
    canvasHeight = Game.LOGICAL_HEIGHT
  ) {
    this.enemyPool = enemyPool;
    this.enemySystem = enemySystem;
    this.eventBus = eventBus;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Starts wave 1 (or specified wave index) and builds squad entry queues.
   */
  public startWave(waveIndex = 1): void {
    this.currentWaveIndex = waveIndex;
    this.difficultyMultiplier =
      1 + (waveIndex - 1) * WaveSpawnSystem.DIFFICULTY_STEP_PER_WAVE;
    this.enemySystem.difficultyMultiplier = this.difficultyMultiplier;

    this.spawnQueue.length = 0;
    this.isWaitingForNextWave = false;
    this.waveBannerTimer = 1.8;

    this.buildWaveSquads(waveIndex);
  }

  /**
   * Generates squads of 4–6 enemies entering from alternating margins along Bézier curves (FR-015).
   * Row 0 (top): COMMANDER elites
   * Row 1: FIGHTER escorts
   * Rows 2-3: SCOUT swarms
   */
  private buildWaveSquads(waveIndex: number): void {
    // Base 16 enemies on Wave 1, growing up to 32 enemies in 4x8 formation grid
    const cols = Math.min(8, 4 + Math.floor(waveIndex / 2));
    const rows = Math.min(4, 3 + (waveIndex >= 2 ? 1 : 0));

    const gridSpacingX = 60;
    const gridSpacingY = 48;
    const startSlotX =
      (this.canvasWidth - (cols - 1) * gridSpacingX) * 0.5;
    const startSlotY = 95;

    const sides: Array<'left' | 'right' | 'top-left' | 'top-right'> = [
      'left',
      'right',
      'top-left',
      'top-right'
    ];

    let squadIndex = 0;
    let unitInSquad = 0;
    const squadSize = 4; // 4-6 units per squad (FR-015)
    let accumulatedDelay = 0.4;

    for (let r = 0; r < rows; r++) {
      const archetype: EnemyArchetype =
        r === 0 ? 'COMMANDER' : r === 1 ? 'FIGHTER' : 'SCOUT';

      for (let c = 0; c < cols; c++) {
        const targetX = startSlotX + c * gridSpacingX;
        const targetY = startSlotY + r * gridSpacingY;
        const entrySide = sides[squadIndex % sides.length];

        const splinePath = Spline.createSwoopEntryPath(
          entrySide,
          targetX,
          targetY,
          this.canvasWidth,
          this.canvasHeight
        );

        this.spawnQueue.push({
          delayTimer: accumulatedDelay,
          params: {
            archetype,
            gridCol: c,
            gridRow: r,
            targetSlotX: targetX,
            targetSlotY: targetY,
            splinePath,
            difficultyMultiplier: this.difficultyMultiplier
          }
        });

        unitInSquad++;
        if (unitInSquad >= squadSize) {
          unitInSquad = 0;
          squadIndex++;
          accumulatedDelay += 1.15; // Pause between squad waves
        } else {
          accumulatedDelay += 0.22; // Tight spacing within the 4-unit squad
        }
      }
    }
  }

  public update(dt: number): void {
    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer = Math.max(0, this.waveBannerTimer - dt);
    }

    // Process pending squad spawns
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      item.delayTimer -= dt;
      if (item.delayTimer <= 0) {
        this.enemyPool.spawn(item.params);
        this.spawnQueue.splice(i, 1);
      }
    }

    // Check if wave is completely cleared
    if (
      this.currentWaveIndex > 0 &&
      this.spawnQueue.length === 0 &&
      this.enemyPool.getActiveCount() === 0
    ) {
      if (!this.isWaitingForNextWave) {
        this.isWaitingForNextWave = true;
        this.nextWaveDelayTimer = 1.6;

        const bonusPoints =
          this.currentWaveIndex * WaveSpawnSystem.WAVE_CLEAR_BONUS_BASE;
        this.eventBus.emit('WAVE_COMPLETED', {
          completedWaveIndex: this.currentWaveIndex,
          bonusPoints,
          nextWaveIndex: this.currentWaveIndex + 1
        });
      } else {
        this.nextWaveDelayTimer -= dt;
        if (this.nextWaveDelayTimer <= 0) {
          this.startWave(this.currentWaveIndex + 1);
        }
      }
    }
  }

  public reset(): void {
    this.spawnQueue.length = 0;
    this.currentWaveIndex = 0;
    this.difficultyMultiplier = 1.0;
    this.isWaitingForNextWave = false;
    this.enemyPool.releaseAll();
  }

  public getPendingSpawnCount(): number {
    return this.spawnQueue.length;
  }
}

