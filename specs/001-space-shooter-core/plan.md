# Implementation Plan: Core Space Shooter Gameplay Mechanics

**Branch**: `001-space-shooter-core` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-space-shooter-core/spec.md`

## Summary

Build a modern, high-tempo Galaga-style arcade shoot-'em-up tailored for internal company gameplay. The game delivers 8-directional normalized flight control, multi-point Bézier spline enemy wave entries, 3 distinct enemy tactical archetypes, an in-run 3-tier weapon upgrade system, a forgiving 40–50% cockpit core hitbox for grazing, and a multi-life vitality structure (3 lives, each with full health bar). 

The technical approach implements a lightweight, high-performance TypeScript + Vite + HTML5 Canvas 2D architecture utilizing a Component-Based (ECS-lite) design with strict pre-warmed object pooling, a 2D spatial hash grid broadphase collision system, and an offline-resilient local score cache with a pluggable REST leaderboard client.

## Technical Context

**Language/Version**: TypeScript 5.7+, ECMAScript 2022+ target.

**Primary Dependencies**: Vite 6.x (build/dev server), Vitest (test runner). Zero heavy runtime game engine frameworks (pure Canvas 2D and Web Audio API to eliminate garbage collection overhead).

**Storage**: Browser `localStorage` (instant high score and audio/vfx settings persistence) + pluggable HTTP REST client (`contracts/leaderboard-api.yaml`) for internal company leaderboard integration.

**Testing**: Vitest (headless unit testing of vector math, Bézier curves, spatial hash collisions, and object pool lifecycles; integration testing of full combat sessions).

**Target Platform**: Modern desktop/laptop web browsers (Chrome, Edge, Firefox, Safari) running on standard office hardware.

**Project Type**: Browser-based client-side 2D Arcade Game.

**Performance Goals**: Consistent 60 FPS (≤ 16.7 ms frame budget) during peak load (up to 40 active enemies, 150 simultaneous bullets, and 300 visual particles on screen).

**Constraints**:
- Zero memory allocations (`new`, `push`, object instantiation) inside active update/render game loops.
- Bundle size < 150 KB (gzip).
- Initial load time < 1.0 second on local/intranet network.
- Visual comfort: micro screen-shake (< 0.2s duration) with an explicit toggle and intensity slider in settings.

**Scale/Scope**: Single-page browser app, modular architecture (~15 core components/systems), endless wave scaling.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Status | Compliance Details in Plan |
|-----------|-------------|----------------------------|
| **I. Smooth, High-Fidelity Visuals** | **PASS** | Canvas 2D styled with `devicePixelRatio` native Retina resolution (no blurry upscaling); continuous delta-time kinematic motion; additive blending (`lighter`) for neon laser glow and explosion particles; accessible screen-shake and flash toggles. |
| **II. Frame-Budget Discipline** | **PASS** | Fixed-step 60 Hz kinematic update loop; $64 \times 64$ px 2D spatial hash grid drops collision complexity from $O(N \cdot M)$ to $O(N)$; zero runtime garbage collection pauses during gameplay. |
| **III. Component-Based Architecture** | **PASS** | Entities are flat IDs composed of discrete components (`Transform`, `Render`, `Hitbox`, `Health`, `Weapon`, `EnemyBehavior`); zero multi-level class inheritance; behaviors encapsulated in standalone systems (`MovementSystem`, `CollisionSystem`, `WeaponSystem`, `RenderSystem`). |
| **IV. Strict Object Pooling (NON-NEGOTIABLE)** | **PASS** | Pre-warmed pools with fixed capacities (`PlayerBullet: 50`, `EnemyBullet: 150`, `Enemy: 60`, `Particle: 300`, `PowerUp: 20`); O(1) acquire/release; deterministic state reset routines; debug overlay tracks active/peak pool usage. |
| **V. Original Assets & IP Safety** | **PASS** | 100% original procedural vector and pixel graphics; procedural Web Audio synth sound effects; product named independently without infringing on Bandai Namco's "Galaga" trademark or copyright. |

## Project Structure

### Documentation (this feature)

```text
specs/001-space-shooter-core/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & engine/physics decisions
├── data-model.md        # Component schemas, entities, FSM states
├── quickstart.md        # Setup commands, test suites, and validation scenarios
├── contracts/
│   ├── leaderboard-api.yaml # OpenAPI schema for company leaderboard service
│   └── game-events.json     # JSON schema for decoupled internal event bus
├── checklists/
│   └── requirements.md      # Spec quality validation checklist
└── spec.md              # Feature specification
```

### Source Code Layout

```text
src/
├── core/                    # Engine foundations
│   ├── Game.ts              # Main game loop, delta-time management, FSM state controller
│   ├── EventBus.ts          # Decoupled publish-subscribe event dispatcher
│   └── SpatialGrid.ts       # 2D spatial hash broadphase collision partitioner
├── ecs/                     # Component-Based Architecture
│   ├── Entity.ts            # EntityId generator and entity manager
│   ├── Component.ts         # Component type definitions and interfaces
│   └── Pool.ts              # Generic high-performance pre-warmed object pool
├── components/              # Concrete data components
│   ├── Transform.ts
│   ├── Render.ts
│   ├── Hitbox.ts
│   ├── Health.ts
│   ├── Weapon.ts
│   └── EnemyBehavior.ts
├── systems/                 # Pure logic system processors
│   ├── InputSystem.ts       # 8-directional keyboard/gamepad handler
│   ├── MovementSystem.ts    # Velocity integration & Bézier spline path evaluator
│   ├── WeaponSystem.ts      # Fire-rate cooldowns & projectile spawning from pools
│   ├── CollisionSystem.ts   # Core hitbox grazing & damage resolution
│   ├── HealthSystem.ts      # Life stock decrements, invulnerability timers, game over
│   ├── WaveSpawnSystem.ts   # Endless wave sequencer and enemy squad spawner
│   ├── VFXSystem.ts         # Particle lifecycle updates & screen-shake decay
│   └── RenderSystem.ts      # Canvas 2D layered drawing & additive neon bloom
├── audio/                   # Audio subsystem
│   ├── SoundManager.ts      # Web Audio API polyphonic sound effects
│   └── SoundSynthesizer.ts  # Procedural chiptune/retro-modern sound generator
├── services/                # External & persistence adapters
│   ├── StorageService.ts    # LocalStorage high-score and user preferences manager
│   └── LeaderboardClient.ts # Pluggable REST client for company intranet rankings
├── utils/                   # Math & geometry helpers
│   ├── Vector2.ts           # 2D vector operations (normalized speed calculations)
│   └── Spline.ts            # Cubic Bézier curve evaluations
├── index.html               # Entry HTML shell with high-DPI canvas
└── main.ts                  # Application bootstrap entrypoint

tests/
├── unit/
│   ├── pools.test.ts        # Object pool pre-warming, recycling, zero allocations
│   ├── physics.test.ts      # 8-direction normalization, boundary clamping, hitbox math
│   ├── splines.test.ts      # Bézier curve calculation tests
│   └── ecs.test.ts          # Entity component attachment and query tests
└── integration/
    └── combat-flow.test.ts  # End-to-end combat loop simulation
```

**Structure Decision**: Clean single-project web architecture (`src/` and `tests/`) separating engine core, data components, systems, and services. Ensures extreme modularity, simple build tooling with Vite, and painless unit testing with Vitest.

## Complexity Tracking

> **No Constitution violations detected.** The architecture strictly complies with Principles I through V. No complexity exemptions required.
