import { describe, it, expect } from 'vitest';
import { HellSplines } from '../../src/modes/hell/HellSplines';
import { Spline } from '../../src/utils/Spline';
import { Vector2 } from '../../src/utils/Vector2';

describe('HellSplines - Pincer & Cross-Fire Bézier Paths (T011)', () => {
  const WIDTH = 600;
  const HEIGHT = 800;
  const targetX = 300;
  const targetY = 150;

  it('creates Wave 2 left pincer path starting off-screen left and ending at target slot', () => {
    const segments = HellSplines.createPincerSwoopPath('left', targetX, targetY, WIDTH, HEIGHT);
    expect(segments.length).toBeGreaterThanOrEqual(2);

    // Starts off-screen left
    expect(segments[0].p0.x).toBeLessThan(0);

    // Ends exactly at target
    const lastSeg = segments[segments.length - 1];
    expect(lastSeg.p3.x).toBeCloseTo(targetX, 1);
    expect(lastSeg.p3.y).toBeCloseTo(targetY, 1);

    // Continuous C0 continuity between segments
    for (let i = 0; i < segments.length - 1; i++) {
      expect(segments[i].p3.x).toBeCloseTo(segments[i + 1].p0.x, 2);
      expect(segments[i].p3.y).toBeCloseTo(segments[i + 1].p0.y, 2);
    }
  });

  it('creates Wave 2 right pincer path starting off-screen right and ending at target slot', () => {
    const segments = HellSplines.createPincerSwoopPath('right', targetX, targetY, WIDTH, HEIGHT);
    expect(segments.length).toBeGreaterThanOrEqual(2);

    // Starts off-screen right
    expect(segments[0].p0.x).toBeGreaterThan(WIDTH);

    // Ends exactly at target
    const lastSeg = segments[segments.length - 1];
    expect(lastSeg.p3.x).toBeCloseTo(targetX, 1);
    expect(lastSeg.p3.y).toBeCloseTo(targetY, 1);
  });

  it('creates Wave 3 diagonal cross-fire paths intersecting across screen', () => {
    const crossLeft = HellSplines.createCrossFireSweepPath(
      'top-left-to-bottom-right',
      targetX,
      targetY,
      WIDTH,
      HEIGHT
    );
    const crossRight = HellSplines.createCrossFireSweepPath(
      'top-right-to-bottom-left',
      targetX,
      targetY,
      WIDTH,
      HEIGHT
    );

    expect(crossLeft.length).toBeGreaterThanOrEqual(2);
    expect(crossRight.length).toBeGreaterThanOrEqual(2);

    // Starts at top off-screen
    expect(crossLeft[0].p0.y).toBeLessThanOrEqual(0);
    expect(crossLeft[0].p0.x).toBeLessThanOrEqual(WIDTH * 0.2);

    expect(crossRight[0].p0.y).toBeLessThanOrEqual(0);
    expect(crossRight[0].p0.x).toBeGreaterThanOrEqual(WIDTH * 0.8);

    // Ends at target
    expect(crossLeft[crossLeft.length - 1].p3.x).toBeCloseTo(targetX, 1);
    expect(crossLeft[crossLeft.length - 1].p3.y).toBeCloseTo(targetY, 1);
    expect(crossRight[crossRight.length - 1].p3.x).toBeCloseTo(targetX, 1);
    expect(crossRight[crossRight.length - 1].p3.y).toBeCloseTo(targetY, 1);
  });

  it('evaluates spline smoothly without NaN throughout t in [0, 1]', () => {
    const segments = HellSplines.createPincerSwoopPath('left', targetX, targetY, WIDTH, HEIGHT);
    const out = new Vector2();

    for (let t = 0; t <= 1; t += 0.1) {
      Spline.evaluatePath(segments, t, out);
      expect(Number.isNaN(out.x)).toBe(false);
      expect(Number.isNaN(out.y)).toBe(false);
    }
  });
});

