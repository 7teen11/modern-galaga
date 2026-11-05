---
description: "Task list for Core Space Shooter Gameplay Mechanics implementation"
---

# Tasks: Core Space Shooter Gameplay Mechanics

**Input**: Design documents from `/specs/001-space-shooter-core/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [constitution.md](../../.specify/memory/constitution.md)  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, build tools, canvas shell, and fundamental math utilities.

- [X] T001 Initialize Vite 6 + TypeScript 5.7+ project structure, configurations, and Vitest test runner in `package.json`, `tsconfig.json`, and `vite.config.ts`
- [X] T002 [P] Configure HTML5 canvas shell with Retina high-DPI scaling (`window.devicePixelRatio`) and arcade styling in `index.html` and `src/style.css`
- [X] T003 [P] Implement 2D vector utility with normalized diagonal calculations ($1/\sqrt{2} \approx 0.7071$) in `src/utils/Vector2.ts`
- [X] T004 [P] Implement cubic Bézier spline calculation utilities for curved flight paths in `src/utils/Spline.ts`

---

## Phase 2: Foundational (Blocking Architecture & Object Pools)

**Purpose**: Core engine infrastructure, ECS foundation, pre-warmed object pools, and spatial partitioning that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement decoupled publish-subscribe EventBus matching `contracts/game-events.json` in `src/core/EventBus.ts`
- [X] T006 [P] Define core ECS entity manager and component interfaces matching `data-model.md` in `src/ecs/Component.ts` and `src/ecs/Entity.ts`
- [X] T007 Implement generic pre-warmed Typed Object Pool with zero-allocation recycling routines in `src/ecs/Pool.ts`
- [X] T008 [P] Implement 2D Spatial Hash Grid partitioning ($64 \times 64$ px cells) for $O(N)$ broadphase collision queries in `src/core/SpatialGrid.ts`
- [X] T009 Implement main Game loop with fixed-step 60 Hz kinematic update, delta-time clamping, and Canvas 2D render context in `src/core/Game.ts`
- [X] T010 [P] Unit tests for object pool pre-warming, acquire/release, and zero-allocation recycling in `tests/unit/pools.test.ts`
- [X] T011 [P] Unit tests for vector math and 2D spatial grid queries in `tests/unit/physics.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Responsive 8-Directional Flight & Basic Firing (Priority: P1) 🎯 MVP

**Goal**: Deliver fluid 8-directional player ship piloting with normalized diagonal speed, viewport boundary clamping, and continuous primary weapon firing.

**Independent Test**: Pilot the ship across the screen using WASD / Arrow keys; verify smooth 8-directional motion, normalized diagonal speed, clamped boundaries, and continuous blaster bullets firing when holding Space.

### Tests for User Story 1
- [X] T012 [P] [US1] Unit and integration test for player 8-directional movement, normalized speed, and continuous bullet firing in `tests/unit/player-movement.test.ts`

### Implementation for User Story 1
- [X] T013 [P] [US1] Create player ship components (`TransformComponent`, `RenderComponent`, `HitboxComponent`, `WeaponComponent`) in `src/components/PlayerComponents.ts`
- [X] T014 [P] [US1] Implement keyboard/gamepad 8-directional input handler with normalized diagonal speed in `src/systems/InputSystem.ts`
- [X] T015 [US1] Implement kinematic velocity integration and canvas viewport border clamping in `src/systems/MovementSystem.ts`
- [X] T016 [US1] Implement primary weapon firing system with fire-rate cooldown and bullet retrieval from `PlayerBulletPool` (capacity: 50) in `src/systems/WeaponSystem.ts`
- [X] T017 [US1] Implement Canvas 2D player ship and projectile rendering with additive laser glow in `src/systems/RenderSystem.ts`

**Checkpoint**: User Story 1 is fully functional and delivers an independently testable MVP flight & firing slice.

---

## Phase 4: User Story 2 - Wave-Based Enemies with Diverse Tactical Behaviors (Priority: P1)

**Goal**: Deliver structured enemy wave arrivals with multi-point Bézier spline swooping entries in squads of 4–6, grid formation hovering, and distinct attack dive behaviors for Scout, Fighter, and Commander archetypes.

**Independent Test**: Trigger wave spawn; verify enemy squads swoop in along curved paths into formation, peel off into dive attacks toward the player, and take damage/destroy when shot.

### Tests for User Story 2
- [X] T018 [P] [US2] Unit test for Bézier spline flight path progression and enemy state transitions in `tests/unit/splines.test.ts`

### Implementation for User Story 2
- [X] T019 [P] [US2] Create enemy data components (`EnemyBehaviorComponent`, `EnemyState`) with archetype attributes in `src/components/EnemyBehavior.ts`
- [X] T020 [US2] Implement enemy pre-warmed pool (capacity: 60) for Scout, Fighter, and Commander archetypes in `src/ecs/EnemyPool.ts`
- [X] T021 [US2] Implement Bézier curve trajectory evaluator in `src/systems/MovementSystem.ts` to navigate entering squads (4–6 units) from off-screen margins into formation slots
- [X] T022 [US2] Implement tactical behavioral FSM (formation hovering, peeling dive-bombs, aimed projectile fire) in `src/systems/EnemySystem.ts`
- [X] T023 [US2] Implement enemy wave sequencing and progressive spawn coordinator in `src/systems/WaveSpawnSystem.ts`

