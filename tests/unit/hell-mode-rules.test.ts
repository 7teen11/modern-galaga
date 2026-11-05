import { describe, it, expect, beforeEach } from 'vitest';
import { HellDirector } from '../../src/modes/hell/HellDirector';
import { HELL_RULES, formatClearTime } from '../../src/modes/hell/HellConfig';
import { EventBus } from '../../src/core/EventBus';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, value); }
}

describe('HellDirector & Hell Mode Rules (T005)', () => {
  let mockStorage: MockStorage;
  let eventBus: EventBus;
  let director: HellDirector;

  beforeEach(() => {
    mockStorage = new MockStorage();
    eventBus = new EventBus();
    director = new HellDirector(eventBus, mockStorage);
  });

  it('initializes with STANDARD mode by default if storage is empty', () => {
    expect(director.getMode()).toBe('STANDARD');
    expect(director.isHellMode()).toBe(false);
  });

  it('switches mode between STANDARD and HELL and persists to storage', () => {
    director.setMode('HELL');
    expect(director.getMode()).toBe('HELL');
    expect(director.isHellMode()).toBe(true);
    expect(mockStorage.getItem('star_vanguard_selected_mode_v1')).toBe('HELL');

    director.setMode('STANDARD');
    expect(director.getMode()).toBe('STANDARD');
    expect(director.isHellMode()).toBe(false);
    expect(mockStorage.getItem('star_vanguard_selected_mode_v1')).toBe('STANDARD');
  });

  it('notifies listeners when game mode changes', () => {
    let notifiedMode = '';
    director.onModeChanged((mode) => {
      notifiedMode = mode;
    });

    director.setMode('HELL');
    expect(notifiedMode).toBe('HELL');
  });

  it('tracks clear time during active run and formats time as MM:SS.mmm', () => {
    director.setMode('HELL');
    director.startRun();
    expect(director.getClearTimeMs()).toBe(0);

    // Simulate 65.432 seconds elapsed (60 fixed steps of 1s + partial)
    director.update(65.432);
    expect(director.getClearTimeMs()).toBeCloseTo(65432, -1);
    expect(director.getFormattedClearTime()).toBe('01:05.432');
  });

  it('exposes correct Hell Mode hazard scalars from HELL_RULES', () => {
    expect(HELL_RULES.DAMAGE.bulletDamage).toBe(40);
    expect(HELL_RULES.DAMAGE.collisionDamage).toBe(70);
    expect(HELL_RULES.DAMAGE.damageMultiplier).toBe(2.0);
    expect(HELL_RULES.WAVES.densityMultiplier).toBe(1.5);
    expect(HELL_RULES.BOSS.maxHealth).toBe(1200);
  });

  it('correctly formats boundary clear times', () => {
    expect(formatClearTime(0)).toBe('00:00.000');
    expect(formatClearTime(59999)).toBe('00:59.999');
    expect(formatClearTime(60000)).toBe('01:00.000');
    expect(formatClearTime(623456)).toBe('10:23.456');
  });
});

