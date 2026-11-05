# Technical Research: Core Space Shooter Engine, Physics & Scoring

**Feature**: `001-space-shooter-core` | **Date**: 2026-11-04

## Overview

This research artifact consolidates the architectural decisions for building the modern Galaga-style internal shooter, addressing the user's specific technical requests:
1. Technology stack recommendation
2. Game management & score storage architecture
3. Optimal lightweight custom physics & collision system

---

## 1. Technology Stack & Runtime

### Decision: TypeScript + Vite + HTML5 High-DPI Canvas 2D + Web Audio API

- **Language & Runtime**: TypeScript 5.x, modern ECMAScript target (ES2022+), browser execution.
- **Build Tool**: Vite 6.x (ultra-fast HMR, sub-second dev startup, optimized tree-shaken static production bundle <150 KB gzip).
- **Rendering Pipeline**: HTML5 Canvas 2D Context with `devicePixelRatio` scaling (native high-DPI/Retina crispness without blur) and procedural additive blending (`globalCompositeOperation = 'lighter'`) for neon glows and particle bloom.
- **Audio**: Web Audio API with pooled synthetic/procedural sound effect oscillators and sample buffers for zero-latency arcade feedback.
- **Testing Framework**: Vitest for high-speed headless unit and integration testing of components, pools, and math systems.

### Rationale
- **Zero Friction for Internal Users**: Any employee can play instantly via an internal browser link without installing binaries, Steam, or OS-dependent packages.
- **Direct Hardware & Memory Control**: Avoids heavy engine abstractions that allocate garbage during runtime. Canvas 2D native primitives with pre-allocated off-screen sprite buffers comfortably render 300+ particles, 150 bullets, and 40 enemies at a solid 60–120 FPS.
- **Complete Constitution Compliance**: Seamlessly satisfies Principle I (Smooth High-DPI), Principle II (Frame-Budget Discipline), Principle III (Component Architecture), and Principle IV (Object Pooling).

### Alternatives Considered
- **PixiJS (WebGL/WebGPU)**: Excellent for massive sprite counts (10,000+), but brings additional runtime weight (~400KB), shader setup complexity, and WebGL context loss recovery requirements that are unnecessary for an arcade game with ≤500 active on-screen entities.
- **Phaser 3**: Monolithic framework with built-in scene managers and arcade physics. However, Phaser's built-in game object lifecycles allocate garbage and fight against strict custom Component-Based / Object Pooling paradigms.
- **Unity / Godot WebAssembly Export**: 15–30 MB initial download, 5–10 second loading times, heavy memory footprint; inappropriate for quick internal company break-time gaming.

---

## 2. Component-Based Architecture & Strict Object Pooling

### Decision: Custom Lightweight Data-Oriented Component Architecture with Pre-Warmed Typed Pools

- **Entities**: Entities are lightweight numeric identifiers (`entityId: number`) indexing into component arrays or holding a sparse set of component references.
- **Components**: Plain data structures with no business logic:
  - `TransformComponent`: `x`, `y`, `vx`, `vy`, `rotation`, `speed`.
  - `RenderComponent`: `spriteKey`, `layer`, `alpha`, `scale`, `bloomColor`.
  - `HitboxComponent`: `shape` (Circle/AABB), `radius`, `halfWidth`, `halfHeight`, `isCoreHitbox`.
  - `HealthComponent`: `current`, `max`, `invulnerableTimer`.
  - `WeaponComponent`: `tier`, `cooldown`, `timer`, `bulletSpeed`, `pattern`.
  - `EnemyBehaviorComponent`: `archetype`, `state`, `splinePath`, `splineT`, `diveTargetX`, `diveTargetY`.
- **Systems**: Pure logic processors executing in fixed sequential order within the game loop:
  1. `InputSystem`: Maps 8-directional keyboard/gamepad inputs into normalized player velocity vectors.
  2. `MovementSystem`: Integrates delta-time velocities and evaluates Bézier spline trajectories.
  3. `WeaponSystem`: Handles fire rates and pulls bullet entities from pools.
  4. `CollisionSystem`: Broadphase spatial partitioning and narrowphase hitbox resolution.
  5. `HealthSystem`: Applies damage, invulnerability timers, and destruction triggers.
  6. `VFXSystem`: Updates particle positions, fades alpha, and updates screen-shake offset.
  7. `RenderSystem`: Draws background starfield, enemies, player, bullets, particles, and HUD in back-to-front layer order.
- **Strict Object Pooling (Principle IV)**:
  - Pre-warmed typed pools:
    - `PlayerBulletPool`: 50 capacity
    - `EnemyBulletPool`: 150 capacity
    - `EnemyPool`: 60 capacity (Scouts, Fighters, Commanders)
    - `ParticlePool`: 300 capacity (sparks, debris, hit-flashes)
    - `PowerUpPool`: 20 capacity
  - O(1) acquire and release operations with dedicated `reset()` lifecycle methods. Zero heap allocations occur during active gameplay.

### Rationale
- Completely decoupled, testable systems without multi-level inheritance hierarchies (Principle III).
- Guarantees 0ms GC pauses and smooth 60 FPS frame pacing (Principle II & IV).

---

## 3. Optimal Lightweight Physics & Collision System

