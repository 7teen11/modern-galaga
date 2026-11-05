import { GameSystem } from '../../core/Game';
import { EventBus } from '../../core/EventBus';
import {
  GameModeType,
  HELL_STORAGE_KEYS,
  formatClearTime,
} from './HellConfig';

export class HellDirector implements GameSystem {
  private mode: GameModeType = 'STANDARD';
  private storage: Storage | null = null;
  public readonly eventBus?: EventBus;
  private modeListeners: ((mode: GameModeType) => void)[] = [];

  // Speedrun / Clear time tracking
  private isRunActive = false;
  private clearTimeMs = 0;

  // Subsystems registered within Hell Mode module
  private subSystems: GameSystem[] = [];

  constructor(eventBus?: EventBus, storage?: Storage) {
    this.eventBus = eventBus;
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    }

    if (this.storage) {
      const savedMode = this.storage.getItem(
        HELL_STORAGE_KEYS.SELECTED_MODE
      ) as GameModeType | null;
      if (savedMode === 'STANDARD' || savedMode === 'HELL') {
        this.mode = savedMode;
      }
    }
  }

  public getMode(): GameModeType {
    return this.mode;
  }

  public isHellMode(): boolean {
    return this.mode === 'HELL';
  }

  public setMode(newMode: GameModeType): void {
    if (this.mode === newMode) return;
    this.mode = newMode;
    if (this.storage) {
      try {
        this.storage.setItem(HELL_STORAGE_KEYS.SELECTED_MODE, newMode);
      } catch {
        // Ignore quota errors
      }
    }
    for (const listener of this.modeListeners) {
      listener(this.mode);
    }
  }

  public toggleMode(): GameModeType {
    const nextMode: GameModeType = this.mode === 'STANDARD' ? 'HELL' : 'STANDARD';
    this.setMode(nextMode);
    return nextMode;
  }

  public onModeChanged(listener: (mode: GameModeType) => void): () => void {
    this.modeListeners.push(listener);
    return () => {
      this.modeListeners = this.modeListeners.filter((l) => l !== listener);
    };
  }

  public registerSubSystem(system: GameSystem): void {
    this.subSystems.push(system);
  }

  public startRun(): void {
    this.isRunActive = true;
    this.clearTimeMs = 0;
  }

  public stopRun(): void {
    this.isRunActive = false;
  }

  public getClearTimeMs(): number {
    return this.clearTimeMs;
  }

  public getFormattedClearTime(): string {
    return formatClearTime(this.clearTimeMs);
  }

  public update(dt: number): void {
    if (this.isRunActive) {
      this.clearTimeMs += dt * 1000;
    }

    // Only update Hell subsystems if Hell Mode is currently active
    if (this.isHellMode()) {
      for (const sys of this.subSystems) {
        if (sys.update) {
          sys.update(dt);
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Render Hell-specific overlays / HUD when Hell mode is active
    if (this.isHellMode()) {
      for (const sys of this.subSystems) {
        if (sys.render) {
          sys.render(ctx);
        }
      }
    }
  }
}