**Checkpoint**: User Stories 1 AND 2 operate together: player can dogfight against entering squads and diving enemy formations.

---

## Phase 5: User Story 3 - Multi-Life Stock with Health Bar & Damage Feedback (Priority: P2)

**Goal**: Deliver a forgiving 3-life vitality stock where each life has a full health bar, responsive damage feedback, 0.5s damage blinking, 2.5s post-respawn invulnerability at bottom-center, and a 40–50% cockpit core hitbox allowing wing grazing.

**Independent Test**: Take hits to the ship; verify health bar depletes, wing grazing causes 0 damage, losing all health decrements life count from 3 to 2, respawns with 2.5s flashing invulnerability, and 0 lives triggers Game Over.

### Tests for User Story 3
- [X] T024 [P] [US3] Unit test for core hitbox grazing vs lethal cockpit hits and multi-life respawn logic in `tests/unit/collision-health.test.ts`

### Implementation for User Story 3
- [X] T025 [P] [US3] Create `HealthComponent` tracking 3 lives, active health bar (100 HP), and invulnerability timers in `src/components/Health.ts`
- [X] T026 [US3] Implement narrowphase collision detector with 40–50% cockpit core hitbox and wingtip grazing tolerance in `src/systems/CollisionSystem.ts`
- [X] T027 [US3] Implement health damage resolution, 0.5s hit damage blinking, and 2.5s post-respawn invulnerability at bottom-center in `src/systems/HealthSystem.ts`
- [X] T028 [US3] Implement HUD rendering for dynamic health bar, lives stock counter, and Game Over trigger upon 0 lives in `src/ui/HUD.ts`

**Checkpoint**: Player survival loop is complete with fair hitboxes, readable health, multi-life stocks, and game over states.

---

## Phase 6: User Story 4 - In-Run Weapon Upgrades & Power-Up Drops (Priority: P2)

**Goal**: Deliver collectible weapon upgrade tokens dropped by defeated elite Commanders that dynamically elevate firing patterns across 3 tiers (Single $\rightarrow$ Dual Parallel $\rightarrow$ Triple Spread) during a run, resetting to Tier 1 on life loss.

**Independent Test**: Defeat an elite Commander; verify glowing token drops, collecting it upgrades weapon from Tier 1 to Tier 2 and Tier 3, collecting surplus tokens at Tier 3 grants 1,000 bonus points, and losing a life resets back to Tier 1.

### Tests for User Story 4
- [X] T029 [P] [US4] Unit test for weapon tier progression, surplus bonus scoring, and life-loss tier reset in `tests/unit/weapon-upgrade.test.ts`

### Implementation for User Story 4
- [X] T030 [P] [US4] Create `PowerUpComponent` and pre-warmed `PowerUpPool` (capacity: 20) in `src/components/PowerUp.ts`
- [X] T031 [US4] Implement elite Commander defeat drop logic with downward floating tokens in `src/systems/DropSystem.ts`
- [X] T032 [US4] Implement player ship power-up pickup collision and 3-tier weapon upgrade transitions (Single $\rightarrow$ Dual $\rightarrow$ Triple Spread) in `src/systems/WeaponSystem.ts`
- [X] T033 [US4] Implement 1,000 bonus score award for max-tier surplus pickups and reset to Tier 1 upon life loss in `src/systems/WeaponSystem.ts`

**Checkpoint**: Weapon progression loop is fully functional, giving players ramped-up firepower to conquer denser swarms.

---

## Phase 7: User Story 5 - Real-Time Scoring & Endless Survival Progression (Priority: P3)

**Goal**: Deliver real-time score accumulation based on enemy archetype point values and wave completion bonuses, endless difficulty scaling (+10% enemy speed/frequency per wave), local storage caching, and leaderboards.

**Independent Test**: Defeat enemies and clear waves; verify real-time HUD score increment, wave completion bonuses, endless scaling difficulty, high score persistence in `localStorage`, and submission via `LeaderboardClient`.

### Tests for User Story 5
- [X] T034 [P] [US5] Integration test for endless wave score accumulation and high-score local persistence in `tests/integration/scoring.test.ts`

### Implementation for User Story 5
- [X] T035 [P] [US5] Implement `ScoreState` tracking real-time points, wave clear bonuses, and session high score in `src/core/ScoreManager.ts`
- [X] T036 [US5] Implement endless difficulty scaler (+10% enemy speed, attack density per wave) in `src/systems/WaveSpawnSystem.ts`
- [X] T037 [P] [US5] Implement `StorageService` for local browser persistence of high score and wave record in `src/services/StorageService.ts`
- [X] T038 [US5] Implement `LeaderboardClient` matching `contracts/leaderboard-api.yaml` with anti-cheat session token in `src/services/LeaderboardClient.ts`
- [X] T039 [US5] Implement Game Over screen with final score summary, wave reached, and high-score badge in `src/ui/GameOverScreen.ts`

