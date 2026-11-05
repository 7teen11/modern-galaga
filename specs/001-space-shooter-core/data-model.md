# Data Model: Core Space Shooter Engine

**Feature**: `001-space-shooter-core` | **Date**: 2026-11-04

This document defines the structural entities, component schemas, state transitions, and validation rules for the game.

---

## 1. Component Schemas (Entity-Component Architecture)

Entities are numeric IDs (`type EntityId = number`). All entities are composed of the following decoupled component interfaces:

### `TransformComponent`
Represents spatial positioning and movement in 2D space.
```typescript
interface TransformComponent {
  x: number;               // Horizontal position in canvas pixels (0 = left)
  y: number;               // Vertical position in canvas pixels (0 = top)
  vx: number;              // Horizontal velocity (pixels/second)
  vy: number;              // Vertical velocity (pixels/second)
  speed: number;           // Base scalar speed (pixels/second)
  rotation: number;        // Heading angle in radians
}
```

### `RenderComponent`
Defines visual presentation and shader/blending parameters.
```typescript
interface RenderComponent {
  spriteKey: string;       // Identifier for cached procedural or pre-rendered sprite
  width: number;           // Rendering width in pixels
  height: number;          // Rendering height in pixels
  layer: RenderLayer;      // Enum: BACKGROUND (0), PARTICLES_BG (1), ENEMIES (2), PLAYER (3), BULLETS (4), PARTICLES_FG (5), HUD (6)
  alpha: number;           // Transparency (0.0 to 1.0)
  scale: number;           // Visual scale factor (default 1.0)
  hitFlashTimer: number;   // Duration remaining in seconds for white hit-flash effect
  bloomColor?: string;     // Hex/RGBA glow color for neon additive blending
}
```

### `HitboxComponent`
Defines collision boundaries with distinction between full sprite and core hitbox.
```typescript
interface HitboxComponent {
  shape: 'circle' | 'aabb';
  radius: number;          // For circle colliders (cockpit core, projectiles)
  halfWidth: number;       // For AABB colliders (enemies)
  halfHeight: number;      // For AABB colliders (enemies)
  isCoreHitbox: boolean;   // True for player ship 40-50% core (wings do not register damage)
  collisionMask: number;   // Bitmask: PLAYER_SHIP(1), PLAYER_BULLET(2), ENEMY_SHIP(4), ENEMY_BULLET(8), POWERUP(16)
}
```

### `HealthComponent`
Tracks entity vitality, damage limits, and damage invulnerability.
```typescript
interface HealthComponent {
  currentHealth: number;   // Current hit points (e.g., 100 for player)
  maxHealth: number;       // Maximum hit points (e.g., 100 for player)
  invulnerableTimer: number; // Seconds of remaining damage invulnerability
  livesRemaining?: number; // Present on Player entity only (default 3)
}
```

### `WeaponComponent`
Manages firing rates, cooldowns, and upgrade configurations.
```typescript
type WeaponTier = 1 | 2 | 3;

interface WeaponComponent {
  tier: WeaponTier;        // 1 = Single Forward, 2 = Dual Parallel, 3 = Triple Spread
  cooldown: number;        // Minimum interval between shots in seconds (e.g., 0.15s)
  cooldownTimer: number;   // Time remaining until next shot can fire
  bulletSpeed: number;     // Speed of spawned projectiles (e.g., 800 px/s)
  bulletDamage: number;    // Damage per projectile (e.g., 25)
}
```

### `EnemyBehaviorComponent`
Drives formation staging, Bézier curve entries, and dive attacks.
```typescript
type EnemyArchetype = 'SCOUT' | 'FIGHTER' | 'COMMANDER';
type EnemyState = 'ENTERING_SPLINE' | 'IN_FORMATION' | 'DIVING' | 'RETURNING' | 'DESTROYED';

interface EnemyBehaviorComponent {
  archetype: EnemyArchetype;
  state: EnemyState;
  pointValue: number;      // SCOUT: 100, FIGHTER: 200, COMMANDER: 400 (diving doubles points)
  formationGridX: number;  // Designated slot column in top grid (0 to 9)
  formationGridY: number;  // Designated slot row in top grid (0 to 3)
  splinePath?: BezierPoint[]; // Array of cubic Bézier control points
  splineProgress: number;  // Normalized progress along entry path (0.0 to 1.0)
  diveTimer: number;       // Countdown until next potential dive
  diveTargetX: number;     // Locked player position at dive initiation
  diveTargetY: number;
}
```

