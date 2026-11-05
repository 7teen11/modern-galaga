# Feature Specification: Core Space Shooter Gameplay Mechanics

**Feature Branch**: `001-space-shooter-core`

**Created**: 2026-11-04

**Status**: Ready for Planning

**Input**: User description: "xay dung game ban ruoi voi tau vu tru di chuyen 8 huong, ke dich xuat hien theo dot voi hanh vi da dang, co he thong tinh diem, nang cap vu khi va thanh mau hien thi ro rang." (Clarifications: Q1=In-run temporary upgrades, Q2=3 Lives with health bar per life, Q3=Endless survival wave scaling).

## Clarifications

### Session 2026-11-04

- Q: How should collision hitboxes be dimensioned for the player ship when interacting with enemy bullets and diving swarms? → A: Forgiving Core Hitbox (~40–50% of sprite size centered at the cockpit/core), allowing near-miss grazing of wings while keeping collision resolution clear and fair.
- Q: How should enemy squads enter the playfield when spawning at the start of each wave? → A: Curved Spline Swoop (squads of 4–6 enemies entering along smooth Bézier curves from screen edges, performing looping flight maneuvers before assembling into the top formation).
- Q: Which visual feedback (VFX & juice) package should apply to hits, destructions, and weapon upgrades? → A: Neon Arcade High-Juice (luminous glowing projectiles, white hit-flashes on impact, directional particle spark/debris bursts on destruction, and brief micro screen-shake <0.2s on high-impact events with a user-configurable intensity toggle/slider).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responsive 8-Directional Flight & Basic Firing (Priority: P1)

As a player, I want to pilot my spaceship fluidly across the playfield in 8 directions and fire projectiles at hostile targets so that I have precise, satisfying arcade control over my ship.

**Why this priority**: Precise movement and shooting form the foundational core loop of a shoot-'em-up. If piloting feels unresponsive or sluggish, the game fails regardless of surrounding features.

**Independent Test**: Can be tested on a blank playfield with target dummies; player moves smoothly in all 8 directions (including diagonals with normalized speed) and fires primary blaster rounds continuously while holding the fire trigger.

**Acceptance Scenarios**:

1. **Given** the player is in an active play session, **When** directional inputs are triggered (Up, Down, Left, Right, and diagonal combinations), **Then** the spaceship translates in 8 corresponding directions while staying bounded within the screen boundaries at consistent velocity.
2. **Given** the spaceship is moving diagonally, **When** measuring velocity vector, **Then** diagonal speed is normalized ($1/\sqrt{2} \approx 0.7071$ per axis) to prevent moving faster than orthogonal directions.
3. **Given** the player holds the fire action, **When** the weapon cooldown elapses, **Then** blaster projectiles spawn from the ship and travel forward at constant velocity.

---

### User Story 2 - Wave-Based Enemies with Diverse Tactical Behaviors (Priority: P1)

As a player, I want enemy formations to enter the screen in structured waves exhibiting diverse tactical behaviors so that combat feels dynamic, challenging, and requires continuous threat prioritization.

**Why this priority**: Enemies provide the interactive challenge and tension. Diverse behavioral archetypes (entry sweeps, formation hovering, dive-bomb kamikaze runs, returning attacks) turn a static shooting range into a genuine arcade experience.

**Independent Test**: Can be tested by spawning individual waves; verify that wave announcer signals arrival, enemies enter along predetermined choreography, settle into staging positions, and execute distinct behavioral states (patrol, aim-and-dive, ranged attack).

**Acceptance Scenarios**:

1. **Given** a new wave starts, **When** enemy squads spawn, **Then** they enter the screen along smooth multi-point Bézier spline flight paths in squads of 4–6 from screen margins, looping dynamically before settling into their top-screen formation grid.
2. **Given** enemies assembled in formation, **When** dynamic attack triggers fire, **Then** individual enemies break formation to execute peeling dive attacks toward the player's last-known position.
3. **Given** an enemy takes damage equal to or exceeding its health threshold, **When** the fatal hit connects, **Then** the enemy is destroyed with celebratory visual/audio impact and awards points.

---

### User Story 3 - Multi-Life Stock with Health Bar & Damage Feedback (Priority: P2)

