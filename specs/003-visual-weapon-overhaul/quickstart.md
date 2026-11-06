# Quickstart Validation Guide: Modern 2D Web Game Visual & 5-Tier Weapon Overhaul

**Feature**: `003-visual-weapon-overhaul`  
**Status**: Ready for Implementation  
**Prerequisites**: [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/weapon-visual-contracts.yaml](./contracts/weapon-visual-contracts.yaml)

---

## 1. Automated Test Execution Scenarios

### Scenario 1: 5-Tier Weapon Progression & Geometries
Verify that the weapon system ascends sequentially through 5 distinct tiers with exact geometry, stream count, and colors.
```bash
npx vitest run tests/unit/weapon-5tier.test.ts
```
**Expected Outcome**:
- Tier 1: 1 cyan stream ($4\times 16\text{px}$)
- Tier 2: 2 emerald streams ($6\times 18\text{px}$)
- Tier 3: 3 amber streams ($8\times 20\text{px}$) with $\pm 12^\circ$ fan
- Tier 4: 4 violet streams ($10\times 24\text{px}$)
- Tier 5: 5 crimson streams ($14\times 32\text{px}$) with twin central piercing beams
- Collecting tokens at Tier 5 triggers +2,000 Overcharge bonus and bullet clearing pulse.

---

### Scenario 2: Tier 5 Armor-Piercing Laser Physics
Verify that Tier 5 central beams penetrate through front-line scouts to strike rear commanders in a single flight pass.
```bash
npx vitest run tests/unit/piercing-projectiles.test.ts
```
**Expected Outcome**:
- Central beam damages front-line Scout (25 HP), does not despawn, and proceeds to strike second-line Fighter (50 HP).
- Penetrated entity set prevents duplicate damage frames against the same target.
- Wing plasma bolts retain standard single-impact collision and are recycled on impact.

---

### Scenario 3: Life Loss Weapon Penalty (Tier - 1)
Verify that ship destruction reduces the active weapon tier by exactly 1 level rather than resetting to Tier 1.
```bash
npx vitest run tests/unit/life-loss-penalty.test.ts
```
**Expected Outcome**:
- Dying at Tier 5 respawns at Tier 4.
- Dying at Tier 3 respawns at Tier 2.
- Dying at Tier 1 respawns at Tier 1 (clamped to minimum).

---

### Scenario 4: Token Drop Probability Distribution
Verify that Commanders guarantee 100% weapon drops and Fighters drop with 20% probability.
```bash
npx vitest run tests/unit/token-drops.test.ts
```
**Expected Outcome**:
- 100/100 destroyed Commanders produce a weapon upgrade token.
- Destroying 1,000 Fighters produces $\approx 200 \pm 35$ tokens ($20\%$ distribution within $3\sigma$).

---

### Scenario 5: 3-Layer Parallax Scrolling & Ship Banking Tilt
Verify that background layers scroll smoothly at independent speeds and player lateral movement triggers banking tilt.
```bash
npx vitest run tests/unit/parallax-visuals.test.ts
```
**Expected Outcome**:
- Distant stars scroll at $25\text{ px/s}$, nebulae scroll at $60\text{ px/s}$, cosmic dust scrolls at $140\text{ px/s}$.
- Horizontal steering with positive $v_x$ tilts ship smoothly to $+15^\circ$ ($+0.26\text{ rad}$) and $-15^\circ$ for negative $v_x$.

---

### Scenario 6: 60 FPS Peak-Load Danmaku & Parallax Frame Budget
Verify that full visual rendering (5-tier weapons, multi-color enemy fleet, animated thrusters, parallax starfield, and Danmaku bullets) consumes $\le 16.67\text{ ms}$ per step.
```bash
npx vitest run tests/integration/visual-overhaul-performance.test.ts
```
**Expected Outcome**:
- 100 simulation frames with 400+ active pooled entities execute in an average step time of $< 8.0\text{ ms}$ (well within the $16.67\text{ ms}$ 60Hz frame budget).
- Zero heap allocations (`0 new objects`) during active gameplay loop.

---

## 2. In-Browser Manual Validation Guide

1. Start development server:
   ```bash
   npm run dev
   ```
2. Open browser at `http://localhost:5173/`.
3. Select **STANDARD MODE** or **HELL MODE** on the main menu.
4. Observe the 3-layer parallax starfield with cosmic dust and nebula clouds.
5. Steer left and right to inspect the dynamic $15^\circ$ banking tilt and wingtip vortex trails.
6. Shoot enemies to observe diverse neon color palettes (Cyan, Amber, Lime, Magenta, Orange, Gold).
7. Collect 4 consecutive weapon upgrade capsules to experience the visual transformation from Tier 1 to Tier 5:
   - Notice the massive crimson central beams slicing through enemy formations.
   - Notice the tactical micro-shake and energy bloom.
8. Collect a 5th token at Tier 5 and verify the "+2,000 OVERCHARGE" floating banner.
9. Intentionally collide with an enemy to verify that weapon level drops by 1 tier (Tier 5 $\rightarrow$ Tier 4).