### `PowerUpComponent`
Represents dropped collectible upgrade tokens.
```typescript
type PowerUpType = 'WEAPON_UPGRADE' | 'SCORE_BONUS';

interface PowerUpComponent {
  type: PowerUpType;
  driftSpeed: number;      // Downward drift velocity (e.g., 100 px/s)
  despawnTimer: number;    // Lifetime before despawning (e.g., 8.0s)
}
```

### `ParticleComponent`
Short-lived pooled visual feedback entity.
```typescript
interface ParticleComponent {
  vx: number;
  vy: number;
  decayRate: number;       // Alpha decrease per second
  color: string;
  size: number;
  currentLifetime: number;
  maxLifetime: number;
}
```

---

## 2. High-Level Game State Model

### `GameState` (Finite State Machine)
```typescript
enum GameModeState {
  BOOT = 'BOOT',
  TITLE = 'TITLE',
  WAVE_INTRO = 'WAVE_INTRO',
  PLAYING = 'PLAYING',
  RESPAWNING = 'RESPAWNING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

interface GameSessionState {
  currentState: GameModeState;
  currentWave: number;
  currentScore: number;
  sessionHighScore: number;
  enemiesDefeatedCount: number;
  sessionStartTime: number;
  sessionId: string;
}
```

### State Transitions Diagram
```
[BOOT] ───────────────► [TITLE]
                          │
                          ▼ (Press Start / Space)
                     [WAVE_INTRO]
                          │
                          ▼ (Squads reach formation)
                     [PLAYING] ◄────────────────┐
                       │   │                    │
        (Player Hit,   │   │ (Press ESC/P)      │
       health <= 0,    │   ▼                    │
         lives > 0)    │  [PAUSED]              │
                       │   │                    │
                       │   └────► (Resume) ─────┘
                       │
                       ▼
                 [RESPAWNING] ──► (After 2.5s) ──► [PLAYING]
                       │
        (Player Hit,   │
       health <= 0,    │
         lives == 0)   ▼
                  [GAME_OVER] ──► (Restart) ──► [WAVE_INTRO]
```

---

## 3. Object Pool Specifications

| Pool Name | Entity Type | Pre-allocated Capacity | Exhaustion Policy |
|-----------|-------------|------------------------|-------------------|
| `PlayerBulletPool` | Projectile (Player) | 50 | Ring buffer recycle (oldest bullet re-purposed) |
| `EnemyBulletPool` | Projectile (Enemy) | 150 | Ring buffer recycle |
| `EnemyPool` | Enemy (Scout, Fighter, Commander) | 60 | Reject spawn with logged warning |
| `ParticlePool` | VFXParticle (Sparks, debris) | 300 | Drop oldest particle immediately |
| `PowerUpPool` | PowerUp (Upgrade tokens) | 20 | Drop oldest token |

---

## 4. Validation Rules & Invariants

1. **Normalized Diagonals**: Player velocity must never exceed `speed` ($V_x^2 + V_y^2 \le \text{speed}^2$). Diagonal factor is $1/\sqrt{2} \approx 0.7071$.
2. **Boundary Clamping**: Player coordinates must remain strictly within canvas limits:
   - $X \in [HalfWidth, CanvasWidth - HalfWidth]$
   - $Y \in [HalfHeight, CanvasHeight - HalfHeight]$
3. **Weapon Tier Bounds**: Tier is strictly integer $\in [1, 3]$. Additional pickups at Tier 3 award 1,000 points without incrementing tier.
4. **Lives Integrity**: Lives counter is integer $\in [0, 3]$. Decrement occurs strictly upon health reaching 0.
5. **Zero Allocation in Loop**: No pool or component allocation calls (`new`, `Array.push`, `Object.assign`) may occur inside `update(dt)` or `render()` methods.

