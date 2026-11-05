/**
 * 2D Vector math utility optimized for zero-allocation in hot loops.
 * Enforces normalized diagonal movement (1 / sqrt(2) ≈ 0.70710678).
 */
export const INV_SQRT2 = Math.SQRT1_2; // 0.7071067811865476

export interface Vec2 {
  x: number;
  y: number;
}

export class Vector2 implements Vec2 {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  public set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  public copy(v: Vec2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  public lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Normalizes vector in-place without allocating a new object.
   */
  public normalize(): this {
    const lenSq = this.x * this.x + this.y * this.y;
    if (lenSq > 0.000001) {
      const invLen = 1 / Math.sqrt(lenSq);
      this.x *= invLen;
      this.y *= invLen;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  /**
   * Normalizes an 8-directional discrete input pair (-1, 0, 1) in-place.
   * Ensures diagonal speed equals orthogonal speed via INV_SQRT2.
   */
  public static normalize8Dir(dx: number, dy: number, out: Vec2): Vec2 {
    const clampedX = dx < 0 ? -1 : dx > 0 ? 1 : 0;
    const clampedY = dy < 0 ? -1 : dy > 0 ? 1 : 0;

    if (clampedX !== 0 && clampedY !== 0) {
      out.x = clampedX * INV_SQRT2;
      out.y = clampedY * INV_SQRT2;
    } else {
      out.x = clampedX;
      out.y = clampedY;
    }
    return out;
  }

  public static distanceSq(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  public static clamp(val: number, min: number, max: number): number {
    return val < min ? min : val > max ? max : val;
  }
}