As a player, I want a stock of 3 lives where each life features a clear health bar and responsive damage feedback so that I can survive multiple minor mistakes, understand my current health at a glance, and respawn smoothly when a life is lost.

**Why this priority**: Modernizing classic one-hit-kill retro shooters requires a forgiving, readable health system. Clear health representation and multiple lives give players tactical agency to take calculated risks while preserving arcade stakes.

**Independent Test**: Can be tested by exposing the player ship to deliberate hazards and enemy bullets; verify the health bar depletes accurately, displays damage flash/shake, decrements lives stock when health reaches 0, respawns with temporary invulnerability, and only triggers Game Over when all 3 lives are gone.

**Acceptance Scenarios**:

1. **Given** an active player ship with full health and 3 lives, **When** collision with an enemy or enemy bullet occurs, **Then** the player's active health bar depletes by the hazard's damage value, and the ship flashes with brief damage invulnerability (0.5s).
2. **Given** the active health bar reaches 0 and the player has remaining lives (e.g., 2 lives left), **When** damage resolves, **Then** the ship is destroyed with an explosion, lives decrement by 1, and the ship respawns at the bottom center with full health and 2.5 seconds of flashing invulnerability.
3. **Given** the player loses their final life (0 lives remaining and health reaches 0), **When** the ship is destroyed, **Then** the game transitions immediately to the Game Over screen.

---

### User Story 4 - In-Run Weapon Upgrades & Power-Up Drops (Priority: P2)

As a player, I want to collect weapon upgrade tokens dropped by defeated elite enemies during a run that elevate my blaster tier so that I can ramp up my firepower to counter increasingly dense enemy waves.

**Why this priority**: In-run weapon progression provides immediate gratification, tactical pacing, and creates exciting high-points during a combat run while keeping a clean competitive baseline for high-score resets.

**Independent Test**: Can be tested by dropping weapon power-ups into the playfield; ship picks them up, weapon tier increments, projectile configuration updates visibly, and weapon power increases.

**Acceptance Scenarios**:

1. **Given** an elite or designated enemy is destroyed, **When** it explodes, **Then** it has a chance to drop a floating weapon upgrade token that slowly drifts downward.
2. **Given** a floating weapon upgrade token on screen, **When** the player ship touches the token, **Then** the ship's weapon upgrades to the next tier (Tier 1: Single Forward Shot -> Tier 2: Dual Parallel Shot -> Tier 3: Triple Spread Shot) and a visual pickup burst is displayed.
3. **Given** the player is at maximum weapon tier (Tier 3), **When** picking up additional weapon tokens, **Then** the player receives a 1,000-point bonus score award instead of an invalid tier increase.
4. **Given** the player loses a life, **When** respawning, **Then** the weapon tier resets back to Tier 1 base blaster.

---

### User Story 5 - Real-Time Scoring & Endless Survival Progression (Priority: P3)

As a player, I want to battle through infinitely scaling waves and watch my score increase in real time so that I can test my endurance and set the highest possible score on the internal leaderboard.

**Why this priority**: Endless scaling and scoring are the core motivators for ongoing replayability and friendly internal competition.

**Independent Test**: Can be tested by clearing consecutive waves; verify each wave increments the wave counter, applies scaling multipliers to enemy count/speed, and accumulates total points dynamically on the HUD.

**Acceptance Scenarios**:

1. **Given** a player destroys an enemy, **When** destruction is confirmed, **Then** the score increments by the designated point value of that enemy archetype.
2. **Given** all enemies in a wave are eliminated, **When** the wave clears, **Then** a wave completion bonus is awarded and the next wave begins with progressive difficulty scaling (e.g., +10% enemy speed and attack frequency per wave).
3. **Given** the player survives across dozens of waves, **When** waves increment, **Then** the wave difficulty continues to scale indefinitely without hard caps until all player lives are lost.
4. **Given** all lives are exhausted, **When** the Game Over screen displays, **Then** the final score and highest wave reached are shown and compared against the recorded session high score.

---

### Edge Cases

