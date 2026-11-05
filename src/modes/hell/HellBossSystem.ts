import { Game, GameSystem } from '../../core/Game';
import { EntityManager } from '../../ecs/Entity';
import { EventBus } from '../../core/EventBus';
import { HellDirector } from './HellDirector';
import { HellBossPool } from './HellBossPool';
import { EnemyPool } from '../../ecs/EnemyPool';
import { BossHealthBar } from './ui/BossHealthBar';
import { HellBossRenderer, BossRenderState } from './ui/HellBossRenderer';
import { HELL_RULES } from './HellConfig';
import { Vector2 } from '../../utils/Vector2';

export type BossState = 'HIDDEN' | 'INTRO' | 'PHASE_1' | 'PHASE_2' | 'DYING' | 'DEFEATED';

/**
 * HellBossSystem - Climax Boss FSM, Danmaku Barrages, Enrage & Escort Summons (US3).
 */
export class HellBossSystem implements GameSystem {
  private entities: EntityManager;
  private eventBus: EventBus;
  private director: HellDirector;
  private bossPool: HellBossPool;
  private enemyPool: EnemyPool;
  private playerId: number;

  // Boss state
  private state: BossState = 'HIDDEN';
  private currentHealth = HELL_RULES.BOSS.maxHealth;
  private maxHealth = HELL_RULES.BOSS.maxHealth;
  private x = 300;
  private y = -100;
  private width = 110;
  private height = 75;
  private hitFlashTimer = 0;
  private introTimer = 2.5;
  private dyingTimer = 2.5;

  // Danmaku timers & angle trackers
  private danmakuTimer = 0;
  private spiralAngle = 0;
  private swayTimer = 0;
  private escortsSpawned = 0;

  // Sub-components
  public readonly healthBar: BossHealthBar;
  public readonly renderer: HellBossRenderer;
  public onBossDefeated?: () => void;

  constructor(
    entities: EntityManager,
    eventBus: EventBus,
    director: HellDirector,
    bossPool: HellBossPool,
    enemyPool: EnemyPool,
    playerId: number
  ) {
    this.entities = entities;
    this.eventBus = eventBus;
    this.director = director;
    this.bossPool = bossPool;
    this.enemyPool = enemyPool;
    this.playerId = playerId;

    this.healthBar = new BossHealthBar();
    this.renderer = new HellBossRenderer();

    // Guarantee weapon upgrade drop from Phase 2 escorts (Clarification Q4)
    this.eventBus.on('ENEMY_DESTROYED', (payload) => {
      if (this.escortIds.has(payload.enemyId)) {
        this.escortIds.delete(payload.enemyId);
        if (payload.droppedPowerUp !== 'WEAPON_UPGRADE') {
          // Re-emit with guaranteed drop token for DropSystem
          this.eventBus.emit('ENEMY_DESTROYED', {
            ...payload,
            droppedPowerUp: 'WEAPON_UPGRADE',
          });
        }
      }
    });
  }

  public setPlayerId(id: number): void {
    this.playerId = id;
  }

  public isBossActive(): boolean {
    return this.state !== 'HIDDEN' && this.state !== 'DEFEATED';
  }

  public getState(): BossState {
    return this.state;
  }

  public getCurrentHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public isEnraged(): boolean {
    return this.state === 'PHASE_2' || (this.currentHealth <= this.maxHealth * HELL_RULES.BOSS.enrageHealthThresholdRatio && this.state !== 'HIDDEN');
  }

  public getEscortsSpawnedCount(): number {
    return this.escortsSpawned;
  }

  public spawnBoss(): void {
    this.state = 'INTRO';
    this.currentHealth = this.maxHealth;
    this.x = Game.LOGICAL_WIDTH / 2;
    this.y = -80;
    this.introTimer = 2.5;
    this.dyingTimer = 2.5;
    this.danmakuTimer = 0;
    this.spiralAngle = 0;
    this.swayTimer = 0;
    this.escortsSpawned = 0;

    this.healthBar.setVisible(true);
    this.healthBar.updateHealth(this.currentHealth, this.maxHealth, false);
  }

  public setBossPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public forcePhase1(): void {
    this.state = 'PHASE_1';
    this.introTimer = 0;
  }

