import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { createPlayerShip, DEFAULT_PLAYER_CONFIG } from '../../src/components/PlayerComponents';
import { InputSystem } from '../../src/systems/InputSystem';
import { MovementSystem } from '../../src/systems/MovementSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { INV_SQRT2 } from '../../src/utils/Vector2';
import { EntityId } from '../../src/ecs/Component';

describe('User Story 1: Responsive 8-Directional Flight & Basic Firing (MVP)', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let playerId: EntityId;
  let inputSystem: InputSystem;
  let movementSystem: MovementSystem;
  let weaponSystem: WeaponSystem;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    playerId = createPlayerShip(entities, {
      ...DEFAULT_PLAYER_CONFIG,
      startX: 300,
      startY: 700,
      speed: 300,
      fireCooldown: 0.15
    });

    inputSystem = new InputSystem(entities, eventBus, playerId);
    movementSystem = new MovementSystem(entities, playerId, 600, 800);
    weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId, 600, 800);
  });

  it('moves player ship in all 4 cardinal directions at exact configured scalar speed', () => {
    const dt = 0.1; // 100ms
    const transform = entities.transforms.get(playerId)!;

    // Move Right (+X)
    inputSystem.setKeyState('KeyD', true);
    inputSystem.update(dt);
    movementSystem.update(dt);
    expect(transform.x).toBeCloseTo(300 + 300 * dt, 4);
    expect(transform.y).toBeCloseTo(700, 4);

    // Move Up (-Y)
    inputSystem.clearInputs();
    inputSystem.setKeyState('KeyW', true);
    inputSystem.update(dt);
    movementSystem.update(dt);
    expect(transform.y).toBeCloseTo(700 - 300 * dt, 4);
  });

  it('normalizes diagonal velocity by 1/sqrt(2) (~0.7071) so diagonal travel speed equals cardinal speed', () => {
    const dt = 0.1;
    const transform = entities.transforms.get(playerId)!;

    // Hold Up + Right simultaneously
    inputSystem.setKeyState('ArrowUp', true);
    inputSystem.setKeyState('ArrowRight', true);
    inputSystem.update(dt);

    expect(transform.vx).toBeCloseTo(300 * INV_SQRT2, 4);
    expect(transform.vy).toBeCloseTo(-300 * INV_SQRT2, 4);

    // Total scalar velocity magnitude must equal 300
    const speedMag = Math.hypot(transform.vx, transform.vy);
    expect(speedMag).toBeCloseTo(300, 4);
  });

  it('cancels opposing directional keys held simultaneously (Left + Right = 0, Up + Down = 0)', () => {
    const dt = 1 / 60;
    const transform = entities.transforms.get(playerId)!;

    inputSystem.setKeyState('KeyA', true);
    inputSystem.setKeyState('KeyD', true);
    inputSystem.update(dt);

    expect(transform.vx).toBe(0);
    expect(transform.vy).toBe(0);
  });

  it('clamps player ship coordinates strictly inside the active canvas viewport boundaries', () => {
    const transform = entities.transforms.get(playerId)!;

    // Drive far left
    inputSystem.setKeyState('KeyA', true);
    inputSystem.update(1.0);
    movementSystem.update(5.0);
    expect(transform.x).toBeGreaterThanOrEqual(26);

    // Drive far right
    inputSystem.clearInputs();
    inputSystem.setKeyState('KeyD', true);
    inputSystem.update(1.0);
    movementSystem.update(5.0);
    expect(transform.x).toBeLessThanOrEqual(600 - 26);
  });

  it('fires projectiles continuously from pre-warmed PlayerBulletPool respecting fire-rate cooldown', () => {
    inputSystem.setKeyState('Space', true);
    inputSystem.update(0.016);

    // First shot fires immediately
    weaponSystem.update(0.016);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(1);

    // Next frame (0.05s later < 0.15s cooldown) does NOT fire yet
    weaponSystem.update(0.05);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(1);

    // After cooldown elapses (+0.11s -> total 0.16s >= 0.15s), second shot spawns
    weaponSystem.update(0.11);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(2);
  });

  it('reclaims off-screen projectiles back to PlayerBulletPool automatically without memory leaks', () => {
    inputSystem.setKeyState('Space', true);
    inputSystem.update(0.016);
    weaponSystem.update(0.016);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(1);

    inputSystem.clearInputs();
    inputSystem.update(0.016);

    // Advance bullet past top screen margin (-30px)
    for (let i = 0; i < 90; i++) {
      movementSystem.update(1 / 60);
      weaponSystem.update(1 / 60);
    }

    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(0);
    expect(weaponSystem.getPoolMetrics().playerBullets.freeCount).toBe(50);
  });
});

