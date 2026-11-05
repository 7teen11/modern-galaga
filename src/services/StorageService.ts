export type VisualQualityPreset = 'HIGH' | 'PERFORMANCE';

export interface UserSettings {
  masterVolume: number;         // 0.0 to 1.0
  screenShakeIntensity: number; // 0.0 (disabled) to 1.0 (full micro-shake)
  reducedFlash: boolean;        // Accessibility toggle for hit-flash reduction (Principle I)
  qualityPreset: VisualQualityPreset; // 'HIGH' | 'PERFORMANCE' (Principle I & Performance Standards)
  playerName: string;
  department: string;
}

export interface PersistedRecord {
  highScore: number;
  highestWave: number;
}

const STORAGE_KEY_RECORD = 'star_vanguard_high_record_v1';
const STORAGE_KEY_SETTINGS = 'star_vanguard_user_settings_v1';
const STORAGE_KEY_LEADERBOARD = 'star_vanguard_company_board_v1';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  masterVolume: 0.6,
  screenShakeIntensity: 0.8,
  reducedFlash: false,
  qualityPreset: 'HIGH',
  playerName: 'Pilot-01',
  department: 'Engineering'
};

/**
 * LocalStorage Adapter for High-Score Records, Accessibility Settings & Local Leaderboard Cache.
 * Gracefully degrades to in-memory storage in headless test environments.
 */
export class StorageService {
  private memoryRecord: PersistedRecord = { highScore: 0, highestWave: 1 };
  private memorySettings: UserSettings = { ...DEFAULT_USER_SETTINGS };
  private memoryBoard: string | null = null;

  public loadRecord(): PersistedRecord {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_RECORD);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedRecord>;
          this.memoryRecord = {
            highScore: typeof parsed.highScore === 'number' ? parsed.highScore : 0,
            highestWave: typeof parsed.highestWave === 'number' ? parsed.highestWave : 1
          };
        }
      }
    } catch {
      // Fallback to in-memory record
    }
    return { ...this.memoryRecord };
  }

  public saveRecord(highScore: number, highestWave: number): PersistedRecord {
    const current = this.loadRecord();
    const updated: PersistedRecord = {
      highScore: Math.max(current.highScore, Math.floor(highScore)),
      highestWave: Math.max(current.highestWave, Math.floor(highestWave))
    };
    this.memoryRecord = updated;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_RECORD, JSON.stringify(updated));
      }
    } catch {
      // Ignore storage quota errors
    }
    return updated;
  }

  public loadSettings(): UserSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<UserSettings>;
          this.memorySettings = {
            ...DEFAULT_USER_SETTINGS,
            ...parsed
          };
        }
      }
    } catch {
      // Fallback to defaults
    }
    return { ...this.memorySettings };
  }

  public saveSettings(settings: Partial<UserSettings>): UserSettings {
    const current = this.loadSettings();
    const updated: UserSettings = {
      ...current,
      ...settings
    };
    this.memorySettings = updated;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
      }
    } catch {
      // Ignore storage quota errors
    }
    return updated;
  }

  public loadRawLeaderboard(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      }
    } catch {
      // Fallback
    }
    return this.memoryBoard;
  }

  public saveRawLeaderboard(json: string): void {
    this.memoryBoard = json;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_LEADERBOARD, json);
      }
    } catch {
      // Fallback
    }
  }
}

