import { HELL_STORAGE_KEYS } from './HellConfig';

export interface HellSessionResponse {
  sessionId: string;
  sessionToken: string;
  timestamp: number;
}

export interface HellLeaderboardEntry {
  rank: number;
  playerName: string;
  department: string;
  score: number;
  isVictory: boolean;
  clearTimeMs: number;
  achievedAt: string;
}

export interface HellScoreSubmissionRequest {
  sessionToken: string;
  playerName: string;
  department: string;
  score: number;
  isVictory: boolean;
  durationSeconds: number;
  clearTimeMs: number;
  livesRemaining: number;
}

export interface HellScoreSubmissionResponse {
  rank: number;
  isPersonalBest: boolean;
  message: string;
}

const SEED_HELL_RECORDS: Omit<HellLeaderboardEntry, 'rank'>[] = [
  {
    playerName: 'Vanguard-Alpha',
    department: 'Platform Core',
    score: 88500,
    isVictory: true,
    clearTimeMs: 145200,
    achievedAt: '2026-11-04T12:00:00Z',
  },
  {
    playerName: 'DanmakuKing',
    department: 'Quality Assurance',
    score: 64200,
    isVictory: true,
    clearTimeMs: 182600,
    achievedAt: '2026-11-04T14:30:00Z',
  },
];

/**
 * HellLeaderboardClient - Segregated leaderboard storage adapter for Hell Mode (US4).
 * Matches contracts/hell-mode-contracts.yaml and enforces anti-cheat verification.
 */
export class HellLeaderboardClient {
  public static readonly MAX_PLAUSIBLE_SCORE_PER_SEC = 6000;

  private storage: Storage | null = null;
  private activeSession: HellSessionResponse | null = null;

  constructor(storage?: Storage) {
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    }
  }

  public startSession(): HellSessionResponse {
    const timestamp = Date.now();
    const sessionId = `hell_sess_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionToken = `tok_hell_${btoa(`${sessionId}:${timestamp}`)}`;

    this.activeSession = {
      sessionId,
      sessionToken,
      timestamp,
    };
    return this.activeSession;
  }

  public getTopScores(limit = 10): HellLeaderboardEntry[] {
    const records = this.loadRecords();
    return records.slice(0, limit);
  }

  public submitScore(req: HellScoreSubmissionRequest): HellScoreSubmissionResponse {
    // 1. Anti-Cheat: Validate Session Token
    if (!this.activeSession || this.activeSession.sessionToken !== req.sessionToken) {
      throw new Error('Anti-Cheat: Invalid or tampered session token');
    }

    // 2. Anti-Cheat: Plausible score rate
    const scoreRate = req.score / Math.max(1, req.durationSeconds);
    if (scoreRate > HellLeaderboardClient.MAX_PLAUSIBLE_SCORE_PER_SEC) {
      throw new Error(`Anti-Cheat: Implausible score rate (${Math.round(scoreRate)} pts/sec)`);
    }

    // 3. Insert and sort
    const records = this.loadRecords();
    const newEntry: Omit<HellLeaderboardEntry, 'rank'> = {
      playerName: (req.playerName || 'Anonymous').slice(0, 30),
      department: (req.department || 'Vanguard Pilot').slice(0, 30),
      score: Math.max(0, Math.floor(req.score)),
      isVictory: req.isVictory,
      clearTimeMs: req.clearTimeMs,
      achievedAt: new Date().toISOString(),
    };

    records.push({ ...newEntry, rank: 0 });

    // Sort: Score DESC, then Clear Time ASC
    records.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.clearTimeMs - b.clearTimeMs;
    });

    // Assign 1-indexed ranks
    for (let i = 0; i < records.length; i++) {
      records[i].rank = i + 1;
    }

    // Keep top 50
    const trimmed = records.slice(0, 50);
    this.saveRecords(trimmed);

    // Invalidate session
    this.activeSession = null;

    const rank = trimmed.findIndex(
      (r) =>
        r.playerName === newEntry.playerName &&
        r.score === newEntry.score &&
        r.clearTimeMs === newEntry.clearTimeMs
    ) + 1;

    return {
      rank: rank > 0 ? rank : trimmed.length,
      isPersonalBest: rank === 1,
      message: 'Hell record recorded successfully',
    };
  }

  private loadRecords(): HellLeaderboardEntry[] {
    if (!this.storage) {
      return this.assignRanks([...SEED_HELL_RECORDS]);
    }

    const raw = this.storage.getItem(HELL_STORAGE_KEYS.LEADERBOARD);
    if (!raw) {
      const seeded = this.assignRanks([...SEED_HELL_RECORDS]);
      this.saveRecords(seeded);
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fallback on corrupt storage
    }

    const seeded = this.assignRanks([...SEED_HELL_RECORDS]);
    this.saveRecords(seeded);
    return seeded;
  }

  private saveRecords(records: HellLeaderboardEntry[]): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(HELL_STORAGE_KEYS.LEADERBOARD, JSON.stringify(records));
    } catch {
      // Ignore storage write issues
    }
  }

  private assignRanks(entries: Omit<HellLeaderboardEntry, 'rank'>[]): HellLeaderboardEntry[] {
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }
}

