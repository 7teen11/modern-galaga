# Technical Research: Modern 2D Web Game Visual & 5-Tier Weapon Overhaul

**Feature**: `003-visual-weapon-overhaul`  
**Status**: Completed  
**Prerequisites**: [spec.md](./spec.md), [constitution.md](../../.specify/memory/constitution.md), [`d-game-development/SKILL.md`](../../d-game-development/SKILL.md)

---

## 1. Technical Decisions & Architectural Investigations

### Decision 1: 5-Tier Weapon Expansion & High-Impact Geometry System

- **Context**: The existing weapon system in `src/systems/WeaponSystem.ts` defines `WeaponTier = 1 | 2 | 3`. The user requested 5 distinct weapon tiers with escalating visual identity, bullet geometries, colors, and audio-tactile power delivery.
- **Decision**:
  - Extend `WeaponTier` union to `1 | 2 | 3 | 4 | 5`.
  - Author a declarative configuration map `WEAPON_TIER_CONFIG` mapping each tier to:
    - **Tier 1 (Single Ion Needle)**: Cyan (`#00f0ff`), 1 central stream ($4\times 16\text{px}$), damage: 25, speed: 760 px/s, cooldown: 0.14s.
    - **Tier 2 (Twin Pulse Blasters)**: Emerald (`#00ff88`), 2 parallel streams ($6\times 18\text{px}$) offset $\pm 10\text{px}$, damage: 22 each (44 total), speed: 780 px/s, cooldown: 0.13s.
    - **Tier 3 (Tri-Beam Spread Cannon)**: Golden Amber (`#ffcc00`), 3 streams (1 central, 2 angled $\pm 12^\circ$), damage: 20 each (60 total), speed: 800 px/s, cooldown: 0.12s.
    - **Tier 4 (Quad Plasma Devastator)**: Electric Violet (`#bf55ec`), 4 streams ($\pm 6\text{px}$, $\pm 18\text{px}$ angled $\pm 7^\circ$), heavy plasma spheres with electric arcs, damage: 22 each (88 total), speed: 820 px/s, cooldown: 0.11s.
    - **Tier 5 (Omega Vanguard Hyper Beam)**: Solar Crimson / Prismatic (`#ff2a55`), 5 streams with **twin central Armor-Piercing Hyper Beams** ($14\times 32\text{px}$) that slice continuously through multiple enemy hulls, flanked by 2 angled wing bolts ($\pm 15^\circ$) and 1 forward vanguard lance, damage: 30 on piercing beams + 20 on wings (120+ total), speed: 850 px/s, cooldown: 0.10s.
- **Alternatives Considered**:
  - *Hardcoded switch cases in fire loop*: Rejected as brittle and violating Constitution Principle III (Component/Data-Driven Composition).
  - *Runtime procedural math without config*: Rejected because declarative configs allow instant tweaking, zero allocations, and automated testing.

### Decision 2: Armor-Piercing Projectile Physics for Tier 5 Central Beams

- **Context**: Per user decision (Q3: A), Tier 5 features armor-piercing capabilities where central laser beams punch through front-line scouts and dive-bombers to strike rear targets without being consumed on first contact.
- **Decision**:
  - Add an optional boolean `isPiercing: boolean` to `ProjectileComponent` and `PooledBullet`.
  - In `CollisionSystem.ts`, when a player bullet collides with an enemy:
    - If `!bProj.isPiercing`: The bullet damages the target and is immediately recycled into `playerBulletPool.release(bullet)`.
    - If `bProj.isPiercing`: The bullet damages the target, triggers hit-flash and impact sparks, but **continues flying**. To prevent multi-hitting the exact same enemy multiple frames in a row, the projectile entity maintains a lightweight hit-stamp or per-frame set `damagedEntityIds: number[]` (cleared when released or reset).
- **Alternatives Considered**:
  - *Instantly creating raycasts*: Breaks visual parity with travel-time projectiles and object pooling.
  - *Deleting bullet and spawning another behind*: Causes pool churn and visual flicker.

### Decision 3: Procedural 3-Layer Parallax Starfield & Cosmic Depth

- **Context**: In accordance with `d-game-development/SKILL.md` (Section 2 - Layering and Section 4 - Camera/Feel) and Constitution Principle I (Visual Polish), the background must provide vibrant optical depth without consuming significant CPU/GPU frame time.
- **Decision**:
  - Build `ParallaxBackgroundSystem` containing 3 pre-allocated particle buffers:
    - **Layer 1 (Distant Stars - Background, speed: $25\text{ px/s}$)**: 80 small pinpoints ($1\text{px}$), muted sapphire/navy tones (`#3a4d7a`), low flicker.
    - **Layer 2 (Mid-ground Nebulae & Celestial Gas, speed: $60\text{ px/s}$)**: 4 procedural radial nebula cloud nodes pre-rendered onto an offscreen canvas or smoothly blended with gradient fills (`#4a154b` $\rightarrow$ `#0d1b2a`), creating cosmic ambiance.
    - **Layer 3 (Foreground Hyper Dust, speed: $140\text{ px/s}$)**: 35 elongated streak particles ($2\times 6\text{px}$), cyan/white tint, with occasional shooting star streaks.
  - All positions wrap around when $y > \text{LOGICAL\_HEIGHT}$ using simple modular arithmetic. Zero garbage collection allocations.
