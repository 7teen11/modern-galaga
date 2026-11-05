import { describe, it, expect } from 'vitest';
import { ObjectPool, Poolable } from '../../src/ecs/Pool';

class MockBullet implements Poolable {
  public active = false;
  public poolIndex = 0;
  public x = 0;
  public y = 0;
  public damage = 10;

  constructor(index: number) {
    this.poolIndex = index;
  }

  public reset(): void {
    this.x = 0;
    this.y = 0;
    this.damage = 10;
  }
}

describe('ObjectPool (Constitution Principle IV - Strict Object Pooling)', () => {
  it('pre-warms the exact capacity upfront with zero active items initially', () => {
    const pool = new ObjectPool<MockBullet>(50, (i) => new MockBullet(i));
    const metrics = pool.getMetrics();

    expect(metrics.capacity).toBe(50);
    expect(metrics.activeCount).toBe(0);
    expect(metrics.freeCount).toBe(50);
    expect(pool.getAllItems().length).toBe(50);
  });

  it('acquires and releases objects in O(1) while resetting state cleanly', () => {
    const pool = new ObjectPool<MockBullet>(10, (i) => new MockBullet(i));

    const b1 = pool.acquire()!;
    expect(b1).not.toBeNull();
    expect(b1.active).toBe(true);
    b1.x = 250;
    b1.y = 400;
    b1.damage = 99;

    expect(pool.getMetrics().activeCount).toBe(1);
    expect(pool.getMetrics().freeCount).toBe(9);

    pool.release(b1);
    expect(b1.active).toBe(false);
    expect(b1.x).toBe(0);
    expect(b1.y).toBe(0);
    expect(b1.damage).toBe(10);
    expect(pool.getMetrics().activeCount).toBe(0);
    expect(pool.getMetrics().freeCount).toBe(10);
  });

  it('reuses existing pre-allocated object references without allocating new instances', () => {
    const pool = new ObjectPool<MockBullet>(5, (i) => new MockBullet(i));
    const initialRefs = new Set(pool.getAllItems());

    for (let cycle = 0; cycle < 20; cycle++) {
      const item = pool.acquire()!;
      expect(initialRefs.has(item)).toBe(true);
      pool.release(item);
    }

    expect(pool.getAllItems().length).toBe(5);
  });

  it('handles pool exhaustion gracefully via RECYCLE_OLDEST policy', () => {
    const pool = new ObjectPool<MockBullet>(3, (i) => new MockBullet(i), 'RECYCLE_OLDEST');

    const b0 = pool.acquire()!;
    b0.x = 111;
    const b1 = pool.acquire()!;
    b1.x = 222;
    const b2 = pool.acquire()!;
    b2.x = 333;

    expect(pool.getMetrics().activeCount).toBe(3);
    expect(pool.getMetrics().freeCount).toBe(0);

    // Acquiring 4th item recycles the oldest (b0) and resets its state
    const b3 = pool.acquire()!;
    expect(b3).toBe(b0);
    expect(b3.x).toBe(0);
    expect(pool.getMetrics().activeCount).toBe(3);
    expect(pool.getMetrics().recycleOverflowCount).toBe(1);
  });

  it('handles pool exhaustion via REJECT policy when configured', () => {
    const pool = new ObjectPool<MockBullet>(2, (i) => new MockBullet(i), 'REJECT');
    expect(pool.acquire()).not.toBeNull();
    expect(pool.acquire()).not.toBeNull();
    expect(pool.acquire()).toBeNull();
    expect(pool.getMetrics().recycleOverflowCount).toBe(1);
  });
});

