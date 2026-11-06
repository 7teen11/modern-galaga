import { WeaponTier } from '../ecs/Component';

export type ProjectileShape =
  | 'ION_NEEDLE'
  | 'PULSE_CAPSULE'
  | 'CRESCENT_WAVE'
  | 'PLASMA_LANCE'
  | 'HYPER_BEAM';

export interface WeaponStreamOffset {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly angleRad: number;
  readonly isPiercing: boolean;
  readonly damage: number;
  readonly width: number;
  readonly height: number;
}

export interface WeaponTierVisualSpec {
  readonly tier: WeaponTier;
  readonly name: string;
  readonly streamCount: number;
  readonly cooldownSec: number;
  readonly bulletSpeed: number;
  readonly baseDamage: number;
  readonly primaryColor: string;
  readonly coreColor: string;
  readonly bloomColor: string;
  readonly bulletWidth: number;
  readonly bulletHeight: number;
  readonly shape: ProjectileShape;
  readonly hasPiercingCenter: boolean;
  readonly audioFreqHz: number;
  readonly recoilPx: number;
  readonly screenShakeMagnitude: number;
  readonly screenShakeDurationSec: number;
  readonly streams: ReadonlyArray<WeaponStreamOffset>;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Canonical 5-Tier Weapon Progression Specification (FR-001, FR-002, FR-003).
 * Each upgrade transforms stream pattern, projectile geometry, neon color palette,
 * audio harmonic frequency, and tactile recoil/shake feedback.
 */
export const WEAPON_TIER_SPECS: Record<WeaponTier, WeaponTierVisualSpec> = {
  1: {
    tier: 1,
    name: 'Single Ion Needle',
    streamCount: 1,
    cooldownSec: 0.16,
    bulletSpeed: 760,
    baseDamage: 25,
    primaryColor: '#00f0ff',
    coreColor: '#ffffff',
    bloomColor: '#00f0ff',
    bulletWidth: 4,
    bulletHeight: 16,
    shape: 'ION_NEEDLE',
    hasPiercingCenter: false,
    audioFreqHz: 520,
    recoilPx: 0,
    screenShakeMagnitude: 0,
    screenShakeDurationSec: 0,
    streams: [
      {
        offsetX: 0,
        offsetY: -20,
        angleRad: 0,
        isPiercing: false,
        damage: 25,
        width: 4,
        height: 16
      }
    ]
  },
  2: {
    tier: 2,
    name: 'Twin Pulse Blaster',
    streamCount: 2,
    cooldownSec: 0.155,
    bulletSpeed: 780,
    baseDamage: 22,
    primaryColor: '#00ff88',
    coreColor: '#e8fff4',
    bloomColor: '#00ff88',
    bulletWidth: 6,
    bulletHeight: 18,
    shape: 'PULSE_CAPSULE',
    hasPiercingCenter: false,
    audioFreqHz: 600,
    recoilPx: 0,
    screenShakeMagnitude: 0,
    screenShakeDurationSec: 0,
    streams: [
      {
        offsetX: -11,
        offsetY: -16,
        angleRad: 0,
        isPiercing: false,
        damage: 22,
        width: 6,
        height: 18
      },
      {
        offsetX: 11,
        offsetY: -16,
        angleRad: 0,
        isPiercing: false,
        damage: 22,
        width: 6,
        height: 18
      }
    ]
  },
  3: {
    tier: 3,
    name: 'Tri-Beam Spread Cannon',
    streamCount: 3,
    cooldownSec: 0.15,
    bulletSpeed: 800,
    baseDamage: 20,
    primaryColor: '#ffcc00',
    coreColor: '#fff9e0',
    bloomColor: '#ffcc00',
    bulletWidth: 8,
    bulletHeight: 20,
    shape: 'CRESCENT_WAVE',
    hasPiercingCenter: false,
    audioFreqHz: 680,
    recoilPx: 1,
    screenShakeMagnitude: 0,
    screenShakeDurationSec: 0,
    streams: [
      {
        offsetX: 0,
        offsetY: -22,
        angleRad: 0,
        isPiercing: false,
        damage: 20,
        width: 8,
        height: 20
      },
      {
        offsetX: -12,
        offsetY: -14,
        angleRad: -12 * DEG_TO_RAD,
        isPiercing: false,
        damage: 20,
        width: 8,
        height: 20
      },
      {
        offsetX: 12,
        offsetY: -14,
        angleRad: 12 * DEG_TO_RAD,
        isPiercing: false,
        damage: 20,
        width: 8,
        height: 20
      }
    ]
  },
  4: {
    tier: 4,
    name: 'Quad Plasma Annihilator',
    streamCount: 4,
    cooldownSec: 0.145,
    bulletSpeed: 840,
    baseDamage: 22,
    primaryColor: '#bf55ec',
    coreColor: '#f5e6ff',
    bloomColor: '#d980fa',
    bulletWidth: 10,
    bulletHeight: 24,
    shape: 'PLASMA_LANCE',
    hasPiercingCenter: false,
    audioFreqHz: 760,
    recoilPx: 2,
    screenShakeMagnitude: 1.5,
    screenShakeDurationSec: 0.05,
    streams: [
      {
        offsetX: -7,
        offsetY: -22,
        angleRad: 0,
        isPiercing: false,
        damage: 22,
        width: 10,
        height: 24
      },
      {
        offsetX: 7,
        offsetY: -22,
        angleRad: 0,
        isPiercing: false,
        damage: 22,
        width: 10,
        height: 24
      },
      {
        offsetX: -18,
        offsetY: -12,
        angleRad: -7 * DEG_TO_RAD,
        isPiercing: false,
        damage: 22,
        width: 9,
        height: 22
      },
      {
        offsetX: 18,
        offsetY: -12,
        angleRad: 7 * DEG_TO_RAD,
        isPiercing: false,
        damage: 22,
        width: 9,
        height: 22
      }
    ]
  },
  5: {
    tier: 5,
    name: 'Omega Vanguard Hyper Beam',
    streamCount: 5,
    cooldownSec: 0.135,
    bulletSpeed: 900,
    baseDamage: 30,
    primaryColor: '#ff2a55',
    coreColor: '#ffffff',
    bloomColor: '#ff5e7e',
    bulletWidth: 14,
    bulletHeight: 32,
    shape: 'HYPER_BEAM',
    hasPiercingCenter: true,
    audioFreqHz: 860,
    recoilPx: 2,
    screenShakeMagnitude: 2.5,
    screenShakeDurationSec: 0.08,
    streams: [
      // Central Twin Armor-Piercing Hyper Beams (FR-002 Tier 5, Q3: A)
      {
        offsetX: -6,
        offsetY: -26,
        angleRad: 0,
        isPiercing: true,
        damage: 30,
        width: 14,
        height: 32
      },
      {
        offsetX: 6,
        offsetY: -26,
        angleRad: 0,
        isPiercing: true,
        damage: 30,
        width: 14,
        height: 32
      },
      // Center-forward focused plasma bolt
      {
        offsetX: 0,
        offsetY: -28,
        angleRad: 0,
        isPiercing: false,
        damage: 24,
        width: 10,
        height: 26
      },
      // Angled Wing Escort Bolts (+-15 deg)
      {
        offsetX: -20,
        offsetY: -12,
        angleRad: -15 * DEG_TO_RAD,
        isPiercing: false,
        damage: 20,
        width: 10,
        height: 22
      },
      {
        offsetX: 20,
        offsetY: -12,
        angleRad: 15 * DEG_TO_RAD,
        isPiercing: false,
        damage: 20,
        width: 10,
        height: 22
      }
    ]
  }
};

export const MAX_WEAPON_TIER: WeaponTier = 5;
export const OVERCHARGE_RADIAL_CLEAR_RADIUS_PX = 80;
export const OVERCHARGE_BONUS_POINTS = 2000;

