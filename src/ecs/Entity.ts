import {
  EntityId,
  TransformComponent,
  RenderComponent,
  HitboxComponent,
  HealthComponent,
  WeaponComponent,
  EnemyBehaviorComponent,
  ProjectileComponent,
  PowerUpComponent,
  ParticleComponent
} from './Component';

/**
 * Lightweight Component-Based Entity Manager (Constitution Principle III).
 * Uses flat Map/Array storage indexed by numeric EntityId without class inheritance hierarchies.
 */
export class EntityManager {
  private nextId: EntityId = 1;
  private activeEntities: Set<EntityId> = new Set();

  public readonly transforms: Map<EntityId, TransformComponent> = new Map();
  public readonly renders: Map<EntityId, RenderComponent> = new Map();
  public readonly hitboxes: Map<EntityId, HitboxComponent> = new Map();
  public readonly healths: Map<EntityId, HealthComponent> = new Map();
  public readonly weapons: Map<EntityId, WeaponComponent> = new Map();
  public readonly enemyBehaviors: Map<EntityId, EnemyBehaviorComponent> = new Map();
  public readonly projectiles: Map<EntityId, ProjectileComponent> = new Map();
  public readonly powerUps: Map<EntityId, PowerUpComponent> = new Map();
  public readonly particles: Map<EntityId, ParticleComponent> = new Map();

  public createEntity(): EntityId {
    const id = this.nextId++;
    this.activeEntities.add(id);
    return id;
  }

  public setEntityActive(id: EntityId, active: boolean): void {
    if (active) {
      this.activeEntities.add(id);
    } else {
      this.activeEntities.delete(id);
    }
  }

  public isEntityActive(id: EntityId): boolean {
    return this.activeEntities.has(id);
  }

  public getActiveEntities(): ReadonlySet<EntityId> {
    return this.activeEntities;
  }

  public destroyEntity(id: EntityId): void {
    this.activeEntities.delete(id);
    this.transforms.delete(id);
    this.renders.delete(id);
    this.hitboxes.delete(id);
    this.healths.delete(id);
    this.weapons.delete(id);
    this.enemyBehaviors.delete(id);
    this.projectiles.delete(id);
    this.powerUps.delete(id);
    this.particles.delete(id);
  }

  public clear(): void {
    this.activeEntities.clear();
    this.transforms.clear();
    this.renders.clear();
    this.hitboxes.clear();
    this.healths.clear();
    this.weapons.clear();
    this.enemyBehaviors.clear();
    this.projectiles.clear();
    this.powerUps.clear();
    this.particles.clear();
    this.nextId = 1;
  }
}

