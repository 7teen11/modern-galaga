import { EntityManager } from './Entity';
import {
  EntityId,
  RenderLayer,
  CollisionMask
} from './Component';
import { ObjectPool, Poolable, PoolMetrics } from './Pool';
import { EnemyArchetype } from '../core/EventBus';
import { ENEMY_ARCHETYPE_CONFIG } from '../components/EnemyBehavior';
import { selectEnemyColorVariant } from '../components/EnemyVariants';
import { CubicBezierSegment } from '../utils/Spline';

export class PooledEnemy implements Poolable {
  public active = false;
  public poolIndex = 0;
  public readonly entityId: EntityId;
  private readonly entities: EntityManager;

  constructor(poolIndex: number, entityId: EntityId, entities: EntityManager) {
    this.poolIndex = poolIndex;
    this.entityId = entityId;
    this.entities = entities;
  }

  public reset(): void {
    this.entities.setEntityActive(this.entityId, false);
    const t = this.entities.transforms.get(this.entityId);
    if (t) {
      t.x = -200;
      t.y = -200;
      t.vx = 0;
      t.vy = 0;
      t.rotation = 0;
    }
    const b = this.entities.enemyBehaviors.get(this.entityId);
    if (b) {
      b.state = 'DESTROYED';
      b.splinePath = null;
      b.splineProgress = 0;
    }
  }
}

export interface EnemySpawnParams {
  archetype: EnemyArchetype;
  gridCol: number;
  gridRow: number;
  targetSlotX: number;
  targetSlotY: number;
  splinePath: CubicBezierSegment[];
  difficultyMultiplier: number;
}

/**
 * Pre-warmed Object Pool for all Enemy entities (Capacity: 60, Constitution Principle IV).
 */
export class EnemyPool {
  public static readonly CAPACITY = 60;

  private readonly entities: EntityManager;
  public readonly pool: ObjectPool<PooledEnemy>;
  private readonly enemyByEntityId: Map<EntityId, PooledEnemy> = new Map();

  constructor(entities: EntityManager) {
    this.entities = entities;
    this.pool = new ObjectPool<PooledEnemy>(
      EnemyPool.CAPACITY,
      (idx) => this.createPooledEnemyEntity(idx),
      'REJECT'
    );
  }

  private createPooledEnemyEntity(poolIndex: number): PooledEnemy {
    const id = this.entities.createEntity();

    this.entities.transforms.set(id, {
      x: -200,
      y: -200,
      vx: 0,
      vy: 0,
      speed: 240,
      rotation: 0
    });

    this.entities.renders.set(id, {
      spriteKey: 'ENEMY_SCOUT',
      width: 28,
      height: 28,
      layer: RenderLayer.ENEMIES,
      alpha: 1.0,
      scale: 1.0,
      hitFlashTimer: 0,
      bloomColor: '#e0aaff'
    });

    this.entities.hitboxes.set(id, {
      shape: 'aabb',
      radius: 14,
      halfWidth: 14,
      halfHeight: 14,
      isCoreHitbox: false,
      collisionLayer: CollisionMask.ENEMY_SHIP,
      collisionMask:
        CollisionMask.PLAYER_BULLET | CollisionMask.PLAYER_SHIP
    });

    this.entities.healths.set(id, {
      currentHealth: 25,
      maxHealth: 25,
      invulnerableTimer: 0
    });

    this.entities.enemyBehaviors.set(id, {
      archetype: 'SCOUT',
      state: 'DESTROYED',
      pointValue: 100,
      formationGridX: 0,
      formationGridY: 0,
      targetSlotX: 0,
      targetSlotY: 0,
      splinePath: null,
      splineProgress: 0,
      splineSpeed: 0.45,
      diveTimer: 4.0,
      fireTimer: 2.0,
      diveTargetX: 300,
      diveTargetY: 700
    });

    this.entities.setEntityActive(id, false);
    const pooled = new PooledEnemy(poolIndex, id, this.entities);
    this.enemyByEntityId.set(id, pooled);
    return pooled;
  }

  public spawn(params: EnemySpawnParams): EntityId | null {
    const item = this.pool.acquire();
    if (!item) return null;

    const id = item.entityId;
    const stats = ENEMY_ARCHETYPE_CONFIG[params.archetype];
    const mult = Math.max(1, params.difficultyMultiplier);

    this.entities.setEntityActive(id, true);

    const startPoint =
      params.splinePath.length > 0
        ? params.splinePath[0].p0
        : { x: params.targetSlotX, y: -40 };

    const t = this.entities.transforms.get(id)!;
    t.x = startPoint.x;
    t.y = startPoint.y;
    t.vx = 0;
    t.vy = 0;
    t.speed = stats.baseDiveSpeed * mult;
    t.rotation = 0;

    const variant = selectEnemyColorVariant(
      params.archetype,
      params.gridCol,
      params.gridRow
    );

    const r = this.entities.renders.get(id)!;
    r.spriteKey = `ENEMY_${params.archetype}`;
    r.width = stats.width;
    r.height = stats.height;
    r.hitFlashTimer = 0;
    r.bloomColor = variant.hullPrimary;
    r.variantId = variant.variantId;
    r.hullPrimary = variant.hullPrimary;
    r.hullSecondary = variant.hullSecondary;
    r.thrusterColor = variant.thrusterColor;

    const hb = this.entities.hitboxes.get(id)!;
    hb.halfWidth = stats.width * 0.5;
    hb.halfHeight = stats.height * 0.5;
    hb.radius = Math.max(hb.halfWidth, hb.halfHeight);

    const h = this.entities.healths.get(id)!;
    h.maxHealth = stats.maxHealth;
    h.currentHealth = stats.maxHealth;
    h.invulnerableTimer = 0;

    const b = this.entities.enemyBehaviors.get(id)!;
    b.archetype = params.archetype;
    b.state = 'ENTERING_SPLINE';
    b.pointValue = stats.pointValue;
    b.formationGridX = params.gridCol;
    b.formationGridY = params.gridRow;
    b.targetSlotX = params.targetSlotX;
    b.targetSlotY = params.targetSlotY;
    b.splinePath = params.splinePath;
    b.splineProgress = 0;
    b.splineSpeed = Math.min(1.1, 0.42 * (1 + (mult - 1) * 0.5));
    // Stagger dive & fire timers deterministically based on grid coordinates
    const stagger = ((params.gridCol * 7 + params.gridRow * 13) % 10) * 0.35;
    b.diveTimer = (stats.baseDiveInterval / mult) + stagger;
    b.fireTimer = (stats.baseFireInterval / mult) + stagger * 0.5;
    b.diveTargetX = params.targetSlotX;
    b.diveTargetY = 720;

    return id;
  }

  public releaseByEntityId(entityId: EntityId): void {
    const pooled = this.enemyByEntityId.get(entityId);
    if (pooled && pooled.active) {
      this.pool.release(pooled);
    }
  }

  public releaseAll(): void {
    this.pool.releaseAll();
  }

  public getActiveCount(): number {
    return this.pool.getMetrics().activeCount;
  }

  public getMetrics(): PoolMetrics {
    return this.pool.getMetrics();
  }
}

