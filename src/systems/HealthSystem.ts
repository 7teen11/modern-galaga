import { EntityManager } from '../ecs/Entity';
import { EntityId } from '../ecs/Component';
import { EventBus, PowerUpType } from '../core/EventBus';
import { EnemyPool } from '../ecs/EnemyPool';
import { WeaponSystem } from './WeaponSystem';
import { GameSystem } from '../core/Game';
import {
  DAMAGE_INVULNERABILITY_SEC,
  RESPAWN_INVULNERABILITY_SEC,
  SAFE_RESPAWN_X,
  SAFE_RESPAWN_Y
} from '../components/Health';
import { ENEMY_ARCHETYPE_CONFIG } from '../components/EnemyBehavior';

/**
 * Vitality, Multi-Life Respawn & Destruction Resolution System (FR-003, FR-004, FR-011, FR-012).
 * Enforces:
 * - 0.5s damage invulnerability on non-lethal hits
 * - Life decrement on 0 HP with bottom-center respawn + 2.5s invulnerability + Weapon Tier 1 reset
 * - Immediate transition to GAME_OVER when all 3 lives are exhausted (prioritizing player death)
 */
export class HealthSystem implements GameSystem {
  private readonly entities: EntityManager;
  private readonly eventBus: EventBus;
  private readonly enemyPool: EnemyPool;
  private readonly weaponSystem: WeaponSystem;
  private playerId: EntityId;
  private readonly onGameOver?: () => void;

  constructor(
    entities: EntityManager,
    eventBus: EventBus,
    enemyPool: EnemyPool,
    weaponSystem: WeaponSystem,
    playerId: EntityId,
    onGameOver?: () => void
  ) {
    this.entities = entities;
    this.eventBus = eventBus;
    this.enemyPool = enemyPool;
    this.weaponSystem = weaponSystem;
    this.playerId = playerId;
    this.onGameOver = onGameOver;
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public update(dt: number): void {
    for (const id of this.entities.getActiveEntities()) {
      const h = this.entities.healths.get(id);
      if (h && h.invulnerableTimer > 0) {
        h.invulnerableTimer = Math.max(0, h.invulnerableTimer - dt);
      }
    }
  }

  /**
   * Applies damage to a target entity (Player or Enemy) and resolves life/death state transitions.
   * Returns true if the damage was applied (false if target was invulnerable or inactive).
   */
  public applyDamage(
    targetId: EntityId,
    damageAmount: number,
    sourceId: EntityId = 0
  ): boolean {
    if (!this.entities.isEntityActive(targetId)) return false;

    const health = this.entities.healths.get(targetId);
    if (!health || health.invulnerableTimer > 0) return false;

    const transform = this.entities.transforms.get(targetId);
    const render = this.entities.renders.get(targetId);

    health.currentHealth = Math.max(0, health.currentHealth - damageAmount);

    // Trigger 1-frame white hit-flash (FR-016)
    if (render) {
      render.hitFlashTimer = 0.07;
    }

    this.eventBus.emit('ENTITY_DAMAGED', {
      targetId,
      damageAmount,
      remainingHealth: health.currentHealth,
      sourceId
    });

    if (transform) {
      this.eventBus.emit('VFX_SPAWN_TRIGGERED', {
        type: 'HIT_SPARK',
        x: transform.x,
        y: transform.y,
        particleCount: 6,
        color: targetId === this.playerId ? '#00f0ff' : '#ffcc00'
      });
    }

    if (targetId === this.playerId) {
      this.resolvePlayerHit(health.currentHealth);
    } else {
      this.resolveEnemyHit(targetId, health.currentHealth);
    }

    return true;
  }

  private resolvePlayerHit(remainingHealth: number): void {
    const health = this.entities.healths.get(this.playerId)!;
    const transform = this.entities.transforms.get(this.playerId);

    if (remainingHealth > 0) {
      // Non-lethal hit: grant 0.5s damage blink invulnerability (FR-004)
      health.invulnerableTimer = DAMAGE_INVULNERABILITY_SEC;
      return;
    }

    // Health reached 0: consume 1 life (FR-012)
    const currentLives = health.livesRemaining ?? 1;
    const nextLives = Math.max(0, currentLives - 1);
    health.livesRemaining = nextLives;

    if (transform) {
      this.eventBus.emit('VFX_SPAWN_TRIGGERED', {
        type: 'EXPLOSION',
        x: transform.x,
        y: transform.y,
        particleCount: 30,
        color: '#00f0ff'
      });
    }

    // Reset weapon tier to base Tier 1 on life loss (FR-011)
    this.weaponSystem.resetPlayerWeaponTier();

    if (nextLives > 0) {
      // Respawn at safe bottom-center coordinate with full health & 2.5s invulnerability (FR-012)
      health.currentHealth = health.maxHealth;
      health.invulnerableTimer = RESPAWN_INVULNERABILITY_SEC;
      if (transform) {
        transform.x = SAFE_RESPAWN_X;
        transform.y = SAFE_RESPAWN_Y;
        transform.vx = 0;
        transform.vy = 0;
      }

      this.eventBus.emit('PLAYER_LIFE_LOST', {
        livesRemaining: nextLives,
        isGameOver: false
      });
    } else {
      // 0 lives remaining -> Game Over!
      health.currentHealth = 0;
      this.entities.setEntityActive(this.playerId, false);

      this.eventBus.emit('PLAYER_LIFE_LOST', {
        livesRemaining: 0,
        isGameOver: true
      });

      if (this.onGameOver) {
        this.onGameOver();
      }
    }
  }

  private resolveEnemyHit(enemyId: EntityId, remainingHealth: number): void {
    if (remainingHealth > 0) return;

    const behavior = this.entities.enemyBehaviors.get(enemyId);
    const transform = this.entities.transforms.get(enemyId);
    const x = transform ? transform.x : 0;
    const y = transform ? transform.y : 0;
    const archetype = behavior ? behavior.archetype : 'SCOUT';
    const stats = ENEMY_ARCHETYPE_CONFIG[archetype];

    // Determine power-up drop: Commanders drop Weapon Upgrades (FR-006, FR-008)
    let droppedPowerUp: PowerUpType | null = null;
    if (archetype === 'COMMANDER') {
      droppedPowerUp = 'WEAPON_UPGRADE';
    } else if (
      stats.dropWeaponUpgradeChance > 0 &&
      Math.random() < stats.dropWeaponUpgradeChance
    ) {
      droppedPowerUp = 'WEAPON_UPGRADE';
    }

    const pointsAwarded = behavior ? behavior.pointValue : stats.pointValue;

    this.eventBus.emit('VFX_SPAWN_TRIGGERED', {
      type: 'EXPLOSION',
      x,
      y,
      particleCount: archetype === 'COMMANDER' ? 26 : 14,
      color: stats.bloomColor
    });

    this.eventBus.emit('ENEMY_DESTROYED', {
      enemyId,
      archetype,
      x,
      y,
      pointsAwarded,
      droppedPowerUp
    });

    this.enemyPool.releaseByEntityId(enemyId);
  }
}

