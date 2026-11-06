/**
 * 3-Layer Parallax Starfield & Atmospheric Nebula State (FR-009).
 * Pre-allocated fixed arrays uphold Constitution Principle IV (Zero runtime allocations).
 */

export interface ParallaxStarNode {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinklePhase: number;
  color: string;
}

export interface ParallaxNebulaNode {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  colorInner: string;
  colorOuter: string;
  alpha: number;
}

export interface ParallaxLayerConfig {
  readonly id: 'DISTANT_STARS' | 'MID_NEBULA' | 'FOREGROUND_DUST';
  readonly scrollSpeedPxPerSec: number;
  readonly nodeCount: number;
}

export const PARALLAX_LAYER_CONFIGS: Record<
  ParallaxLayerConfig['id'],
  ParallaxLayerConfig
> = {
  DISTANT_STARS: {
    id: 'DISTANT_STARS',
    scrollSpeedPxPerSec: 25,
    nodeCount: 45
  },
  MID_NEBULA: {
    id: 'MID_NEBULA',
    scrollSpeedPxPerSec: 60,
    nodeCount: 5
  },
  FOREGROUND_DUST: {
    id: 'FOREGROUND_DUST',
    scrollSpeedPxPerSec: 140,
    nodeCount: 25
  }
};

