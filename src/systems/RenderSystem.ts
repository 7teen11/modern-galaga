import { EntityManager } from '../ecs/Entity';
import { EntityId, WeaponTier } from '../ecs/Component';
import { Game, GameSystem } from '../core/Game';
import { VisualQualityPreset } from '../services/StorageService';
import {
  WEAPON_TIER_SPECS,
  OVERCHARGE_RADIAL_CLEAR_RADIUS_PX
} from '../components/WeaponTierConfig';
import { selectEnemyColorVariant } from '../components/EnemyVariants';
import { ParallaxSystem } from './ParallaxSystem';

/**
 * High-Fidelity Neon Arcade Canvas 2D Renderer (Constitution Principle I & V).
 * Draws:
 * - 3-layer Parallax Starfield, Nebulae, and Cosmic Dust (FR-009)
 * - Player ship with +-15 deg banking tilt, wingtip trails, recoil kickback, and 5-tier wing pods (FR-010)
 * - Multi-color neon Enemy Fleet with velocity-stretching engine thrusters (FR-006, FR-007)
 * - Distinct 5-Tier Weapon Projectiles with additive neon bloom and armor-piercing hyper beams (FR-002)
 */
export class RenderSystem implements GameSystem {
  private readonly entities: EntityManager;
  private playerId: EntityId;
  private readonly width: number;
  private readonly height: number;
  public readonly parallaxSystem: ParallaxSystem;

  public screenShakeOffsetX = 0;
  public screenShakeOffsetY = 0;
  public playerRecoilOffsetY = 0;
  public showCoreHitboxDebug = false;
  public reducedFlash = false;
  public qualityPreset: VisualQualityPreset = 'HIGH';
  private pulseTime = 0;

  // Pre-allocated Overcharge 80px radial pulse & floating indicator state (US1/AC3, FR-004)
  private overchargePulseTimer = 0;
  private readonly overchargePulseMaxDuration = 0.65;
  private overchargeOriginX = 0;
  private overchargeOriginY = 0;

