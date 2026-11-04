# Modern Galaga Constitution

## Core Principles

### I. Smooth, High-Fidelity Visuals

Visual quality is the project's top product priority. The game MUST look smooth, sharp, and vivid.

- Rendering MUST target the display's native resolution, including high-DPI/Retina screens,
  with no blurry upscaling of the game canvas or assets.
- Art assets MUST be authored at a resolution (or as vectors/shaders) that stays crisp at the
  highest supported output resolution. Low-resolution placeholder art MUST NOT ship.
- Motion MUST be continuous: entity movement and animation MUST be time-based (delta-time or
  fixed-step with interpolation), never tied to the frame count.
- Gameplay feedback MUST be visually rich: hits, explosions, power-ups, and upgrades MUST have
  distinct effects (e.g., particles, glow/bloom, screen shake, flashes).
- Effects intensity MUST be configurable (quality presets and a reduced-motion/flash option)
  so the experience stays comfortable and accessible.

Rationale: the stated identity of the project is a modern, high-energy, visually striking take on
a classic shooter. Visual polish is the core value, not an afterthought.

### II. Frame-Budget Discipline

Smoothness is measured, not assumed.

- The game MUST sustain 60 FPS (≤ 16.7 ms per frame) on the agreed reference hardware during
  peak-load scenarios (maximum enemies, bullets, and effects on screen).
- The game SHOULD support higher refresh rates (120/144 Hz) without changing gameplay speed.
- Every visual feature MUST fit within the frame budget. A feature that causes frame drops on
  reference hardware MUST be optimized, scaled by quality preset, or removed.
- Garbage-collection or allocation spikes MUST NOT cause visible stutter during gameplay.

Rationale: high fidelity (Principle I) is worthless if the game stutters. A fast-paced shooter
depends on consistent frame pacing for fair, responsive control.

### III. Component-Based Architecture

Game objects MUST be composed from small, reusable components, not built from deep inheritance
trees.

- Entities (player ship, enemies, bullets, pickups, effects) MUST be assembled from discrete
  components (e.g., transform, renderable, collider, health, weapon, movement pattern, AI).
- Each component MUST have a single responsibility and MUST be testable in isolation.
- Behavior shared across entity types MUST live in components or systems, not be duplicated.
- Inheritance depth for game-object classes MUST NOT exceed 2 levels. Composition is the
  default.
- New gameplay features (ship upgrades, enemy types, weapons) MUST be addable by composing or
  configuring components, ideally via data, with minimal changes to existing code.

Rationale: an upgrade system and many enemy/weapon variants scale cleanly with composition and
become brittle with inheritance hierarchies.

### IV. Strict Object Pooling (NON-NEGOTIABLE)

All high-frequency runtime objects MUST be pooled. This applies with no exceptions to the
**bullet system** (player and enemy projectiles) and the **enemy system**.

- Bullets and enemies MUST be obtained from and returned to pre-allocated pools. Creating or
  destroying them with `new`/destroy (or the engine equivalent) during gameplay is forbidden.
- Particles, hit effects, explosions, and other short-lived visual objects MUST also be pooled.
- Pools MUST be pre-warmed during loading to the measured peak counts, with explicit, documented
  capacities per pool.
- Reset logic MUST fully restore an object's state on release/acquire. Leaked or stale state
  between reuses is a defect.
- Pool exhaustion behavior MUST be defined per pool (e.g., controlled growth with a logged
  warning, or recycling the oldest object) and MUST never crash or stall the game.
- Pool usage (active/free counts, peak usage) MUST be observable in a debug overlay or log.

Rationale: bullets and enemies are created and destroyed in the hundreds per second in a
fast-paced shooter. Runtime allocation causes GC pauses and frame drops, which directly violate
Principles I and II.

### V. Original Assets & IP Safety

The game MUST be "Galaga-style" in mechanics only.

- The name "Galaga" (or confusingly similar names) MUST NOT appear in the product title,
  branding, or assets.
- All art, audio, and code MUST be original or properly licensed. Ripping, tracing, or
  near-identical recreation of original Galaga sprites, sounds, or code is forbidden.
- Third-party assets and libraries MUST have a recorded license compatible with internal company
  use.

Rationale: research found "Galaga" to be an active Bandai Namco trademark with protected assets.
Mechanics are generally free to use, but expression is not.

## Performance & Visual Standards

- **Reference hardware**: the minimum target machine MUST be documented in the plan of the first
  feature and used for all frame-budget verification.
- **Peak-load scenario**: every feature plan MUST define a worst-case on-screen load (enemies,
  bullets, particles) and verify Principle II against it.
- **Hot-path rule**: per-frame update and render loops MUST NOT allocate memory for pooled entity
  types (Principle IV). Temporary allocations in hot paths MUST be justified in review.
- **Quality presets**: at least two visual quality levels (e.g., High / Performance) MUST exist
  by first release, with the reduced-motion/flash option from Principle I.
- **Asset pipeline**: assets MUST be tracked with source files and license metadata
  (Principle V).

## Development Workflow & Quality Gates

- Every feature spec and plan MUST include a **Constitution Check** confirming compliance with
  Principles I–V, or listing justified, approved exceptions.
- Code review MUST verify:
  - new entity types are component-composed (Principle III);
  - bullets, enemies, and effects use pools, with no runtime instantiation in gameplay (Principle IV);
  - movement and animation are time-based (Principle I);
  - no unlicensed or IP-infringing assets are added (Principle V).
- Components and pool logic (acquire/release/reset, exhaustion behavior) MUST have automated
  tests.
- Before merging any feature that affects rendering, entities, or effects, a performance check
  MUST be run on the reference hardware under the peak-load scenario, with FPS/frame time and
  pool peaks recorded.

## Governance

- This constitution supersedes conflicting practices, conventions, and preferences in the project.
- **Amendments** MUST be proposed in writing (PR or documented change). Each amendment states the
  change, the rationale, and its impact on existing specs/plans, and is approved by the project
  owner before merge.
- **Versioning** follows semantic versioning:
  - MAJOR: removal or backward-incompatible redefinition of a principle;
  - MINOR: a new principle or section, or materially expanded guidance;
  - PATCH: clarifications and wording fixes.
- **Compliance review**: all PRs and reviews MUST verify compliance. Any added complexity or
  exception to a principle MUST be justified in the relevant plan's Complexity Tracking or an
  equivalent record.
- Runtime development guidance lives in feature plans and project docs. It MUST NOT contradict
  this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-04
