# Pre-Implementation Quality Checklist: Hell Mode & Internationalization

**Purpose**: Formal requirements-quality gate validating the completeness, clarity, architectural non-destructiveness, and testability of feature requirements prior to task decomposition and code implementation.  
**Created**: 2026-11-04  
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  

**Review Ownership**: This checklist is a reviewer-owned requirements-quality review artifact. Mark an item `[x]` only when the reviewer determines the requirements-quality criterion is satisfied.  
**Marker Semantics**: `[x]` means the criterion has been reviewed and satisfied for requirements quality. It does NOT mean implementation work is complete.  

---

## 1. Architecture & Non-Destructive Modularity Requirements

- [x] CHK001 Are module boundaries explicitly declared such that all Hell Mode code resides in `src/modes/hell/` without modifying existing Standard Mode classes? [Completeness, Plan §Summary]
- [x] CHK002 Does the specification define how Hell Mode systems implement the core `GameSystem` interface (`update(dt)`, `render(ctx)`)? [Consistency, Plan §Technical Context]
- [x] CHK003 Are regression isolation requirements specified to ensure all 38 existing unit and integration tests continue to pass unaltered? [Coverage, Plan §Summary]
- [x] CHK004 Is the event-driven decoupling between core `EventBus` and Hell Mode director fully documented without circular dependencies? [Clarity, Data-Model §1]
- [x] CHK005 Is the cleanup and state reset contract specified when switching between Standard Mode and Hell Mode? [Edge Cases, Plan §Technical Context]

---

## 2. Hell Mode Threat & Wave Progression Requirements

- [x] CHK006 Is the double-damage hazard modifier quantified for both enemy projectile impacts (40 HP) and ship ramming collisions (70 HP)? [Clarity, Spec §FR-002]
- [x] CHK007 Is the +50% enemy volume scaling quantified with exact formation column/row dimensions or squad spawn counts? [Clarity, Spec §FR-003]
- [x] CHK008 Are the entry start coordinates, midpoint intersections, and formation endpoints specified for the Wave 2 dual-squad pincer maneuvers? [Completeness, Spec §FR-004]
- [x] CHK009 Are the trajectories and firing behaviors specified for Wave 3 cross-fire diagonal sweeps? [Completeness, Spec §FR-004]
- [x] CHK010 Is the 3-wave campaign progression sequence and wave transition timing explicitly bounded before the Boss arrival? [Clarity, Spec §FR-008]

---

## 3. Climax Boss Lifecycle & Danmaku Ballistics Requirements

- [x] CHK011 Are the Void Dreadnought flagship Boss baseline attributes (1,200 HP, physical dimensions, core hitbox) defined with testable numeric bounds? [Completeness, Data-Model §2.1]
- [x] CHK012 Are ballistic parameters (16 projectiles, 360° dispersion, 220 px/s speed, 1.8s interval) specified for Phase 1 radial bullet rings? [Clarity, Spec §FR-007, Data-Model §2.2]
- [x] CHK013 Are arc spread angles (±36°) and projectile counts (7-way fan) explicitly defined for Phase 1 spread attacks? [Clarity, Spec §FR-007]
- [x] CHK014 Is the Phase 2 Enrage transition threshold precisely bounded at ≤50% HP (≤600 HP)? [Clarity, Spec §FR-009]
- [x] CHK015 Are the Phase 2 enrage speed multiplier (+25%, 275 px/s) and continuous spiral emission rate (0.06s interval) objectively quantified? [Clarity, Spec §FR-009]
- [x] CHK016 Are the spawn conditions, archetype stats, and formation offsets defined for the 2 summoned Fighter escorts in Phase 2? [Completeness, Spec §FR-009]
- [x] CHK017 Is the guaranteed weapon upgrade drop behavior specified upon destroying the Phase 2 Fighter escorts? [Consistency, Spec §FR-013, Clarification Q4]

---

## 4. Dedicated Boss Health Bar & Visual Feedback Requirements

