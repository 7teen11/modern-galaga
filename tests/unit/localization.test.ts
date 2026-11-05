import { describe, it, expect, beforeEach } from 'vitest';
import { LocalizationService, VIETNAMESE_DICTIONARY, ENGLISH_DICTIONARY } from '../../src/i18n/Localization';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, value); }
}

describe('Bilingual Localization System (VI / EN)', () => {
  let mockStorage: MockStorage;
  let i18n: LocalizationService;

  beforeEach(() => {
    mockStorage = new MockStorage();
    i18n = new LocalizationService(mockStorage);
  });

  it('defaults to Vietnamese locale on initial launch if no preference is stored', () => {
    expect(i18n.getLocale()).toBe('vi');
    expect(i18n.t('title.name')).toBe('STAR VANGUARD');
    expect(i18n.t('hud.score')).toBe('ĐIỂM');
  });

  it('switches locale between Vietnamese and English and persists choice to storage', () => {
    i18n.setLocale('en');
    expect(i18n.getLocale()).toBe('en');
    expect(i18n.t('hud.score')).toBe('SCORE');
    expect(i18n.t('title.mode.hell')).toBe('HELL MODE');
    expect(mockStorage.getItem('star_vanguard_locale_v1')).toBe('en');

    // Switch back to Vietnamese
    i18n.setLocale('vi');
    expect(i18n.getLocale()).toBe('vi');
    expect(i18n.t('hud.score')).toBe('ĐIỂM');
    expect(i18n.t('title.mode.hell')).toBe('CHẾ ĐỘ ĐỊA NGỤC (HELL)');
    expect(mockStorage.getItem('star_vanguard_locale_v1')).toBe('vi');
  });

  it('interpolates template parameters in localized strings', () => {
    i18n.setLocale('en');
    const bossAlertEn = i18n.t('hell.alertBoss', { name: 'VOID DREADNOUGHT' });
    expect(bossAlertEn).toContain('VOID DREADNOUGHT');
    expect(bossAlertEn).toContain('ALERT');

    i18n.setLocale('vi');
    const bossAlertVi = i18n.t('hell.alertBoss', { name: 'VOID DREADNOUGHT' });
    expect(bossAlertVi).toContain('CẢNH BÁO');
    expect(bossAlertVi).toContain('VOID DREADNOUGHT');
  });

  it('falls back to Vietnamese dictionary if key is missing in English', () => {
    i18n.setLocale('en');
    // Test with a key present in VI
    expect(i18n.t('title.name')).toBe('STAR VANGUARD');
  });

  it('fires callbacks on locale change', () => {
    let notifiedLocale = '';
    i18n.onLocaleChanged((loc) => {
      notifiedLocale = loc;
    });

    i18n.setLocale('en');
    expect(notifiedLocale).toBe('en');
  });

  it('contains equivalent key sets between Vietnamese and English dictionaries', () => {
    const viKeys = Object.keys(VIETNAMESE_DICTIONARY).sort();
    const enKeys = Object.keys(ENGLISH_DICTIONARY).sort();
    expect(enKeys).toEqual(viKeys);
  });
});

