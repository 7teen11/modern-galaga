---
description: "Task list for Hell Mode & Internationalization implementation (Independent Module)"
---

# Tasks: Hell Mode & Internationalization

**Input**: Design documents from `/specs/002-hell-mode/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [constitution.md](../../.specify/memory/constitution.md)  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task includes an exact file path

---

## Phase 1: Setup (Module Scaffolding & Bilingual Localization)

**Purpose**: Establish independent directory structure `src/modes/hell/` and zero-dependency bilingual localization system (`vi` / `en`).

- [X] T001 Create directory structure for independent Hell Mode module in `src/modes/hell/`, `src/modes/hell/ui/`, and `src/i18n/`
- [X] T002 [P] Unit tests for bilingual dictionary token resolution, locale switching, and fallback in `tests/unit/localization.test.ts`
- [X] T003 [P] Implement zero-dependency bilingual localization dictionary (Vietnamese & English) and `LocalizationService` in `src/i18n/Localization.ts` and `src/i18n/index.ts`
- [X] T004 [P] Implement Hell Mode rule configurations, 2x damage multipliers, density scalars, and contracts in `src/modes/hell/HellConfig.ts`

---

## Phase 2: Foundational (Modular Mode Director & Zero-Mutation Architecture)

**Purpose**: Core infrastructure that integrates Hell Mode as a pluggable `GameSystem` without mutating existing Standard Mode classes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Unit tests for Hell Mode session rule initialization and 2x damage scaling in `tests/unit/hell-mode-rules.test.ts`
- [X] T006 Implement `HellDirector` implementing core `GameSystem` interface (`update`, `render`) to orchestrate the independent mode in `src/modes/hell/HellDirector.ts`
- [X] T007 Implement Title Screen mode selector (`STANDARD MODE` vs `HELL MODE`) and language toggle pill (`[ VI | EN ]`) in `src/modes/hell/ui/ModeSelectorUI.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Hell Mode Selection & High-Lethality Combat (Priority: P1) 🎯 MVP

**Goal**: Deliver selectable Hell Mode from the menu featuring double enemy damage (40 HP bullets, 70 HP collisions), +50% enemy volume, and distinct crimson HUD ambiance.

**Independent Test**: Launch game, toggle Hell Mode at Title Screen; verify crimson HUD accents, verify enemy bullets inflict 40 HP damage and collisions inflict 70 HP damage, and verify enemy squads spawn +50% units.

### Tests for User Story 1
- [X] T008 [P] [US1] Unit and integration test for Hell Mode state activation and 2x damage resolution in `tests/unit/hell-damage.test.ts`

### Implementation for User Story 1
- [X] T009 [US1] Implement 2x damage multiplier interceptor and Hell combat rules in `src/modes/hell/HellDamageSystem.ts`
- [X] T010 [US1] Implement Hell Mode HUD visual styling with crimson tactical borders and "HELL" threat indicator in `src/modes/hell/ui/HellHUDTheme.ts`

**Checkpoint**: User Story 1 is fully functional and delivers an independently testable MVP slice of high-lethal combat.

---

## Phase 4: User Story 2 - Distinct Pincer & Cross-Fire Wave Entry Choreography (Priority: P1)

**Goal**: Deliver a 3-wave campaign with exclusive Bézier entry paths: Wave 2 dual-squad simultaneous lateral pincer swoops and Wave 3 intersecting diagonal cross-fire sweeps.

**Independent Test**: Play through Waves 1 to 3 in Hell Mode; verify Wave 2 squads swoop simultaneously from left and right margins, and Wave 3 squads sweep across intersecting diagonals while firing suppression shots.

### Tests for User Story 2
- [X] T011 [P] [US2] Unit test for Wave 2 dual pincer and Wave 3 cross-fire Bézier spline paths in `tests/unit/hell-splines.test.ts`

### Implementation for User Story 2
- [X] T012 [P] [US2] Implement Wave 2 dual lateral pincer and Wave 3 diagonal cross-fire Bézier spline curves in `src/modes/hell/HellSplines.ts`
- [X] T013 [US2] Implement 3-wave campaign sequencer (+50% swarm density, custom squad entry dispatch) in `src/modes/hell/HellWaveSystem.ts`

**Checkpoint**: User Stories 1 AND 2 operate together: players battle through dense, complex entrance choreographies with 2x damage stakes.

---

## Phase 5: User Story 3 - Climax Boss Encounter with Dedicated Boss Health Bar & 2-Phase Danmaku (Priority: P2)

**Goal**: Deliver the Void Dreadnought flagship Boss (1,200 HP) emerging at the climax of Wave 3 with a dedicated top-viewport health bar, 16-way radial/spread danmaku in Phase 1, Phase 2 Enrage (<50% HP) with +25% speed, continuous spiral streams, and 2 Fighter escorts dropping weapon upgrades.

**Independent Test**: Clear Wave 3; verify boss warning siren, emergence of Void Dreadnought with dedicated health bar, 16-way radial and spread barrages, Phase 2 Enrage shift at ≤600 HP with spiral streams and escort summons, and Stage Victory upon boss defeat.

### Tests for User Story 3
- [X] T014 [P] [US3] Unit test for Void Dreadnought danmaku emission, Phase 2 Enrage state transition, and escort weapon recovery drops in `tests/unit/boss-danmaku.test.ts`

