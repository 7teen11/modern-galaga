import { CubicBezierSegment } from '../utils/Spline';
import { EnemyArchetype, PowerUpType } from '../core/EventBus';

export type EntityId = number;

export enum RenderLayer {
  BACKGROUND = 0,
  PARTICLES_BG = 1,
  POWERUPS = 2,
  ENEMIES = 3,
  PLAYER = 4,
  BULLETS = 5,
  PARTICLES_FG = 6,
  HUD = 7
}

export enum CollisionMask {
  NONE = 0,
  PLAYER_SHIP = 1 << 0,
  PLAYER_BULLET = 1 << 1,
  ENEMY_SHIP = 1 << 2,
  ENEMY_BULLET = 1 << 3,
  POWERUP = 1 << 4
}

export interface TransformComponent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  rotation: number;
}

export interface RenderComponent {
  spriteKey: string;
  width: number;
  height: number;
  layer: RenderLayer;
  alpha: number;
  scale: number;
  hitFlashTimer: number;
  bloomColor?: string;
}

export interface HitboxComponent {
  shape: 'circle' | 'aabb';
  radius: number;
  halfWidth: number;
  halfHeight: number;
  isCoreHitbox: boolean;
  collisionLayer: CollisionMask;
  collisionMask: number;
}

export interface HealthComponent {
  currentHealth: number;
  maxHealth: number;
  invulnerableTimer: number;
  livesRemaining?: number;
}

export type WeaponTier = 1 | 2 | 3;

export interface WeaponComponent {
  tier: WeaponTier;
  cooldown: number;
  cooldownTimer: number;
  bulletSpeed: number;
  bulletDamage: number;
}

export type EnemyState =
  | 'ENTERING_SPLINE'
  | 'IN_FORMATION'
  | 'DIVING'
  | 'RETURNING'
  | 'DESTROYED';

export interface EnemyBehaviorComponent {
  archetype: EnemyArchetype;
  state: EnemyState;
  pointValue: number;
  formationGridX: number;
  formationGridY: number;
  targetSlotX: number;
  targetSlotY: number;
  splinePath: CubicBezierSegment[] | null;
  splineProgress: number;
  splineSpeed: number;
  diveTimer: number;
  fireTimer: number;
  diveTargetX: number;
  diveTargetY: number;
}

export interface ProjectileComponent {
  sourceAffiliation: 'PLAYER' | 'ENEMY';
  damage: number;
}

export interface PowerUpComponent {
  type: PowerUpType;
  driftSpeed: number;
  despawnTimer: number;
}

export interface ParticleComponent {
  vx: number;
  vy: number;
  decayRate: number;
  color: string;
  size: number;
  currentLifetime: number;
  maxLifetime: number;
}

