# Feature Specification: Hell Mode & Climax Boss Danmaku Encounter

**Feature Branch**: `002-hell-mode`

**Created**: 2026-11-04

**Status**: Ready for Planning

**Input**: User description: "them hell mode vao he thong, o che do nay, sat thuong cua dich tang gap doi, so luong dich xuat hien nhieu hon va them 1 man xuat hien khac nhau, boss se xuat hien cuoi man voi thanh mau rieng va xa dan dien rong."

## Clarifications

### Session 2026-11-04

- **Q1: Hell Mode Progression & Boss Arrival Cadence** → **Option A**: 3-Wave Campaign + Climax Boss. The player battles through Wave 1 (dense swarm), Wave 2 (dual pincer swoops), and Wave 3 (cross-fire sweeps), concluding with the flagship Boss emergence at the end of Wave 3. Defeating the Boss achieves Stage Victory and submits clear time and score.
- **Q2: Boss Multi-Phase & Enrage Mechanics** → **Option A**: 2-Phase Battle with Enrage at <50% HP. Phase 1 (100%–50% HP) alternates 16-way radial 360° ring bursts and 7-way spread fans. Phase 2 Enrage (<50% HP) increases projectile velocity by +25%, fires continuous spiral bullet streams, and summons 2 escort Fighters.
- **Q3: Leaderboard & Scoring Structure** → **Option A**: Dedicated Hell Mode Leaderboard. Hell Mode records are segregated under a dedicated "HELL RANKINGS" leaderboard category to recognize hardcore clears fairly without distorting Standard Mode scores.
- **Q4: Weapon Tier Recovery During Boss Battle** → **Option A**: Reset to Tier 1 with Escort Drops. Losing a life during the Boss battle resets the player's weapon to Tier 1, but the 2 Fighter escorts summoned by the Boss in Phase 2 are guaranteed to drop Weapon Upgrade tokens upon destruction, providing a viable skill-based recovery path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hell Mode Selection & High-Lethality Combat (Priority: P1)

As an experienced arcade pilot, I want to toggle and enter "Hell Mode" from the main menu where all enemy attacks inflict double damage and enemy swarms are noticeably denser, so that I can experience an extreme survival challenge tailored for veteran players.

**Why this priority**: Establishes the foundational difficulty modifiers (2x damage, +50% enemy volume) and mode selection entry point, delivering an immediately playable and intensely challenging variant of the core game.

**Independent Test**: Start a Hell Mode session from the title screen; verify all enemy projectiles deal 40 damage (2x the normal 20 HP) and ramming deals 70 damage (2x the normal 35 HP), while enemy squad counts increase noticeably across waves.

**Acceptance Scenarios**:

1. **Given** the player is on the Title Screen, **When** they toggle the game mode selector to "HELL MODE" and start the run, **Then** the game session initializes with Hell Mode rules enabled, marked by distinct crimson HUD accent lighting.
2. **Given** an active Hell Mode session, **When** the player ship is hit by an enemy plasma projectile, **Then** the health bar reduces by 40 HP (exactly double the standard 20 HP damage).
3. **Given** an active Hell Mode session, **When** enemy squads spawn, **Then** the wave contains at least 50% more enemy units per formation than the equivalent wave in standard mode.

---

### User Story 2 - Distinct Pincer & Cross-Fire Wave Entry Choreography (Priority: P1)

As a player in Hell Mode, I want to confront unique and disorienting wave entry formations (such as simultaneous dual-margin pincer swoops in Wave 2 and criss-cross diagonal sweeps in Wave 3), so that the combat encounters feel distinct, unpredictable, and demand heightened spatial reflexes compared to standard mode.

**Why this priority**: Introduces new flight choreographies specifically requested by the user ("them 1 man xuat hien khac nhau"), ensuring Hell Mode delivers novel gameplay scenarios beyond simple numerical stat buffs.

**Independent Test**: Play through Hell Mode waves; verify that enemy squads enter using distinct simultaneous left/right pincer maneuvers and diagonal criss-cross entry paths before assembling into formation.

**Acceptance Scenarios**:

1. **Given** Wave 2 begins, **When** enemy squads initiate their entry sequence, **Then** two squads swoop in simultaneously from opposite screen margins (left and right pincer paths) and cross flight vectors without colliding.
2. **Given** enemies executing pincer entry curves, **When** they traverse the screen, **Then** they actively fire aimed suppression rounds toward the player ship along their trajectory.
3. **Given** Wave 3 begins, **When** enemies spawn, **Then** squads enter along intersecting cross-screen diagonal sweeps before locking into dense formation slots.

---

### User Story 3 - Climax Boss Encounter with Dedicated Boss Health Bar & 2-Phase Danmaku (Priority: P2)

As a player who survives the 3 waves of Hell Mode, I want to battle a colossal flagship Boss entity ("VOID DREADNOUGHT") with its own dedicated health bar that saturates the playfield with wide-area bullet hell (danmaku) patterns and enters an enraged phase at <50% HP, so that I experience a climactic, adrenaline-pumping arcade showdown.

