import { EntityManager } from '../ecs/Entity';
import { EntityId } from '../ecs/Component';
import { Game, GameSystem } from '../core/Game';
import { Vector2, Vec2 } from '../utils/Vector2';
import { Spline } from '../utils/Spline';

/**
 * Kinematic 2D Movement & Viewport Boundary Clamping System (FR-001, FR-015).
 * Integrates velocity vectors using fixed delta-time and evaluates Bézier spline paths.
 */
export class MovementSystem implements GameSystem {
  private readonly entities: EntityManager;
  private playerId: EntityId;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly splinePos: Vec2 = { x: 0, y: 0 };
  private readonly splinePrevPos: Vec2 = { x: 0, y: 0 };

  constructor(
    entities: EntityManager,
    playerId: EntityId,
    canvasWidth = Game.LOGICAL_WIDTH,
    canvasHeight = Game.LOGICAL_HEIGHT
  ) {
    this.entities = entities;
    this.playerId = playerId;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public update(dt: number): void {
    const activeSet = this.entities.getActiveEntities();

    for (const id of activeSet) {
      const transform = this.entities.transforms.get(id);
      if (!transform) continue;

      // 1. Player ship movement & strict viewport clamping (FR-001)
      if (id === this.playerId) {
        transform.x += transform.vx * dt;
        transform.y += transform.vy * dt;

        const render = this.entities.renders.get(id);
        const halfW = render ? render.width * 0.5 : 22;
        const halfH = render ? render.height * 0.5 : 24;

        transform.x = Vector2.clamp(
          transform.x,
          halfW + 4,
          this.canvasWidth - halfW - 4
        );
        transform.y = Vector2.clamp(
          transform.y,
          halfH + 40, // Keep below top HUD bar
          this.canvasHeight - halfH - 8
        );
        continue;
      }

      // 2. Enemy Bézier Spline entry traversal (FR-015)
      const enemy = this.entities.enemyBehaviors.get(id);
      if (enemy && enemy.state === 'ENTERING_SPLINE' && enemy.splinePath) {
        this.splinePrevPos.x = transform.x;
        this.splinePrevPos.y = transform.y;

        enemy.splineProgress += enemy.splineSpeed * dt;
        if (enemy.splineProgress >= 1.0) {
          enemy.splineProgress = 1.0;
          Spline.evaluatePath(enemy.splinePath, 1.0, this.splinePos);
          transform.x = enemy.targetSlotX;
          transform.y = enemy.targetSlotY;
          transform.vx = 0;
          transform.vy = 0;
          transform.rotation = 0;
          enemy.state = 'IN_FORMATION';
        } else {
          Spline.evaluatePath(
            enemy.splinePath,
            enemy.splineProgress,
            this.splinePos
          );
          transform.x = this.splinePos.x;
          transform.y = this.splinePos.y;
          const dx = transform.x - this.splinePrevPos.x;
          const dy = transform.y - this.splinePrevPos.y;
          if (dx * dx + dy * dy > 0.001) {
            transform.rotation = Math.atan2(dy, dx) - Math.PI * 0.5;
          }
        }
        continue;
      }

      // 3. Standard kinematic velocity integration for bullets, diving enemies, and power-ups
      transform.x += transform.vx * dt;
      transform.y += transform.vy * dt;
    }
  }
}