  public applyBossDamage(amount: number): void {
    if (!this.isBossActive() || this.state === 'INTRO' || this.state === 'DYING') return;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.hitFlashTimer = 0.08;

    const enraged = this.isEnraged();
    this.healthBar.updateHealth(this.currentHealth, this.maxHealth, enraged);

    // Check Phase 2 Enrage transition
    if (this.currentHealth <= this.maxHealth * HELL_RULES.BOSS.enrageHealthThresholdRatio) {
      if (this.state === 'PHASE_1') {
        this.state = 'PHASE_2';
        this.spawnEscorts();
      }
    }

    if (this.currentHealth <= 0) {
      this.state = 'DYING';
      this.dyingTimer = 2.5;
      this.bossPool.releaseAll();
    }
  }

  private escortIds = new Set<number>();

  private spawnEscorts(): void {
    if (this.escortsSpawned >= 2) return;
    this.escortsSpawned = 2;

    // Spawn 2 Fighter escorts with guaranteed weapon upgrade drops (Clarification Q4)
    const id1 = this.enemyPool.spawn({
      archetype: 'FIGHTER',
      gridCol: 0,
      gridRow: 1,
      targetSlotX: this.x - 120,
      targetSlotY: this.y + 30,
      splinePath: [],
      difficultyMultiplier: 1.25,
    });
    if (id1 !== null) {
      this.escortIds.add(id1);
    }

    const id2 = this.enemyPool.spawn({
      archetype: 'FIGHTER',
      gridCol: 1,
      gridRow: 1,
      targetSlotX: this.x + 120,
      targetSlotY: this.y + 30,
      splinePath: [],
      difficultyMultiplier: 1.25,
    });
    if (id2 !== null) {
      this.escortIds.add(id2);
    }
  }

  public fireRadialRing(rays = 16): void {
    const speed = HELL_RULES.BOSS.bulletSpeed;
    const step = (Math.PI * 2) / rays;

    for (let i = 0; i < rays; i++) {
      const angle = i * step + this.swayTimer;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawnDanmakuBullet(this.x, this.y + 20, vx, vy);
    }
  }

  public fireTargetedFan(rays = 7, targetX: number, targetY: number): void {
    const speed = HELL_RULES.BOSS.bulletSpeed * 1.1;
    const baseAngle = Math.atan2(targetY - this.y, targetX - this.x);
    const spreadArc = Math.PI / 4; // 45 degrees fan
    const halfSpread = spreadArc / 2;
    const step = spreadArc / (rays - 1);

    for (let i = 0; i < rays; i++) {
      const angle = baseAngle - halfSpread + i * step;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawnDanmakuBullet(this.x, this.y + 25, vx, vy);
    }
  }

  public fireSpiralStream(): void {
    const speed = HELL_RULES.BOSS.bulletSpeed * 1.05;
    this.spiralAngle += 0.38;

    // Twin spiral streams from dual cannons
    const vx1 = Math.cos(this.spiralAngle) * speed;
    const vy1 = Math.sin(this.spiralAngle) * speed;
    this.spawnDanmakuBullet(this.x - 35, this.y + 10, vx1, vy1);

    const vx2 = Math.cos(this.spiralAngle + Math.PI) * speed;
    const vy2 = Math.sin(this.spiralAngle + Math.PI) * speed;
    this.spawnDanmakuBullet(this.x + 35, this.y + 10, vx2, vy2);
  }

  private spawnDanmakuBullet(x: number, y: number, vx: number, vy: number): void {
    const bullet = this.bossPool.acquire();
    if (!bullet) return;

    const t = this.entities.transforms.get(bullet.entityId);
    if (t) {
      t.x = x;
      t.y = y;
      t.vx = vx;
      t.vy = vy;
    }
  }

  public update(dt: number): void {
    if (!this.director.isHellMode()) return;
    if (this.state === 'HIDDEN' || this.state === 'DEFEATED') return;

    this.renderer.update(dt);
    this.healthBar.update(dt);

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    // 1. INTRO Descent
    if (this.state === 'INTRO') {
      this.introTimer -= dt;
      this.y += 92 * dt;
      if (this.y >= 148 || this.introTimer <= 0) {
        this.y = 148;
        this.state = 'PHASE_1';
      }
      return;
    }

    // 2. DYING Explosions
    if (this.state === 'DYING') {
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) {
        this.state = 'DEFEATED';
        this.healthBar.setVisible(false);
        if (this.onBossDefeated) {
          this.onBossDefeated();
        }
      }
      return;
    }

