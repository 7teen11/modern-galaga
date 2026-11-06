# Feature Specification: Modern 2D Web Game Visual & 5-Tier Weapon Overhaul

**Feature Branch**: `003-visual-weapon-overhaul`  
**Created**: 2026-11-05  
**Status**: Draft  
**Input**: User description: "dung SKILL.md thiet ke lai giao dien chuan game 2d tren web, nang cap do hoa sinh dong hon. su dung nhiu mau khac nhau cho ke dich. nang cap do hoa cho vu khi, nang len 5 cap vu khi, noi lan nang cap vu khi se thay doi hinh anh, tao cam giac manh hon."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 5-Tier Weapon Progression & Escalating Visual Impact (Priority: P1)

Players start with a baseline blaster and collect dropped weapon upgrade tokens to evolve through 5 distinct, increasingly destructive weapon tiers. Each tier overhaul features completely new projectile geometries, radiant energy color palettes, expanded firing trajectories, and intensified impact VFX that visually and kinesthetically communicate overwhelming firepower.

- **Tier 1 (Single Ion Needle - Cyan `#00f0ff`)**: Rapid single-beam focused kinetic bolt.
- **Tier 2 (Dual Twin Blaster - Emerald `#00ff88`)**: Parallel dual bolts with wider lateral spread.
- **Tier 3 (Tri-Beam Spread Cannon - Golden Amber `#ffcc00`)**: 3-way fan pattern (1 central bolt, 2 angled at $12^\circ$) covering broad enemy waves.
- **Tier 4 (Quad Plasma Annihilator - Electric Violet `#bf55ec`)**: 4-stream heavy plasma barrage with sustained radiant energy trails and muzzle flashes.
- **Tier 5 (Omega Hyper Cannon - Solar Crimson / Prismatic `#ff2a55`)**: Ultimate 5-stream energy wave featuring massive central armor-piercing bolts, wide wing-cannons, ambient muzzle shockwaves, and micro-screen impact feedback.
- **Max-Tier Surplus**: Collecting additional tokens at Tier 5 awards +2,000 Overcharge bonus points and triggers a localized enemy projectile deflection pulse.

**Why this priority**: Directly satisfies the user's primary gameplay request to upgrade to 5 weapon tiers with transformative visuals that create an escalating sense of power.

**Independent Test**: Can be verified independently by spawning weapon tokens, upgrading from Tier 1 to Tier 5, and inspecting bullet models, colors, widths, fire patterns, and impact VFX at each step.

**Acceptance Scenarios**:

1. **Given** player is at Tier 1, **When** collecting a weapon upgrade token, **Then** the ship immediately shifts to Tier 2, firing dual emerald bolts with distinct muzzle sound and particle flare.
2. **Given** player is at Tier 4, **When** collecting a weapon upgrade token, **Then** weapon elevates to Tier 5, emitting the 5-stream Omega barrage with dramatic visual distortion, heavy impact sparks, and a screen-edge energy glow.
3. **Given** player is at Tier 5, **When** collecting an additional weapon upgrade token, **Then** a floating "+2,000 OVERCHARGE" indicator appears, a radial energy wave clears nearby enemy bullets within 80px, and tier remains at 5.
4. **Given** player takes lethal damage and respawns while holding remaining lives, **When** ship re-enters the playfield, **Then** weapon tier degrades by exactly 1 level ($\max(1, \text{Tier} - 1)$), preserving hard-earned progression while maintaining combat stakes.

---

### User Story 2 - Vibrant Multi-Color Enemy Fleet & Role Telegraphing (Priority: P2)

Enemy ships across all formations and swooping squads are upgraded with vibrant, high-contrast neon color schemes and dynamic animations that immediately telegraph their tactical archetype, movement behavior, and attack threat.

- **Scout Variants**: Agile insectoid interceptors rendered in Neon Cyan, Lime Green, and Solar Yellow with pulsing rear ion trail particles.
- **Fighter Variants**: Aggressive wedge-wing dive bombers rendered in Hot Magenta, Blazing Amber, and Cobalt Blue with animated side thrusters.
- **Commander Elites**: Heavy dual-hit dread-vessels in Radiant Gold with deep Crimson command crests, surrounded by an ambient tactical shield glow.
- **Hit Reaction & Telegraphs**: Every enemy flashes bright white on hit, emits colored shrapnel matching their hull palette upon destruction, and changes thruster brightness during high-speed diving attacks.

**Why this priority**: Transforms flat or monotonous enemy visuals into a vivid, readable arcade battlefield where player threats can be identified instantly at high speeds.

**Independent Test**: Can be tested by entering any wave and verifying that Scouts, Fighters, and Commanders spawn with varied color palettes, distinct thruster flame animations, and thematic impact particles.

**Acceptance Scenarios**:

