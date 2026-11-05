import { CubicBezierSegment } from '../../utils/Spline';
import { Vector2 } from '../../utils/Vector2';

/**
 * HellSplines - Exclusive Bézier flight entry curves for Hell Mode (US2).
 * Wave 2: Dual lateral pincer swoops.
 * Wave 3: Intersecting diagonal cross-fire sweeps.
 */
export class HellSplines {
  /**
   * Builds Wave 2 dual-squad lateral pincer swoop path.
   * Ships swoop simultaneously across center screen before hooking into formation.
   */
  public static createPincerSwoopPath(
    side: 'left' | 'right',
    targetX: number,
    targetY: number,
    canvasWidth = 600,
    canvasHeight = 800
  ): CubicBezierSegment[] {
    const isLeft = side === 'left';

    const startX = isLeft ? -50 : canvasWidth + 50;
    const startY = canvasHeight * 0.42;

    const crossX = isLeft ? canvasWidth * 0.78 : canvasWidth * 0.22;
    const crossY = canvasHeight * 0.62;

    const loopApexX = isLeft ? canvasWidth * 0.32 : canvasWidth * 0.68;
    const loopApexY = canvasHeight * 0.22;

    const p0 = new Vector2(startX, startY);
    const p1 = new Vector2(isLeft ? canvasWidth * 0.35 : canvasWidth * 0.65, canvasHeight * 0.5);
    const p2 = new Vector2(isLeft ? canvasWidth * 0.7 : canvasWidth * 0.3, canvasHeight * 0.68);
    const p3 = new Vector2(crossX, crossY);

    const q0 = new Vector2(crossX, crossY);
    const q1 = new Vector2(isLeft ? canvasWidth * 0.85 : canvasWidth * 0.15, canvasHeight * 0.45);
    const q2 = new Vector2(loopApexX, loopApexY);
    const q3 = new Vector2(targetX, targetY);

    return [
      { p0, p1, p2, p3 },
      { p0: q0, p1: q1, p2: q2, p3: q3 },
    ];
  }

  /**
   * Builds Wave 3 diagonal cross-fire sweep path.
   * Squads plunge diagonally across the viewport in intersecting X-patterns.
   */
  public static createCrossFireSweepPath(
    direction: 'top-left-to-bottom-right' | 'top-right-to-bottom-left',
    targetX: number,
    targetY: number,
    canvasWidth = 600,
    canvasHeight = 800
  ): CubicBezierSegment[] {
    const isFromLeft = direction === 'top-left-to-bottom-right';

    const startX = isFromLeft ? canvasWidth * 0.1 : canvasWidth * 0.9;
    const startY = -40;

    const sweepBottomX = isFromLeft ? canvasWidth * 0.85 : canvasWidth * 0.15;
    const sweepBottomY = canvasHeight * 0.68;

    const loopX = isFromLeft ? canvasWidth * 0.55 : canvasWidth * 0.45;
    const loopY = canvasHeight * 0.3;

    const p0 = new Vector2(startX, startY);
    const p1 = new Vector2(startX, canvasHeight * 0.25);
    const p2 = new Vector2(isFromLeft ? canvasWidth * 0.65 : canvasWidth * 0.35, canvasHeight * 0.55);
    const p3 = new Vector2(sweepBottomX, sweepBottomY);

    const q0 = new Vector2(sweepBottomX, sweepBottomY);
    const q1 = new Vector2(isFromLeft ? canvasWidth * 0.95 : canvasWidth * 0.05, canvasHeight * 0.5);
    const q2 = new Vector2(loopX, loopY);
    const q3 = new Vector2(targetX, targetY);

    return [
      { p0, p1, p2, p3 },
      { p0: q0, p1: q1, p2: q2, p3: q3 },
    ];
  }
}

