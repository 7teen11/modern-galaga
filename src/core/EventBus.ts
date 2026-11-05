/**
 * Typed EventBus implementing the contract in contracts/game-events.json.
 * Designed for decoupled communication between game systems without runtime allocations.
 */

export type EnemyArchetype = 'SCOUT' | 'FIGHTER' | 'COMMANDER';
export type PowerUpType = 'WEAPON_UPGRADE' | 'SCORE_BONUS';
export type VFXEventType = 'EXPLOSION' | 'HIT_SPARK' | 'PICKUP_BURST' | 'GRAZE_SPARK';

export interface GameEventMap {
  PLAYER_INPUT: {
    dx: number;
    dy: number;
    isFiring: boolean;
  };
  ENTITY_DAMAGED: {
    targetId: number;
    damageAmount: number;
    remainingHealth: number;
    sourceId: number;
  };
  ENEMY_DESTROYED: {
    enemyId: number;
    archetype: EnemyArchetype;
    x: number;
    y: number;
    pointsAwarded: number;
    droppedPowerUp: PowerUpType | null;
  };
  PLAYER_LIFE_LOST: {
    livesRemaining: number;
    isGameOver: boolean;
  };
  WEAPON_UPGRADED: {
    newTier: 1 | 2 | 3;
    isMaxTierBonus: boolean;
  };
  WAVE_COMPLETED: {
    completedWaveIndex: number;
    bonusPoints: number;
    nextWaveIndex: number;
  };
  VFX_SPAWN_TRIGGERED: {
    type: VFXEventType;
    x: number;
    y: number;
    particleCount: number;
    color: string;
  };
}

type EventHandler<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

export class EventBus {
  private listeners: { [K in keyof GameEventMap]?: EventHandler<K>[] } = {};

  public on<K extends keyof GameEventMap>(event: K, handler: EventHandler<K>): () => void {
    let list = this.listeners[event];
    if (!list) {
      list = [];
      this.listeners[event] = list;
    }
    list.push(handler);
    return () => this.off(event, handler);
  }

  public off<K extends keyof GameEventMap>(event: K, handler: EventHandler<K>): void {
    const list = this.listeners[event];
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  public emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const list = this.listeners[event];
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      list[i](payload);
    }
  }

  public clear(): void {
    this.listeners = {};
  }
}

