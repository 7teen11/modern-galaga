import { EventBus } from './EventBus';
import { StorageService } from '../services/StorageService';

export interface ScoreState {
  currentScore: number;
  sessionHighScore: number;
  highestWaveCleared: number;
  currentWave: number;
  enemiesDefeatedCount: number;
}

/**
 * Real-Time Score Accumulation & High-Score Persistence Manager (FR-009, FR-010, User Story 5).
 * Listens to ENEMY_DESTROYED and WAVE_COMPLETED events on EventBus,
 * updates score counters instantaneously, and persists records via StorageService.
 */
export class ScoreManager {
  private readonly eventBus: EventBus;
  private readonly storage: StorageService;

  public currentScore = 0;
  public sessionHighScore = 0;
  public highestWaveCleared = 1;
  public currentWave = 1;
  public enemiesDefeatedCount = 0;

  constructor(eventBus: EventBus, storage: StorageService) {
    this.eventBus = eventBus;
    this.storage = storage;

    const record = this.storage.loadRecord();
    this.sessionHighScore = record.highScore;
    this.highestWaveCleared = record.highestWave;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.eventBus.on('ENEMY_DESTROYED', (payload) => {
      this.enemiesDefeatedCount++;
      this.addPoints(payload.pointsAwarded);
    });

    this.eventBus.on('WAVE_COMPLETED', (payload) => {
      this.currentWave = payload.nextWaveIndex;
      if (payload.completedWaveIndex > this.highestWaveCleared) {
        this.highestWaveCleared = payload.completedWaveIndex;
      }
      this.addPoints(payload.bonusPoints);
      this.persistRecord();
    });
  }

  public addPoints(points: number): void {
    if (points <= 0) return;
    this.currentScore += Math.floor(points);
    if (this.currentScore > this.sessionHighScore) {
      this.sessionHighScore = this.currentScore;
    }
  }

  public setCurrentWave(waveIndex: number): void {
    this.currentWave = waveIndex;
    if (waveIndex > this.highestWaveCleared) {
      this.highestWaveCleared = waveIndex;
    }
  }

  public persistRecord(): void {
    const saved = this.storage.saveRecord(
      this.sessionHighScore,
      Math.max(this.highestWaveCleared, this.currentWave)
    );
    this.sessionHighScore = saved.highScore;
    this.highestWaveCleared = saved.highestWave;
  }

  public resetRun(): void {
    this.persistRecord();
    this.currentScore = 0;
    this.currentWave = 1;
    this.enemiesDefeatedCount = 0;
  }

  public getState(): ScoreState {
    return {
      currentScore: this.currentScore,
      sessionHighScore: this.sessionHighScore,
      highestWaveCleared: this.highestWaveCleared,
      currentWave: this.currentWave,
      enemiesDefeatedCount: this.enemiesDefeatedCount
    };
  }
}

