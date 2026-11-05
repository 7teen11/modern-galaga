# Data Model & Component Specifications: Hell Mode & Internationalization

**Feature Branch**: `002-hell-mode` | **Date**: 2026-11-04  
**Status**: Ready for Planning

---

## 1. Modular Entity-Component Architecture

Following Constitution Principle III (Component-Based Architecture), all Hell Mode entities are flat numeric `EntityId` handles mapped to typed data components.

```
┌────────────────────────────────────────────────────────┐
│                   GameModeDirector                     │
│  - Active Mode: 'STANDARD' | 'HELL'                    │
│  - Active Locale: 'vi' | 'en'                          │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       Standard Mode ECS        Hell Mode Module (src/modes/hell/)
        - WaveSpawnSystem        - HellWaveSystem (3-Wave Campaign)
        - EnemySystem            - HellBossSystem (Void Dreadnought FSM)
        - Standard Rules         - BossHealthBarUI
                                 - HellLeaderboardClient
```

---

## 2. Hell Mode Entities & Component Definitions

### 2.1 Boss Entity (`BossEntityComponent`)
Represents the climax flagship Boss entity ("VOID DREADNOUGHT").

```typescript
export type BossPhase = 'INTRO' | 'PHASE_1' | 'PHASE_2_ENRAGED' | 'DYING';

export interface BossEntityComponent {
  readonly bossName: string;         // 'VOID DREADNOUGHT'
  currentHealth: number;             // Default: 1,200 HP
  maxHealth: number;                 // 1,200 HP
  phase: BossPhase;                  // State machine tracking
  enrageThresholdHp: number;         // 600 HP (50% maxHealth)
  attackCycleTimer: number;          // Countdown to next barrage
  patternIndex: number;              // Current active danmaku pattern
  spiralAngle: number;               // Angular accumulator for spiral danmaku
  escortsSummoned: boolean;          // True when Phase 2 escorts have been spawned
  escortsAliveCount: number;         // Active Fighter escorts (0-2)
  hitFlashTimer: number;             // Hit flash duration (0.07s)
}
```

### 2.2 Boss Danmaku Pattern (`DanmakuPatternConfig`)
Defines the ballistic parameters for wide-area bullet dispersion.

```typescript
export type DanmakuType = 'RADIAL_RING' | 'SPREAD_FAN' | 'SPIRAL_STREAM';

export interface DanmakuPatternConfig {
  readonly type: DanmakuType;
  readonly projectileCount: number;  // 16 for radial ring, 7 for spread fan
  readonly speed: number;            // 220 px/s (Phase 1), 275 px/s (Phase 2)
  readonly angularSpreadRad: number; // 2 * Math.PI for radial, 0.62 for fan
  readonly fireIntervalSec: number;  // 1.8s for radial, 0.06s for spiral
  readonly damage: number;           // 40 HP (Hell Mode 2x damage)
}
```

### 2.3 Boss Health Bar State (`BossHealthBarState`)
Render state consumed by `BossHealthBarUI`.

```typescript
export interface BossHealthBarState {
  readonly isVisible: boolean;
  readonly bossName: string;
  readonly currentHealth: number;
  readonly maxHealth: number;
  readonly healthRatio: number;      // 0.0 to 1.0
  readonly isEnraged: boolean;       // True when HP < 50%
  readonly introBannerTimer: number; // 2.0s alert animation
}
```

### 2.4 Hell Run Result & Submission (`HellRunResult`)
Data payload for the dedicated Hell Mode leaderboard.

```typescript
export interface HellRunResult {
  readonly sessionToken: string;
  readonly playerName: string;
  readonly department: string;
  readonly score: number;
  readonly isVictory: boolean;       // True if Boss defeated
  readonly clearTimeMs: number;      // Duration in milliseconds
  readonly livesRemaining: number;
  readonly achievedAt: string;       // ISO 8601 timestamp
}
```

---

## 3. Localization Data Model (`src/i18n/Localization.ts`)

### 3.1 Supported Locales & Dictionary Schema

```typescript
export type SupportedLocale = 'vi' | 'en';

export interface LocalizationDictionary {
  // Title & Mode Selector
  'title.name': string;
  'title.subtitle': string;
  'title.mode.standard': string;
  'title.mode.hell': string;
  'title.startPrompt': string;
  'title.features': string;

  // HUD & Game Over
  'hud.score': string;
  'hud.highScore': string;
  'hud.wave': string;
  'hud.lives': string;
  'hud.weapon': string;
  'hud.paused': string;
  'hud.resumePrompt': string;

  // Hell Mode & Boss Alerts
  'hell.alertBoss': string;
  'hell.bossTitle': string;
  'hell.stageVictory': string;
  'hell.missionOver': string;
  'hell.clearTime': string;
  'hell.badge': string;

  // Settings
  'settings.title': string;
  'settings.language': string;
  'settings.pilotName': string;
  'settings.department': string;
  'settings.volume': string;
  'settings.shake': string;
  'settings.qualityPreset': string;
  'settings.reducedFlash': string;
  'settings.saveClose': string;

  // Leaderboard
  'leaderboard.title': string;
  'leaderboard.tabStandard': string;
  'leaderboard.tabHell': string;
  'leaderboard.rank': string;
  'leaderboard.pilot': string;
  'leaderboard.time': string;
  'leaderboard.score': string;
}
```

---

## 4. State Machine Transitions

### 4.1 Hell Mode Wave Campaign Lifecycle
```
[TITLE SCREEN]
      │
      ▼ (Toggle Mode to 'HELL' & press Enter/Space)
[WAVE 1: Dense Swarm]
      │ (All Wave 1 enemies defeated)
      ▼
[WAVE 2: Dual Pincer Entry]
      │ (All Wave 2 enemies defeated)
      ▼
[WAVE 3: Cross-Fire Diagonal Sweeps]
      │ (All Wave 3 enemies defeated)
      ▼
[BOSS INTRO ALERT] (2.0s "ALERT // VOID DREADNOUGHT APPROACHING")
      │
      ▼
[BOSS FIGHT: Phase 1] (16-way radial rings + 7-way spread arcs)
      │ (Boss HP reaches <= 50%)
      ▼
[BOSS FIGHT: Phase 2 Enraged] (+25% bullet speed, continuous spiral streams, 2 Fighter summons)
      │
      ├───────────────────────────────┐
      │ (Boss HP reaches 0)           │ (Player lives reach 0)
      ▼                               ▼
[STAGE VICTORY]                  [MISSION OVER]
(Submit Hell Clear Time/Score)   (Submit Hell Score)
```

