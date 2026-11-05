import { EventBus } from './EventBus';
import { EntityManager } from '../ecs/Entity';
import { SpatialGrid } from './SpatialGrid';

export enum GameModeState {
  BOOT = 'BOOT',
  TITLE = 'TITLE',
  WAVE_INTRO = 'WAVE_INTRO',
  PLAYING = 'PLAYING',
  RESPAWNING = 'RESPAWNING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export interface GameSystem {
  update?(dt: number): void;
  render?(ctx: CanvasRenderingContext2D): void;
}

/**
 * Core Game Loop & Finite State Machine Controller.
 * Enforces 60 Hz fixed-step kinematic integration and Retina High-DPI Canvas rendering
 * (Constitution Principles I & II).
 */
export class Game {
  public static readonly LOGICAL_WIDTH = 600;
  public static readonly LOGICAL_HEIGHT = 800;
  public static readonly FIXED_DT = 1 / 60;
  public static readonly MAX_FRAME_DELTA = 0.1; // Clamps tab-switch spikes

  public readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  public readonly eventBus: EventBus;
  public readonly entities: EntityManager;
  public readonly spatialGrid: SpatialGrid;

  private state: GameModeState = GameModeState.BOOT;
  private systems: GameSystem[] = [];
  private isRunning = false;
  private rafId = 0;
  private lastTimestamp = 0;
  private accumulator = 0;

  // Frame-budget & FPS observability metrics
  private fps = 60;
  private frameCount = 0;
  private fpsTimer = 0;
  public lastFrameDurationMs = 0;
  public debugOverlayEnabled = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to initialize 2D rendering context');
    }
    this.ctx = context;
    this.eventBus = new EventBus();
    this.entities = new EntityManager();
    this.spatialGrid = new SpatialGrid(
      Game.LOGICAL_WIDTH,
      Game.LOGICAL_HEIGHT,
      64
    );

    this.configureRetinaCanvas();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.configureRetinaCanvas());
    }
  }

  /**
   * Scales internal backing store by window.devicePixelRatio for sharp Retina visuals
   * while maintaining a consistent 600x800 logical coordinate system (Principle I).
   */
  public configureRetinaCanvas(): void {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.canvas.width = Game.LOGICAL_WIDTH * dpr;
    this.canvas.height = Game.LOGICAL_HEIGHT * dpr;

    if (typeof window !== 'undefined' && this.canvas.parentElement) {
      const parentRect = this.canvas.parentElement.getBoundingClientRect();
      const aspect = Game.LOGICAL_WIDTH / Game.LOGICAL_HEIGHT;
      let cssHeight = Math.max(400, parentRect.height - 8);
      let cssWidth = cssHeight * aspect;

      if (cssWidth > parentRect.width - 8) {
        cssWidth = Math.max(300, parentRect.width - 8);
        cssHeight = cssWidth / aspect;
      }

      this.canvas.style.width = `${Math.floor(cssWidth)}px`;
      this.canvas.style.height = `${Math.floor(cssHeight)}px`;
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  public addSystem(system: GameSystem): this {
    this.systems.push(system);
    return this;
  }

  public getState(): GameModeState {
    return this.state;
  }

  public setState(newState: GameModeState): void {
    this.state = newState;
  }

  public getFps(): number {
    return this.fps;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /**
   * Single deterministic step for headless automated testing or frame loop.
   */
  public step(dt: number = Game.FIXED_DT): void {
    const startMs = performance.now();

    if (this.state !== GameModeState.PAUSED) {
      for (let i = 0; i < this.systems.length; i++) {
        const sys = this.systems[i];
        if (sys.update) {
          sys.update(dt);
        }
      }
    }

    for (let i = 0; i < this.systems.length; i++) {
      const sys = this.systems[i];
      if (sys.render) {
        sys.render(this.ctx);
      }
    }

    this.lastFrameDurationMs = performance.now() - startMs;
  }

  private loop(timestamp: number): void {
    if (!this.isRunning) return;

    let deltaSeconds = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (deltaSeconds > Game.MAX_FRAME_DELTA) {
      deltaSeconds = Game.MAX_FRAME_DELTA;
    }

    // FPS tracking
    this.frameCount++;
    this.fpsTimer += deltaSeconds;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.accumulator += deltaSeconds;
    const frameStart = performance.now();

    while (this.accumulator >= Game.FIXED_DT) {
      if (this.state !== GameModeState.PAUSED) {
        for (let i = 0; i < this.systems.length; i++) {
          const sys = this.systems[i];
          if (sys.update) {
            sys.update(Game.FIXED_DT);
          }
        }
      }
      this.accumulator -= Game.FIXED_DT;
    }

    for (let i = 0; i < this.systems.length; i++) {
      const sys = this.systems[i];
      if (sys.render) {
        sys.render(this.ctx);
      }
    }

    this.lastFrameDurationMs = performance.now() - frameStart;
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }
}

