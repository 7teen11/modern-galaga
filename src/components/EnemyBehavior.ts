import { EnemyArchetype } from '../core/EventBus';

export interface EnemyArchetypeStats {
  readonly archetype: EnemyArchetype;
  readonly maxHealth: number;
  readonly pointValue: number;
  readonly width: number;
  readonly height: number;
  readonly baseDiveSpeed: number;
  readonly baseFireInterval: number;
  readonly baseDiveInterval: number;
  readonly dropWeaponUpgradeChance: number;
  readonly bloomColor: string;
}

/**
 * Canonical stats for the 3 distinct enemy behavioral archetypes (FR-006).
 */
export const ENEMY_ARCHETYPE_CONFIG: Record<EnemyArchetype, EnemyArchetypeStats> = {
  SCOUT: {
    archetype: 'SCOUT',
    maxHealth: 25, // Destroyed in 1 base blaster shot
    pointValue: 100,
    width: 28,
    height: 28,
    baseDiveSpeed: 270,
    baseFireInterval: 3.4,
    baseDiveInterval: 4.5,
    dropWeaponUpgradeChance: 0.0,
    bloomColor: '#e0aaff'
  },
  FIGHTER: {
    archetype: 'FIGHTER',
    maxHealth: 50, // Destroyed in 2 base blaster shots
    pointValue: 200,
    width: 34,
    height: 32,
    baseDiveSpeed: 245,
    baseFireInterval: 2.2,
    baseDiveInterval: 5.0,
    dropWeaponUpgradeChance: 0.15,
    bloomColor: '#ff1e8a'
  },
  COMMANDER: {
    archetype: 'COMMANDER',
    maxHealth: 100, // Destroyed in 4 base blaster shots
    pointValue: 400,
    width: 44,
    height: 40,
    baseDiveSpeed: 215,
    baseFireInterval: 1.7,
    baseDiveInterval: 6.0,
    dropWeaponUpgradeChance: 1.0, // Guaranteed weapon upgrade drop (FR-006, FR-008)
    bloomColor: '#ffcc00'
  }
};