- [x] CHK018 Are visual positioning, width, height, and z-index layers specified for the dedicated top-viewport Boss Health Bar? [Clarity, Spec §FR-006]
- [x] CHK019 Is the visual transition tell defined when the Boss enters Phase 2 Enrage (e.g., crimson bar shift and glowing core)? [Completeness, Spec §US3/AC3]
- [x] CHK020 Is the pre-boss audiovisual warning alert ("ALERT // VOID DREADNOUGHT APPROACHING") specified with duration and sound cues? [Clarity, Spec §FR-005]
- [x] CHK021 Are Boss hit-flash duration (1 frame / 0.07s) and multi-stage sequential destruction FX requirements documented? [Completeness, Spec §FR-011]
- [x] CHK022 Are accessibility requirements defined for reducing screen-shake and flash intensity during massive Danmaku bursts? [Consistency, Spec §FR-012, Constitution I]

---

## 5. Strict Object Pooling & Frame-Budget Discipline Requirements

- [x] CHK023 Is the dedicated Boss projectile pool capacity explicitly specified (160 pre-warmed bullets) with zero runtime heap allocations? [Completeness, Plan §Constitution Check, Constitution IV]
- [x] CHK024 Is the pool exhaustion policy defined (`RECYCLE_OLDEST`) when bullet saturation exceeds capacity during overlapping barrages? [Clarity, Plan §Technical Context]
- [x] CHK025 Are bullet dimensions and circular collision radii specified for Danmaku projectiles to preserve fair 40–50% core hitbox grazing? [Measurability, Spec §SC-005]
- [x] CHK026 Can the sustained 60 FPS (≤16.7 ms frame step) requirement during 100+ bullet Danmaku storms be objectively benchmarked? [Measurability, Spec §SC-004, Constitution II]
- [x] CHK027 Does the specification require live Boss bullet pool metrics (`Active / Capacity / Peak`) to be observable via the `F3` debug overlay? [Consistency, Constitution IV]

---

## 6. Bilingual Localization & Menu UX Requirements

- [x] CHK028 Are dictionary schemas and canonical keys defined for all UI text across both Vietnamese (`vi`) and English (`en`) locales? [Completeness, Data-Model §3.1]
- [x] CHK029 Is fallback behavior specified if an individual translation key is missing in a secondary locale? [Edge Cases, Research §3]
- [x] CHK030 Are interaction requirements specified for the Title Screen language toggle button (`[ VI | EN ]`)? [Completeness, Spec §US1]
- [x] CHK031 Does the specification require the active language selection to persist across browser sessions in local storage? [Completeness, Plan §Technical Context]
- [x] CHK032 Are interaction requirements defined for selecting between Standard Mode and Hell Mode on the Title Screen? [Clarity, Spec §FR-001]

---

## 7. Scoring, Dedicated Leaderboard & Edge Case Requirements

- [x] CHK033 Is the storage key and data schema defined for the segregated "HELL RANKINGS" local storage cache? [Completeness, Spec §FR-010, Plan §Technical Context]
- [x] CHK034 Does the specification define clear time measurement precision (milliseconds) and display formatting (`MM:SS.mmm`)? [Clarity, Data-Model §2.4]
- [x] CHK035 Is the 15,000-point Boss victory bonus and Stage Victory transition screen explicitly specified? [Clarity, Spec §FR-011]
- [x] CHK036 Is the player respawn safety window (2.5s invulnerability at bottom-center) validated to prevent instant deaths against active Boss Danmaku? [Coverage, Spec §Edge Cases]
- [x] CHK037 Is resolution priority defined when the player loses their final life at the exact frame the Boss reaches 0 HP? [Consistency, Spec §Edge Cases]
- [x] CHK038 Are out-of-bounds cleanup rules specified for Danmaku bullets travelling beyond viewport margins? [Coverage, Spec §Edge Cases]

---

## Notes

- 38/38 requirements-quality criteria verified and satisfied (PASS).
- Review confirms architecture is non-destructive to existing Standard Mode classes, Danmaku object pooling satisfies Constitution IV, Boss 2-phase lifecycle is testable, and bilingual i18n dictionary is complete.
- Ready for `/speckit-implement` execution gate.

