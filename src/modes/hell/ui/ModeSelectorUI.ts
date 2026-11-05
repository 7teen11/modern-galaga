import { GameSystem, Game, GameModeState } from '../../../core/Game';
import { HellDirector } from '../HellDirector';
import { LocalizationService, i18n } from '../../../i18n';
import { LeaderboardEntry } from '../../../services/LeaderboardClient';
import { HellLeaderboardEntry } from '../HellLeaderboardClient';
import { formatClearTime } from '../HellConfig';

export interface ModeSelectorBounds {
  modeStandardRect: { x: number; y: number; w: number; h: number };
  modeHellRect: { x: number; y: number; w: number; h: number };
  langToggleRect: { x: number; y: number; w: number; h: number };
}

export interface ModeSelectorOptions {
  getStandardTopScores?: () => LeaderboardEntry[];
  getHellTopScores?: () => HellLeaderboardEntry[];
  isModalOpen?: () => boolean;
}

export class ModeSelectorUI implements GameSystem {
  private director: HellDirector;
  private getGameState: () => GameModeState;
  private locService: LocalizationService;
  private canvas: HTMLCanvasElement;
  private options: ModeSelectorOptions;
  private blinkTimer = 0;

  // Non-overlapping interactive bounding boxes in logical 600x800 coordinates
  // Placed inside Zone 2 (Mode & Language Selector Deck: y = 158..308)
  private bounds: ModeSelectorBounds = {
    modeStandardRect: { x: 88, y: 190, w: 204, h: 42 },
    modeHellRect: { x: 308, y: 190, w: 204, h: 42 },
    langToggleRect: { x: 200, y: 264, w: 200, h: 30 },
  };

  constructor(
    canvas: HTMLCanvasElement,
    director: HellDirector,
    getGameState: () => GameModeState,
    locService: LocalizationService = i18n,
    options: ModeSelectorOptions = {}
  ) {
    this.canvas = canvas;
    this.director = director;
    this.getGameState = getGameState;
    this.locService = locService;
    this.options = options;

    this.bindEvents();
    this.syncDomLocale();
    this.locService.onLocaleChanged(() => this.syncDomLocale());
  }

  private isInputBlocked(): boolean {
    if (this.getGameState() !== GameModeState.TITLE) return true;
    if (this.options.isModalOpen && this.options.isModalOpen()) return true;
    return false;
  }

  private syncDomLocale(): void {
    if (typeof document === 'undefined') return;
    const isEn = this.locService.getLocale() === 'en';

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.textContent = isEn ? '⚙ SETTINGS' : '⚙ CÀI ĐẶT';
    }

    const btnLeaderboard = document.getElementById('btn-leaderboard');
    if (btnLeaderboard) {
      btnLeaderboard.textContent = isEn ? '🏆 LEADERBOARD' : '🏆 BẢNG XẾP HẠNG';
    }

