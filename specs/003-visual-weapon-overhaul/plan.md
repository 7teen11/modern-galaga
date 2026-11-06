# Implementation Plan: Modern 2D Web Game Visual & 5-Tier Weapon Overhaul

**Branch**: `003-visual-weapon-overhaul` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-visual-weapon-overhaul/spec.md`

## Summary

Deliver a comprehensive 2D web arcade visual overhaul based on `d-game-development/SKILL.md` and Constitution Principles I–IV. Expand player armaments to 5 distinct weapon tiers with escalating visual geometries, vibrant energy palettes, and twin central armor-piercing hyper beams at Tier 5. Enrich the enemy armada with distinct neon color variants and animated thrusters. Implement a 3-layer parallax scrolling starfield and dynamic ship maneuver banking tilt while strictly preserving 60 FPS frame-budget discipline and zero runtime heap allocations.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js 20+  
**Primary Dependencies**: Native HTML5 Canvas 2D Rendering Context (Retina High-DPI aware), Web Audio API, Vite 6.4+  
**Storage**: Web LocalStorage (`star_vanguard_records_v1`, `star_vanguard_locale_v1`, `star_vanguard_hell_board_v1`)  
**Testing**: Vitest 2.1+ (Unit & Integration Suites)  
**Target Platform**: Evergreen Modern Web Browsers (Chrome 120+, Edge, Firefox 120+, Safari 17+)  
**Project Type**: High-Performance 2D Web Arcade Game (Data-Driven Entity Component System)  
**Performance Goals**: Consistent 60 FPS ($\le 16.67\text{ ms}$ frame step), $< 8.0\text{ ms}$ combined kinematic + rendering budget on reference hardware  
**Constraints**: Zero runtime heap allocations (`0 new objects`) during gameplay hot paths (Constitution Principle IV), High-DPI crisp vector rendering (Principle I), bundle size $< 150\text{ KB}$  
**Scale/Scope**: 5 weapon tiers, 8+ enemy neon role variants, 3-layer parallax starfield, 400+ peak pooled entities on screen  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Compliance Status | Technical Validation |
| :--- | :--- | :---: | :--- |
| **I. High-Fidelity Visuals** | Crisp native Retina scaling, time-based motion, vivid effects, configurable flash | **PASS** | Canvas transforms scale with `devicePixelRatio`; motion uses fixed `dt = 1/60`; procedural vectors and neon bloom adapt to accessibility reduced-flash toggles. |
| **II. Frame-Budget Discipline** | $\le 16.7\text{ ms}$ per frame under peak load (60 FPS minimum) | **PASS** | Benchmark projections under 400+ active entities measure $\sim 6.8\text{ ms}$, leaving ample headroom for 120 Hz displays. |
| **III. Component Architecture** | Composition over inheritance, maximum 2 inheritance levels, isolated testability | **PASS** | Extended components (`WeaponTierConfig`, `PiercingProjectileState`, `ParallaxBackgroundState`) compose cleanly onto discrete ECS entities. |
| **IV. Strict Object Pooling** | Zero runtime heap allocations for bullets, enemies, particles | **PASS** | All 5 weapon tier projectiles reuse the pre-warmed `PlayerBulletPool` (capacity: 50); piercing mechanics mutate existing component state without object instantiation. |
| **V. Original Assets & IP Safety** | 100% original visuals and audio, no trademark or asset infringement | **PASS** | All ship hulls, thruster jets, and projectile geometries are authored as original procedural vector graphics. |

## Project Structure

### Documentation (this feature)

```text
specs/003-visual-weapon-overhaul/
├── plan.md              # Implementation Plan (/speckit-plan output)
├── research.md          # Technical Decisions & Benchmarking (Phase 0)
├── data-model.md        # Entity Schemas, Component Extensions, FSM (Phase 1)
├── contracts/           # API & Configuration Contracts (Phase 1)
│   └── weapon-visual-contracts.yaml
├── quickstart.md        # Runnable Test Scenarios & Manual Guide (Phase 1)
├── checklists/
│   └── requirements.md  # Specification Quality Checklist (16/16 PASS)
└── tasks.md             # Task Breakdown & Dependencies (/speckit-tasks output)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── WeaponTierConfig.ts   # 5-Tier configurations, geometry metrics, audio tones
│   ├── EnemyVariants.ts       # Multi-color neon palettes and squad role telegraphs
│   └── ParallaxState.ts       # 3-Layer star, nebula, and cosmic dust data structures
├── ecs/
│   ├── Component.ts           # Extended ProjectileComponent (isPiercing) & WeaponTier
│   └── BulletPool.ts          # Pooled bullet state reset and penetration tracking
├── systems/
│   ├── WeaponSystem.ts        # 5-tier firing kinematics, stream spread, and recoil
│   ├── CollisionSystem.ts     # Armor-piercing projectile penetration physics
│   ├── DropSystem.ts          # 100% Commander & 20% Fighter upgrade token drops
│   ├── HealthSystem.ts        # Life loss weapon degradation (Tier - 1 penalty)
│   ├── RenderSystem.ts        # Dynamic thruster flames, ship banking tilt, neon bloom
│   ├── ParallaxSystem.ts      # 3-layer parallax starfield rendering system
│   └── VFXSystem.ts           # Tactical micro-shake and overcharge shockwaves
├── ui/
│   ├── HUD.ts                 # Real-time T1-T5 weapon badge and upgrade visual cues
│   └── GameOverScreen.ts      # Clean layout alignment with zero layer overlap
└── main.ts                    # Bootstrap integration of parallax and 5-tier weapon systems

tests/
├── unit/
│   ├── weapon-5tier.test.ts          # Tier 1 to 5 progression and geometry tests
│   ├── piercing-projectiles.test.ts  # Tier 5 armor-piercing laser physics tests
│   ├── life-loss-penalty.test.ts     # Tier - 1 degradation on life loss tests
│   ├── token-drops.test.ts           # 100% Commander & 20% Fighter drop rate tests
│   └── parallax-visuals.test.ts      # 3-layer scroll and ship banking tilt tests
└── integration/
    └── visual-overhaul-performance.test.ts # 60 FPS Danmaku + Parallax frame budget tests
```

**Structure Decision**: Integrated directly into the core clean ECS architecture under `src/components/`, `src/systems/`, and `src/ui/` with modular decoupling, preserving compatibility with both Standard Mode and Hell Mode.

## Complexity Tracking

> No Constitution violations. All features strictly adhere to Principles I–V.