- **Simultaneous Lethal Damage & Wave Clear**: If the player takes fatal damage on their last life at the exact moment the final enemy in a wave is destroyed, the game must prioritize player defeat and trigger Game Over.
- **Off-Screen Projectile & Enemy Disposal**: Projectiles and dive-bombing enemies that travel beyond screen boundaries must be cleanly reclaimed and recycled to pools without memory leaks or phantom collisions.
- **Simultaneous Opposing Directional Inputs**: If opposing directions are held simultaneously (e.g., Left + Right, or Up + Down), the inputs must cancel out along that axis resulting in zero movement along that axis.
- **Weapon Reset on Life Loss**: When a player loses a life and respawns, the weapon tier resets to base Tier 1 to maintain classic arcade survival risk/reward.
- **High-Density Bullet Collision Overlaps**: When dozens of bullets collide with targets simultaneously on the same frame, each collision must resolve deterministically without skipped hit detection or multiple duplicate scores for a single entity.
- **Respawn Safety**: When respawning at bottom-center after losing a life, enemies in that immediate area must not instantly re-damage the player during the 2.5-second invulnerability window.
- **Near-Miss / Grazing Tolerance**: Projectiles and enemy hulls passing through the outer wingtip area outside the 40–50% core hitbox do not trigger damage, ensuring tight dodging maneuvers feel fair and rewarding.
- **Visual FX Clutter & Performance Throttling**: If more than 50 particle effects spawn simultaneously during massive explosions, particle pools must cap and gracefully recycle oldest particles to strictly maintain the 60 FPS frame budget.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide 8-directional player ship movement with normalized diagonal speed ($1/\sqrt{2} \approx 0.7071$) and clamped bounds within the active viewport.
- **FR-002**: System MUST support continuous primary weapon firing via sustained input trigger with a defined fire-rate cooldown.
- **FR-003**: System MUST render a prominent, visible player health bar and lives counter (starting at 3 lives) on the HUD, updating in real time.
- **FR-004**: System MUST grant brief temporary invulnerability (0.5s damage blink) immediately following any non-lethal hit, and 2.5s invulnerability upon respawning after a lost life.
- **FR-005**: System MUST spawn enemies in structured, sequential waves in an endless progression, scaling difficulty parameters (enemy speed, projectile frequency, swarm density) after each cleared wave.
- **FR-006**: Enemies MUST exhibit at least three distinct behavioral archetypes:
  1. *Scout / Swarm*: Rapid curved entry path, low health, periodic diving.
  2. *Fighter / Escort*: Standard formation hovering, shoots aimed projectiles, peeling strafing runs.
  3. *Commander / Elite*: Higher health, absorbs damage, triggers coordinated dive attacks with escorts, drops weapon power-ups upon defeat.
