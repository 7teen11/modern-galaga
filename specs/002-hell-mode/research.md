# Technical Research & Architecture Decisions: Hell Mode & Internationalization

**Feature**: `002-hell-mode` | **Date**: 2026-11-04  
**Context**: Implement Hell Mode as an independent, non-destructive module inheriting core game interfaces without altering existing classes, featuring a 3-wave campaign, dual pincer/cross-fire flight paths, 2-phase Void Dreadnought Danmaku Boss, dedicated Hell Leaderboard, and English/Vietnamese language localization.

---

## 1. Modular Independent Mode Architecture (Zero Modifications to Existing Classes)

### Context & Constraint
The user explicitly specified: *"xay dung hell mode nhu mot module doc lap, chon lua che nao o menu. ke thua cac interface coi loi cua game, ko duoc thay doi class cu."* (Build Hell Mode as an independent module, selectable at menu. Inherit core game interfaces, MUST NOT modify existing classes).

### Decision
Encapsulate all Hell Mode mechanics under `src/modes/hell/` as an isolated package implementing the `GameSystem` and core engine contracts.
- **Core Interface Inherited**: `GameSystem` (`update?(dt: number): void`, `render?(ctx: CanvasRenderingContext2D): void` from `src/core/Game.ts`).
- **Orchestration Pattern**: `HellModeDirector` (or `HellModeSystem`) acts as a pluggable mode controller. When Hell Mode is active:
  - It intercepts and manages Wave progression (`HellWaveSystem`: Wave 1 dense swarm, Wave 2 dual pincer swoops, Wave 3 cross-fire sweeps, Climax Boss).
  - It handles 2x damage multiplication seamlessly via an event-driven damage modifier wrapper or a dedicated `HellDamageSystem` without modifying `HealthSystem.ts`.
  - It manages the `VoidDreadnoughtBoss` lifecycle and dedicated health bar UI (`HellBossSystem` and `BossHealthBar`).
- **Zero Modification Verification**: Existing classes (`WaveSpawnSystem`, `HealthSystem`, `CollisionSystem`, `WeaponSystem`, `DropSystem`, `HUD`) remain untouched. All existing 38 unit/integration tests continue to run and pass without modification.

### Rationale & Alternatives
- *Alternative Considered*: Modifying `WaveSpawnSystem.ts` and `HealthSystem.ts` with `if (mode === 'HELL')` branches.  
  *Rejected*: Violates user's explicit non-destructive constraint, creates code coupling, and risks regressing the verified Standard Mode gameplay.
- *Selected Pattern*: Open-Closed Principle (OCP). Existing classes remain closed for modification, open for extension via composition and decoupled `EventBus` payloads.

---

## 2. High-Density Danmaku Object Pooling & Frame-Budget Discipline

### Context & Constraint
Constitution Principle IV mandates strict object pooling with zero runtime heap allocations. In Phase 1 and Phase 2 of the Boss fight, the Void Dreadnought releases 16-way radial bursts and continuous spiral bullet hell streams.

### Decision
Instantiate a dedicated pre-warmed `BossBulletPool` (`ObjectPool<PooledBullet>`, capacity: 160) or expand the modular projectile pool within `src/modes/hell/HellBossSystem.ts`:
- **Pool Capacity**: 160 pre-warmed boss projectiles, acquired in $O(1)$ and recycled using `RECYCLE_OLDEST`.
- **Danmaku Math**:
  - Phase 1 Radial Ring: 16 projectiles emitted simultaneously with angle increment $\Delta \theta = \frac{2\pi}{16} = \frac{\pi}{8}$ ($22.5^\circ$), velocity $220\text{ px/s}$.
  - Phase 1 Fan: 7 projectiles spread symmetrically over $\pm 36^\circ$ toward player's current coordinate.
  - Phase 2 Spiral Enrage: Continuous angular stream $\theta(t) = \theta_0 + \omega t$ firing 1 projectile every $0.06\text{s}$ at $275\text{ px/s}$ (+25% speed).
