import {
  StorageService,
  UserSettings,
  VisualQualityPreset
} from '../services/StorageService';

/**
 * Interactive Settings & Accessibility Modal (FR-016, SC-007, Constitution Principle I).
 * Allows employees to configure:
 * - Pilot Name & Department for Company Leaderboard
 * - Master Audio Volume (0% - 100%)
 * - Micro Screen-Shake Intensity Slider (0% = Off to 100%)
 * - Reduced Flash Accessibility Toggle
 */
export class SettingsModal {
  private readonly storage: StorageService;
  private readonly onSettingsChanged: (settings: UserSettings) => void;
  private modalEl: HTMLDivElement | null = null;

  constructor(
    storage: StorageService,
    onSettingsChanged: (settings: UserSettings) => void
  ) {
    this.storage = storage;
    this.onSettingsChanged = onSettingsChanged;

    if (typeof document !== 'undefined') {
      this.mountModal();
    }
  }

  private mountModal(): void {
    const settings = this.storage.loadSettings();

    const overlay = document.createElement('div');
    overlay.id = 'settings-modal-overlay';
    overlay.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(4, 5, 14, 0.85);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    `;

    overlay.innerHTML = `
      <div style="
        background: #0c1024;
        border: 2px solid #00f0ff;
        border-radius: 10px;
        padding: 22px;
        width: 380px;
        max-width: 92vw;
        box-shadow: 0 0 25px rgba(0, 240, 255, 0.25);
        color: #e4f0ff;
        font-family: inherit;
      ">
        <h2 style="color: #00f0ff; font-size: 1.15rem; margin-bottom: 16px; letter-spacing: 1px;">
          ⚙ CÀI ĐẶT & TRỢ NĂNG (SETTINGS)
        </h2>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 0.8rem; color: #8be9fd; margin-bottom: 4px;">
            Tên Phi Công (Employee Name):
          </label>
          <input id="inp-pilot-name" type="text" maxlength="30" value="${settings.playerName}" style="
            width: 100%; padding: 7px 10px; background: #050714; border: 1px solid #00f0ff;
            border-radius: 5px; color: #fff; font-size: 0.9rem;
          "/>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.8rem; color: #8be9fd; margin-bottom: 4px;">
            Phòng Ban (Department):
          </label>
          <input id="inp-department" type="text" maxlength="30" value="${settings.department}" style="
            width: 100%; padding: 7px 10px; background: #050714; border: 1px solid #00f0ff;
            border-radius: 5px; color: #fff; font-size: 0.9rem;
          "/>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #8be9fd; margin-bottom: 4px;">
            <span>Âm Lượng (Master Volume):</span>
            <span id="lbl-vol-val">${Math.round(settings.masterVolume * 100)}%</span>
          </label>
          <input id="inp-volume" type="range" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}" style="width: 100%; accent-color: #00f0ff;" />
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #8be9fd; margin-bottom: 4px;">
            <span>Cường Độ Rung Màn Hình (Screen Shake):</span>
            <span id="lbl-shake-val">${Math.round(settings.screenShakeIntensity * 100)}%</span>
          </label>
          <input id="inp-shake" type="range" min="0" max="100" value="${Math.round(settings.screenShakeIntensity * 100)}" style="width: 100%; accent-color: #ff1e8a;" />
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.8rem; color: #8be9fd; margin-bottom: 4px;">
            Cấu Hình Đồ Họa (Visual Quality Preset):
          </label>
          <select id="inp-quality-preset" style="
            width: 100%; padding: 7px 10px; background: #050714; border: 1px solid #00f0ff;
            border-radius: 5px; color: #fff; font-size: 0.88rem;
          ">
            <option value="HIGH" ${settings.qualityPreset === 'HIGH' ? 'selected' : ''}>
              Cao (High - Đầy đủ hiệu ứng Bloom & Hạt)
            </option>
            <option value="PERFORMANCE" ${settings.qualityPreset === 'PERFORMANCE' ? 'selected' : ''}>
              Hiệu năng (Performance - Giảm hạt & Tắt Bloom)
            </option>
          </select>
        </div>

        <div style="margin-bottom: 18px; display: flex; align-items: center; gap: 8px;">
          <input id="inp-reduced-flash" type="checkbox" ${settings.reducedFlash ? 'checked' : ''} style="accent-color: #00ff88; width: 16px; height: 16px;" />
          <label for="inp-reduced-flash" style="font-size: 0.82rem; color: #e4f0ff; cursor: pointer;">
            Giảm chớp sáng khi trúng đạn (Reduced Flash Accessibility)
          </label>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="btn-save-settings" class="arcade-btn" style="background: rgba(0, 255, 136, 0.2); border-color: #00ff88;">
            ✓ LƯU & ĐÓNG
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.modalEl = overlay;

    const volInput = overlay.querySelector('#inp-volume') as HTMLInputElement;
    const volLbl = overlay.querySelector('#lbl-vol-val') as HTMLSpanElement;
    volInput?.addEventListener('input', () => {
      volLbl.textContent = `${volInput.value}%`;
    });

    const shakeInput = overlay.querySelector('#inp-shake') as HTMLInputElement;
    const shakeLbl = overlay.querySelector('#lbl-shake-val') as HTMLSpanElement;
    shakeInput?.addEventListener('input', () => {
      shakeLbl.textContent = `${shakeInput.value}%`;
    });

    const saveBtn = overlay.querySelector('#btn-save-settings') as HTMLButtonElement;
    saveBtn?.addEventListener('click', () => this.saveAndClose());
  }

  public open(): void {
    if (!this.modalEl) return;
    this.modalEl.style.display = 'flex';
  }

  public close(): void {
    if (!this.modalEl) return;
    this.modalEl.style.display = 'none';
  }

  public isOpen(): boolean {
    return this.modalEl?.style.display === 'flex';
  }

  private saveAndClose(): void {
    if (!this.modalEl) return;

    const nameEl = this.modalEl.querySelector('#inp-pilot-name') as HTMLInputElement;
    const deptEl = this.modalEl.querySelector('#inp-department') as HTMLInputElement;
    const volEl = this.modalEl.querySelector('#inp-volume') as HTMLInputElement;
    const shakeEl = this.modalEl.querySelector('#inp-shake') as HTMLInputElement;
    const qualityEl = this.modalEl.querySelector('#inp-quality-preset') as HTMLSelectElement;
    const flashEl = this.modalEl.querySelector('#inp-reduced-flash') as HTMLInputElement;

    const qualityPreset: VisualQualityPreset =
      qualityEl?.value === 'PERFORMANCE' ? 'PERFORMANCE' : 'HIGH';

    const updated = this.storage.saveSettings({
      playerName: nameEl?.value.trim() || 'Pilot-01',
      department: deptEl?.value.trim() || 'Engineering',
      masterVolume: Number(volEl?.value ?? 60) / 100,
      screenShakeIntensity: Number(shakeEl?.value ?? 80) / 100,
      qualityPreset,
      reducedFlash: Boolean(flashEl?.checked)
    });

    this.onSettingsChanged(updated);
    this.close();
  }
}