1. **Given** an enemy squad enters the screen, **When** performing a Bézier swoop, **Then** each ship displays animated engine thruster particles that stretch dynamically based on movement velocity.
2. **Given** an enemy takes projectile damage, **When** hit by player fire, **Then** a high-contrast white flash triggers for 70ms accompanied by 6+ directional sparks colored in the enemy's signature neon hue.
3. **Given** a Commander elite is eliminated, **When** its health reaches 0, **Then** it triggers a multi-ring shockwave explosion and guarantees a 100% weapon upgrade capsule drop, while destroyed Fighter escorts possess a 20% random drop probability.

---

### User Story 3 - Modern 2D Web Arcade Interface & Parallax Starfield (Priority: P3)

The visual presentation adheres to industry-standard 2D web game design principles (`SKILL.md`):
- **Parallax Space Canvas**: A 3-layer parallax starfield with distant dim stars, mid-ground swirling nebulae, and foreground hyper-speed cosmic dust to create immersive optical depth.
- **Clean Tactical HUD**: Sleek, non-intrusive heads-up display showcasing real-time health bar with critical danger strobe, current weapon tier badges (T1 through T5 visual icons), lives counter, and arcade-style digital score counters.
- **No Layer Collision (Zero Overlap)**: Clean separation of UI layers (Menu, HUD, Modals, Canvas) ensuring no text or buttons clip into gameplay areas or status bars.
- **Juice & Game Feel**: Controlled micro screen shake (50–150ms) on heavy impacts, ship banking rotation when strafing left/right, and subtle squash & stretch when firing high-tier weapons.

**Why this priority**: Elevates the game from a basic web canvas to a professional, cohesive 2D arcade production with rich visual clarity and responsive feedback.

**Independent Test**: Can be tested in browser by moving the ship left/right to observe banking tilt, watching the multi-layer parallax backdrop scroll continuously, and inspecting the HUD layout across varying browser window sizes.

**Acceptance Scenarios**:

1. **Given** the game is running, **When** the canvas renders, **Then** 3 distinct background layers scroll at differing speeds ($0.2\times$, $0.6\times$, $1.2\times$), generating fluid depth perception without performance stutter.
2. **Given** player steers laterally, **When** pressing left or right controls, **Then** the player ship model tilts smoothly up to $15^\circ$ with animated wingtip vortex trails.
3. **Given** player fires Tier 4 or Tier 5 weapons, **When** bullets discharge, **Then** the ship exhibits a subtle 2-pixel recoil displacement and micro-shake that ceases immediately upon releasing the trigger.

---

### User Story 4 - High-Tier Weapon Mechanics & Tactile Power Delivery (Priority: P4)

Higher weapon tiers deliver not just cosmetic changes, but authentic tactile and tactical supremacy that rewards players for survival and accurate token collection.

- **Bullet Shapes & Visual Identity**:
  - Tier 1: Slender cyan laser bolts ($4\times 14\text{px}$) with pinpoint tip.
  - Tier 2: Dual parallel bolts with emerald glow rings ($6\times 16\text{px}$).
  - Tier 3: Triangular energy fangs with trailing spark emitters ($8\times 18\text{px}$).
  - Tier 4: Heavy plasma spheres wrapped in rotating electric arcs ($12\times 22\text{px}$).
  - Tier 5: Omega Vanguard Hyper Beam firing 5 streams with twin central armor-piercing hyper beams ($14\times 30\text{px}$) that slice continuously through multiple enemy hulls on the same trajectory, flanked by dual angled solar-plasma wing bolts.

**Why this priority**: Ensures that reaching the ultimate weapon tiers feels immensely satisfying and mechanically distinct from earlier tiers.

**Independent Test**: Can be tested by firing at dense enemy clusters in Wave 2/3 at Tier 1 versus Tier 5 and comparing time-to-kill, bullet spread radius, and visual feedback.

**Acceptance Scenarios**:

1. **Given** player reaches Tier 5, **When** firing into an enemy formation, **Then** central armor-piercing beams penetrate through front-line scouts to strike rear commanders in a single blast with heavy impact sparks and screen-edge energy glow.
2. **Given** player fires continuously across 10 seconds, **When** weapon is active, **Then** frame rate maintains a rock-solid 60 FPS without memory allocation spikes or frame stuttering.

---

### Edge Cases

