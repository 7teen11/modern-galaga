import { EntityManager } from '../ecs/Entity';
import {
  EntityId,
  RenderLayer,
  CollisionMask,
  WeaponTier
} from '../ecs/Component';

export interface PlayerConfig {
  startX: number;
  startY: number;
  speed: number;
  spriteWidth: number;
  spriteHeight: number;
  coreHitboxRatio: number; // 0.45 = 45% centered at cockpit (FR-014)
  maxHealth: number;
  initialLives: number;
  fireCooldown: number;
  bulletSpeed: number;
  bulletDamage: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  startX: 300,
  startY: 700,
  speed: 340, // pixels per second
  spriteWidth: 44,
  spriteHeight: 48,
  coreHitboxRatio: 0.45, // 45% cockpit core hitbox (FR-014)
  maxHealth: 100,
  initialLives: 3,
  fireCooldown: 0.14, // ~7 shots/second
  bulletSpeed: 760,
  bulletDamage: 25
};

/**
 * Factory assembling the PlayerShip entity from discrete data components (Principle III).
 */
export function createPlayerShip(
  entities: EntityManager,
  config: PlayerConfig = DEFAULT_PLAYER_CONFIG
): EntityId {
  const id = entities.createEntity();

  entities.transforms.set(id, {
    x: config.startX,
    y: config.startY,
    vx: 0,
    vy: 0,
    speed: config.speed,
    rotation: 0
  });

  entities.renders.set(id, {
    spriteKey: 'PLAYER_VANGUARD',
    width: config.spriteWidth,
    height: config.spriteHeight,
    layer: RenderLayer.PLAYER,
    alpha: 1.0,
    scale: 1.0,
    hitFlashTimer: 0,
    bloomColor: '#00f0ff'
  });

  // Core cockpit circle hitbox: 45% of ship dimension (FR-014)
  const coreRadius = Math.round((config.spriteWidth * config.coreHitboxRatio) * 0.5);

  entities.hitboxes.set(id, {
    shape: 'circle',
    radius: coreRadius, // ~10px radius for 44px wide ship
    halfWidth: config.spriteWidth * 0.5,
    halfHeight: config.spriteHeight * 0.5,
    isCoreHitbox: true,
    collisionLayer: CollisionMask.PLAYER_SHIP,
    collisionMask:
      CollisionMask.ENEMY_SHIP |
      CollisionMask.ENEMY_BULLET |
      CollisionMask.POWERUP
  });

  entities.healths.set(id, {
    currentHealth: config.maxHealth,
    maxHealth: config.maxHealth,
    invulnerableTimer: 0,
    livesRemaining: config.initialLives
  });

  entities.weapons.set(id, {
    tier: 1 as WeaponTier,
    cooldown: config.fireCooldown,
    cooldownTimer: 0,
    bulletSpeed: config.bulletSpeed,
    bulletDamage: config.bulletDamage
  });

  return id;
}

