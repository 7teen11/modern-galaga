import { EntityManager } from '../ecs/Entity';
import { EntityId } from '../ecs/Component';
import { EventBus } from '../core/EventBus';
import { PowerUpPool, SURPLUS_UPGRADE_BONUS_POINTS } from '../components/PowerUp';
import { WeaponSystem } from './WeaponSystem';
import { CollisionSystem } from './CollisionSystem';
import { Game, GameSystem } from '../core/Game';

/**
 * Power-Up Drop Spawning, Drifting Lifecycle & Pickup Resolution System (FR-007, FR-008, FR-011).
 * Automatically drops weapon upgrade tokens when elite Commanders are destroyed,
 * upgrades player blaster tiers (Tier 1 -> Tier 2 -> Tier 3), and awards 1,000 bonus points
 * when picking up surplus upgrades at Tier 3.
 */
export class DropSystem implements GameSystem {
  private readonly entities: EntityManager;
  private readonly eventBus: EventBus;
  public readonly powerUpPool: PowerUpPool;
  private readonly weaponSystem: WeaponSystem;
  private readonly canvasHeight: number;
  private onBonusScoreAwarded?: (points: number) => void;

  constructor(
    entities: EntityManager,
    eventBus: EventBus,
    powerUpPool: PowerUpPool,
    weaponSystem: WeaponSystem,
    collisionSystem: CollisionSystem,
    canvasHeight = Game.LOGICAL_HEIGHT,
    onBonusScoreAwarded?: (points: number) => void
  ) {
    this.entities = entities;
    this.eventBus = eventBus;
    this.powerUpPool = powerUpPool;
    this.weaponSystem = weaponSystem;
    this.canvasHeight = canvasHeight;
    this.onBonusScoreAwarded = onBonusScoreAwarded;

    // Bind collision callback
    collisionSystem.setPowerUpCollector((powerUpId) =>
      this.collectPowerUp(powerUpId)
    );

    // Subscribe to enemy destruction events to spawn dropped tokens (FR-008)
    this.eventBus.on('ENEMY_DESTROYED', (payload) => {
      if (payload.droppedPowerUp) {
        this.powerUpPool.spawn(payload.droppedPowerUp, payload.x, payload.y);
      }
    });
  }

  public setBonusScoreCallback(cb: (points: number) => void): void {
    this.onBonusScoreAwarded = cb;
  }

  public update(dt: number): void {
    this.powerUpPool.pool.forEachActive((pooled) => {
      const id = pooled.entityId;
      const t = this.entities.transforms.get(id);
      const p = this.entities.powerUps.get(id);
      if (!t || !p) return;

      p.despawnTimer -= dt;
      if (p.despawnTimer <= 0 || t.y > this.canvasHeight + 30) {
        this.powerUpPool.releaseByEntityId(id);
      }
    });
  }

  /**
   * Resolves player contact with a floating power-up token.
   */
  public collectPowerUp(powerUpEntityId: EntityId): void {
    if (!this.entities.isEntityActive(powerUpEntityId)) return;

    const powerUp = this.entities.powerUps.get(powerUpEntityId);
    const transform = this.entities.transforms.get(powerUpEntityId);
    if (!powerUp) return;

    const x = transform ? transform.x : 0;
    const y = transform ? transform.y : 0;

    // Release token back to pool first
    this.powerUpPool.releaseByEntityId(powerUpEntityId);

    this.eventBus.emit('VFX_SPAWN_TRIGGERED', {
      type: 'PICKUP_BURST',
      x,
      y,
      particleCount: 16,
      color: '#00ff88'
    });

    if (powerUp.type === 'WEAPON_UPGRADE') {
      const result = this.weaponSystem.upgradePlayerWeapon();
      if (result.isMaxTierBonus && this.onBonusScoreAwarded) {
        this.onBonusScoreAwarded(SURPLUS_UPGRADE_BONUS_POINTS);
      }
    } else if (powerUp.type === 'SCORE_BONUS' && this.onBonusScoreAwarded) {
      this.onBonusScoreAwarded(SURPLUS_UPGRADE_BONUS_POINTS);
    }
  }
}