- **Alternatives Considered**:
  - *Loading large bitmap PNG textures*: Increases bundle size and causes texture sampling blur on high-DPI screens.
  - *Single-layer star field*: Looks flat and static, failing the "vibrant 2D game" user prompt.

### Decision 4: Vibrant Multi-Color Enemy Fleet & Role Telegraphing

- **Context**: User requested vibrant, distinct colors for enemy ships to immediately communicate squad roles, archetype behaviors, and attack states.
- **Decision**:
  - Formulate an `ENEMY_COLOR_REGISTRY` mapping archetypes and squad positions to neon color palettes:
    - **Scout**:
      - *Emerald Interceptor* (`#00f0ff` cyan hull, `#00ff88` wings): Agile baseline.
      - *Amber Hornet* (`#ffe600` solar gold, `#ff6b00` eyes): High-speed swoop diver.
      - *Toxic Viper* (`#a8ff00` lime neon, `#38b000` accents): Swarm flanker.
    - **Fighter**:
      - *Magenta Striker* (`#ff1e8a` hot pink, `#7928ca` trim): Rapid dual blaster.
      - *Crimson Fury* (`#ff3300` blazing orange, `#ff0055` wings): Aggressive escort.
      - *Cobalt Corsair* (`#0070f3` electric blue, `#00dfd8` trim): Defensive escort.
    - **Commander**:
      - *Imperial Dreadgold* (`#ffd700` royal gold, `#800080` command crest, glowing ambient shield ring).
  - Engine thrusters: Animated procedural vector exhaust flames rendered behind each ship, scaling in length from $4\text{px}$ (stationary/formation) to $14\text{px}$ (diving at speed).
  - Hit reactions: White hit-flash for 70ms + 6 directional spark particles matching the specific ship's neon hull color.

### Decision 5: Ship Maneuver Banking Tilt & Game Feel ("Juice")

- **Context**: Top-down 2D shooters benefit significantly from visual responsiveness (`d-game-development/SKILL.md` Section 1 & 5).
- **Decision**:
  - When the player ship moves horizontally ($v_x \ne 0$), apply smooth banking rotation up to $\pm 15^\circ$ ($\pm 0.26\text{ rad}$) with exponential damping.
  - When firing Tier 4 and Tier 5 weapons, add an instantaneous 2px recoil kickback and micro-screen shake (50–120ms with diminishing amplitude) via `VFXSystem`.
  - Add wingtip vortex trails at high speed.

### Decision 6: Progression Rules: Drop Rates & Life Loss Penalty

- **Context**: User answered clarifications Q1: A and Q2: A.
- **Decision**:
  - **Drop Rates**:
    - Commander: 100% guaranteed weapon upgrade drop.
    - Fighter: 20% random drop chance upon destruction.
    - Scout: 0% base drop chance (standard points fodder).
  - **Life Loss Weapon Penalty**:
    - When player loses a life and respawns: $\text{newTier} = \max(1, \text{currentTier} - 1)$.
    - Player does not lose all progress, retaining Tier 4 if dying at Tier 5, or Tier 3 if dying at Tier 4.

---

## 2. Benchmark & Frame-Budget Validation

- **Peak Load Estimation**:
  - 32 active enemy ships with animated thrusters.
  - 50 player bullets (Tier 5 firing 5 beams at 10 Hz = up to 35 active on screen).
  - 80 enemy/boss bullets.
  - 150 background parallax stars and cosmic dust.
  - 100 active VFX hit spark particles.
- **Total active entities on screen**: $\sim 412$ entities.
- **Target Frame Time**: $\le 16.67\text{ ms}$ (60 FPS) on reference hardware.
- **Projected Render Budget**:
  - Parallax Background: $\sim 0.6\text{ ms}$
  - Enemies + Thrusters: $\sim 2.1\text{ ms}$
  - Bullets + Piercing checks: $\sim 1.8\text{ ms}$
  - Particles + Screen shake: $\sim 1.5\text{ ms}$
  - HUD + Overlays: $\sim 0.8\text{ ms}$
  - **Total**: $\sim 6.8\text{ ms}$ (well under the 16.67 ms ceiling, sustaining 120 Hz headroom).

