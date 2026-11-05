import { Vec2 } from './Vector2';

/**
 * Cubic Bézier curve segment defined by 4 control points: P0, P1, P2, P3.
 */
export interface CubicBezierSegment {
  p0: Vec2;
  p1: Vec2;
  p2: Vec2;
  p3: Vec2;
}

/**
 * Multi-segment cubic Bézier spline path used for Galaga-style swooping enemy wave entries.
 * All evaluation methods write into an existing `out` Vec2 to maintain zero-allocation compliance.
 */
export class Spline {
  /**
   * Evaluates a single cubic Bézier segment at t in [0, 1] and writes coordinates into `out`.
   */
  public static evaluateCubic(
    p0: Vec2,
    p1: Vec2,
    p2: Vec2,
    p3: Vec2,
    t: number,
    out: Vec2
  ): Vec2 {
    const clampedT = t < 0 ? 0 : t > 1 ? 1 : t;
    const u = 1 - clampedT;
    const tt = clampedT * clampedT;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * clampedT;

    out.x =
      uuu * p0.x +
      3 * uu * clampedT * p1.x +
      3 * u * tt * p2.x +
      ttt * p3.x;

    out.y =
      uuu * p0.y +
      3 * uu * clampedT * p1.y +
      3 * u * tt * p2.y +
      ttt * p3.y;

    return out;
  }

  /**
   * Evaluates a multi-segment spline path for global progress t in [0, 1].
   */
  public static evaluatePath(
    segments: readonly CubicBezierSegment[],
    t: number,
    out: Vec2
  ): Vec2 {
    const count = segments.length;
    if (count === 0) {
      out.x = 0;
      out.y = 0;
      return out;
    }

    const clampedT = t <= 0 ? 0 : t >= 1 ? 1 : t;
    if (clampedT >= 1) {
      const last = segments[count - 1];
      out.x = last.p3.x;
      out.y = last.p3.y;
      return out;
    }

    const scaled = clampedT * count;
    const index = Math.min(Math.floor(scaled), count - 1);
    const localT = scaled - index;
    const seg = segments[index];

    return Spline.evaluateCubic(seg.p0, seg.p1, seg.p2, seg.p3, localT, out);
  }

  /**
   * Builds a classic swooping loop entry path from an off-screen edge into a target formation slot.
   */
  public static createSwoopEntryPath(
    side: 'left' | 'right' | 'top-left' | 'top-right',
    targetX: number,
    targetY: number,
    canvasWidth = 600,
    canvasHeight = 800
  ): CubicBezierSegment[] {
    const isLeft = side === 'left' || side === 'top-left';
    const startX = isLeft ? -40 : canvasWidth + 40;
    const startY = side.startsWith('top') ? -40 : canvasHeight * 0.35;

    const midX = isLeft ? canvasWidth * 0.72 : canvasWidth * 0.28;
    const midY = canvasHeight * 0.52;

    const loopApexX = isLeft ? canvasWidth * 0.22 : canvasWidth * 0.78;
    const loopApexY = canvasHeight * 0.25;

    // Segment 1: Swoop across playfield into central loop
    const seg1: CubicBezierSegment = {
      p0: { x: startX, y: startY },
      p1: { x: isLeft ? canvasWidth * 0.25 : canvasWidth * 0.75, y: startY + 180 },
      p2: { x: midX, y: midY + 120 },
      p3: { x: midX, y: midY }
    };

    // Segment 2: Loop back upward and lock smoothly into formation slot
    const seg2: CubicBezierSegment = {
      p0: { x: midX, y: midY },
      p1: { x: midX, y: loopApexY - 60 },
      p2: { x: loopApexX, y: loopApexY },
      p3: { x: targetX, y: targetY }
    };

    return [seg1, seg2];
  }
}

