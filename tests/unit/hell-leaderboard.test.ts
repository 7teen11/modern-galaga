import { describe, it, expect, beforeEach } from 'vitest';
import {
  HellLeaderboardClient,
  HellScoreSubmissionRequest,
} from '../../src/modes/hell/HellLeaderboardClient';
import { HELL_STORAGE_KEYS } from '../../src/modes/hell/HellConfig';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, value); }
}

describe('HellLeaderboardClient & Segregated Rankings (T020)', () => {
  let mockStorage: MockStorage;
  let client: HellLeaderboardClient;

  beforeEach(() => {
    mockStorage = new MockStorage();
    client = new HellLeaderboardClient(mockStorage);
  });

  it('returns seeded Hell rankings on initial launch', () => {
    const top = client.getTopScores();
    expect(top.length).toBeGreaterThanOrEqual(1);
    expect(top[0].rank).toBe(1);
    expect(top[0].score).toBeGreaterThan(0);
  });

  it('submits a valid Hell Mode victory run and ranks it in storage', () => {
    const session = client.startSession();

    const req: HellScoreSubmissionRequest = {
      sessionToken: session.sessionToken,
      playerName: 'AcePilot',
      department: 'Platform Core',
      score: 95000,
      isVictory: true,
      durationSeconds: 120,
      clearTimeMs: 120500,
      livesRemaining: 2,
    };

    const res = client.submitScore(req);
    expect(res.rank).toBe(1);
    expect(res.isPersonalBest).toBe(true);

    const savedRaw = mockStorage.getItem(HELL_STORAGE_KEYS.LEADERBOARD);
    expect(savedRaw).not.toBeNull();
    const top = client.getTopScores();
    expect(top[0].playerName).toBe('AcePilot');
    expect(top[0].score).toBe(95000);
    expect(top[0].clearTimeMs).toBe(120500);
  });

  it('rejects submissions with invalid or tampered session token (Anti-Cheat)', () => {
    client.startSession();

    const req: HellScoreSubmissionRequest = {
      sessionToken: 'invalid_token_123',
      playerName: 'Cheater',
      department: 'Hacker',
      score: 999999,
      isVictory: true,
      durationSeconds: 2,
      clearTimeMs: 2000,
      livesRemaining: 3,
    };

    expect(() => client.submitScore(req)).toThrowError(/session token/i);
  });

  it('sorts entries by score descending, then clear time ascending for ties', () => {
    const session1 = client.startSession();
    client.submitScore({
      sessionToken: session1.sessionToken,
      playerName: 'RunnerFast',
      department: 'Eng',
      score: 50000,
      isVictory: true,
      durationSeconds: 100,
      clearTimeMs: 100000,
      livesRemaining: 1,
    });

    const session2 = client.startSession();
    client.submitScore({
      sessionToken: session2.sessionToken,
      playerName: 'RunnerSlow',
      department: 'Eng',
      score: 50000,
      isVictory: true,
      durationSeconds: 150,
      clearTimeMs: 150000,
      livesRemaining: 1,
    });

    const top = client.getTopScores();
    const tieFast = top.find((e) => e.playerName === 'RunnerFast');
    const tieSlow = top.find((e) => e.playerName === 'RunnerSlow');
    expect(tieFast).toBeDefined();
    expect(tieSlow).toBeDefined();
    if (tieFast && tieSlow) {
      expect(tieFast.rank).toBeLessThan(tieSlow.rank);
    }
  });
});