    // 3. Movement sway
    const speedMult = this.state === 'PHASE_2' ? HELL_RULES.BOSS.enrageSpeedMultiplier : 1.0;
    this.swayTimer += dt * 1.5 * speedMult;
    this.x = Game.LOGICAL_WIDTH / 2 + Math.sin(this.swayTimer) * 110;

    // 4. Danmaku attack scheduling
    this.danmakuTimer += dt;
    const playerT = this.entities.transforms.get(this.playerId);
    const px = playerT ? playerT.x : Game.LOGICAL_WIDTH / 2;
    const py = playerT ? playerT.y : Game.LOGICAL_HEIGHT * 0.85;

    if (this.state === 'PHASE_1') {
      if (this.danmakuTimer >= 1.4) {
        this.danmakuTimer = 0;
        if (Math.random() < 0.5) {
          this.fireRadialRing(HELL_RULES.BOSS.phase1RadialRays);
        } else {
          this.fireTargetedFan(HELL_RULES.BOSS.phase1SpreadRays, px, py);
        }
      }
    } else if (this.state === 'PHASE_2') {
      // Phase 2 Enrage: Continuous spiral stream every 200ms
      if (this.danmakuTimer >= 0.2) {
        this.danmakuTimer = 0;
        this.fireSpiralStream();
      }
    }

    // 5. Update Danmaku Bullets kinematics & Player collision
    this.updateDanmakuBullets(dt, px, py);
  }

  private updateDanmakuBullets(dt: number, playerX: number, playerY: number): void {
    const playerActive = this.entities.isEntityActive(this.playerId);
    const playerHealth = this.entities.healths.get(this.playerId);
    const playerHitbox = this.entities.hitboxes.get(this.playerId);
    const lethalRadius = (playerHitbox ? playerHitbox.radius : 10) + HELL_RULES.BOSS.bulletRadius;
    const lethalDistSq = lethalRadius * lethalRadius;

    this.bossPool.forEachActive((bullet) => {
      const t = this.entities.transforms.get(bullet.entityId);
      if (!t) return;

      t.x += t.vx * dt;
      t.y += t.vy * dt;

      // Cull off-screen bullets
      if (
        t.x < -30 ||
        t.x > Game.LOGICAL_WIDTH + 30 ||
        t.y < -30 ||
        t.y > Game.LOGICAL_HEIGHT + 30
      ) {
        this.bossPool.release(bullet);
        return;
      }

      // Check collision with Player Cockpit Core (45%)
      if (playerActive && playerHealth && playerHealth.invulnerableTimer <= 0) {
        const distSq = Vector2.distanceSq(t.x, t.y, playerX, playerY);
        if (distSq <= lethalDistSq) {
          this.bossPool.release(bullet);
          // 40 HP Hell bullet damage
          this.eventBus.emit('ENTITY_DAMAGED', {
            targetId: this.playerId,
            damageAmount: HELL_RULES.DAMAGE.bulletDamage,
            remainingHealth: Math.max(0, playerHealth.currentHealth - HELL_RULES.DAMAGE.bulletDamage),
            sourceId: bullet.entityId,
          });
          playerHealth.currentHealth = Math.max(
            0,
            playerHealth.currentHealth - HELL_RULES.DAMAGE.bulletDamage
          );
        }
      }
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.director.isHellMode()) return;
    if (this.state === 'HIDDEN' || this.state === 'DEFEATED') return;

    const renderState: BossRenderState = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      hitFlashTimer: this.hitFlashTimer,
      isEnraged: this.isEnraged(),
      state: this.state === 'INTRO' ? 'INTRO' : this.state === 'DYING' ? 'DYING' : 'ACTIVE',
      introTimer: this.introTimer,
      dyingTimer: this.dyingTimer,
    };

    this.renderer.renderBoss(ctx, renderState);
    this.healthBar.render(ctx);

    // Render active Danmaku bullets
    ctx.save();
    ctx.fillStyle = this.isEnraged() ? '#ff0033' : '#ff2a70';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;

    this.bossPool.forEachActive((bullet) => {
      const t = this.entities.transforms.get(bullet.entityId);
      if (t) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, HELL_RULES.BOSS.bulletRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }
}