- **FR-007**: System MUST support at least three tiers of weapon upgrades (Tier 1: Single Forward Shot; Tier 2: Dual Parallel Shot; Tier 3: Triple Spread Shot).
- **FR-008**: System MUST spawn collectible weapon upgrade items from defeated Commander/Elite enemies and apply instant tier upgrades upon player contact.
- **FR-009**: System MUST track player score continuously in real time, awarding points based on enemy point values, wave completion bonuses, and surplus power-up pickups.
- **FR-010**: System MUST persist and display the highest recorded session score and highest wave achieved on the HUD and Game Over screen.
- **FR-011**: System MUST manage weapon upgrade lifecycle as session-bound temporary progression: upgrades are collected from enemy drops during an active run, enhance weapon tiers up to Tier 3, and reset back to base Tier 1 upon losing a life or restarting the run.
- **FR-012**: System MUST manage player vitality using a multi-life stock with a persistent health bar per life: player begins each run with 3 lives; taking damage depletes the active health bar; reaching 0 health consumes 1 life, triggers a ship destruction sequence, and respawns the ship with full health and 2.5 seconds of invulnerability frames. The run only ends in Game Over when all 3 lives are exhausted.
- **FR-013**: System MUST structure combat as an endless scaling survival mode: enemy waves generate indefinitely with progressive difficulty scaling (speed, density, and projectile aggression modifiers per wave) until player lives reach zero, with final score and highest wave achieved recorded for leaderboard competition.
- **FR-014**: System MUST implement a reduced core hitbox for the player ship (approximately 40–50% of the visual sprite dimensions, centered around the ship's cockpit/core) for detecting projectile and enemy collision, permitting close grazing maneuvers along the wingtips without taking damage.
- **FR-015**: System MUST choreograph enemy wave entries using predefined multi-point Bézier spline paths: squads of 4–6 enemies enter from off-screen margins (sides and top corners), execute continuous looping flight trajectories where they remain shootable and vulnerable to player fire, and transition smoothly into their assigned formation slots.
- **FR-016**: System MUST incorporate a Neon Arcade visual feedback suite complying with Constitution Principle I: projectiles feature luminous bloom/glow, targets render a 1-frame white hit-flash upon taking damage, defeated targets release pooled directional particle sparks and debris fragments, and elite kills/player damage trigger a micro screen-shake effect (duration <0.2 seconds). System MUST provide a settings toggle or intensity slider to reduce or disable screen shake and flashing effects for visual comfort and accessibility.

### Key Entities *(include if feature involves data)*

- **PlayerShip**: Represents the user-controlled spaceship. Attributes: `position`, `velocityVector`, `currentHealth`, `maxHealth`, `livesRemaining` (default 3), `weaponTier` (1-3), `invulnerableTimer`, `coreHitboxBounds` (40-50% centered), `isActive`.
- **Enemy**: Represents hostile targets. Attributes: `archetype` (Scout, Fighter, Commander), `state` (Spawning, InFormation, Diving, Retreating), `healthPoints`, `attackTimer`, `pointValue`, `dropTable`, `collisionBounds`, `entryPathId`.
- **Projectile**: Represents bullets fired by player or enemies. Attributes: `sourceAffiliation` (Player, Enemy), `damage`, `velocityVector`, `isActive`, `collisionRadius`.
- **PowerUp**: Represents collectible in-game drops. Attributes: `type` (WeaponUpgrade, ScoreBonus), `position`, `driftVelocity`, `despawnTimer`.
- **Wave**: Represents a combat encounter unit. Attributes: `waveIndex`, `enemyCompositionList`, `spawnTimings`, `entrySplinePaths`, `difficultyMultiplier`, `isCompleted`.
- **VFXParticle**: Represents short-lived visual feedback elements (sparks, explosion debris). Attributes: `position`, `velocityVector`, `colorGradient`, `lifetimeTimer`, `poolIndex`, `isActive`.
- **ScoreState**: Tracks the active scoring metrics. Attributes: `currentScore`, `sessionHighScore`, `highestWaveCleared`, `enemiesDefeatedCount`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of directional inputs (including all 4 cardinal and 4 diagonal axes) translate into immediate, visually fluid ship movement within 1 frame (<16.7 ms latency at 60 FPS).
- **SC-002**: Players can distinguish all 3 enemy archetypes and anticipate their attack behavior within the first 30 seconds of encountering them.
- **SC-003**: In-game health bar and lives counter accurately reflect player status in real time with 0 noticeable latency or visual desynchronization between hit impact and UI reduction.
- **SC-004**: Players can collect weapon power-ups and achieve upgraded firing patterns (Tier 2 or Tier 3) within the first 3 waves of standard gameplay.
- **SC-005**: Game sustains a consistent frame rate of 60 FPS during peak wave load with up to 40 active enemies and 150 simultaneous on-screen projectiles without stutter or frame drops.
- **SC-006**: 90% of playtesters in usability verification understand how score and lives work, and can state their final score and wave reached upon Game Over.
- **SC-007**: All hit-flash, particle burst, and screen-shake effects execute without exceeding the 16.7 ms frame budget (sustaining steady 60 FPS) and can be toggled or reduced to zero shake in settings within 2 interactions.

## Assumptions

- The primary control scheme supports standard keyboard navigation (e.g., WASD / Arrow keys for 8 directions, Spacebar for firing) with support for controller analog/D-pad where available.
- Weapon upgrades reset to Tier 1 when a life is lost.
- Diagonal movement speed utilizes vector normalization ($1/\sqrt{2} \approx 0.7071$ on each axis) so diagonal traversal does not grant unfair speed advantages over cardinal directions.
- The visual presentation uses high-contrast, sharp color palettes for player, enemy, and projectile entities so that bullet patterns, health indicators, and lives icons remain immediately legible amidst fast action.
- Audio cues (fire sound, hit impact, explosion, power-up jingle, low-health alarm, game over chime) complement all visual states for multi-sensory feedback.
