import { EntityManager } from '../ecs/Entity';
import { EntityId } from '../ecs/Component';
import { Game, GameSystem } from '../core/Game';
import { VisualQualityPreset } from '../services/StorageService';

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
}

/**
 * High-Fidelity Neon Arcade Canvas 2D Renderer (Constitution Principle I & V).
 * Draws procedural vector spaceships, additive glowing laser projectiles,
 * multi-layer parallax starfield, and hit-flash shaders without external copyrighted assets.
 */
export class RenderSystem implements GameSystem {
  private readonly entities: EntityManager;
  private playerId: EntityId;
  private readonly width: number;
  private readonly height: number;
  private readonly stars: Star[] = [];

  public screenShakeOffsetX = 0;
  public screenShakeOffsetY = 0;
  public showCoreHitboxDebug = false;
  public reducedFlash = false;
  public qualityPreset: VisualQualityPreset = 'HIGH';
  private pulseTime = 0;

  constructor(
    entities: EntityManager,
    playerId: EntityId,
    width = Game.LOGICAL_WIDTH,
    height = Game.LOGICAL_HEIGHT
  ) {
    this.entities = entities;
    this.playerId = playerId;
    this.width = width;
    this.height = height;

    this.initStarfield(95);
  }

  private initStarfield(count: number): void {
    const colors = ['#ffffff', '#8be9fd', '#bd93f9', '#ffb86c', '#ff79c6'];
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 25 + layer * 45,
        size: 1 + layer * 0.75,
        color: colors[i % colors.length]
      });
    }
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public update(dt: number): void {
    this.pulseTime += dt;

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += s.speed * dt;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
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

    // 1. Background parallax starfield
    this.renderStarfield(ctx);

    // 2. Power-ups
    this.renderPowerUps(ctx);

    // 3. Enemies
    this.renderEnemies(ctx);

    // 4. Player Ship
    this.renderPlayer(ctx);

    // 5. Projectiles (Additive Neon Glow)
    this.renderProjectiles(ctx);

    ctx.restore();
  }

  private renderStarfield(ctx: CanvasRenderingContext2D): void {
    const isPerf = this.qualityPreset === 'PERFORMANCE';
    for (let i = 0; i < this.stars.length; i++) {
      if (isPerf && i % 2 !== 0) continue;
      const s = this.stars[i];
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.35 + (i % 3) * 0.25;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1.0;
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
    ctx.translate(t.x, t.y);
    if (h && h.invulnerableTimer > 0 && this.reducedFlash) {
      ctx.globalAlpha = 0.55;
    }

    const isFlashing = !this.reducedFlash && r.hitFlashTimer > 0;

    // Engine plasma thruster flame
    const flameLen = 14 + Math.sin(this.pulseTime * 35) * 5;
    ctx.fillStyle = '#00f0ff';
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

    // Weapon tier wing pods visual indicator
    if (weapon && weapon.tier >= 2) {
      ctx.fillStyle = weapon.tier === 3 ? '#ffcc00' : '#00ff88';
      ctx.fillRect(-17, 2, 4, 12);
      ctx.fillRect(13, 2, 4, 12);
    }

    // Inner fuselage & glowing cockpit core (45% Core Hitbox - FR-014)
    ctx.fillStyle = isFlashing ? '#ffffff' : '#00f0ff';
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

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);

      const isFlashing = !this.reducedFlash && r.hitFlashTimer > 0;

      if (behavior.archetype === 'SCOUT') {
        // Agile cyan/violet insectoid scout
        ctx.fillStyle = isFlashing ? '#ffffff' : '#7b2cbf';
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#e0aaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(14, -10);
        ctx.lineTo(0, -4);
        ctx.lineTo(-14, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (behavior.archetype === 'FIGHTER') {
        // Crimson assault fighter
        ctx.fillStyle = isFlashing ? '#ffffff' : '#9d0208';
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#ff1e8a';
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
      } else {
        // Golden Elite Commander (Drops weapon upgrades)
        ctx.fillStyle = isFlashing ? '#ffffff' : '#b5651d';
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#ffcc00';
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

        // Commander crown core
        ctx.fillStyle = isFlashing ? '#ffffff' : '#ffcc00';
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
      if (!t) continue;

      ctx.save();
      ctx.translate(t.x, t.y);

      if (proj.sourceAffiliation === 'PLAYER') {
        ctx.rotate(t.rotation);
        if (isHighQuality) {
          // Outer cyan glow
          ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
          ctx.fillRect(-5, -12, 10, 24);
        }
        // Inner bright laser core
        ctx.fillStyle = '#e0ffff';
        ctx.fillRect(-2, -10, 4, 20);
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

