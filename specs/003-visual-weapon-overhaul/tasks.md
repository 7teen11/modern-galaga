---
description: "Task list for Modern 2D Web Game Visual & 5-Tier Weapon Overhaul"
---

# Tasks: Modern 2D Web Game Visual & 5-Tier Weapon Overhaul

**Input**: Design documents from `/specs/003-visual-weapon-overhaul/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [data-model.md](./data-model.md), [contracts/weapon-visual-contracts.yaml](./contracts/weapon-visual-contracts.yaml), [quickstart.md](./quickstart.md), [constitution.md](../../.specify/memory/constitution.md)  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Data Structures & Configurations)

**Purpose**: Establish core data models, configuration schemas, and interfaces for 5 weapon tiers, parallax layers, and neon enemy variants.

- [X] T001 Update component interfaces for 5 weapon tiers (`WeaponTier = 1 | 2 | 3 | 4 | 5`) and piercing projectile fields (`isPiercing?: boolean`, `penetratedEntityIds?: number[]`) in `src/ecs/Component.ts`
- [X] T002 [P] Implement declarative 5-tier weapon configuration, stream metrics, bullet geometries, and audio tones in `src/components/WeaponTierConfig.ts`
- [X] T003 [P] Implement enemy neon color palettes, squad role themes, and thruster flame configurations in `src/components/EnemyVariants.ts`
- [X] T004 [P] Implement 3-layer parallax starfield, nebula clouds, and cosmic dust particle data structures in `src/components/ParallaxState.ts`

---

## Phase 2: Foundational (ECS Pools & Piercing Mechanics Core)

**Purpose**: Core engine updates for bullet penetration physics and pre-warmed pool support that all user stories depend on.

**⚠️ CRITICAL**: Must complete before any user story can be implemented.

- [X] T005 [P] Unit tests for 5-tier weapon configuration contracts and stream geometries in `tests/unit/weapon-5tier.test.ts`
- [X] T006 Extend `PooledBullet` and bullet pool acquisition/reset logic to support penetration tracking without runtime allocations in `src/systems/WeaponSystem.ts`
- [X] T007 Implement armor-piercing projectile collision resolution (penetrating enemies without immediate recycling) in `src/systems/CollisionSystem.ts`

**Checkpoint**: Core foundational data structures and collision mechanics ready for user stories.

---

## Phase 3: User Story 1 - 5-Tier Weapon Progression & Escalating Visual Impact (Priority: P1) 🎯 MVP

**Goal**: Deliver a 5-tier weapon progression system where every tier upgrade transforms projectile models, stream patterns, radiant energy colors, and firepower.

**Independent Test**: Collect weapon upgrade tokens sequentially from Tier 1 to Tier 5; verify bullet shape, stream count, color shifts (Cyan $\rightarrow$ Emerald $\rightarrow$ Amber $\rightarrow$ Violet $\rightarrow$ Crimson), and +2,000 Overcharge bonus at max tier.

### Tests for User Story 1
- [X] T008 [P] [US1] Unit tests for 5-tier progression, fire cooldowns, stream geometry offsets, and surplus overcharge bonus in `tests/unit/weapon-5tier.test.ts`

### Implementation for User Story 1
- [X] T009 [US1] Implement 5-tier volley spawning, spread angles ($\pm 12^\circ$ for T3, $\pm 7^\circ$ for T4, $\pm 15^\circ$ for T5), and cooldown timings in `src/systems/WeaponSystem.ts`
- [X] T010 [US1] Implement distinct procedural vector bullet rendering with radiant glow and beam geometry for all 5 tiers in `src/systems/RenderSystem.ts`
- [X] T011 [US1] Implement multi-frequency procedural audio synthesizer laser tones scaling from Tier 1 through Tier 5 in `src/audio/SoundSynthesizer.ts`
- [X] T012 [US1] Implement +2,000 Overcharge score bonus and radial projectile-clearing pulse (80px radius) when collecting tokens at Tier 5 in `src/systems/DropSystem.ts`
- [X] T013 [US1] Implement HUD weapon tier badge (T1–T5 visual icons) and tier ascension flash animation in `src/ui/HUD.ts`

**Checkpoint**: User Story 1 is fully functional and delivers an independently playable MVP slice of 5-tier weapon gameplay.

---

## Phase 4: User Story 2 - Vibrant Multi-Color Enemy Fleet & Role Telegraphing (Priority: P2)

**Goal**: Transform enemy armada visuals with high-contrast neon palettes for Scouts, Fighters, and Commanders, dynamic animated thrusters, and balanced token drop rates.

**Independent Test**: Spawn enemy squads across Waves 1–3; verify distinct neon color schemes by squad role, velocity-stretching thruster flames, colored impact shrapnel, and 100% Commander / 20% Fighter upgrade token drops.

### Tests for User Story 2
- [X] T014 [P] [US2] Unit tests for enemy neon variant assignments and token drop probabilities (100% Commander, 20% Fighter) in `tests/unit/token-drops.test.ts`

### Implementation for User Story 2
- [X] T015 [US2] Implement procedural multi-color rendering for Scout (Cyan/Amber/Lime), Fighter (Magenta/Orange/Cobalt), and Commander (Gold/Purple) in `src/systems/RenderSystem.ts`
- [X] T016 [US2] Implement dynamic animated engine thruster flame rendering with speed-proportional stretching behind enemy hulls in `src/systems/RenderSystem.ts`
- [X] T017 [US2] Implement hit-flash and matching neon shrapnel particle burst generation upon enemy damage/destruction in `src/systems/HealthSystem.ts` and `src/systems/VFXSystem.ts`
- [X] T018 [US2] Implement 100% Commander and 20% Fighter weapon upgrade token drop probability in `src/systems/HealthSystem.ts`

**Checkpoint**: User Stories 1 and 2 operate together: players battle vivid neon enemy squads while advancing through 5 weapon tiers.

---

## Phase 5: User Story 3 - Modern 2D Web Arcade Interface & Parallax Starfield (Priority: P3)

**Goal**: Deliver a 3-layer parallax scrolling starfield, player ship banking tilt ($15^\circ$), and a professional 2D arcade layout adhering to `d-game-development/SKILL.md`.

**Independent Test**: Launch game; verify continuous 3-layer parallax scrolling at independent speeds, test left/right steering to observe smooth banking tilt, and verify zero layer overlap between HUD, Canvas, and Modals.

### Tests for User Story 3
- [X] T019 [P] [US3] Unit tests for 3-layer parallax scrolling speeds and ship banking tilt angles in `tests/unit/parallax-visuals.test.ts`

### Implementation for User Story 3
- [X] T020 [US3] Implement `ParallaxSystem` rendering distant stars ($25\text{ px/s}$), procedural nebulae ($60\text{ px/s}$), and cosmic dust ($140\text{ px/s}$) in `src/systems/ParallaxSystem.ts`
- [X] T021 [US3] Implement smooth player ship banking tilt rotation (up to $\pm 15^\circ$) and wingtip vortex trails during lateral maneuvers in `src/systems/MovementSystem.ts` and `src/systems/RenderSystem.ts`
- [X] T022 [US3] Wire `ParallaxSystem` into application lifecycle and verify strict Z-order layer separation in `src/main.ts`

**Checkpoint**: User Stories 1, 2, and 3 create an immersive, responsive 2D arcade atmosphere with depth and fluid controls.

---

## Phase 6: User Story 4 - High-Tier Weapon Mechanics & Tactile Power Delivery (Priority: P4)

**Goal**: Deliver tactile supremacy for higher tiers including Tier 5 twin central armor-piercing hyper beams, micro screen shake feedback, and fair life loss tier degradation ($\max(1, \text{Tier} - 1)$).

**Independent Test**: Fire Tier 5 weapons through multiple stacked enemy ranks to confirm penetration; verify micro-shake on trigger; verify dying at Tier 5 respawns at Tier 4.

### Tests for User Story 4
- [X] T023 [P] [US4] Unit tests for Tier 5 armor-piercing beam penetration and life loss tier degradation in `tests/unit/piercing-projectiles.test.ts` and `tests/unit/life-loss-penalty.test.ts`

### Implementation for User Story 4
- [X] T024 [US4] Implement player life loss weapon tier degradation ($\max(1, \text{currentTier} - 1)$) upon ship destruction in `src/systems/HealthSystem.ts`
- [X] T025 [US4] Implement tactile micro screen shake (intensity: 1.5–2.5px, duration: 60–100ms) and ship recoil kickback on Tier 4/5 discharge in `src/systems/WeaponSystem.ts` and `src/systems/VFXSystem.ts`

**Checkpoint**: All 4 user stories are fully integrated: supreme tactile weapon power, multi-color armada, depth parallax, and balanced arcade progression.

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Performance benchmarking, accessibility compliance, regression audit, and production build validation.

- [X] T026 [P] Integration test simulating 60 FPS Danmaku, 5-tier weapons, multi-color enemies, and parallax peak load frame budget ($\le 16.67\text{ ms}$) in `tests/integration/visual-overhaul-performance.test.ts`
- [X] T027 Verify visual accessibility options (Reduced Flash & Visual Quality presets) attenuating high-tier muzzle blooms in `src/systems/RenderSystem.ts` and `src/systems/VFXSystem.ts`
- [X] T028 Execute full regression test suite verifying all 71 existing unit & integration tests pass with zero regression
- [X] T029 Execute production build (`npm run build`) and verify zero TypeScript compilation errors and bundle size $< 150\text{ KB}$ in `package.json` and `dist/`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS ALL USER STORIES**.
- **User Story 1 (Phase 3 - P1)**: Depends on Phase 2. Delivers core MVP.
- **User Story 2 (Phase 4 - P2)**: Depends on Phase 2. Can run in parallel with US1 or sequentially.
- **User Story 3 (Phase 5 - P3)**: Depends on Phase 2. Parallax and ship banking tilt.
- **User Story 4 (Phase 6 - P4)**: Depends on Phase 3 (US1 weapons) and Phase 2 (collision piercing).
- **Polish (Phase 7)**: Depends on all user stories being functionally complete.

### Parallel Opportunities
- In Phase 1: `T002`, `T003`, `T004` can run in parallel after `T001`.
- In Phase 2: `T005` (test) can run in parallel with foundational implementations.
- In Phase 3: `T008` (test) runs before implementation; `T010`, `T011`, `T013` can be developed in parallel.
- In Phase 4: `T014` (test) runs before implementation; `T015`, `T016`, `T017` can be developed in parallel.
- In Phase 5: `T019` (test) runs before implementation; `T020`, `T021` can be developed in parallel.
- In Phase 6: `T023` (test) runs before implementation.
- In Phase 7: `T026` (integration test) can run in parallel with polish audit.

---

## Implementation Strategy: MVP First

1. **Step 1: Setup & Foundations (Phases 1 & 2)**
   - Define `WeaponTier = 1..5`, create `WeaponTierConfig.ts`, and add piercing projectile mechanics.
2. **Step 2: Deliver Core MVP (Phase 3 - User Story 1)**
   - Implement 5-tier volley spawning, colors, and HUD badges.
   - **Validate**: Player can collect tokens and ascend through 5 distinct tiers.
3. **Step 3: Add Living Enemy Fleet (Phase 4 - User Story 2)**
   - Implement multi-color neon variants and dynamic thruster flames.
4. **Step 4: Add Parallax Canvas & Maneuver Tilt (Phase 5 - User Story 3)**
   - Implement 3-layer parallax starfield and $15^\circ$ ship banking tilt.
5. **Step 5: High-Tier Armor Piercing & Tactile Feedback (Phase 6 - User Story 4)**
   - Implement Tier 5 central beam penetration, micro-shake, and Tier - 1 life loss penalty.
6. **Step 6: Polish & Performance Verification (Phase 7)**
   - Verify 60 FPS Danmaku frame budget, test accessibility toggles, confirm zero regressions, and verify bundle $< 150\text{ KB}$.


---

## Phase 8: Convergence

- [X] T030 Render floating "+2,000 OVERCHARGE" indicator and expanding 80px radial energy wave ring on max-tier token pickup in `src/ui/HUD.ts` and `src/systems/RenderSystem.ts` per US1/AC3 (partial)
