import { EventBus } from '../core/EventBus';
import { EntityManager } from '../ecs/Entity';
import { EntityId } from '../ecs/Component';
import { Vector2, Vec2 } from '../utils/Vector2';
import { GameSystem } from '../core/Game';

/**
 * 8-Directional Input Handler (FR-001, FR-002).
 * Supports WASD, Arrow Keys, Space/J/Z firing, and Gamepad axes.
 * Cancels opposing simultaneous directions (Left+Right = 0, Up+Down = 0)
 * and normalizes diagonal velocity vectors by 1/sqrt(2) (~0.7071).
 */
export class InputSystem implements GameSystem {
  private readonly entities: EntityManager;
  private readonly eventBus: EventBus;
  private playerId: EntityId;

  private readonly keysDown: Set<string> = new Set();
  private readonly normalizedDir: Vec2 = { x: 0, y: 0 };
  private readonly gamepadState = { dx: 0, dy: 0, fire: false };
  public isFiring = false;
  private pauseCallback?: () => void;

  constructor(
    entities: EntityManager,
    eventBus: EventBus,
    playerId: EntityId,
    onTogglePause?: () => void
  ) {
    this.entities = entities;
    this.eventBus = eventBus;
    this.playerId = playerId;
    this.pauseCallback = onTogglePause;

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => this.onKeyDown(e));
      window.addEventListener('keyup', (e) => this.onKeyUp(e));
      window.addEventListener('blur', () => this.clearInputs());
    }
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  /**
   * Programmatic key state control for headless automated testing.
   */
  public setKeyState(code: string, isDown: boolean): void {
    if (isDown) {
      this.keysDown.add(code);
    } else {
      this.keysDown.delete(code);
    }
  }

  public clearInputs(): void {
    this.keysDown.clear();
    this.isFiring = false;
    this.normalizedDir.x = 0;
    this.normalizedDir.y = 0;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.pauseCallback && !e.repeat) {
        this.pauseCallback();
      }
      return;
    }

    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    this.keysDown.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  public update(_dt: number): void {
    if (!this.entities.isEntityActive(this.playerId)) return;

    const transform = this.entities.transforms.get(this.playerId);
    if (!transform) return;

    const left =
      this.keysDown.has('ArrowLeft') ||
      this.keysDown.has('KeyA') ? 1 : 0;
    const right =
      this.keysDown.has('ArrowRight') ||
      this.keysDown.has('KeyD') ? 1 : 0;
    const up =
      this.keysDown.has('ArrowUp') ||
      this.keysDown.has('KeyW') ? 1 : 0;
    const down =
      this.keysDown.has('ArrowDown') ||
      this.keysDown.has('KeyS') ? 1 : 0;

    this.pollGamepad();

    // Opposing simultaneous keys cancel out cleanly: (-1 + 1 = 0)
    const kbDx = right - left;
    const kbDy = down - up;

    const rawDx = kbDx !== 0 ? kbDx : this.gamepadState.dx;
    const rawDy = kbDy !== 0 ? kbDy : this.gamepadState.dy;

    Vector2.normalize8Dir(rawDx, rawDy, this.normalizedDir);

    transform.vx = this.normalizedDir.x * transform.speed;
    transform.vy = this.normalizedDir.y * transform.speed;

    this.isFiring =
      this.keysDown.has('Space') ||
      this.keysDown.has('KeyJ') ||
      this.keysDown.has('KeyZ') ||
      this.gamepadState.fire;

    this.eventBus.emit('PLAYER_INPUT', {
      dx: this.normalizedDir.x,
      dy: this.normalizedDir.y,
      isFiring: this.isFiring
    });
  }

  /**
   * Polls HTML5 Gamepad API (navigator.getGamepads) for D-pad and left analog stick 8-directional input (T048).
   */
  private pollGamepad(): void {
    this.gamepadState.dx = 0;
    this.gamepadState.dy = 0;
    this.gamepadState.fire = false;

    if (
      typeof navigator === 'undefined' ||
      typeof navigator.getGamepads !== 'function'
    ) {
      return;
    }

    const pads = navigator.getGamepads();
    if (!pads) return;

    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad || !pad.connected) continue;

      const deadzone = 0.25;
      const axisX = pad.axes[0] ?? 0;
      const axisY = pad.axes[1] ?? 0;

      const dpadUp = pad.buttons[12]?.pressed ? 1 : 0;
      const dpadDown = pad.buttons[13]?.pressed ? 1 : 0;
      const dpadLeft = pad.buttons[14]?.pressed ? 1 : 0;
      const dpadRight = pad.buttons[15]?.pressed ? 1 : 0;

      let gx = dpadRight - dpadLeft;
      let gy = dpadDown - dpadUp;

      if (gx === 0 && Math.abs(axisX) > deadzone) {
        gx = axisX > 0 ? 1 : -1;
      }
      if (gy === 0 && Math.abs(axisY) > deadzone) {
        gy = axisY > 0 ? 1 : -1;
      }

      this.gamepadState.dx = gx;
      this.gamepadState.dy = gy;
      this.gamepadState.fire = Boolean(
        pad.buttons[0]?.pressed ||
        pad.buttons[1]?.pressed ||
        pad.buttons[7]?.pressed
      );
      break;
    }
  }
}

