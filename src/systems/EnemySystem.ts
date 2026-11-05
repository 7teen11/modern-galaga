import { EntityManager } from '../ecs/Entity';
import { EntityId, EnemyBehaviorComponent } from '../ecs/Component';
import { ENEMY_ARCHETYPE_CONFIG } from '../components/EnemyBehavior';
import { WeaponSystem } from './WeaponSystem';
import { Game, GameSystem } from '../core/Game';

/**
 * Enemy Tactical Behavioral FSM System (FR-006).
 * Manages:
 * - IN_FORMATION: Synchronized breathing oscillation and dive/fire countdowns
 * - DIVING: Peeling kamikaze dive attacks toward player's position (Commanders trigger Fighter escorts)
 * - RETURNING: Wrapping from bottom to top margin and gliding back into formation slot
 */
export class EnemySystem implements GameSystem {
  private readonly entities: EntityManager;
  private readonly weaponSystem: WeaponSystem;
  private playerId: EntityId;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;

  private swayClock = 0;
  public difficultyMultiplier = 1.0;

  constructor(
    entities: EntityManager,
    weaponSystem: WeaponSystem,
    playerId: EntityId,
    canvasWidth = Game.LOGICAL_WIDTH,
    canvasHeight = Game.LOGICAL_HEIGHT
  ) {
    this.entities = entities;
    this.weaponSystem = weaponSystem;
    this.playerId = playerId;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public update(dt: number): void {
    this.swayClock += dt;
    const swayOffset = Math.sin(this.swayClock * 2.1) * 20;

    const playerTransform = this.entities.transforms.get(this.playerId);
    const playerX = playerTransform ? playerTransform.x : this.canvasWidth * 0.5;
    const playerY = playerTransform ? playerTransform.y : this.canvasHeight - 90;

    for (const id of this.entities.getActiveEntities()) {
      const behavior = this.entities.enemyBehaviors.get(id);
      if (!behavior) continue;

      const transform = this.entities.transforms.get(id);
      if (!transform) continue;

      const stats = ENEMY_ARCHETYPE_CONFIG[behavior.archetype];

      switch (behavior.state) {
        case 'ENTERING_SPLINE': {
          // Allow occasional suppression fire while swooping in on higher waves
          behavior.fireTimer -= dt;
          if (behavior.fireTimer <= 0 && behavior.splineProgress > 0.45) {
            behavior.fireTimer = stats.baseFireInterval / this.difficultyMultiplier;
            this.fireAtPlayer(transform.x, transform.y, playerX, playerY, behavior);
          }
          break;
        }

        case 'IN_FORMATION': {
          // Smoothly track breathing formation slot
          const desiredX = behavior.targetSlotX + swayOffset;
          transform.x += (desiredX - transform.x) * Math.min(1, dt * 10);
          transform.y += (behavior.targetSlotY - transform.y) * Math.min(1, dt * 10);
          transform.vx = 0;
          transform.vy = 0;
          transform.rotation = 0;

          // Ranged attack timer
          behavior.fireTimer -= dt;
          if (behavior.fireTimer <= 0) {
            behavior.fireTimer = stats.baseFireInterval / this.difficultyMultiplier;
            if (behavior.archetype !== 'SCOUT') {
              this.fireAtPlayer(transform.x, transform.y, playerX, playerY, behavior);
            }
          }

          // Dive initiation timer
          behavior.diveTimer -= dt;
          if (behavior.diveTimer <= 0) {
            this.initiateDive(id, behavior, playerX, playerY);
          }
          break;
        }

        case 'DIVING': {
          // Steer laterally toward locked dive target while accelerating downward
          const dx = behavior.diveTargetX - transform.x;
          const lateralPull = Math.max(-180, Math.min(180, dx * 1.8));
          transform.vx = lateralPull;
          transform.vy = stats.baseDiveSpeed * this.difficultyMultiplier;
          transform.rotation = Math.atan2(transform.vy, transform.vx) - Math.PI * 0.5;

          // Firing while diving
          behavior.fireTimer -= dt;
          if (behavior.fireTimer <= 0) {
            behavior.fireTimer = (stats.baseFireInterval * 0.75) / this.difficultyMultiplier;
            this.fireAtPlayer(transform.x, transform.y, playerX, playerY, behavior);
          }

          // Wrap from bottom of screen to top to return to formation (FR-006)
          if (transform.y > this.canvasHeight + 32) {
            transform.y = -28;
            transform.x = behavior.targetSlotX;
            behavior.state = 'RETURNING';
          }
          break;
        }

        case 'RETURNING': {
          const desiredX = behavior.targetSlotX + swayOffset;
          const desiredY = behavior.targetSlotY;
          const dx = desiredX - transform.x;
          const dy = desiredY - transform.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 10) {
            transform.x = desiredX;
            transform.y = desiredY;
            transform.vx = 0;
            transform.vy = 0;
            transform.rotation = 0;
            behavior.state = 'IN_FORMATION';
            behavior.diveTimer = stats.baseDiveInterval / this.difficultyMultiplier;
          } else {
            const returnSpeed = stats.baseDiveSpeed * 1.1;
            transform.vx = (dx / dist) * returnSpeed;
            transform.vy = (dy / dist) * returnSpeed;
            transform.rotation = Math.atan2(transform.vy, transform.vx) - Math.PI * 0.5;
          }
          break;
        }
      }
    }
  }

  /**
   * Transitions an enemy from IN_FORMATION to DIVING.
   * If the enemy is an elite COMMANDER, triggers up to 2 nearby FIGHTER escorts to dive alongside it (FR-006).
   */
  public initiateDive(
    enemyId: EntityId,
    behavior: EnemyBehaviorComponent,
    playerX: number,
    playerY: number
  ): void {
    behavior.state = 'DIVING';
    behavior.diveTargetX = playerX;
    behavior.diveTargetY = playerY;

    if (behavior.archetype === 'COMMANDER') {
      let escortsRecruited = 0;
      for (const otherId of this.entities.getActiveEntities()) {
        if (otherId === enemyId || escortsRecruited >= 2) continue;
        const other = this.entities.enemyBehaviors.get(otherId);
        if (
          other &&
          other.archetype === 'FIGHTER' &&
          other.state === 'IN_FORMATION' &&
          Math.abs(other.formationGridX - behavior.formationGridX) <= 1
        ) {
          other.state = 'DIVING';
          other.diveTargetX = playerX + (escortsRecruited === 0 ? -36 : 36);
          other.diveTargetY = playerY;
          escortsRecruited++;
        }
      }
    }
  }

  private fireAtPlayer(
    fromX: number,
    fromY: number,
    playerX: number,
    playerY: number,
    behavior: EnemyBehaviorComponent
  ): void {
    const bulletSpeed = Math.min(480, 250 * (1 + (this.difficultyMultiplier - 1) * 0.6));

    if (behavior.archetype === 'FIGHTER' || behavior.archetype === 'COMMANDER') {
      // Aimed plasma bolt toward player position
      const dx = playerX - fromX;
      const dy = Math.max(60, playerY - fromY);
      const dist = Math.hypot(dx, dy);
      const vx = (dx / dist) * bulletSpeed;
      const vy = (dy / dist) * bulletSpeed;
      this.weaponSystem.spawnEnemyBullet(fromX, fromY + 14, vx, vy, 20);
    } else {
      // Scout fires straight downward
      this.weaponSystem.spawnEnemyBullet(fromX, fromY + 12, 0, bulletSpeed, 15);
    }
  }
}

