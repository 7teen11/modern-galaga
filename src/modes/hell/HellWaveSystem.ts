import { GameSystem, Game } from '../../core/Game';
import { EnemyPool, EnemySpawnParams } from '../../ecs/EnemyPool';
import { EnemySystem } from '../../systems/EnemySystem';
import { EventBus, EnemyArchetype } from '../../core/EventBus';
import { HellDirector } from './HellDirector';
import { HellSplines } from './HellSplines';
import { Spline } from '../../utils/Spline';
import { HELL_RULES } from './HellConfig';

interface QueuedSpawn {
  delayTimer: number;
  params: EnemySpawnParams;
}

/**
 * HellWaveSystem - Independent 3-Wave Campaign Orchestrator for Hell Mode (US2).
 * Spawns +50% enemy volume with Wave 2 pincer swoops and Wave 3 cross-fire sweeps,
 * culminating in the Wave 3 Climax Boss encounter.
 */
export class HellWaveSystem implements GameSystem {
  public static readonly WAVE_CLEAR_BONUS_BASE = 1000;

  private enemyPool: EnemyPool;
  private enemySystem: EnemySystem;
  private eventBus: EventBus;
  private director: HellDirector;
  private canvasWidth: number;
  private canvasHeight: number;

  public currentWaveIndex = 0;
  public waveBannerTimer = 0;
  public isWaveInProgress = false;
  public isBossPhase = false;

  private spawnQueue: QueuedSpawn[] = [];
  private isWaitingForNextWave = false;
  private nextWaveDelayTimer = 0;
  public onBossTriggered?: () => void;

  constructor(
    enemyPool: EnemyPool,
    enemySystem: EnemySystem,
    eventBus: EventBus,
    director: HellDirector,
    canvasWidth = Game.LOGICAL_WIDTH,
    canvasHeight = Game.LOGICAL_HEIGHT
  ) {
    this.enemyPool = enemyPool;
    this.enemySystem = enemySystem;
    this.eventBus = eventBus;
    this.director = director;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public reset(): void {
    this.currentWaveIndex = 0;
    this.waveBannerTimer = 0;
    this.isWaveInProgress = false;
    this.isBossPhase = false;
    this.spawnQueue.length = 0;
    this.isWaitingForNextWave = false;
    this.nextWaveDelayTimer = 0;
  }

  public startCampaign(): void {
    this.reset();
    this.startWave(1);
  }

  public startWave(waveIndex: number): void {
    if (waveIndex > HELL_RULES.WAVES.waveCount) {
      // Climax reached: trigger Boss encounter
      this.isBossPhase = true;
      this.isWaveInProgress = false;
      if (this.onBossTriggered) {
        this.onBossTriggered();
      }
      return;
    }

    this.currentWaveIndex = waveIndex;
    this.isWaveInProgress = true;
    this.isBossPhase = false;
    this.spawnQueue.length = 0;
    this.isWaitingForNextWave = false;
    this.waveBannerTimer = 1.8;

    // Hell mode difficulty boost: +25% enemy dive and fire speed
    this.enemySystem.difficultyMultiplier = 1.25 + (waveIndex - 1) * 0.15;

    this.buildWaveSquads(waveIndex);
  }

  private buildWaveSquads(waveIndex: number): void {
    // 50% denser formation grid (e.g. 6 to 8 cols, 4 rows = 24 to 32 enemies)
    const cols = waveIndex === 1 ? 6 : waveIndex === 2 ? 7 : 8;
    const rows = 4;

    const gridSpacingX = 54;
    const gridSpacingY = 44;
    const startSlotX = (this.canvasWidth - (cols - 1) * gridSpacingX) * 0.5;
    const startSlotY = 90;

    let squadIndex = 0;
    let unitInSquad = 0;

    for (let r = 0; r < rows; r++) {
      let archetype: EnemyArchetype = 'SCOUT';
      if (r === 0) {
        archetype = 'COMMANDER';
      } else if (r === 1) {
        archetype = 'FIGHTER';
      }

      for (let c = 0; c < cols; c++) {
        const targetX = startSlotX + c * gridSpacingX;
        const targetY = startSlotY + r * gridSpacingY;

        let entryPath;
        if (waveIndex === 2) {
          // Wave 2: Dual lateral pincer swoops
          const side = c % 2 === 0 ? 'left' : 'right';
          entryPath = HellSplines.createPincerSwoopPath(
            side,
            targetX,
            targetY,
            this.canvasWidth,
            this.canvasHeight
          );
        } else if (waveIndex === 3) {
          // Wave 3: Intersecting diagonal cross-fire sweeps
          const direction = c % 2 === 0
            ? 'top-left-to-bottom-right'
            : 'top-right-to-bottom-left';
          entryPath = HellSplines.createCrossFireSweepPath(
            direction,
            targetX,
            targetY,
            this.canvasWidth,
            this.canvasHeight
          );
        } else {
          // Wave 1: Standard high-density alternating swoops
          const side: 'left' | 'right' = c % 2 === 0 ? 'left' : 'right';
          entryPath = Spline.createSwoopEntryPath(
            side,
            targetX,
            targetY,
            this.canvasWidth,
            this.canvasHeight
          );
        }

        const delay = squadIndex * 1.1 + unitInSquad * 0.16;
        this.spawnQueue.push({
          delayTimer: delay,
          params: {
            archetype,
            gridCol: c,
            gridRow: r,
            targetSlotX: targetX,
            targetSlotY: targetY,
            splinePath: entryPath,
            difficultyMultiplier: 1.25 + (waveIndex - 1) * 0.15,
          },
        });

        unitInSquad++;
        if (unitInSquad >= 6) {
          unitInSquad = 0;
          squadIndex++;
        }
      }
    }
  }

  public update(dt: number): void {
    if (!this.director.isHellMode()) return;
    if (this.isBossPhase) return;

    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer = Math.max(0, this.waveBannerTimer - dt);
    }

    // Process queued enemy spawns
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      item.delayTimer -= dt;
      if (item.delayTimer <= 0) {
        this.enemyPool.spawn(item.params);
        this.spawnQueue.splice(i, 1);
      }
    }

    // Check for wave clear condition
    if (
      this.isWaveInProgress &&
      this.spawnQueue.length === 0 &&
      this.enemyPool.getActiveCount() === 0 &&
      !this.isWaitingForNextWave
    ) {
      this.isWaitingForNextWave = true;
      this.nextWaveDelayTimer = 2.0;

      const bonusPoints = this.currentWaveIndex * HellWaveSystem.WAVE_CLEAR_BONUS_BASE;
      this.eventBus.emit('WAVE_COMPLETED', {
        completedWaveIndex: this.currentWaveIndex,
        bonusPoints,
        nextWaveIndex: this.currentWaveIndex + 1,
      });
    }

    if (this.isWaitingForNextWave) {
      this.nextWaveDelayTimer -= dt;
      if (this.nextWaveDelayTimer <= 0) {
        this.isWaitingForNextWave = false;
        this.startWave(this.currentWaveIndex + 1);
      }
    }
  }
}
