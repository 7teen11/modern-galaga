import { EntityManager } from '../ecs/Entity';
import { EntityId, WeaponTier } from '../ecs/Component';
import { Game, GameModeState, GameSystem } from '../core/Game';
import { isHealthCritical } from '../components/Health';
import { WEAPON_TIER_SPECS } from '../components/WeaponTierConfig';
import { PoolMetrics } from '../ecs/Pool';

export interface HUDDebugStats {
  enabled: boolean;
  fps: number;
  frameTimeMs: number;
  pools: Array<{
    name: string;
    metrics: PoolMetrics;
  }>;
}

export interface HUDStateProvider {
  getCurrentScore(): number;
  getHighScore(): number;
  getCurrentWave(): number;
  getWaveBannerTimer(): number;
  getGameState(): GameModeState;
  getDebugStats?(): HUDDebugStats;
}

/**
 * Heads-Up Display (HUD) & In-Game Status Renderer (FR-003, SC-003).
 * Renders:
 * - Prominent real-time player Health Bar with 25% critical red pulse alert
 * - Remaining Lives stock icons (starting at 3 lives)
 * - Current Weapon Upgrade Tier indicator (Tier 1 / 2 / 3)
 * - Score, High Score, and Active Wave banners
 */
export class HUD implements GameSystem {
  private readonly entities: EntityManager;
  private playerId: EntityId;
  private readonly provider: HUDStateProvider;
  private readonly width: number;
  private readonly height: number;
  private pulseClock = 0;
  private lastKnownTier: WeaponTier = 1;
  private tierUpgradeFlashTimer = 0;
  private overchargeBannerTimer = 0;