  constructor(
    entities: EntityManager,
    playerId: EntityId,
    width = Game.LOGICAL_WIDTH,
    height = Game.LOGICAL_HEIGHT,
    parallaxSystem?: ParallaxSystem
  ) {
    this.entities = entities;
    this.playerId = playerId;
    this.width = width;
    this.height = height;
    this.parallaxSystem = parallaxSystem ?? new ParallaxSystem(width, height);
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public triggerPlayerRecoil(recoilPx: number): void {
    this.playerRecoilOffsetY = Math.min(4, Math.max(this.playerRecoilOffsetY, recoilPx));
  }

  /**
   * Triggers the expanding 80px radial energy wave ring and floating "+2,000 OVERCHARGE" indicator (US1/AC3).
   */
  public triggerOverchargePulse(x: number, y: number): void {
    this.overchargePulseTimer = this.overchargePulseMaxDuration;
    this.overchargeOriginX = x;
    this.overchargeOriginY = y;
  }

  public isOverchargePulseActive(): boolean {
    return this.overchargePulseTimer > 0;
  }

  public update(dt: number): void {
    this.pulseTime += dt;
    this.parallaxSystem.qualityPreset = this.qualityPreset;
    this.parallaxSystem.update(dt);

    if (this.playerRecoilOffsetY > 0) {
      this.playerRecoilOffsetY = Math.max(0, this.playerRecoilOffsetY - 18 * dt);
    }

    if (this.overchargePulseTimer > 0) {
      this.overchargePulseTimer = Math.max(0, this.overchargePulseTimer - dt);
    }

    // Decay hit-flash timers on active entities
    for (const id of this.entities.getActiveEntities()) {
      const r = this.entities.renders.get(id);
      if (r && r.hitFlashTimer > 0) {
        r.hitFlashTimer = Math.max(0, r.hitFlashTimer - dt);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Clear deep space backdrop
    ctx.fillStyle = '#04050c';
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply micro screen-shake offset if active (FR-016)
    if (this.screenShakeOffsetX !== 0 || this.screenShakeOffsetY !== 0) {
      ctx.translate(this.screenShakeOffsetX, this.screenShakeOffsetY);
    }

    // 1. 3-Layer Parallax Starfield, Nebulae & Cosmic Dust (FR-009)
    this.parallaxSystem.render(ctx);

    // 2. Power-ups
    this.renderPowerUps(ctx);

    // 3. Multi-Color Enemy Fleet & Animated Thrusters (FR-006, FR-007)
    this.renderEnemies(ctx);

    // 4. Player Ship with Banking Tilt & Tier Wing Pods (FR-010)
    this.renderPlayer(ctx);

    // 5. 5-Tier Projectiles (Additive Neon Glow, FR-002)
    this.renderProjectiles(ctx);

    // 6. Overcharge 80px Radial Energy Pulse & Floating "+2,000 OVERCHARGE" Text (US1/AC3)
    this.renderOverchargePulse(ctx);

    ctx.restore();
  }

  private renderOverchargePulse(ctx: CanvasRenderingContext2D): void {
    if (this.overchargePulseTimer <= 0) return;

    const progress =
      1 - this.overchargePulseTimer / this.overchargePulseMaxDuration;
    const radius = 14 + progress * (OVERCHARGE_RADIAL_CLEAR_RADIUS_PX - 14);
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.globalAlpha = this.reducedFlash ? alpha * 0.55 : alpha;
    ctx.strokeStyle = '#ff2a55';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.overchargeOriginX, this.overchargeOriginY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      this.overchargeOriginX,
      this.overchargeOriginY,
      radius * 0.78,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Floating "+2,000 OVERCHARGE" text rising from pickup coordinate
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '+2,000 OVERCHARGE',
      this.overchargeOriginX,
      this.overchargeOriginY - 22 - progress * 26
    );
    ctx.restore();
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    if (!this.entities.isEntityActive(this.playerId)) return;

    const t = this.entities.transforms.get(this.playerId);
    const r = this.entities.renders.get(this.playerId);
    const h = this.entities.healths.get(this.playerId);
    const hitbox = this.entities.hitboxes.get(this.playerId);
    const weapon = this.entities.weapons.get(this.playerId);
    if (!t || !r) return;

    // Invulnerability blink feedback (FR-004, FR-016)
    if (h && h.invulnerableTimer > 0 && !this.reducedFlash) {
      const blinkOn = Math.floor(h.invulnerableTimer * 18) % 2 === 0;
      if (!blinkOn) return;
    }

    ctx.save();
    ctx.translate(t.x, t.y + this.playerRecoilOffsetY);
    ctx.rotate(t.rotation);

    if (h && h.invulnerableTimer > 0 && this.reducedFlash) {
      ctx.globalAlpha = 0.55;
    }

    const isFlashing = !this.reducedFlash && r.hitFlashTimer > 0;
    const tier: WeaponTier = weapon ? weapon.tier : 1;
    const tierSpec = WEAPON_TIER_SPECS[tier] ?? WEAPON_TIER_SPECS[1];

    // Wingtip plasma trails when banking laterally (FR-010)
    if (Math.abs(t.rotation) > 0.04) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.32)';
      ctx.fillRect(-22, 16, 3, 14);
      ctx.fillRect(19, 16, 3, 14);
    }

    // Engine plasma thruster flame (scales with forward/lateral thrust)
    const speedMag = Math.sqrt(t.vx * t.vx + t.vy * t.vy);
    const stretch = 1 + Math.min(0.8, speedMag / 450);
    const flameLen = (14 + Math.sin(this.pulseTime * 35) * 5) * stretch;
    ctx.fillStyle = tier >= 4 ? tierSpec.primaryColor : '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(-7, 18);
    ctx.lineTo(0, 18 + flameLen);
    ctx.lineTo(7, 18);
    ctx.closePath();
    ctx.fill();

    // Outer swept wings (Grazing zone - FR-014)
    ctx.fillStyle = isFlashing ? '#ffffff' : '#16284c';
    ctx.strokeStyle = isFlashing ? '#ffffff' : '#00f0ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(22, 16);
    ctx.lineTo(13, 21);
    ctx.lineTo(6, 12);
    ctx.lineTo(-6, 12);
    ctx.lineTo(-13, 21);
    ctx.lineTo(-22, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Escalating Weapon Tier Wing Pods & Shoulder Cannons (FR-001, FR-002)
    if (tier >= 2) {
      ctx.fillStyle = isFlashing ? '#ffffff' : tierSpec.primaryColor;
      ctx.fillRect(-17, 2, 4, 12);
      ctx.fillRect(13, 2, 4, 12);
    }
    if (tier >= 4) {
      // Heavy outer plasma pods for Tier 4 & Tier 5
      ctx.fillStyle = isFlashing ? '#ffffff' : tierSpec.primaryColor;
      ctx.fillRect(-23, 5, 4, 11);
      ctx.fillRect(19, 5, 4, 11);
    }
    if (tier === 5 && !this.reducedFlash) {
      // Tier 5 Omega Hyper Core aura
      ctx.strokeStyle = '#ff2a55';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -2, 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Inner fuselage & glowing cockpit core (45% Core Hitbox - FR-014)
    ctx.fillStyle = isFlashing ? '#ffffff' : tier >= 4 ? tierSpec.primaryColor : '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, hitbox ? hitbox.radius : 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e6ffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const id of this.entities.getActiveEntities()) {
      const behavior = this.entities.enemyBehaviors.get(id);
      if (!behavior) continue;

      const t = this.entities.transforms.get(id);
      const r = this.entities.renders.get(id);
      if (!t || !r) continue;

      const fallbackVariant = selectEnemyColorVariant(
        behavior.archetype,
        behavior.formationGridX,
        behavior.formationGridY
      );
      const primaryColor = r.hullPrimary ?? fallbackVariant.hullPrimary;
      const secondaryColor = r.hullSecondary ?? fallbackVariant.hullSecondary;
      const thrusterColor = r.thrusterColor ?? fallbackVariant.thrusterColor;

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);

      const isFlashing = !this.reducedFlash && r.hitFlashTimer > 0;

      // Dynamic animated engine thruster flame stretching with velocity (FR-007)
      const velocityMag =
        behavior.state === 'ENTERING_SPLINE'
          ? 260
          : Math.sqrt(t.vx * t.vx + t.vy * t.vy);
      const stretchFactor =
        1 + Math.min(1.4, velocityMag / 220) + Math.sin(this.pulseTime * 28 + id) * 0.2;
      const flameLength = fallbackVariant.baseThrusterLength * stretchFactor;

      ctx.fillStyle = isFlashing ? '#ffffff' : thrusterColor;
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.lineTo(0, -10 - flameLength);
      ctx.lineTo(5, -10);
      ctx.closePath();
      ctx.fill();

      if (behavior.archetype === 'SCOUT') {
        // Multi-color neon insectoid Scout (Cyan/Emerald, Solar Amber, Toxic Lime)
        ctx.fillStyle = isFlashing ? '#ffffff' : secondaryColor;
        ctx.strokeStyle = isFlashing ? '#ffffff' : primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(14, -10);
        ctx.lineTo(0, -4);
        ctx.lineTo(-14, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit sensor eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (behavior.archetype === 'FIGHTER') {
        // Multi-color heavy assault Fighter (Hot Magenta, Crimson Orange, Cobalt Blue)
        ctx.fillStyle = isFlashing ? '#ffffff' : secondaryColor;
        ctx.strokeStyle = isFlashing ? '#ffffff' : primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(17, -6);
        ctx.lineTo(9, -15);
        ctx.lineTo(-9, -15);
        ctx.lineTo(-17, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Twin wing stripes
        ctx.fillStyle = isFlashing ? '#ffffff' : primaryColor;
        ctx.fillRect(-11, -6, 4, 8);
        ctx.fillRect(7, -6, 4, 8);
      } else {
        // Imperial Gold / Royal Violet Elite Commander (100% Weapon Upgrade Drop)
        ctx.fillStyle = isFlashing ? '#ffffff' : secondaryColor;
        ctx.strokeStyle = isFlashing ? '#ffffff' : primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.lineTo(22, 2);
        ctx.lineTo(15, -18);
        ctx.lineTo(0, -12);
        ctx.lineTo(-15, -18);
        ctx.lineTo(-22, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Commander energy shield ring & crown core
        ctx.fillStyle = isFlashing ? '#ffffff' : primaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderPowerUps(ctx: CanvasRenderingContext2D): void {
    for (const id of this.entities.getActiveEntities()) {
      const p = this.entities.powerUps.get(id);
      if (!p) continue;
      const t = this.entities.transforms.get(id);
      if (!t) continue;

      ctx.save();
      ctx.translate(t.x, t.y);

      const pulse = 1 + Math.sin(this.pulseTime * 10) * 0.12;
      ctx.scale(pulse, pulse);

      ctx.fillStyle = '#072a24';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', 0, 1);

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const isHighQuality = this.qualityPreset === 'HIGH';
    // Additive blending for vivid neon energy bloom in HIGH preset (Principle I, FR-016)
    ctx.globalCompositeOperation = isHighQuality ? 'lighter' : 'source-over';

    for (const id of this.entities.getActiveEntities()) {
      const proj = this.entities.projectiles.get(id);
      if (!proj) continue;
      const t = this.entities.transforms.get(id);
      const r = this.entities.renders.get(id);
      if (!t) continue;

      ctx.save();
      ctx.translate(t.x, t.y);

      if (proj.sourceAffiliation === 'PLAYER') {
        ctx.rotate(t.rotation);
        const tier: WeaponTier = proj.tier ?? 1;
        const spec = WEAPON_TIER_SPECS[tier] ?? WEAPON_TIER_SPECS[1];
        const w = r ? r.width : spec.bulletWidth;
        const h = r ? r.height : spec.bulletHeight;
        const primaryColor = proj.color ?? spec.primaryColor;
        const coreColor = spec.coreColor;

        // Outer neon bloom halo (attenuated when reducedFlash is enabled, T027)
        if (isHighQuality) {
          ctx.globalAlpha = this.reducedFlash ? 0.22 : 0.42;
          ctx.fillStyle = primaryColor;
          ctx.fillRect(-w * 0.7, -h * 0.6, w * 1.4, h * 1.2);
          ctx.globalAlpha = 1.0;
        }

        if (tier === 1) {
          // Tier 1: Single Ion Needle
          ctx.fillStyle = primaryColor;
          ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
          ctx.fillStyle = coreColor;
          ctx.fillRect(-w * 0.25, -h * 0.4, w * 0.5, h * 0.8);
        } else if (tier === 2) {
          // Tier 2: Twin Pulse Capsule
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 3);
          ctx.fill();
          ctx.fillStyle = coreColor;
          ctx.fillRect(-w * 0.25, -h * 0.35, w * 0.5, h * 0.7);
        } else if (tier === 3) {
          // Tier 3: Golden Amber Crescent Wave Bolt
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.moveTo(0, -h * 0.5);
          ctx.lineTo(w * 0.55, h * 0.45);
          ctx.lineTo(0, h * 0.2);
          ctx.lineTo(-w * 0.55, h * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = coreColor;
          ctx.fillRect(-w * 0.2, -h * 0.3, w * 0.4, h * 0.5);
        } else if (tier === 4) {
          // Tier 4: Electric Violet Plasma Lance
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.moveTo(0, -h * 0.55);
          ctx.lineTo(w * 0.5, 0);
          ctx.lineTo(0, h * 0.55);
          ctx.lineTo(-w * 0.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = coreColor;
          ctx.fillRect(-w * 0.22, -h * 0.38, w * 0.44, h * 0.76);
        } else {
          // Tier 5: Omega Vanguard Armor-Piercing Hyper Beam
          ctx.fillStyle = primaryColor;
          ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
          ctx.fillStyle = coreColor;
          ctx.fillRect(-w * 0.28, -h * 0.46, w * 0.56, h * 0.92);
        }
      } else {
        // Enemy plasma orb
        if (isHighQuality) {
          ctx.fillStyle = 'rgba(255, 30, 138, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ff99cc';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