    const footer = document.querySelector('.arcade-footer');
    if (footer) {
      footer.innerHTML = isEn
        ? `<span><strong>MOVE:</strong> WASD / Arrow Keys (8-Way)</span><span>•</span><span><strong>FIRE:</strong> SPACE / J (Auto-Fire)</span><span>•</span><span><strong>PAUSE:</strong> P / ESC</span>`
        : `<span><strong>ĐIỀU KHIỂN:</strong> WASD / Phím Mũi Tên (8 hướng)</span><span>•</span><span><strong>BẮN:</strong> SPACE / J (Giữ liên thanh)</span><span>•</span><span><strong>TẠM DỪNG:</strong> P / ESC</span>`;
    }
  }

  private bindEvents(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.isInputBlocked()) return;

      if (e.code === 'KeyM') {
        this.director.toggleMode();
      } else if (e.code === 'KeyL') {
        this.locService.toggleLocale();
      } else if (e.code === 'ArrowLeft') {
        this.director.setMode('STANDARD');
      } else if (e.code === 'ArrowRight') {
        this.director.setMode('HELL');
      }
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.isInputBlocked()) return;

      const rect = this.canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const scaleX = Game.LOGICAL_WIDTH / rect.width;
      const scaleY = Game.LOGICAL_HEIGHT / rect.height;

      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      if (this.isPointInside(clickX, clickY, this.bounds.modeStandardRect)) {
        this.director.setMode('STANDARD');
      } else if (this.isPointInside(clickX, clickY, this.bounds.modeHellRect)) {
        this.director.setMode('HELL');
      } else if (this.isPointInside(clickX, clickY, this.bounds.langToggleRect)) {
        this.locService.toggleLocale();
      }
    });
  }

  private isPointInside(
    x: number,
    y: number,
    rect: { x: number; y: number; w: number; h: number }
  ): boolean {
    return (
      x >= rect.x &&
      x <= rect.x + rect.w &&
      y >= rect.y &&
      y <= rect.y + rect.h
    );
  }

  public update(dt: number): void {
    this.blinkTimer = (this.blinkTimer + dt * 2.5) % (Math.PI * 2);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.getGameState() !== GameModeState.TITLE) return;

    const isHell = this.director.isHellMode();
    const currentLocale = this.locService.getLocale();
    const isEn = currentLocale === 'en';
    const cx = Game.LOGICAL_WIDTH * 0.5;

    ctx.save();

    // Cover canvas area below top HUD bar (y = 47..800) with opaque dark space backdrop
    // Prevents any layer bleed-through from GameOverScreen static blocks or player ship sprite
    ctx.fillStyle = isHell ? 'rgba(10, 4, 12, 0.97)' : 'rgba(4, 6, 16, 0.97)';
    ctx.fillRect(0, 47, Game.LOGICAL_WIDTH, Game.LOGICAL_HEIGHT - 47);

    // =========================================================================
    // ZONE 1 (y = 75..142): TITLE HEADER
    // =========================================================================
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = isHell ? '#ff2a55' : '#00f0ff';
    ctx.font = '900 40px sans-serif';
    ctx.fillText(this.locService.t('title.name'), cx, 112);

    ctx.fillStyle = isHell ? '#ffaa33' : '#ff1e8a';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(
      isEn
        ? 'INTERNAL COMPANY ARCADE CHAMPIONSHIP'
        : 'GIẢI ĐẤU ARCADE NỘI BỘ // CHỌN CHẾ ĐỘ CHIẾN ĐẤU',
      cx,
      138
    );

    // =========================================================================
    // ZONE 2 (y = 156..308): MODE & LANGUAGE SELECTOR DECK (460x152)
    // =========================================================================
    const deckX = 70;
    const deckY = 156;
    const deckW = 460;
    const deckH = 152;

    ctx.fillStyle = isHell ? 'rgba(28, 6, 16, 0.92)' : 'rgba(8, 14, 34, 0.92)';
    ctx.strokeStyle = isHell ? 'rgba(255, 42, 85, 0.65)' : 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, deckX, deckY, deckW, deckH, 8);
    ctx.fill();
    ctx.stroke();

    // Deck Section Label
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#8be9fd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      isEn
        ? 'SELECT COMBAT MODE & LANGUAGE'
        : 'CHỌN CHẾ ĐỘ CHIẾN ĐẤU & NGÔN NGỮ',
      cx,
      deckY + 18
    );

    const { modeStandardRect, modeHellRect, langToggleRect } = this.bounds;

    // --- STANDARD MODE BUTTON ---
    ctx.lineWidth = !isHell ? 2 : 1;
    ctx.strokeStyle = !isHell ? '#00f0ff' : 'rgba(0, 240, 255, 0.28)';
    ctx.fillStyle = !isHell
      ? 'rgba(0, 240, 255, 0.18)'
      : 'rgba(0, 20, 40, 0.45)';
    this.roundRect(
      ctx,
      modeStandardRect.x,
      modeStandardRect.y,
      modeStandardRect.w,
      modeStandardRect.h,
      6
    );
    ctx.fill();
    ctx.stroke();

    ctx.font = !isHell ? 'bold 13px monospace' : '12px monospace';
    ctx.fillStyle = !isHell ? '#00f0ff' : 'rgba(0, 240, 255, 0.55)';
    ctx.fillText(
      this.locService.t('title.mode.standard'),
      modeStandardRect.x + modeStandardRect.w / 2,
      modeStandardRect.y + modeStandardRect.h / 2
    );

    // --- HELL MODE BUTTON ---
    ctx.lineWidth = isHell ? 2 : 1;
    ctx.strokeStyle = isHell ? '#ff2a55' : 'rgba(255, 42, 85, 0.32)';
    ctx.fillStyle = isHell
      ? 'rgba(85, 0, 24, 0.75)'
      : 'rgba(30, 0, 10, 0.45)';
    this.roundRect(
      ctx,
      modeHellRect.x,
      modeHellRect.y,
      modeHellRect.w,
      modeHellRect.h,
      6
    );
    ctx.fill();
    ctx.stroke();

    ctx.font = isHell ? 'bold 13px monospace' : '12px monospace';
    ctx.fillStyle = isHell ? '#ff2a55' : 'rgba(255, 42, 85, 0.6)';
    ctx.fillText(
      `🔥 ${this.locService.t('title.mode.hell')}`,
      modeHellRect.x + modeHellRect.w / 2,
      modeHellRect.y + modeHellRect.h / 2
    );

    // --- MODE STATUS / HAZARD LINE (y = 248) ---
    if (isHell) {
      const alpha = 0.75 + Math.sin(this.blinkTimer) * 0.25;
      ctx.fillStyle = `rgba(255, 70, 90, ${alpha.toFixed(2)})`;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `⚠ ${this.locService.t('hell.hazardWarning')} • +50% SWARM • DANMAKU BOSS ⚠`,
        cx,
        248
      );
    } else {
      ctx.fillStyle = '#00ff88';
      ctx.font = '11px monospace';
      ctx.fillText(
        isEn
          ? '• Standard 1x Damage • Endless Escalating Enemy Waves •'
          : '• Sát thương tiêu chuẩn 1x • Đợt địch Endless tăng dần độ khó •',
        cx,
        248
      );
    }

    // --- LANGUAGE TOGGLE PILL (y = 264..294) ---
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
    this.roundRect(
      ctx,
      langToggleRect.x,
      langToggleRect.y,
      langToggleRect.w,
      langToggleRect.h,
      15
    );
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    const pillCenterX = langToggleRect.x + langToggleRect.w / 2;
    const pillCenterY = langToggleRect.y + langToggleRect.h / 2;

    ctx.fillStyle = '#8be9fd';
    ctx.fillText(isEn ? 'LANG:' : 'NGÔN NGỮ:', pillCenterX - 42, pillCenterY);

    ctx.fillStyle = currentLocale === 'vi' ? '#ffe600' : 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('VI', pillCenterX + 12, pillCenterY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('|', pillCenterX + 32, pillCenterY);

    ctx.fillStyle = currentLocale === 'en' ? '#ffe600' : 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('EN', pillCenterX + 52, pillCenterY);

    // =========================================================================
    // ZONE 3 (y = 322..410): FEATURE HIGHLIGHTS BOX (460x88)
    // =========================================================================
    const featX = 70;
    const featY = 322;
    const featW = 460;
    const featH = 88;

    ctx.fillStyle = isHell
      ? 'rgba(255, 42, 85, 0.06)'
      : 'rgba(0, 240, 255, 0.06)';
    ctx.strokeStyle = isHell
      ? 'rgba(255, 42, 85, 0.3)'
      : 'rgba(0, 240, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.fillRect(featX, featY, featW, featH);
    ctx.strokeRect(featX, featY, featW, featH);

    ctx.fillStyle = '#e4f0ff';
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'alphabetic';

    if (isHell) {
      ctx.fillText(
        isEn
          ? '• 2x Hostile Damage (40 HP Bullets / 70 HP Collisions) & +50% Swarm Volume'
          : '• Sát thương x2 (Đạn 40 HP / Va chạm 70 HP) & Mật độ đội hình +50%',
        cx,
        featY + 24
      );
      ctx.fillText(
        isEn
          ? '• Wave 2 Dual Pincer Swoops & Wave 3 Diagonal Cross-Fire Sweeps'
          : '• Đợt 2 Gọng Kìm Kép & Đợt 3 Đột Kích Chéo Giao Thoa',
        cx,
        featY + 48
      );
      ctx.fillText(
        isEn
          ? '• Wave 3 Climax Boss: VOID DREADNOUGHT (1,200 HP, 2-Phase Danmaku)'
          : '• Trùm Cuối Đợt 3: VOID DREADNOUGHT (1,200 HP, Đạn Mạc Danmaku 2 Pha)',
        cx,
        featY + 72
      );
    } else {
      ctx.fillText(
        isEn
          ? '• Smooth 8-Way Flight • Wing Graze Tolerance (45% Cockpit Core Hitbox)'
          : '• Bay 8 hướng mượt mà • Lướt đạn qua cánh tàu (45% Core Hitbox)',
        cx,
        featY + 24
      );
      ctx.fillText(
        isEn
          ? '• Bézier Swooping Squads • Destroy Commanders for Weapon Upgrades'
          : '• Địch lượn theo đường cong Bézier • Hạ Commander nhận nâng cấp súng',
        cx,
        featY + 48
      );
      ctx.fillText(
        isEn
          ? '• 3 Combat Lives • Compete on the Internal Company Leaderboard'
          : '• 3 Mạng chiến đấu • Đua điểm Endless trên Bảng xếp hạng nội bộ',
        cx,
        featY + 72
      );
    }

    // =========================================================================
    // ZONE 4 (y = 442): LAUNCH MISSION PROMPT
    // =========================================================================
    if (Math.floor(this.blinkTimer * 1.2) % 2 === 0) {
      ctx.fillStyle = isHell ? '#ff2a55' : '#00ff88';
      ctx.font = 'bold 17px monospace';
      ctx.fillText(this.locService.t('title.start'), cx, 442);
    }

    // =========================================================================
    // ZONE 5 (y = 476..668): TOP 5 LEADERBOARD TABLE (460x175)
    // =========================================================================
    this.renderLeaderboardPreview(ctx, 476, isHell, isEn);

    // =========================================================================
    // ZONE 6 (y = 702): KEYBOARD SHORTCUT HINT FOOTER
    // =========================================================================
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(200, 215, 240, 0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(
      isEn
        ? '[ M / ← → ]: Switch Mode   •   [ L ]: Language (VI / EN)   •   [ SPACE ]: Launch'
        : '[ M / ← → ]: Đổi chế độ   •   [ L ]: Ngôn ngữ (VI / EN)   •   [ SPACE ]: Xuất kích',
      cx,
      702
    );

    ctx.restore();
  }

  private renderLeaderboardPreview(
    ctx: CanvasRenderingContext2D,
    topY: number,
    isHell: boolean,
    isEn: boolean
  ): void {
    const cx = Game.LOGICAL_WIDTH * 0.5;
    const boxW = 460;
    const boxH = 175;
    const boxX = cx - boxW * 0.5;
    const boxY = topY + 14;

    ctx.textAlign = 'center';
    ctx.fillStyle = isHell ? '#ff2a55' : '#ffcc00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(
      isHell
        ? `🔥 ${this.locService.t('hell.rankings')} (TOP 5)`
        : `🏆 ${this.locService.t('hell.standardRankings')} (TOP 5)`,
      cx,
      topY
    );

    ctx.fillStyle = 'rgba(8, 12, 28, 0.92)';
    ctx.strokeStyle = isHell
      ? 'rgba(255, 42, 85, 0.4)'
      : 'rgba(255, 204, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Headers
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#7c8db5';
    ctx.textAlign = 'left';
    ctx.fillText(isEn ? 'RANK' : 'HẠNG', boxX + 16, boxY + 24);
    ctx.fillText(isEn ? 'PILOT (DEPT)' : 'PHI CÔNG (BỘ PHẬN)', boxX + 70, boxY + 24);
    ctx.textAlign = 'right';
    ctx.fillText(
      isHell ? (isEn ? 'TIME' : 'THỜI GIAN') : 'WAVE',
      boxX + 350,
      boxY + 24
    );
    ctx.fillText(this.locService.t('hud.score'), boxX + 442, boxY + 24);

    if (isHell && this.options.getHellTopScores) {
      const entries = this.options.getHellTopScores().slice(0, 5);
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const rowY = boxY + 52 + i * 26;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle =
          i === 0 ? '#ffcc00' : i === 1 ? '#ff2a55' : i === 2 ? '#00ff88' : '#e4f0ff';
        ctx.fillText(`#${e.rank}`, boxX + 16, rowY);
        ctx.fillText(`🔥 ${e.playerName} (${e.department})`, boxX + 70, rowY);

        ctx.textAlign = 'right';
        ctx.fillText(formatClearTime(e.clearTimeMs), boxX + 350, rowY);
        ctx.fillText(e.score.toLocaleString(), boxX + 442, rowY);
      }
    } else if (this.options.getStandardTopScores) {
      const entries = this.options.getStandardTopScores().slice(0, 5);
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const rowY = boxY + 52 + i * 26;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle =
          i === 0 ? '#ffcc00' : i === 1 ? '#00f0ff' : i === 2 ? '#00ff88' : '#e4f0ff';
        ctx.fillText(`#${e.rank}`, boxX + 16, rowY);
        ctx.fillText(`${e.playerName} (${e.department})`, boxX + 70, rowY);

        ctx.textAlign = 'right';
        ctx.fillText(`W${e.highestWave}`, boxX + 350, rowY);
        ctx.fillText(e.score.toLocaleString(), boxX + 442, rowY);
      }
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
