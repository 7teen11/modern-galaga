/**
 * Hell Mode Configuration & Rules Contract
 * Fully decoupled configuration for Hell Mode extension module.
 */

export type GameModeType = 'STANDARD' | 'HELL';

export interface HellDamageConfig {
  readonly bulletDamage: number;
  readonly collisionDamage: number;
  readonly damageMultiplier: number;
}

export interface HellWaveConfig {
  readonly densityMultiplier: number;
  readonly waveCount: number;
  readonly wave2PincerEnabled: boolean;
  readonly wave3CrossFireEnabled: boolean;
}

export interface HellBossConfig {
  readonly name: string;
  readonly maxHealth: number;
  readonly enrageHealthThresholdRatio: number;
  readonly enrageSpeedMultiplier: number;
  readonly phase1RadialRays: number;
  readonly phase1SpreadRays: number;
  readonly phase1FireIntervalMs: number;
  readonly phase2SpiralFireIntervalMs: number;
  readonly phase2SpiralAngularSpeed: number; // rad/s
  readonly escortSpawnThresholds: number[]; // HP ratios e.g. [0.5, 0.25]
  readonly poolCapacity: number;
  readonly bulletSpeed: number;
  readonly bulletRadius: number;
}

export interface HellLeaderboardEntry {
  id: string;
  pilotName: string;
  department: string;
  score: number;
  clearTimeMs: number;
  clearTimeFormatted: string;
  date: string;
  isVictory: boolean;
  badge: '🔥 HELL';
}

export const HELL_STORAGE_KEYS = {
  LEADERBOARD: 'star_vanguard_hell_board_v1',
  SELECTED_MODE: 'star_vanguard_selected_mode_v1',
} as const;

export const HELL_RULES = {
  DAMAGE: {
    bulletDamage: 40,
    collisionDamage: 70,
    damageMultiplier: 2.0,
  } as HellDamageConfig,

  WAVES: {
    densityMultiplier: 1.5,
    waveCount: 3,
    wave2PincerEnabled: true,
    wave3CrossFireEnabled: true,
  } as HellWaveConfig,

  BOSS: {
    name: 'VOID DREADNOUGHT',
    maxHealth: 1200,
    enrageHealthThresholdRatio: 0.5, // 600 HP
    enrageSpeedMultiplier: 1.25,
    phase1RadialRays: 16,
    phase1SpreadRays: 7,
    phase1FireIntervalMs: 1400,
    phase2SpiralFireIntervalMs: 200,
    phase2SpiralAngularSpeed: 2.4, // radians per sec
    escortSpawnThresholds: [0.5],
    poolCapacity: 160,
    bulletSpeed: 240,
    bulletRadius: 5,
  } as HellBossConfig,
} as const;

/**
 * Format milliseconds into standard MM:SS.mmm format
 */
export function formatClearTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  const mmm = millis.toString().padStart(3, '0');

  return `${mm}:${ss}.${mmm}`;
}