**Why this priority**: Delivers the signature boss encounter requested by the user, providing a clear climax to the stage with unique visual presentation, specialized attack patterns, and substantial accomplishment upon victory.

**Independent Test**: Clear Wave 3; verify the arrival of the flagship Boss, the display of the prominent Boss Health Bar, execution of 16-way radial rings and 7-way spread arcs in Phase 1, transition to spiral danmaku and escort summons at <50% HP in Phase 2, and victory resolution upon boss destruction.

**Acceptance Scenarios**:

1. **Given** all enemy squads in Wave 3 are eliminated, **When** the climax trigger activates, **Then** a warning alarm sounds ("ALERT // VOID DREADNOUGHT APPROACHING"), the flagship Boss warps into top-center, and a dedicated full-width Boss Health Bar appears at the top of the viewport.
2. **Given** the Boss is in Phase 1 (100%–50% HP), **When** its attack cycle triggers, **Then** it alternates between 16-way radial 360° circular bullet rings and 7-way spread fans.
3. **Given** the Boss health drops below 50%, **When** entering Phase 2 Enrage, **Then** its health bar color shifts to crimson, projectile velocity increases by +25%, it unleashes continuous spiral bullet streams, and summons up to 2 Fighter escorts.
4. **Given** the player loses a life during the Boss battle, **When** respawning at bottom-center with 2.5s invulnerability, **Then** weapon tier resets to base Tier 1 while the Boss retains its current HP; destroying the summoned Phase 2 Fighter escorts drops guaranteed Weapon Upgrade tokens.
5. **Given** the player fires upon the Boss, **When** player lasers connect with the Boss hull, **Then** the Boss health bar depletes accurately in real time with hit-flash feedback.
6. **Given** the Boss health reaches zero, **When** destruction resolves, **Then** the Boss explodes in a multi-stage sequential detonation, clearing all remaining hostile bullets, awarding a 15,000-point bonus, and presenting the "STAGE VICTORY" completion screen.

---

### User Story 4 - Dedicated Hell Mode Leaderboard & Clear Time Tracking (Priority: P3)

As a competitive player, I want my Hell Mode victories, clear times, and high scores tracked distinctly on a dedicated "HELL RANKINGS" company leaderboard with prestigious badges, so that I can earn company-wide recognition for conquering the highest difficulty.

**Why this priority**: Drives long-term replayability and arcade rivalry by rewarding players who master the demanding high-damage, high-density mechanics of Hell Mode without polluting standard endless high scores.

**Independent Test**: Complete or perish in a Hell Mode run; verify the final score and clear status are submitted to the dedicated Hell Mode leaderboard, recorded in local storage, and visible on the Game Over / Victory screen with a "🔥 HELL" badge.

**Acceptance Scenarios**:

1. **Given** a Hell Mode run concludes in Victory or Game Over, **When** submitting the score, **Then** the record is routed to the dedicated "HELL RANKINGS" board along with total score, boss clear status, and run duration.
2. **Given** viewing the in-game Leaderboard modal, **When** toggling the "HELL RANKINGS" tab, **Then** top Hell Mode pilots are listed with their ranks, clear times, and scores.

---

### Edge Cases