- **Core Hitbox Grazing (FR-014)**: Boss bullets utilize small circular hitboxes ($radius = 4.5\text{ px}$). The player's 40–50% cockpit core hitbox ($radius = 10\text{ px}$) enables threading through tight bullet gaps with wingtip graze sparks.

### Rationale & Alternatives
- *Alternative Considered*: Dynamically instantiating bullet objects with `new Bullet()`.  
  *Rejected*: Strictly forbidden by Constitution Principle IV; creates severe garbage collection latency spikes violating the 60 FPS ($\le 16.7\text{ ms}$) frame budget.

---

## 3. Bilingual Internationalization Architecture (Vietnamese & English)

### Context & Constraint
The user requested: *"them ban English, duoc chon o menu"* (Add English version, selectable at menu).

### Decision
Create a zero-overhead, type-safe Localization Service in `src/i18n/Localization.ts`:
- **Supported Locales**: `'vi'` (Tiếng Việt) and `'en'` (English).
- **Structure**: Strongly typed dictionary keys (`I18nKey`) mapped to string records for UI, HUD, Banners, Boss Alerts, Game Over, and Settings.
- **Persistence**: Active language stored in `localStorage` alongside existing user settings in `StorageService`.
- **UI Language Switcher**:
  - Title Screen language pill button: `[ VI | EN ]` allowing instant toggling with a single click.
  - Language selector in `SettingsModal.ts`.
- **Zero Re-Render Overhead**: Canvas render systems fetch active string tokens directly by key (`i18n.t('hud.score')`), requiring zero DOM framework overhead.

### Rationale & Alternatives
- *Alternative Considered*: Installing heavy i18n libraries like `i18next` or `vue-i18n`.  
  *Rejected*: Unnecessary runtime bloat (>40 KB). A lightweight 2 KB typed dictionary in TypeScript achieves instant translation with 0 dependencies, maintaining the $< 150\text{ KB}$ bundle constraint.

---

## 4. Multi-Point Bézier Spline Pincer & Cross-Fire Entry Choreography

### Context
User requested: *"them 1 man xuat hien khac nhau"* (add a distinct different entrance stage).

### Decision
Add specialized Bézier curve generators in `src/modes/hell/HellSplines.ts`:
- **Wave 2 Dual Pincer**: Squad A enters from top-left $(x: -40, y: 120)$, loops through bottom-center $(300, 480)$, and curves upward to right formation slot $(460, 140)$. Simultaneously, Squad B mirrors from top-right $(x: 640, y: 120)$, crosses at $(300, 480)$, and glides to left formation slot $(140, 140)$.
- **Wave 3 Cross-Fire Diagonal Sweeps**: Squads sweep across opposing screen diagonals while emitting targeted suppression fire.
- Reuses existing `Spline.ts` evaluation math without mutating `Spline.ts`.

---

## 5. Summary of Architecture Decisions

| Area | Decision | Constitution / Requirement Alignment |
|---|---|---|
| **Modularity** | Isolated `src/modes/hell/` module; zero changes to standard mode classes | User constraint; Open-Closed Principle |
| **Interface** | All Hell systems implement `GameSystem` (`update`, `render`) | Principle III (Component-Based Architecture) |
| **Object Pooling** | Pre-warmed `BossBulletPool` (160 capacity, zero runtime `new`) | Principle IV (Strict Object Pooling) |
| **Visual Art** | 100% original procedural Canvas 2D vector flagship ("VOID DREADNOUGHT") | Principle I & V (High-Fidelity & IP Safety) |
| **Localization** | Zero-dependency typed `LocalizationService` (`vi` / `en`) | User requirement; Bundle $< 150\text{ KB}$ |
| **Leaderboard** | Dedicated `"HELL RANKINGS"` category with clear time and score | User Story 4 & Clarification Q3 |

