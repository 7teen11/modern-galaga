import { describe, it, expect } from 'vitest';
import { Vector2, INV_SQRT2 } from '../../src/utils/Vector2';
import { Spline } from '../../src/utils/Spline';
import { SpatialGrid } from '../../src/core/SpatialGrid';

describe('Vector2 & 8-Directional Movement Normalization', () => {
  it('normalizes cardinal directions to unit length 1', () => {
    const out = { x: 0, y: 0 };

    Vector2.normalize8Dir(1, 0, out);
    expect(out.x).toBe(1);
    expect(out.y).toBe(0);

    Vector2.normalize8Dir(0, -1, out);
    expect(out.x).toBe(0);
    expect(out.y).toBe(-1);
  });

  it('normalizes all 4 diagonal axes by 1/sqrt(2) (~0.7071) so diagonal speed equals cardinal speed', () => {
    const out = { x: 0, y: 0 };

    Vector2.normalize8Dir(1, 1, out);
    expect(out.x).toBeCloseTo(INV_SQRT2, 6);
    expect(out.y).toBeCloseTo(INV_SQRT2, 6);

    const magnitude = Math.sqrt(out.x * out.x + out.y * out.y);
    expect(magnitude).toBeCloseTo(1.0, 6);

    Vector2.normalize8Dir(-1, -1, out);
    expect(out.x).toBeCloseTo(-INV_SQRT2, 6);
    expect(out.y).toBeCloseTo(-INV_SQRT2, 6);
  });

  it('clamps coordinates within boundaries accurately', () => {
    expect(Vector2.clamp(-15, 20, 580)).toBe(20);
    expect(Vector2.clamp(650, 20, 580)).toBe(580);
    expect(Vector2.clamp(300, 20, 580)).toBe(300);
  });
});

describe('Cubic Bézier Spline Flight Paths', () => {
  it('evaluates start (t=0) and end (t=1) points of a swoop entry path accurately', () => {
    const path = Spline.createSwoopEntryPath('left', 240, 120, 600, 800);
    const pos = { x: 0, y: 0 };

    Spline.evaluatePath(path, 0, pos);
    expect(pos.x).toBe(-40);

    Spline.evaluatePath(path, 1, pos);
    expect(pos.x).toBeCloseTo(240, 4);
    expect(pos.y).toBeCloseTo(120, 4);
  });

  it('produces continuous intermediate coordinates during loop traversal', () => {
    const path = Spline.createSwoopEntryPath('right', 300, 150, 600, 800);
    const pMid = { x: 0, y: 0 };
    Spline.evaluatePath(path, 0.5, pMid);

    // At t=0.5 (junction between segment 1 and segment 2), position is inside the playfield
    expect(pMid.x).toBeGreaterThan(0);
    expect(pMid.x).toBeLessThan(600);
    expect(pMid.y).toBeGreaterThan(0);
    expect(pMid.y).toBeLessThan(800);
  });
});

describe('SpatialGrid 64x64 Broadphase Partitioning', () => {
  it('inserts entities and retrieves only nearby candidates in O(N)', () => {
    const grid = new SpatialGrid(600, 800, 64);
    grid.clear();

    // Entity 1 at top-left (50, 50)
    grid.insertCircle(1, 50, 50, 16);
    // Entity 2 near Entity 1 (60, 60)
    grid.insertCircle(2, 60, 60, 16);
    // Entity 3 far away at bottom-right (500, 700)
    grid.insertCircle(3, 500, 700, 16);

    const results: number[] = [];
    const count = grid.queryRegion(55, 55, 10, 10, results);

    expect(count).toBe(2);
    expect(results.slice(0, count)).toContain(1);
    expect(results.slice(0, count)).toContain(2);
    expect(results.slice(0, count)).not.toContain(3);
  });

  it('deduplicates an entity spanning across multiple 64x64 cell boundaries', () => {
    const grid = new SpatialGrid(600, 800, 64);
    grid.clear();

    // Large entity right on cell border (64, 64) overlapping 4 cells
    grid.insertAABB(42, 64, 64, 24, 24);

    const results: number[] = [];
    const count = grid.queryRegion(64, 64, 30, 30, results);

    expect(count).toBe(1);
    expect(results[0]).toBe(42);
  });
});