- **Cockpit Core Grazing in Dense Danmaku**: Under dense wide-area Boss bullet rings, bullets passing through outer wingtips outside the 40–50% core cockpit hitbox must inflict 0 damage and generate graze sparks, enabling tight bullet-dodging without unfair instant deaths.
- **Player Death During Boss Fight & Weapon Recovery**: If the player loses a life during the Boss battle and has remaining lives, the ship respawns at bottom-center with 2.5 seconds of invulnerability and weapon reset to Tier 1 while the Boss remains active on screen at its current health. To recover weapon tiers, destroying the Boss's summoned Phase 2 Fighter escorts yields guaranteed Weapon Upgrade drops.
- **Simultaneous Lethal Damage & Boss Destruction**: If the player takes fatal damage on their final life at the exact frame the Boss reaches 0 HP, player defeat takes priority, triggering Game Over.
- **Danmaku Bullet Pool Saturation**: Wide-area Boss attacks (e.g., 20+ bullets per burst) must draw from the pre-warmed object pool without allocating new memory, respecting the strict 60 FPS frame budget and Constitution Principle IV.
- **Boss Viewport Bounds**: The Boss entity must never exit the visible upper playfield or overlap with the player's bottom movement area, preventing unfair body-ramming deaths.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a mode toggle on the Title Screen allowing players to choose between "STANDARD MODE" (Endless) and "HELL MODE" (3-Wave Campaign + Boss) before starting a run.
- **FR-002**: In Hell Mode, all hostile enemy damage MUST be doubled (enemy bullets deal 40 HP damage instead of 20 HP; enemy ship collisions deal 70 HP damage instead of 35 HP).
- **FR-003**: In Hell Mode, enemy wave composition MUST spawn at least 50% more enemy units per wave compared to Standard Mode, arranged in denser formation layouts.
- **FR-004**: System MUST introduce at least one distinct new entry choreography exclusive to Hell Mode: Wave 2 dual-squad simultaneous lateral pincer swoops, and Wave 3 intersecting cross-screen diagonal sweeps.
- **FR-005**: System MUST feature a flagship Boss entity ("VOID DREADNOUGHT") that emerges at the climax of Wave 3 following an audiovisual warning cue ("ALERT // VOID DREADNOUGHT APPROACHING").
- **FR-006**: System MUST render a dedicated, high-contrast Boss Health Bar positioned prominently at the top of the viewport (below the top HUD bar), displaying the Boss's remaining HP and phase state in real time.
- **FR-007**: The Boss MUST execute wide-area bullet dispersion patterns (danmaku), including 16-way radial circular bullet bursts (dispersed 360 degrees) and alternating 7-way spread fans.
- **FR-008**: System MUST structure the Hell Mode campaign as a 3-wave progression (Wave 1: high-density swarm, Wave 2: dual pincer sweeps, Wave 3: cross-fire swarms) culminating in the flagship Boss arrival at the end of Wave 3.
- **FR-009**: The Boss MUST feature a 2-phase combat lifecycle: Phase 1 (100%–50% HP) executing 16-way radial ring bursts and 7-way spread fans; Phase 2 (<50% HP Enrage) accelerating bullet velocity by +25%, emitting continuous spiral bullet streams, and summoning up to 2 Fighter escorts.
- **FR-010**: System MUST maintain a dedicated "HELL RANKINGS" category on the internal company leaderboard (in `localStorage` and via `LeaderboardClient`), isolating Hell Mode scores and clear times from Standard Mode runs while honoring the distinct "🔥 HELL" pilot emblem.
- **FR-011**: Defeating the Boss MUST trigger a celebratory multi-explosion sequence, immediately neutralize all active enemy projectiles on screen, award a 15,000-point victory bonus, and transition to the Stage Victory screen.
- **FR-012**: All Hell Mode bullet storms, particle effects, and screen-shakes MUST remain fully compatible with user accessibility settings (Quality Presets, Reduced Flash, and Screen Shake slider) without exceeding the 16.7 ms frame budget.
- **FR-013**: If a player loses a life during the Boss battle, the weapon tier MUST reset to Tier 1; the 2 Fighter escorts summoned by the Boss in Phase 2 MUST guarantee dropping collectible Weapon Upgrade tokens upon destruction to enable recovery.

### Key Entities *(include if feature involves data)*

- **GameModeConfig**: Defines active session rule parameters: `modeId` ('STANDARD' | 'HELL'), `damageMultiplier` (1.0 or 2.0), `enemyDensityMultiplier` (1.0 or 1.5), `scoreMultiplier` (1.0 or 2.0).
- **BossEntity**: Represents the climax flagship hostile. Attributes: `entityId`, `bossName` ("VOID DREADNOUGHT"), `maxHealth` (1,200 HP), `currentHealth`, `phase` (1 | 2), `attackCycleTimer`, `activePatternIndex`.
- **BossHealthBarUI**: Data representation for the dedicated boss vitality display: `bossId`, `currentHpRatio`, `phaseColor`, `isVisible`.
- **DanmakuPattern**: Defines ballistic emission specifications: `patternType` ('RADIAL_BURST' | 'SPREAD_FAN' | 'SPIRAL_STREAM'), `projectileCount`, `speed`, `angularSpread`, `intervalSec`.
- **HellRunResult**: Represents the completed Hell run data: `isVictory`, `score`, `clearTimeMs`, `bossDefeated`, `livesRemaining`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In Hell Mode, 100% of incoming enemy damage events consistently inflict exactly double their Standard Mode damage values across all weapons and collision types.
- **SC-002**: Players can distinguish Hell Mode visually from Standard Mode within 2 seconds of launching a run via distinct title badges, HUD crimson accent tones, and entrance choreography.
- **SC-003**: The dedicated Boss Health Bar updates in real time with 0 visible lag (<16.7 ms) whenever player projectiles strike the Boss.
- **SC-004**: During peak Boss danmaku barrages with over 100 simultaneous bullets on screen, the game maintains a steady 60 FPS without garbage collection stutter or frame drops.
- **SC-005**: 80% of playtesters in usability verification identify the Boss's attack tell warnings and can navigate through bullet gaps using the 40–50% core cockpit hitbox.
- **SC-006**: Hell Mode scores and stage clear times accurately persist to the dedicated "HELL RANKINGS" board without contaminating Standard Mode high scores.

## Assumptions

- The player's base ship attributes (3 lives, 100 HP per life, 8-directional movement, 3-tier weapon upgrade system) remain consistent across both Standard and Hell modes.
- The Boss is an original procedural vector asset ("VOID DREADNOUGHT") complying with Constitution Principle V (IP Safety).
- All Boss projectiles utilize the pre-allocated projectile pool without runtime memory allocations, expanding `EnemyBulletPool` capacity to 200 to accommodate dense danmaku rings comfortably.
- Hell Mode is designed as an opt-in challenge accessible directly from the Title Screen for any employee seeking a hardcore arcade experience.