### Decision: Kinematic 2D Integrator + 2D Spatial Hash Grid Broadphase + Circle/AABB Narrowphase

- **Physics Model**: Pure Kinematic 2D.
  - Position integration: $P_{t+\Delta t} = P_t + V \cdot \Delta t$.
  - Fixed-step logic update (60 Hz, $\Delta t = 0.01667s$) with delta-time clamping to prevent spiral-of-death tunneling.
  - No rigid-body physics, friction, mass, or angular inertia solvers. Everything moves along predictable, responsive vectors.
- **Collision Detection Strategy**:
  1. **Broadphase (Spatial Hash Grid)**:
     - Screen divided into a static grid of $64 \times 64$ pixel cells (e.g., $10 \times 15$ cells for a typical $640 \times 960$ vertical canvas).
     - Entities register into cell buckets by bounding coordinates.
     - Bullet-to-enemy tests only query entities sharing occupied cells, dropping collision complexity from $O(N \times M)$ ($40 \times 150 = 6,000$ checks) down to $O(N)$ (~150–300 checks per frame).
  2. **Narrowphase (Shape Intersections)**:
     - **Player Core Hitbox**: Circle with radius equal to ~20% of sprite width ($R \approx 10\text{px}$), centered at cockpit.
     - **Projectiles**: Small circles ($R \approx 3\text{px}$–$6\text{px}$).
     - **Enemies**: Axis-Aligned Bounding Boxes (AABB) or circles.
     - **Mathematical check**:
       - Circle vs Circle: $(x_2 - x_1)^2 + (y_2 - y_1)^2 < (r_1 + r_2)^2$ (1 multiply-add check without `Math.sqrt`).
       - Circle vs AABB: Clamped distance squared comparison.
- **Grazing & Fairness**:
  - Hits only trigger if projectile overlaps the 40–50% core cockpit hitbox.
  - Outer wing boundaries are ignored for damage, enabling satisfying bullet-grazing agility.

### Rationale
- Ultra-low computational overhead (<0.5 ms CPU time per frame on standard hardware).
- Deterministic, bug-free collision resolution without physics glitches.

---

## 4. Game Management & Score Persistence

### Decision: Finite State Machine (FSM) + LocalStorage Cache + Pluggable Leaderboard REST Client

- **Game State Flow (FSM)**:
  - `BOOT`: Preload sprite sheets, compile spline paths, pre-warm object pools.
  - `TITLE / MENU`: Display start prompt, difficulty options, controls guide, and session high score.
  - `WAVE_INTRO`: Display wave number banner, spawn enemy squads on Bézier entrance paths.
  - `PLAYING`: Active combat loop (spawning, shooting, collision, health tracking).
  - `RESPAWNING`: Triggered on life loss; ship explosion, life counter decrements, ship respawns with 2.5s invulnerability.
  - `PAUSED`: Freeze time integration; render pause overlay and settings (audio/shake toggle).
  - `GAME_OVER`: Triggered when 0 lives remain; final score tally, check against high score, submission to leaderboard.
- **Score & Progression Persistence**:
  - **Local Layer**: `localStorage` stores:
    - `highScore`: Highest score achieved on this browser.
    - `highestWave`: Maximum wave reached.
    - `userSettings`: Volume master/SFX, screen-shake toggle/scale ($0.0$–$1.0$).
  - **Company Leaderboard API Layer (`ILeaderboardService`)**:
    - Pluggable contract:
      - `submitScore(payload: ScoreSubmission): Promise<LeaderboardResult>`
      - `getTopScores(period: 'all_time' | 'weekly'): Promise<LeaderboardEntry[]>`
    - Anti-cheat sanity verification:
      - Includes session token generated on game start (`sessionId`, `startTime`).
      - Backend/service verifies minimum elapsed time: $\Delta T \ge \text{Score} / \text{MaxTheoreticalRate}$.
      - Validates wave count vs score proportion.
    - Initial release includes `LocalStorageLeaderboardService` (self-contained mock) with ready-to-wire `FetchLeaderboardService` for internal company intranet backend.

---

## 5. Technology Summary Table

| Category | Recommended Choice | Rationale |
|----------|-------------------|-----------|
| **Runtime** | TypeScript 5.x / Modern Browser | Type safety, zero-install internal web deployment |
| **Build & Dev Tool** | Vite 6.x | Instant dev reload, optimized production build |
| **Rendering** | HTML5 Canvas 2D (Retina Hi-DPI) | Smooth 60–120 FPS, native procedural bloom/blending, low overhead |
| **Audio** | Web Audio API | Low-latency polyphonic arcade sounds |
| **Architecture** | ECS-Lite + Pre-warmed Object Pools | Strictly adheres to Constitution Principles III & IV, zero GC spikes |
| **Physics** | Custom Kinematic 2D + Spatial Hash | Deterministic, microsecond collision checks, zero jitter |
| **State Management** | Finite State Machine (FSM) | Clean transitions, deterministic lifecycle and wave resets |
| **Score Storage** | LocalStorage + Pluggable REST Client | Offline resilience + company intranet leaderboard readiness |
| **Testing** | Vitest | Rapid headless unit testing of math, pools, and systems |

