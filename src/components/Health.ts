import { HealthComponent } from '../ecs/Component';

export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_INITIAL_LIVES = 3;
export const DAMAGE_INVULNERABILITY_SEC = 0.5; // Brief blink after non-lethal hit (FR-004)
export const RESPAWN_INVULNERABILITY_SEC = 2.5; // Safe window after life loss (FR-004, FR-012)
export const CRITICAL_HEALTH_THRESHOLD = 0.25; // <= 25% pulses red on HUD (User Story 3)
export const SAFE_RESPAWN_X = 300;
export const SAFE_RESPAWN_Y = 700;

export function createHealthComponent(
  maxHealth = PLAYER_MAX_HEALTH,
  livesRemaining?: number
): HealthComponent {
  return {
    currentHealth: maxHealth,
    maxHealth,
    invulnerableTimer: 0,
    livesRemaining
  };
}

export function isHealthCritical(health: HealthComponent): boolean {
  if (health.maxHealth <= 0) return false;
  return health.currentHealth / health.maxHealth <= CRITICAL_HEALTH_THRESHOLD;
}