- **Rapid Multiple Pickups**: If a player collects two weapon upgrade tokens in rapid succession (< 0.2s), both upgrades must register sequentially (e.g., Tier 2 $\rightarrow$ Tier 3 $\rightarrow$ Tier 4) with appropriate auditory and visual cue stacking.
- **Weapon Fire during Game Pause**: If the game is paused while the player is holding the fire button, firing animations, projectile generation, and screen shake must immediately halt with zero orphaned timers.
- **Retina & High-DPI Scaling**: On high-DPI displays (DPR $\ge 2$), all projectile vector glows, enemy sprites, and HUD elements must render razor-sharp without blurriness or pixel stretching (Constitution Principle I).
- **Reduced Flash / Photosensitivity Mode**: In accessibility settings, when "Reduced Flash" is toggled ON, weapon Tier 4/5 muzzle strobes, hit-flashes, and explosion bloom intensities must be attenuated to comfortable soft thresholds.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support 5 discrete weapon tiers (Tier 1 through Tier 5) with distinct visual geometries, firing formations, and damage characteristics.
- **FR-002**: System MUST render unique projectile visual models and distinct color themes for each tier: Tier 1 (Cyan), Tier 2 (Emerald), Tier 3 (Golden Amber), Tier 4 (Electric Violet), and Tier 5 (Solar Crimson / Prismatic).
- **FR-003**: System MUST display dedicated weapon tier visual indicators on the in-game HUD showing the current active tier level (T1 to T5) and upgrade progress.
- **FR-004**: System MUST award a surplus score bonus (+2,000 points) and emit a protective projectile clearing wave when collecting additional tokens while already at Tier 5.
- **FR-005**: System MUST degrade player weapon tier by 1 level ($\max(1, \text{currentTier} - 1)$) upon ship destruction and respawn when lives remain.
- **FR-006**: System MUST render diverse enemy color variations across Scout, Fighter, and Commander archetypes, assigning distinct neon visual palettes to distinguish squad roles.
- **FR-007**: System MUST render dynamic animated engine thruster flame effects on all player and enemy ships with speed-proportional stretching.
- **FR-008**: System MUST render a 3-layer parallax scrolling starry background (distant star clusters, ambient nebula gradients, foreground cosmic dust particles) that scrolls continuously during gameplay.
- **FR-009**: System MUST apply ship banking tilt animations (up to $15^\circ$) when the player maneuvers left or right across the screen.
- **FR-010**: System MUST incorporate controlled micro screen shake (intensity: 1–3px, duration: 50–120ms) when discharging Tier 5 weapons or destroying heavy elite enemies.
- **FR-011**: System MUST support configurable visual accessibility options (Reduced Flash & Visual Quality presets) in accordance with Constitution Principle I.
- **FR-012**: System MUST equip Tier 5 projectiles with armor-piercing capabilities where the two central beams penetrate through all enemies in their vertical trajectory rather than terminating on first contact.
- **FR-013**: System MUST manage all newly introduced projectile and particle effects using pre-allocated, zero-allocation object pools adhering to Constitution Principle IV.

### Key Entities

- **WeaponTierDefinition**: Configuration specifying tier level (1–5), projectile sprite/geometry, bullet speed, damage scalar, firing offset coordinates, spread angles, muzzle glow color, and audio signature.
- **ParallaxLayer**: Background plane data structure encapsulating particle count, scroll speed multiplier, star density, color palette, and procedural rendering rules.
- **EnemyColorTheme**: Archetype aesthetic schema mapping squad tier/type to primary hull color, secondary trim color, engine thruster hue, and explosion shrapnel palette.
- **WeaponState**: Player entity component tracking current tier level (1–5), fire cooldown timer, surplus overcharge counter, and visual muzzle flash timer.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of weapon tiers (1 to 5) are immediately visually distinguishable by players within 200 milliseconds of firing based solely on projectile shape, color, and spread pattern.
- **SC-002**: Game maintains a constant 60 frames per second (frame time $\le 16.67\text{ ms}$) even when firing Tier 5 weapons at maximum fire rate amidst 30+ colored enemies and active Danmaku barrages on reference hardware.
- **SC-003**: Player transition time between weapon tiers upon token pickup occurs within 1 frame (zero perceptible delay) accompanied by clear audio-visual reinforcement.
- **SC-004**: Visual clarity test: 95% of players can differentiate enemy archetypes (Scout, Fighter, Commander) across all color variants during high-speed swooping maneuvers.
- **SC-005**: Zero runtime heap allocations (`0 new objects`) during gameplay weapon firing, projectile movement, and particle dissipation (verified via performance profiling).

---

## Assumptions

- **Canvas Logical Dimensions**: The game retains its canonical $600 \times 800$ logical coordinate system with Retina High-DPI backing store scaling (`window.devicePixelRatio`).
- **Control Parity**: Upgraded weapon tiers require no new control inputs; auto-fire / spacebar firing mechanics remain identical and intuitive.
- **Audio Synthesizer Integration**: Web Audio API procedural synthesizer handles tone frequency and harmonic modulation for Tier 1 through Tier 5 shots without requiring external bulky audio audio files.
- **Existing Mode Compatibility**: All visual upgrades and 5 weapon tiers are fully functional in both Standard Mode and Hell Mode.

