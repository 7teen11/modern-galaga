# Implementation Plan: Hell Mode & Internationalization (Independent Module)

**Branch**: `002-hell-mode` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: User description: *"xay dung hell mode nhu mot module doc lap, chon lua che nao o menu. ke thua cac interface coi loi cua game, ko duoc thay doi class cu. them ban English, duoc chon o menu."*

## Summary

Deliver Hell Mode as a completely decoupled, modular game mode residing in `src/modes/hell/` that inherits core engine interfaces (`GameSystem`) without altering any existing classes in Standard Mode. 

The mode features double enemy damage (40 HP bullets, 70 HP collisions), +50% enemy swarm density, an exclusive 3-wave campaign with dual pincer swoops and cross-fire diagonal sweeps, and an epic 2-phase Climax Boss ("VOID DREADNOUGHT", 1,200 HP) featuring a dedicated health bar, wide-area radial/spiral danmaku bullet barrages, enrage mechanics at <50% HP, and guaranteed escort upgrade drops. 

In addition, a zero-dependency bilingual localization system (`src/i18n/Localization.ts`) provides full Vietnamese and English translation selectable directly from the Title Screen and Settings modal.

## Technical Context

**Language/Version**: TypeScript 5.7+, ECMAScript 2022+ target.

**Primary Dependencies**: Vite 6.x (bundler/dev server), Vitest (headless test runner). Zero runtime frameworks (pure Canvas 2D + Web Audio API) to preserve zero-GC performance.

**Storage**: Browser `localStorage` (via non-destructive extension of `StorageService` keys: `star_vanguard_hell_board_v1`, `star_vanguard_locale_v1`).

**Testing**: Vitest unit & integration tests (`tests/unit/hell-mode-rules.test.ts`, `tests/unit/hell-splines.test.ts`, `tests/unit/boss-danmaku.test.ts`, `tests/unit/localization.test.ts`, `tests/integration/hell-campaign.test.ts`).

**Target Platform**: Modern desktop/laptop web browsers (Chrome, Edge, Safari, Firefox).

**Project Type**: Browser-based client-side 2D Arcade Game.

**Performance Goals**: Consistent 60 FPS ($\le 16.7\text{ ms}$ frame step budget) during peak boss danmaku with over 100 on-screen projectiles.

**Constraints**:
- Strict Non-Destructive Rule: Zero modifications to existing Standard Mode classes.
- Zero runtime heap allocations in active game loop (strict pre-warmed object pooling).
- Bundle size $< 150\text{ KB}$ (gzip).
- Visual comfort: Danmaku flashes and boss screen-shakes fully adhere to existing accessibility toggles.

**Scale/Scope**: 1 isolated mode package (`src/modes/hell/`), 1 localization module (`src/i18n/`), 5 test suites.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Status | Compliance Details in Plan |
|---|---|---|
| **I. Smooth, High-Fidelity Visuals** | **PASS** | Procedural vector art for the Void Dreadnought flagship boss; crisp Retina resolution rendering; crimson ambient lighting for Hell Mode; full support for Quality Presets (`HIGH` / `PERFORMANCE`) and Reduced Flash. |
| **II. Frame-Budget Discipline** | **PASS** | Fixed-step 60 Hz kinematic integration; peak danmaku barrages (16-way radial bursts + spiral streams) fit cleanly within $< 16.7\text{ ms}$ per frame; verified by peak load integration tests. |
| **III. Component-Based Architecture** | **PASS** | Void Dreadnought modeled as discrete ECS components (`BossEntityComponent`, `Transform`, `Render`, `Hitbox`, `Health`); Hell systems implement the core `GameSystem` interface. |
| **IV. Strict Object Pooling (NON-NEGOTIABLE)** | **PASS** | Dedicated pre-warmed `BossBulletPool` (160 capacity, `RECYCLE_OLDEST`) ensuring zero `new` allocations during bullet-hell patterns; metrics observable via `F3` debug overlay. |
| **V. Original Assets & IP Safety** | **PASS** | 100% original procedural Canvas 2D vector spaceship art ("VOID DREADNOUGHT"); original procedural Web Audio synth sound effects (deep alarm siren, heavy plasma charge, boss explosion roar). |

## Project Structure

### Documentation (this feature)

```text
specs/002-hell-mode/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & architecture decisions
├── data-model.md        # Component schemas, entities, FSM states
├── quickstart.md        # Setup commands, test suites, and validation scenarios
├── contracts/
│   └── hell-mode-contracts.yaml # Schema for Hell Mode, localization, and leaderboard
├── checklists/
│   └── requirements.md  # Spec quality validation checklist (16/16 pass)
└── spec.md              # Feature specification
```

### Source Code Layout

```text
src/
├── i18n/                                # Bilingual Internationalization Module
│   ├── Localization.ts                  # Typed I18n provider, string dictionaries (vi / en)
│   └── index.ts                         # Public exports & active locale singleton
├── modes/
│   └── hell/                            # Decoupled Hell Mode Module
│       ├── HellConfig.ts                # 2x damage multipliers, density scalars, score rules
│       ├── HellSplines.ts               # Wave 2 dual pincer & Wave 3 cross-fire Bézier curves
│       ├── HellWaveSystem.ts            # 3-wave campaign manager implementing GameSystem
│       ├── HellBossSystem.ts            # Void Dreadnought FSM, radial/spiral danmaku pool
│       ├── HellLeaderboardClient.ts     # Segregated "HELL RANKINGS" storage adapter
│       ├── HellDirector.ts              # Pluggable mode orchestrator implementing GameSystem
│       └── ui/
│           ├── BossHealthBar.ts         # Dedicated top-viewport boss vitality display
│           └── HellVictoryScreen.ts     # Stage Victory banner, clear time & Hell emblem
├── core/                                # Untouched Core Engine
│   ├── Game.ts                          # Preserved GameSystem interface
│   ├── EventBus.ts                      # Preserved publish-subscribe dispatcher
│   └── SpatialGrid.ts                   # Preserved 64x64 spatial partitioning
├── ecs/                                 # Preserved Core ECS & Pools
│   ├── Component.ts
│   ├── Entity.ts
│   └── Pool.ts
├── systems/                             # Preserved Standard Mode Systems (Untouched)
├── audio/                               # Sound Subsystem
│   └── SoundSynthesizer.ts              # Enhanced with boss alert & heavy explosion SFX
├── main.ts                              # Mode selection wiring (STANDARD vs HELL) & language pill
└── index.html                           # Canvas container shell
```

**Structure Decision**: Clean modular extension (`src/modes/hell/` and `src/i18n/`) leaving all standard mode classes untouched. Both modes share the high-performance core engine and ECS primitives via the `GameSystem` contract.

## Complexity Tracking

> **No Constitution violations detected.** The architecture strictly complies with Principles I through V. Zero complexity exemptions required.
