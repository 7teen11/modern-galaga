import { EnemyArchetype } from '../core/EventBus';

export interface EnemyColorVariant {
  readonly variantId: string;
  readonly archetype: EnemyArchetype;
  readonly hullPrimary: string;
  readonly hullSecondary: string;
  readonly cockpitAccent: string;
  readonly thrusterColor: string;
  readonly shrapnelColors: readonly [string, string];
  readonly baseThrusterLength: number;
  readonly maxThrusterStretch: number;
}

/**
 * Vibrant Multi-Color Enemy Fleet Palettes (FR-006, FR-007, FR-008).
 * Each enemy archetype features multiple high-contrast neon color variants
 * so formations look rich, varied, and readable against the deep-space background.
 */
export const ENEMY_COLOR_VARIANTS: Record<EnemyArchetype, ReadonlyArray<EnemyColorVariant>> = {
  SCOUT: [
    {
      variantId: 'SCOUT_CYAN_EMERALD',
      archetype: 'SCOUT',
      hullPrimary: '#00f0ff',
      hullSecondary: '#00ff88',
      cockpitAccent: '#ffffff',
      thrusterColor: '#00ff88',
      shrapnelColors: ['#00f0ff', '#00ff88'],
      baseThrusterLength: 9,
      maxThrusterStretch: 2.2
    },
    {
      variantId: 'SCOUT_SOLAR_AMBER',
      archetype: 'SCOUT',
      hullPrimary: '#ffaa00',
      hullSecondary: '#ffdd00',
      cockpitAccent: '#ffffff',
      thrusterColor: '#ffdd00',
      shrapnelColors: ['#ffaa00', '#ffdd00'],
      baseThrusterLength: 9,
      maxThrusterStretch: 2.2
    },
    {
      variantId: 'SCOUT_TOXIC_LIME',
      archetype: 'SCOUT',
      hullPrimary: '#39ff14',
      hullSecondary: '#b0ff00',
      cockpitAccent: '#eaffd0',
      thrusterColor: '#39ff14',
      shrapnelColors: ['#39ff14', '#b0ff00'],
      baseThrusterLength: 9,
      maxThrusterStretch: 2.2
    }
  ],
  FIGHTER: [
    {
      variantId: 'FIGHTER_HOT_MAGENTA',
      archetype: 'FIGHTER',
      hullPrimary: '#ff1e8a',
      hullSecondary: '#ff77ff',
      cockpitAccent: '#ffeef8',
      thrusterColor: '#ff1e8a',
      shrapnelColors: ['#ff1e8a', '#ff77ff'],
      baseThrusterLength: 12,
      maxThrusterStretch: 2.5
    },
    {
      variantId: 'FIGHTER_CRIMSON_ORANGE',
      archetype: 'FIGHTER',
      hullPrimary: '#ff3838',
      hullSecondary: '#ff9f1a',
      cockpitAccent: '#fff0d6',
      thrusterColor: '#ff9f1a',
      shrapnelColors: ['#ff3838', '#ff9f1a'],
      baseThrusterLength: 12,
      maxThrusterStretch: 2.5
    },
    {
      variantId: 'FIGHTER_COBALT_BLUE',
      archetype: 'FIGHTER',
      hullPrimary: '#2e86de',
      hullSecondary: '#54a0ff',
      cockpitAccent: '#e3f2fd',
      thrusterColor: '#54a0ff',
      shrapnelColors: ['#2e86de', '#54a0ff'],
      baseThrusterLength: 12,
      maxThrusterStretch: 2.5
    }
  ],
  COMMANDER: [
    {
      variantId: 'COMMANDER_IMPERIAL_GOLD',
      archetype: 'COMMANDER',
      hullPrimary: '#ffcc00',
      hullSecondary: '#9b59b6',
      cockpitAccent: '#00f0ff',
      thrusterColor: '#ffcc00',
      shrapnelColors: ['#ffcc00', '#9b59b6'],
      baseThrusterLength: 15,
      maxThrusterStretch: 2.8
    },
    {
      variantId: 'COMMANDER_ROYAL_VIOLET',
      archetype: 'COMMANDER',
      hullPrimary: '#e056fd',
      hullSecondary: '#f9ca24',
      cockpitAccent: '#ffffff',
      thrusterColor: '#f9ca24',
      shrapnelColors: ['#e056fd', '#f9ca24'],
      baseThrusterLength: 15,
      maxThrusterStretch: 2.8
    }
  ]
};

/**
 * Selects a deterministic neon color variant based on archetype and formation coordinates.
 */
export function selectEnemyColorVariant(
  archetype: EnemyArchetype,
  gridCol = 0,
  gridRow = 0
): EnemyColorVariant {
  const variants = ENEMY_COLOR_VARIANTS[archetype];
  const index = Math.abs(gridCol + gridRow * 2) % variants.length;
  return variants[index];
}
