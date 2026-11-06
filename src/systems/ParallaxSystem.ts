import { Game, GameSystem } from '../core/Game';
import { VisualQualityPreset } from '../services/StorageService';
import {
  ParallaxStarNode,
  ParallaxNebulaNode,
  PARALLAX_LAYER_CONFIGS
} from '../components/ParallaxState';

/**
 * 3-Layer Parallax Space Backdrop & Atmospheric Nebula Renderer (FR-009).
 * - Layer 1 (Distant Stars): 25 px/s slow twinkling starfield
 * - Layer 2 (Mid-ground Nebulae): 60 px/s translucent cosmic clouds
 * - Layer 3 (Foreground Cosmic Dust): 140 px/s high-speed motion streaks
 * Pre-allocates all nodes at construction to guarantee 0 runtime allocations (Principle IV).
 */
export class ParallaxSystem implements GameSystem {
  private readonly width: number;
  private readonly height: number;

  public readonly distantStars: ParallaxStarNode[] = [];
  public readonly midNebulae: ParallaxNebulaNode[] = [];
  public readonly foregroundDust: ParallaxStarNode[] = [];

  public qualityPreset: VisualQualityPreset = 'HIGH';
  private elapsedSec = 0;

  constructor(
    width = Game.LOGICAL_WIDTH,
    height = Game.LOGICAL_HEIGHT
  ) {
    this.width = width;
    this.height = height;
    this.initLayers();
  }

  private initLayers(): void {
    const starColors = ['#ffffff', '#8be9fd', '#bd93f9', '#ffb86c', '#ff79c6'];
    const distantCfg = PARALLAX_LAYER_CONFIGS.DISTANT_STARS;

    for (let i = 0; i < distantCfg.nodeCount; i++) {
      this.distantStars.push({
        x: ((i * 73) % this.width) + (i % 7),
        y: ((i * 53) % this.height),
        size: 1 + (i % 2) * 0.6,
        alpha: 0.35 + (i % 4) * 0.14,
        twinklePhase: i * 0.9,
        color: starColors[i % starColors.length]
      });
    }

    const nebulaPalettes: ReadonlyArray< readonly [string, string]> = [
      ['rgba(123, 44, 191, 0.12)', 'rgba(0, 240, 255, 0.03)'],
      ['rgba(0, 180, 216, 0.11)', 'rgba(114, 9, 183, 0.03)'],
      ['rgba(255, 30, 138, 0.09)', 'rgba(67, 97, 238, 0.02)']
    ];
    const nebulaCfg = PARALLAX_LAYER_CONFIGS.MID_NEBULA;

    for (let i = 0; i < nebulaCfg.nodeCount; i++) {
      const palette = nebulaPalettes[i % nebulaPalettes.length];
      this.midNebulae.push({
        x: ((i * 137 + 60) % this.width),
        y: ((i * 179 + 40) % this.height),
        radiusX: 90 + (i % 3) * 35,
        radiusY: 65 + (i % 2) * 28,
        colorInner: palette[0],
        colorOuter: palette[1],
        alpha: 0.85
      });
    }

    const dustColors = ['#00f0ff', '#e0aaff', '#ffffff', '#00ff88'];
    const dustCfg = PARALLAX_LAYER_CONFIGS.FOREGROUND_DUST;

    for (let i = 0; i < dustCfg.nodeCount; i++) {
      this.foregroundDust.push({
        x: ((i * 97 + 15) % this.width),
        y: ((i * 67 + 20) % this.height),
        size: 1.8 + (i % 3) * 0.5,
        alpha: 0.55 + (i % 3) * 0.15,
        twinklePhase: i * 1.3,
        color: dustColors[i % dustColors.length]
      });
    }
  }

  public getLayerSpeeds(): {
    distant: number;
    nebula: number;
    foreground: number;
  } {
    return {
      distant: PARALLAX_LAYER_CONFIGS.DISTANT_STARS.scrollSpeedPxPerSec,
      nebula: PARALLAX_LAYER_CONFIGS.MID_NEBULA.scrollSpeedPxPerSec,
      foreground: PARALLAX_LAYER_CONFIGS.FOREGROUND_DUST.scrollSpeedPxPerSec
    };
  }

  public update(dt: number): void {
    this.elapsedSec += dt;

    const distantSpeed = PARALLAX_LAYER_CONFIGS.DISTANT_STARS.scrollSpeedPxPerSec;
    for (let i = 0; i < this.distantStars.length; i++) {
      const s = this.distantStars[i];
      s.y += distantSpeed * dt;
      if (s.y > this.height) {
        s.y -= this.height;
      }
    }

    const nebulaSpeed = PARALLAX_LAYER_CONFIGS.MID_NEBULA.scrollSpeedPxPerSec;
    for (let i = 0; i < this.midNebulae.length; i++) {
      const n = this.midNebulae[i];
      n.y += nebulaSpeed * dt;
      if (n.y - n.radiusY > this.height) {
        n.y = -n.radiusY;
      }
    }

    const fgSpeed = PARALLAX_LAYER_CONFIGS.FOREGROUND_DUST.scrollSpeedPxPerSec;
    for (let i = 0; i < this.foregroundDust.length; i++) {
      const d = this.foregroundDust[i];
      d.y += fgSpeed * dt;
      if (d.y > this.height) {
        d.y -= this.height;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const isPerf = this.qualityPreset === 'PERFORMANCE';

    // Layer 1: Distant Twinkling Starfield (25 px/s)
    for (let i = 0; i < this.distantStars.length; i++) {
      if (isPerf && i % 2 !== 0) continue;
      const s = this.distantStars[i];
      const twinkle = 0.75 + Math.sin(this.elapsedSec * 2.5 + s.twinklePhase) * 0.25;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Layer 2: Mid-ground Atmospheric Nebulae (60 px/s)
    if (!isPerf) {
      for (let i = 0; i < this.midNebulae.length; i++) {
        const n = this.midNebulae[i];
        ctx.globalAlpha = n.alpha;
        ctx.fillStyle = n.colorInner;
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, n.radiusX, n.radiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = n.colorOuter;
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, n.radiusX * 1.35, n.radiusY * 1.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Layer 3: Foreground Cosmic Dust Streaks (140 px/s)
    for (let i = 0; i < this.foregroundDust.length; i++) {
      if (isPerf && i % 2 !== 0) continue;
      const d = this.foregroundDust[i];
      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.alpha;
      ctx.fillRect(d.x, d.y, d.size, d.size * 3.2);
    }

    ctx.globalAlpha = 1.0;
  }
}

