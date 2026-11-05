# Quickstart & Integration Validation Guide: Hell Mode & Internationalization

**Feature**: `002-hell-mode` | **Date**: 2026-11-04  
**Target Platform**: Chrome, Edge, Safari, Firefox on Desktop/Laptop

---

## 1. Setup & Environment Verification

Verify prerequisites and build tools:

```bash
# Verify node packages & TypeScript version (5.7+)
npm --version

# Run all existing unit & integration test suites
npm run test

# Verify production build compilation
npm run build
```

---

## 2. Automated Test Scenarios

### Scenario 1: Hell Mode 2x Damage & Swarm Density Unit Test
- **File**: `tests/unit/hell-mode-rules.test.ts`
- **Command**: `npx vitest run tests/unit/hell-mode-rules.test.ts`
- **Expected Outcome**:
  - Enemy projectile damage in Hell Mode resolves to 40 HP (vs 20 HP in Standard Mode).
  - Enemy hull collision damage resolves to 70 HP (vs 35 HP in Standard Mode).
  - Wave enemy count multiplier verifies $\ge 1.5\times$ base squad size.

### Scenario 2: Wave 2 Pincer & Wave 3 Cross-Fire Bézier Flight Paths
- **File**: `tests/unit/hell-splines.test.ts`
- **Command**: `npx vitest run tests/unit/hell-splines.test.ts`
- **Expected Outcome**:
  - Dual pincer swoops originate from $(-40, 120)$ and $(640, 120)$ simultaneously and intersect safely without collision.
  - Cross-fire diagonal paths reach target formation slots at $t = 1.0$.

### Scenario 3: Void Dreadnought Danmaku & Phase 2 Enrage
- **File**: `tests/unit/boss-danmaku.test.ts`
- **Command**: `npx vitest run tests/unit/boss-danmaku.test.ts`
- **Expected Outcome**:
  - Boss initializes with 1,200 HP and enters Phase 1.
  - Phase 1 emits 16-way radial rings ($220\text{ px/s}$).
  - Reducing Boss HP $\le 600$ (50%) triggers Phase 2 Enrage: bullet velocity increases by +25% ($275\text{ px/s}$), continuous spiral stream activates, and 2 Fighter escorts are spawned.
  - Escort destruction awards guaranteed Weapon Upgrade drops.
  - Reducing HP to 0 triggers `STAGE_VICTORY` and neutralizes all active bullets.

### Scenario 4: Bilingual Localization (VI / EN)
- **File**: `tests/unit/localization.test.ts`
- **Command**: `npx vitest run tests/unit/localization.test.ts`
- **Expected Outcome**:
  - Switching locale between `'vi'` and `'en'` updates all dictionary tokens accurately.
  - Missing keys fallback gracefully to Vietnamese default without throwing errors.
  - Selected language persists across browser reloads via `StorageService`.

### Scenario 5: Full Hell Campaign & Danmaku Frame Budget
- **File**: `tests/integration/hell-campaign.test.ts`
- **Command**: `npx vitest run tests/integration/hell-campaign.test.ts`
- **Expected Outcome**:
  - Full 3-wave campaign simulated through Boss defeat.
  - 100+ simultaneous projectiles on screen execute with average frame duration $< 16.7\text{ ms}$ (60 FPS).
  - Score routes to dedicated `HELL RANKINGS` without altering Standard high scores.

---

## 3. Manual Browser Playtesting Scenarios

1. **Launch Local Server**:
   ```bash
   npm run dev
   ```
2. **Language Toggle Verification**:
   - On the Title Screen, click the `[ VI | EN ]` toggle button.
   - Verify all on-screen titles, instructions, and button labels update instantly to English / Vietnamese.
3. **Hell Mode Selection**:
   - Press `Tab` or click the mode selector on the Title Screen to choose `HELL MODE`.
   - Press `Enter` or `Space` to deploy.
   - Observe the crimson HUD accent and 2x damage notification.
4. **Wave Progression & Boss Battle**:
   - Clear Wave 1 (dense swarms).
   - Clear Wave 2 (observe dual pincer swoops from left and right margins).
   - Clear Wave 3 (cross-fire sweeps).
   - Hear the warning siren (`ALERT // VOID DREADNOUGHT APPROACHING`) and observe the colossal flagship Boss warping in with its dedicated health bar.
   - Dodge 16-way radial rings and spread fans. At 50% HP, observe the crimson enrage glow, spiral bullet hell, and 2 summoned escorts.
   - Destroy the boss to achieve `STAGE VICTORY`.