  constructor(
    entities: EntityManager,
    playerId: EntityId,
    provider: HUDStateProvider,
    width = Game.LOGICAL_WIDTH,
    height = Game.LOGICAL_HEIGHT
  ) {
    this.entities = entities;
    this.playerId = playerId;
    this.provider = provider;
    this.width = width;
    this.height = height;
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public triggerOverchargeBanner(): void {
    this.overchargeBannerTimer = 1.1;
    this.tierUpgradeFlashTimer = 0.65;
  }

  public isOverchargeBannerActive(): boolean {
    return this.overchargeBannerTimer > 0;
  }

  public update(dt: number): void {
    this.pulseClock += dt;
    if (this.tierUpgradeFlashTimer > 0) {
      this.tierUpgradeFlashTimer = Math.max(0, this.tierUpgradeFlashTimer - dt);
    }
    if (this.overchargeBannerTimer > 0) {
      this.overchargeBannerTimer = Math.max(0, this.overchargeBannerTimer - dt);
    }
    const weapon = this.entities.weapons.get(this.playerId);
    if (weapon && weapon.tier !== this.lastKnownTier) {
      if (weapon.tier > this.lastKnownTier) {
        this.tierUpgradeFlashTimer = 0.65;
      }
      this.lastKnownTier = weapon.tier;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Top translucent tactical HUD bar
    ctx.fillStyle = 'rgba(8, 11, 26, 0.85)';
    ctx.fillRect(0, 0, this.width, 46);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.lineTo(this.width, 46);
    ctx.stroke();

    this.renderHealthAndLives(ctx);
    this.renderScoreAndWave(ctx);
    this.renderStateOverlay(ctx);
    this.renderDebugOverlay(ctx);

    ctx.restore();
  }

  private renderHealthAndLives(ctx: CanvasRenderingContext2D): void {
    const health = this.entities.healths.get(this.playerId);
    const weapon = this.entities.weapons.get(this.playerId);

    const currentHp = health ? Math.max(0, Math.round(health.currentHealth)) : 0;
    const maxHp = health ? health.maxHealth : 100;
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;
    const lives = health?.livesRemaining ?? 0;
    const isCritical = health ? isHealthCritical(health) : false;

    // 1. Health Bar Label & Frame
    const barX = 14;
    const barY = 10;
    const barW = 150;
    const barH = 14;

    ctx.fillStyle = '#050814';
    ctx.strokeStyle = isCritical ? '#ff1e8a' : '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeRect(barX, barY, barW, barH);

    // Health Bar Fill Color (Green -> Gold -> Pulsing Crimson at <=25%)
    let fillColor = '#00ff88';
    if (isCritical) {
      const pulse = 0.55 + Math.sin(this.pulseClock * 16) * 0.45;
      fillColor = `rgba(255, 30, 100, ${pulse.toFixed(2)})`;
    } else if (ratio <= 0.5) {
      fillColor = '#ffcc00';
    }

    if (ratio > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(barX + 2, barY + 2, Math.max(2, (barW - 4) * ratio), barH - 4);
    }

    // Numeric HP Readout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `HP ${currentHp}/${maxHp}`,
      barX + barW * 0.5,
      barY + barH * 0.5 + 0.5
    );

    // 2. Lives Stock Mini Ship Icons & Weapon Tier Badge
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8be9fd';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('LIVES:', barX, 36);

    for (let i = 0; i < 3; i++) {
      const iconX = barX + 52 + i * 18;
      const iconY = 35;
      ctx.fillStyle = i < lives ? '#00f0ff' : 'rgba(124, 141, 181, 0.25)';
      ctx.beginPath();
      ctx.moveTo(iconX, iconY - 6);
      ctx.lineTo(iconX + 6, iconY + 5);
      ctx.lineTo(iconX - 6, iconY + 5);
      ctx.closePath();
      ctx.fill();
    }

    const tier: WeaponTier = weapon ? weapon.tier : 1;
    const tierSpec = WEAPON_TIER_SPECS[tier] ?? WEAPON_TIER_SPECS[1];
    const isFlashingUpgrade = this.tierUpgradeFlashTimer > 0;
    const badgeColor = isFlashingUpgrade ? '#ffffff' : tierSpec.primaryColor;

    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(
      this.overchargeBannerTimer > 0
        ? '+2,000 OVERCHARGE'
        : tier === 5
          ? 'WPN: T5 MAX'
          : `WPN: T${tier}`,
      barX + 108,
      36
    );

    // 5-tier visual power pips next to badge (FR-003)
    for (let t = 1; t <= 5; t++) {
      const pipX = barX + 182 + (t - 1) * 6;
      const pipY = 29;
      ctx.fillStyle =
        t <= tier
          ? badgeColor
          : 'rgba(124, 141, 181, 0.25)';
      ctx.fillRect(pipX, pipY, 4, 8);
    }
  }

  private renderScoreAndWave(ctx: CanvasRenderingContext2D): void {
    const score = this.provider.getCurrentScore();
    const highScore = this.provider.getHighScore();
    const wave = this.provider.getCurrentWave();

    // Center: Current Score & High Score
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7c8db5';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('SCORE', this.width * 0.5 - 45, 14);
    ctx.fillText('HIGH SCORE', this.width * 0.5 + 55, 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(score.toString().padStart(7, '0'), this.width * 0.5 - 45, 32);

    ctx.fillStyle = '#ffcc00';
    ctx.fillText(highScore.toString().padStart(7, '0'), this.width * 0.5 + 55, 32);

    // Right: Active Wave Counter
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`WAVE ${wave}`, this.width - 16, 28);
  }

  private renderStateOverlay(ctx: CanvasRenderingContext2D): void {
    const state = this.provider.getGameState();
    const bannerTimer = this.provider.getWaveBannerTimer();
    const wave = this.provider.getCurrentWave();

    if (state === GameModeState.PLAYING && bannerTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.92)';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`WAVE ${wave}`, this.width * 0.5, this.height * 0.38);

      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(
        `THREAT MULTIPLIER: ${(1 + (wave - 1) * 0.1).toFixed(1)}x`,
        this.width * 0.5,
        this.height * 0.38 + 26
      );
      ctx.restore();
    } else if (state === GameModeState.PAUSED) {
      ctx.fillStyle = 'rgba(4, 5, 12, 0.72)';
      ctx.fillRect(0, 46, this.width, this.height - 46);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('TẠM DỪNG // PAUSED', this.width * 0.5, this.height * 0.45);
      ctx.fillStyle = '#e4f0ff';
      ctx.font = '14px sans-serif';
      ctx.fillText('Nhấn [P] hoặc [ESC] để tiếp tục chiến đấu', this.width * 0.5, this.height * 0.45 + 32);
    }
  }

  private renderDebugOverlay(ctx: CanvasRenderingContext2D): void {
    const debug = this.provider.getDebugStats?.();
    if (!debug || !debug.enabled) return;

    ctx.save();
    const boxX = 10;
    const boxY = 54;
    const boxW = 310;
    const boxH = 38 + debug.pools.length * 16;

    ctx.fillStyle = 'rgba(4, 8, 20, 0.88)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(
      `[F3 DEBUG] FPS: ${debug.fps} | STEP: ${debug.frameTimeMs.toFixed(2)}ms`,
      boxX + 8,
      boxY + 16
    );

    ctx.font = '10px monospace';
    for (let i = 0; i < debug.pools.length; i++) {
      const p = debug.pools[i];
      const m = p.metrics;
      ctx.fillStyle = m.recycleOverflowCount > 0 ? '#ffcc00' : '#8be9fd';
      ctx.fillText(
        `${p.name.padEnd(11, ' ')}: Act ${String(m.activeCount).padStart(3, ' ')}/${String(m.capacity).padStart(3, ' ')} | Free ${String(m.freeCount).padStart(3, ' ')} | Peak ${String(m.peakActiveCount).padStart(3, ' ')}`,
        boxX + 8,
        boxY + 34 + i * 15
      );
    }
    ctx.restore();
  }
}

