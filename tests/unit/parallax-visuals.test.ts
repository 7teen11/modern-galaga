import { describe, it, expect } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { MovementSystem } from '../../src/systems/MovementSystem';
import { ParallaxSystem } from '../../src/systems/ParallaxSystem';

describe('Feature 003 - User Story 3: 3-Layer Parallax Starfield & Player Ship Banking Tilt', () => {
  it('scrolls 3 distinct parallax layers at independent speeds (25 px/s, 60 px/s, 140 px/s) and wraps seamlessly (FR-009)', () => {
    const parallax = new ParallaxSystem(600, 800);
    const speeds = parallax.getLayerSpeeds();

    expect(speeds.distant).toBe(25);
    expect(speeds.nebula).toBe(60);
    expect(speeds.foreground).toBe(140);

    expect(parallax.distantStars.length).toBeGreaterThan(0);
    expect(parallax.midNebulae.length).toBeGreaterThan(0);
    expect(parallax.foregroundDust.length).toBeGreaterThan(0);

    const star0Y = parallax.distantStars[0].y;
    const nebula0Y = parallax.midNebulae[0].y;
    const dust0Y = parallax.foregroundDust[0].y;

    // Step 0.5 seconds
    parallax.update(0.5);

    expect(parallax.distantStars[0].y).toBeCloseTo((star0Y + 12.5) % 800, 2);
    expect(parallax.midNebulae[0].y).toBeCloseTo(nebula0Y + 30, 2);
    expect(parallax.foregroundDust[0].y).toBeCloseTo((dust0Y + 70) % 800, 2);
  });

  it('smoothly banks player ship rotation up to +-15 degrees (0.2618 rad) during lateral movement and levels out when stopped (FR-010)', () => {
    const entities = new EntityManager();
    const playerId = createPlayerShip(entities);
    const movement = new MovementSystem(entities, playerId, 600, 800);
    const pt = entities.transforms.get(playerId)!;

    // Steer right (vx > 0) for 0.5 seconds
    pt.vx = 320;
    for (let i = 0; i < 30; i++) {
      movement.update(1 / 60);
    }
    expect(pt.rotation).toBeGreaterThan(0.24);
    expect(pt.rotation).toBeLessThanOrEqual(MovementSystem.MAX_BANK_TILT_RAD + 0.001);

    // Steer left (vx < 0) for 0.5 seconds
    pt.vx = -320;
    for (let i = 0; i < 30; i++) {
      movement.update(1 / 60);
    }
    expect(pt.rotation).toBeLessThan(-0.24);
    expect(pt.rotation).toBeGreaterThanOrEqual(-MovementSystem.MAX_BANK_TILT_RAD - 0.001);

    // Release steering (vx = 0) -> returns smoothly to 0 rad
    pt.vx = 0;
    for (let i = 0; i < 40; i++) {
      movement.update(1 / 60);
    }
    expect(Math.abs(pt.rotation)).toBeLessThan(0.01);
  });
});

