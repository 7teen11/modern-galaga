# Quickstart & Verification Guide: Core Space Shooter Engine

**Feature**: `001-space-shooter-core` | **Date**: 2026-11-04

This document describes how to set up the environment, run the project, execute automated tests, and verify gameplay features end-to-end.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or higher (LTS recommended)
- **Package Manager**: `npm` (v10+) or `pnpm`
- **Modern Web Browser**: Chrome 110+, Edge 110+, Firefox 115+, or Safari 16+ (supporting Canvas 2D and Web Audio API)

---

## 2. Setup Commands

```bash
# 1. Clone/navigate to project root
cd d:\ANTI\modern-galaga

# 2. Install project dependencies (Vite, TypeScript, Vitest)
npm install

# 3. Start local development server with Hot Module Replacement (HMR)
npm run dev
```

The game client will be available locally at `http://localhost:5173`.

---

## 3. Automated Verification & Test Commands

Execute the test suite verifying math, object pools, component invariants, and collision logic:

```bash
# Run all unit and integration tests headlessly
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run test coverage report
npm run test:coverage
```

### Key Automated Test Suites
1. **`tests/unit/pools.test.ts`**:
   - Verifies pre-warming of pools to designated capacities (`PlayerBulletPool: 50`, `EnemyBulletPool: 150`, `EnemyPool: 60`, `ParticlePool: 300`).
   - Verifies that zero heap allocations (`new`) occur when recycling objects.
   - Verifies object state is cleanly reset upon release.
2. **`tests/unit/physics.test.ts`**:
   - Verifies 8-directional normalized diagonal velocity ($1/\sqrt{2}$).
   - Verifies bounding box clamping to screen borders.
   - Verifies circle-circle and circle-AABB collision math.
   - Verifies near-miss grazing (hits outside the 40–50% core hitbox do not trigger damage).
3. **`tests/unit/splines.test.ts`**:
   - Verifies cubic Bézier spline curve point calculations for enemy squad entries.
4. **`tests/integration/combat-flow.test.ts`**:
   - Simulates a full run: Wave start $\rightarrow$ Enemy entry $\rightarrow$ Hit/damage resolution $\rightarrow$ Weapon upgrade Tier 1 to Tier 3 $\rightarrow$ Life decrement $\rightarrow$ Game Over $\rightarrow$ Score persistence.

---

## 4. Manual End-to-End Gameplay Scenarios

### Scenario 1: 8-Directional Movement & Diagonal Speed
1. Open the game in the browser and start a new game.
2. Press `W`, `A`, `S`, `D` (or Arrow keys). Verify the ship moves smoothly up, left, down, and right.
3. Hold `W` + `D` (diagonal). Observe that the ship does not move noticeably faster diagonally than it does cardinally.
4. Attempt to pilot the ship off the screen edges. Verify the ship is cleanly clamped within the viewport bounds.

### Scenario 2: Enemy Wave Entry & Formations
1. At wave start, observe enemy squads (4–6 units) enter from screen margins along curved swooping trajectories.
2. Fire at entering enemies. Verify that enemies can be hit and destroyed during their entry flight loop.
3. Watch surviving enemies settle into their upper-screen formation slots and begin peeling off into dive attacks.

### Scenario 3: Weapon Upgrades & Power-Up Drops
1. Destroy a Commander (elite red/gold enemy).
2. Confirm a glowing upgrade token drops and drifts downward.
3. Fly into the token:
   - Tier 1 $\rightarrow$ Tier 2: Firing transitions from single center shot to dual parallel blasters.
   - Tier 2 $\rightarrow$ Tier 3: Firing transitions to triple spread blasters.
   - At Tier 3: Picking up another token awards an instant 1,000 bonus score.

### Scenario 4: Health Bar, Multi-Life Stock & Grazing
1. Intentionally let an enemy bullet graze the wingtip of the ship. Verify that no damage is taken and no lives are lost.
2. Take a direct hit to the ship's center cockpit. Verify:
   - Health bar decreases visibly.
   - Ship blinks white with 0.5s invulnerability.
3. Let health reach 0. Verify:
   - Ship explodes with debris particles and screen-shake.
   - Lives counter decreases from 3 to 2.
   - Ship respawns at bottom-center with 2.5s flashing invulnerability and weapon tier resets to base Tier 1.
4. Lose all 3 lives. Verify transition to Game Over screen showing final score and highest wave.

### Scenario 5: Frame-Rate & Performance Validation (Constitution Principle II)
1. Open Chrome DevTools (`F12`), switch to the **Performance** tab or press `Shift + Esc` for Chrome Task Manager.
2. Play through wave 5+ with peak enemies (30+), active bullets (100+), and explosions.
3. Confirm the FPS counter remains pinned at 60 FPS without garbage-collection hitching.

