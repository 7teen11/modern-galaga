/**
 * High-Performance Pre-Warmed Typed Object Pool (Constitution Principle IV - NON-NEGOTIABLE).
 * Guarantees zero heap allocations during gameplay loops.
 */

export interface Poolable {
  active: boolean;
  poolIndex: number;
  reset(): void;
}

export type ExhaustionPolicy = 'RECYCLE_OLDEST' | 'REJECT';

export interface PoolMetrics {
  readonly capacity: number;
  readonly activeCount: number;
  readonly freeCount: number;
  readonly peakActiveCount: number;
  readonly recycleOverflowCount: number;
}

export class ObjectPool<T extends Poolable> {
  private readonly items: T[] = [];
  private readonly freeIndices: number[] = [];
  private readonly activeIndices: number[] = [];
  private readonly capacity: number;
  private readonly policy: ExhaustionPolicy;

  private peakActive = 0;
  private overflowCount = 0;

  constructor(
    capacity: number,
    factory: (poolIndex: number) => T,
    policy: ExhaustionPolicy = 'RECYCLE_OLDEST'
  ) {
    this.capacity = capacity;
    this.policy = policy;

    // Pre-warm entire pool upfront
    for (let i = 0; i < capacity; i++) {
      const item = factory(i);
      item.active = false;
      item.poolIndex = i;
      item.reset();
      this.items.push(item);
      // Push in reverse so index 0 is popped first
      this.freeIndices.push(capacity - 1 - i);
    }
  }

  /**
   * Acquires an object from the pre-warmed pool in O(1) without allocating memory.
   */
  public acquire(): T | null {
    let idx: number;

    if (this.freeIndices.length > 0) {
      idx = this.freeIndices.pop()!;
    } else if (this.policy === 'RECYCLE_OLDEST' && this.activeIndices.length > 0) {
      this.overflowCount++;
      idx = this.activeIndices.shift()!;
      const recycled = this.items[idx];
      recycled.reset();
    } else {
      this.overflowCount++;
      return null;
    }

    const item = this.items[idx];
    item.active = true;
    this.activeIndices.push(idx);

    if (this.activeIndices.length > this.peakActive) {
      this.peakActive = this.activeIndices.length;
    }

    return item;
  }

  /**
   * Releases an object back into the pool and invokes its reset() routine.
   */
  public release(item: T): void {
    if (!item.active) return;

    const activePos = this.activeIndices.indexOf(item.poolIndex);
    if (activePos !== -1) {
      this.activeIndices.splice(activePos, 1);
    }

    item.active = false;
    item.reset();
    this.freeIndices.push(item.poolIndex);
  }

  /**
   * Releases all currently active items back to the free pool.
   */
  public releaseAll(): void {
    while (this.activeIndices.length > 0) {
      const idx = this.activeIndices.pop()!;
      const item = this.items[idx];
      item.active = false;
      item.reset();
      this.freeIndices.push(idx);
    }
  }

  /**
   * Iterates over all active items without allocating a temporary array.
   */
  public forEachActive(callback: (item: T) => void): void {
    // Iterate backwards so callbacks that release the current item don't skip elements
    for (let i = this.activeIndices.length - 1; i >= 0; i--) {
      const idx = this.activeIndices[i];
      const item = this.items[idx];
      if (item && item.active) {
        callback(item);
      }
    }
  }

  public getAllItems(): readonly T[] {
    return this.items;
  }

  public getMetrics(): PoolMetrics {
    return {
      capacity: this.capacity,
      activeCount: this.activeIndices.length,
      freeCount: this.freeIndices.length,
      peakActiveCount: this.peakActive,
      recycleOverflowCount: this.overflowCount
    };
  }
}

