import { GameSystem } from '../../core/Game';
import { EntityManager } from '../../ecs/Entity';
import { EventBus } from '../../core/EventBus';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { HellDirector } from './HellDirector';
import { HELL_RULES } from './HellConfig';

/**
 * HellDamageSystem - Non-destructive 2x damage multiplier interceptor.
 * Doubles enemy projectile damage (20 -> 40 HP) and ramming collision damage (35 -> 70 HP)
 * when Hell Mode is active without altering core systems.
 */
export class HellDamageSystem implements GameSystem {
  private entities: EntityManager;
  private eventBus: EventBus;
  private director: HellDirector;
  private weaponSystem: WeaponSystem;
  private playerId: number;

  constructor(
    entities: EntityManager,
    eventBus: EventBus,
    director: HellDirector,
    weaponSystem: WeaponSystem,
    playerId: number
  ) {
    this.entities = entities;
    this.eventBus = eventBus;
    this.director = director;
    this.weaponSystem = weaponSystem;
    this.playerId = playerId;

    this.bindEvents();
  }

  public setPlayerId(id: number): void {
    this.playerId = id;
  }

  private bindEvents(): void {
    this.eventBus.on('ENTITY_DAMAGED', (payload) => {
      if (!this.director.isHellMode()) return;

      // Check if Player took ramming damage from an enemy hull (base damage 35)
      if (payload.targetId === this.playerId) {
        const isRammingHit =
          payload.damageAmount === 35 ||
          this.entities.enemyBehaviors.has(payload.sourceId);

        if (isRammingHit) {
          const health = this.entities.healths.get(this.playerId);
          if (health) {
            // Apply second half of 2x damage (35 additional damage -> 70 total)
            const additionalDamage = HELL_RULES.DAMAGE.collisionDamage - payload.damageAmount;
            if (additionalDamage > 0) {
              health.currentHealth = Math.max(0, health.currentHealth - additionalDamage);
            }
          }
        }
      }
    });
  }

  public update(_dt: number): void {
    const isHell = this.director.isHellMode();
    const targetBulletDamage = isHell
      ? HELL_RULES.DAMAGE.bulletDamage
      : 20;

    // Intercept active enemy bullets in the pool and scale their projectile damage
    this.weaponSystem.enemyBulletPool.forEachActive((pooledBullet) => {
      const proj = this.entities.projectiles.get(pooledBullet.entityId);
      if (proj && proj.sourceAffiliation === 'ENEMY') {
        proj.damage = targetBulletDamage;
      }
    });
  }
}
