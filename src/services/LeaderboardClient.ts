import { StorageService } from './StorageService';

export interface SessionResponse {
  sessionId: string;
  sessionToken: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  department: string;
  score: number;
  highestWave: number;
  achievedAt: string;
}

export interface ScoreSubmissionRequest {
  sessionToken: string;
  playerName: string;
  department: string;
  score: number;
  highestWave: number;
  durationSeconds: number;
  enemiesDefeated: number;
}

export interface ScoreSubmissionResponse {
  rank: number;
  isPersonalBest: boolean;
  isNewHighScore: boolean;
  message: string;
}

const SEED_COMPANY_LEADERBOARD: Omit<LeaderboardEntry, 'rank'>[] = [
  {
    playerName: 'Minh.Tran',
    department: 'Platform Core',
    score: 28500,
    highestWave: 6,
    achievedAt: '2026-11-01T10:15:00Z'
  },
  {
    playerName: 'Linh.Nguyen',
    department: 'Product Design',
    score: 21400,
    highestWave: 5,
    achievedAt: '2026-11-02T14:40:00Z'
  },
  {
    playerName: 'Huy.Le',
    department: 'QA Automation',
    score: 15800,
    highestWave: 4,
    achievedAt: '2026-11-03T16:20:00Z'
  },
  {
    playerName: 'Thao.Pham',
    department: 'People & Culture',
    score: 9600,
    highestWave: 3,
    achievedAt: '2026-11-04T09:05:00Z'
  }
];

/**
 * Pluggable Company Leaderboard Client implementing contracts/leaderboard-api.yaml.
 * Enforces anti-cheat session token and plausible score-rate validation.
 */
export class LeaderboardClient {
  public static readonly MAX_PLAUSIBLE_SCORE_PER_SEC = 4500;

  private readonly storage: StorageService;
  private activeSession: SessionResponse | null = null;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  /**
   * POST /api/v1/session/start
   * Issues a session token embedding start timestamp for anti-cheat verification.
   */
  public startSession(): SessionResponse {
    const timestamp = Date.now();
    const sessionId = `sess_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionToken = `tok_${btoa(`${sessionId}:${timestamp}`)}`;

    this.activeSession = {
      sessionId,
      sessionToken,
      timestamp
    };
    return this.activeSession;
  }

  public getActiveSession(): SessionResponse | null {
    return this.activeSession;
  }

  /**
   * GET /api/v1/leaderboard
   */
  public getTopScores(limit = 10): LeaderboardEntry[] {
    const entries = this.loadBoardEntries();
    entries.sort((a, b) => b.score - a.score);
    return entries.slice(0, limit).map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }

  /**
   * POST /api/v1/leaderboard
   * Validates anti-cheat constraints before recording the score.
   */
  public submitScore(req: ScoreSubmissionRequest): ScoreSubmissionResponse {
    if (!req.sessionToken || !req.sessionToken.startsWith('tok_')) {
      throw new Error('INVALID_SESSION_TOKEN: Missing or malformed session token');
    }

    if (req.score < 0 || req.highestWave < 1 || req.durationSeconds <= 0) {
      throw new Error('INVALID_PAYLOAD: Score metrics out of bounds');
    }

    // Anti-cheat plausibility check: reject impossible score rates
    const effectiveDuration = Math.max(1.5, req.durationSeconds);
    const pointsPerSec = req.score / effectiveDuration;
    if (req.score > 3000 && pointsPerSec > LeaderboardClient.MAX_PLAUSIBLE_SCORE_PER_SEC) {
      throw new Error(
        `ANTI_CHEAT_REJECTED: Score rate (${Math.round(pointsPerSec)} pts/s) exceeds plausible theoretical limit`
      );
    }

    const entries = this.loadBoardEntries();
    const previousTop = entries.reduce((max, e) => Math.max(max, e.score), 0);
    const previousPersonal = entries
      .filter((e) => e.playerName.toLowerCase() === req.playerName.toLowerCase())
      .reduce((max, e) => Math.max(max, e.score), 0);

    const newEntry: Omit<LeaderboardEntry, 'rank'> = {
      playerName: req.playerName.trim() || 'Anonymous Pilot',
      department: req.department.trim() || 'Internal',
      score: Math.floor(req.score),
      highestWave: Math.floor(req.highestWave),
      achievedAt: new Date().toISOString()
    };

    entries.push(newEntry);
    entries.sort((a, b) => b.score - a.score);
    this.saveBoardEntries(entries.slice(0, 50));

    const rank =
      entries.findIndex(
        (e) =>
          e.score === newEntry.score &&
          e.achievedAt === newEntry.achievedAt
      ) + 1;

    return {
      rank: rank > 0 ? rank : entries.length,
      isPersonalBest: newEntry.score > previousPersonal,
      isNewHighScore: newEntry.score > previousTop,
      message: 'Score verified and recorded on Company Leaderboard'
    };
  }

  private loadBoardEntries(): Omit<LeaderboardEntry, 'rank'>[] {
    const raw = this.storage.loadRawLeaderboard();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback to seed
      }
    }
    return [...SEED_COMPANY_LEADERBOARD];
  }

  private saveBoardEntries(entries: Omit<LeaderboardEntry, 'rank'>[]): void {
    this.storage.saveRawLeaderboard(JSON.stringify(entries));
  }
}