**Checkpoint**: Complete arcade competition loop with real-time scoring, endless difficulty progression, and leaderboard submission.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: High-fidelity visual juice (VFX), procedural audio synthesis, user accessibility settings, and end-to-end verification.

- [X] T040 [P] Implement procedural sound synthesizer using Web Audio API (lasers, hits, explosions, power-up jingles) in `src/audio/SoundSynthesizer.ts`
- [X] T041 Implement Neon Arcade VFX system with pooled particle sparks, 1-frame white hit-flashes, and micro screen-shake (<0.2s) in `src/systems/VFXSystem.ts`
- [X] T042 [P] Implement Settings modal with audio volume controls and screen-shake intensity slider for accessibility in `src/ui/SettingsModal.ts`
- [X] T043 Implement application bootstrap, asset preloading, and Game FSM state wiring in `src/main.ts`
- [X] T044 Execute quickstart scenarios and 60 FPS peak-load performance validation per `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS ALL USER STORIES**.
- **User Story 1 (Phase 3 - P1)**: Depends on Phase 2. Core flight and firing MVP.
- **User Story 2 (Phase 4 - P1)**: Depends on Phase 2 and Phase 3 (shares movement and render loop).
- **User Story 3 (Phase 5 - P2)**: Depends on Phase 3 and Phase 4 (vitality requires enemy threats).
- **User Story 4 (Phase 6 - P2)**: Depends on Phase 3, 4, 5 (upgrades drop from Commanders, reset on life loss).
- **User Story 5 (Phase 7 - P3)**: Depends on Phase 3, 4, 5 (scoring aggregates combat events).
- **Polish (Phase 8)**: Depends on all user stories being functionally complete.

### Parallel Opportunities
- In Phase 1: `T002`, `T003`, `T004` can run in parallel.
- In Phase 2: `T006`, `T008`, `T010`, `T011` can run in parallel once `T005`, `T007` are established.
- In User Story 1: `T012` (test), `T013` (components), `T014` (input) can run in parallel.
- In User Story 2: `T018` (test), `T019` (components) can run in parallel.
- In User Story 3: `T024` (test), `T025` (components) can run in parallel.
- In User Story 4: `T029` (test), `T030` (components/pool) can run in parallel.
- In User Story 5: `T034` (test), `T035` (score state), `T037` (storage service) can run in parallel.
- In Phase 8: `T040` (audio synth) and `T042` (settings modal) can run in parallel.

---

## Implementation Strategy: MVP First

1. **Step 1: Setup & Foundation (Phases 1 & 2)**
   - Build build tools, vector math, pre-warmed object pools, and spatial hash grid.
2. **Step 2: Deliver Core MVP (Phase 3 - User Story 1)**
   - Implement 8-direction ship movement and continuous blaster firing.
   - **Validate**: Ship maneuvers smoothly at 60 FPS with normalized diagonal speed.
3. **Step 3: Add Combat Challenges (Phase 4 - User Story 2)**
   - Add Bézier spline squad entries and 3 enemy archetypes.
4. **Step 4: Add Survival Stakes (Phase 5 - User Story 3)**
   - Add 3 lives, health bar, grazing hitboxes, and game over flow.
5. **Step 5: Add Weapon Ramp & High Scores (Phases 6 & 7)**
   - Add weapon drops (3 tiers) and real-time score tracking.
6. **Step 6: Polish (Phase 8)**
   - Add neon particles, screen shake, audio synthesis, and verify 60 FPS frame budget.


---

## Phase 9: Convergence

- [X] T045 CRITICAL: Implement visual quality presets (`HIGH` vs `PERFORMANCE` mode scaling particle counts and additive bloom) in `src/services/StorageService.ts`, `src/ui/SettingsModal.ts`, `src/systems/VFXSystem.ts`, and `src/systems/RenderSystem.ts` per Constitution I & Performance Standards (missing)
- [X] T046 CRITICAL: Implement toggleable runtime debug overlay (`F3` / backtick key) displaying live FPS, frame step duration, and active/free/peak usage across all 5 object pools in `src/ui/HUD.ts` and `src/main.ts` per Constitution IV & plan: Object Pooling (partial)
- [X] T047 Connect `reducedFlash` accessibility toggle to suppress white hit-flashes in `src/systems/RenderSystem.ts` and trigger micro screen-shake on non-lethal player damage (`ENTITY_DAMAGED`) in `src/systems/VFXSystem.ts` per FR-016, SC-007 & US3/AC1 (partial)
- [X] T048 Add HTML5 Gamepad API polling (`navigator.getGamepads()`) for D-pad/analog stick 8-directional movement and primary fire button in `src/systems/InputSystem.ts` per T014 & spec: Assumptions (partial)
