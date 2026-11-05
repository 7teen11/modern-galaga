export type SupportedLocale = 'vi' | 'en';

export const LOCALE_STORAGE_KEY = 'star_vanguard_locale_v1';

export type TranslationKey =
  | 'title.name'
  | 'title.start'
  | 'title.mode.standard'
  | 'title.mode.hell'
  | 'title.lang'
  | 'hud.score'
  | 'hud.lives'
  | 'hud.wave'
  | 'hud.multiplier'
  | 'hell.alertBoss'
  | 'hell.bossName'
  | 'hell.enraged'
  | 'hell.victory'
  | 'hell.clearTime'
  | 'hell.rankings'
  | 'hell.standardRankings'
  | 'hell.hazardWarning'
  | 'game.gameover'
  | 'game.restart';

export const VIETNAMESE_DICTIONARY: Record<TranslationKey, string> = {
  'title.name': 'STAR VANGUARD',
  'title.start': 'NHẤN PHÍM CÁCH ĐỂ BẮT ĐẦU',
  'title.mode.standard': 'CHẾ ĐỘ TIÊU CHUẨN',
  'title.mode.hell': 'CHẾ ĐỘ ĐỊA NGỤC (HELL)',
  'title.lang': 'NGÔN NGỮ: TIẾNG VIỆT',
  'hud.score': 'ĐIỂM',
  'hud.lives': 'MẠNG',
  'hud.wave': 'ĐỢT',
  'hud.multiplier': 'HỆ SỐ',
  'hell.alertBoss': 'CẢNH BÁO: PHÁT HIỆN BOSS {name} TIẾP CẬN!',
  'hell.bossName': 'VOID DREADNOUGHT',
  'hell.enraged': 'CUỒNG NỘ',
  'hell.victory': 'CHIẾN THẮNG ĐỊA NGỤC!',
  'hell.clearTime': 'THỜI GIAN VƯỢT ẢI: {time}',
  'hell.rankings': 'BẢNG XẾP HẠNG HELL',
  'hell.standardRankings': 'BẢNG XẾP HẠNG TIÊU CHUẨN',
  'hell.hazardWarning': 'NGUY HIỂM: SÁT THƯƠNG x2',
  'game.gameover': 'KẾT THÚC TRÒ CHƠI',
  'game.restart': 'NHẤN R ĐỂ CHƠI LẠI',
};

export const ENGLISH_DICTIONARY: Record<TranslationKey, string> = {
  'title.name': 'STAR VANGUARD',
  'title.start': 'PRESS SPACE TO START',
  'title.mode.standard': 'STANDARD MODE',
  'title.mode.hell': 'HELL MODE',
  'title.lang': 'LANGUAGE: ENGLISH',
  'hud.score': 'SCORE',
  'hud.lives': 'LIVES',
  'hud.wave': 'WAVE',
  'hud.multiplier': 'MULTIPLIER',
  'hell.alertBoss': 'ALERT: BOSS {name} DETECTED!',
  'hell.bossName': 'VOID DREADNOUGHT',
  'hell.enraged': 'ENRAGED',
  'hell.victory': 'HELL VICTORY!',
  'hell.clearTime': 'CLEAR TIME: {time}',
  'hell.rankings': 'HELL RANKINGS',
  'hell.standardRankings': 'STANDARD RANKINGS',
  'hell.hazardWarning': 'HAZARD: 2X DAMAGE',
  'game.gameover': 'GAME OVER',
  'game.restart': 'PRESS R TO RESTART',
};

export class LocalizationService {
  private currentLocale: SupportedLocale = 'vi';
  private storage: Storage | null = null;
  private listeners: ((locale: SupportedLocale) => void)[] = [];

  constructor(storage?: Storage) {
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    }

    if (this.storage) {
      const savedLocale = this.storage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
      if (savedLocale === 'vi' || savedLocale === 'en') {
        this.currentLocale = savedLocale;
      }
    }
  }

  public getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  public setLocale(locale: SupportedLocale): void {
    if (this.currentLocale === locale) return;
    this.currentLocale = locale;
    if (this.storage) {
      try {
        this.storage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // Ignore storage write issues (e.g. private mode quota)
      }
    }
    for (const listener of this.listeners) {
      listener(this.currentLocale);
    }
  }

  public toggleLocale(): SupportedLocale {
    const nextLocale: SupportedLocale = this.currentLocale === 'vi' ? 'en' : 'vi';
    this.setLocale(nextLocale);
    return nextLocale;
  }

  public onLocaleChanged(callback: (locale: SupportedLocale) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public t(key: TranslationKey, params?: Record<string, string | number>): string {
    const dict = this.currentLocale === 'en' ? ENGLISH_DICTIONARY : VIETNAMESE_DICTIONARY;
    let template = dict[key] ?? VIETNAMESE_DICTIONARY[key] ?? key;

    if (params) {
      for (const [paramKey, paramVal] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }
    }

    return template;
  }
}

// Global singleton instance for shared usage
export const i18n = new LocalizationService();