### Implementation for User Story 3
- [X] T015 [US3] Implement dedicated pre-warmed `BossBulletPool` (capacity: 160, `RECYCLE_OLDEST`, zero runtime heap allocations) in `src/modes/hell/HellBossPool.ts`
- [X] T016 [US3] Implement Void Dreadnought procedural vector rendering, audiovisual warning alert, and multi-stage sequential explosion FX in `src/modes/hell/ui/HellBossRenderer.ts`
- [X] T017 [US3] Implement dedicated top-viewport Boss Health Bar displaying remaining HP ratio and Phase 2 crimson enrage state in `src/modes/hell/ui/BossHealthBar.ts`
- [X] T018 [US3] Implement `HellBossSystem` FSM (Phase 1: 16-way radial rings + 7-way spread fans, Phase 2 Enrage: +25% speed, spiral streams, 2 Fighter escorts) in `src/modes/hell/HellBossSystem.ts`
- [X] T019 [US3] Implement Stage Victory celebration screen with clear time, score bonus, and return-to-menu prompt in `src/modes/hell/ui/HellVictoryScreen.ts`

**Checkpoint**: Climax Boss battle is fully playable, featuring intense Danmaku patterns and complete stage victory resolution.

---

## Phase 6: User Story 4 - Dedicated Hell Mode Leaderboard & Clear Time Tracking (Priority: P3)

**Goal**: Deliver a segregated "HELL RANKINGS" leaderboard category tracking pilot names, departments, clear times (`MM:SS.mmm`), scores, and the "🔥 HELL" prestige emblem.

**Independent Test**: Complete a Hell Mode run (Victory or Game Over); verify score and clear time route to the dedicated Hell leaderboard in local storage, and verify tab switching between Standard and Hell rankings in the leaderboard modal.

### Tests for User Story 4
- [X] T020 [P] [US4] Unit test for segregated Hell Rankings storage, millisecond clear time formatting, and anti-cheat session verification in `tests/unit/hell-leaderboard.test.ts`

### Implementation for User Story 4
- [X] T021 [US4] Implement segregated "HELL RANKINGS" storage adapter and leaderboard client matching `contracts/hell-mode-contracts.yaml` in `src/modes/hell/HellLeaderboardClient.ts`
- [X] T022 [US4] Implement Leaderboard modal tab switcher (`[STANDARD] | [HELL RANKINGS]`) and pilot "🔥 HELL" badge display in `src/modes/hell/ui/HellLeaderboardModal.ts`

**Checkpoint**: Arcade competition loop is complete with distinct Hell Mode records, speedrun timings, and leaderboards.

---

## Phase 7: Polish, Integration & Cross-Cutting Verification

**Purpose**: Application integration, bilingual UI wiring, performance verification under peak Danmaku, and zero-regression audit.

- [X] T023 [P] Integration test simulating complete 3-wave Hell Campaign, Boss defeat, and 60 FPS Danmaku frame budget in `tests/integration/hell-campaign.test.ts`
- [X] T024 Wire Hell Mode module, Mode Selector, and bilingual language toggle into application bootstrap `src/main.ts` without modifying existing core classes
- [X] T025 Execute regression test suite verifying all 38 existing tests in `001-space-shooter-core` continue to pass without regression
- [X] T026 Execute production build (`npm run build`) and verify zero TypeScript compilation errors and bundle size < 150 KB

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS ALL USER STORIES**.
- **User Story 1 (Phase 3 - P1)**: Depends on Phase 2. Core Hell Mode rules & MVP.
- **User Story 2 (Phase 4 - P1)**: Depends on Phase 2 and Phase 3 (3-wave campaign progression).
- **User Story 3 (Phase 5 - P2)**: Depends on Phase 2, 3, and 4 (Boss appears at climax of Wave 3).
- **User Story 4 (Phase 6 - P3)**: Depends on Phase 3 and Phase 5 (records Victory and clear times).
- **Polish (Phase 7)**: Depends on all user stories being functionally complete.

### Parallel Opportunities
- In Phase 1: `T002`, `T003`, `T004` can run in parallel.
- In Phase 2: `T005` (test) and `T007` (UI) can run in parallel.
- In User Story 1: `T008` (test) can run in parallel before implementation.
- In User Story 2: `T011` (test) and `T012` (splines) can run in parallel.
- In User Story 3: `T014` (test), `T015` (pool), `T016` (renderer), `T017` (health bar) can run in parallel.
- In User Story 4: `T020` (test) and `T021` (storage) can run in parallel.
- In Phase 7: `T023` (integration test) can run in parallel with polish tasks.

---

## Implementation Strategy: MVP First

1. **Step 1: Setup & Foundation (Phases 1 & 2)**
   - Build bilingual dictionary (`vi` / `en`), Hell config, and `HellDirector` implementing `GameSystem`.
2. **Step 2: Deliver Core MVP (Phase 3 - User Story 1)**
   - Implement Title Screen mode toggle and 2x damage hazard multiplier.
   - **Validate**: Player can launch Hell Mode and experience immediate 2x damage threat.
3. **Step 3: Add 3-Wave Campaign (Phase 4 - User Story 2)**
   - Add Wave 2 dual lateral pincer swoops and Wave 3 diagonal cross-fire sweeps with +50% swarm density.
4. **Step 4: Add Climax Boss Danmaku (Phase 5 - User Story 3)**
   - Add Void Dreadnought, pre-warmed 160 bullet pool, 16-way radial bursts, Phase 2 Enrage, and Stage Victory.
5. **Step 5: Add Dedicated Leaderboard (Phase 6 - User Story 4)**
   - Add segregated "HELL RANKINGS" with clear times and "🔥 HELL" badge.
6. **Step 6: Polish & Regression Verification (Phase 7)**
   - Wire language selector, verify 60 FPS Danmaku frame budget, and confirm zero regressions on Standard Mode.

