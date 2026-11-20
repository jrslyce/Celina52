import type { PlayerInput } from '../sim/types';

export interface ControlsElements {
  joystickZone: HTMLElement;
  joystickBase: HTMLElement;
  joystickKnob: HTMLElement;
  actionBtn: HTMLButtonElement;
}

/**
 * Floating one-finger mobile touch joystick + WASD/Arrows + Space/E/F brawl & cash-in action button.
 */
export class InputController {
  private readonly keys = new Set<string>();
  private stickPointerId: number | null = null;
  private stickOriginX = 0;
  private stickOriginY = 0;
  private stickX = 0;
  private stickY = 0;
  private actionTapQueued = false;
  private actionHeld = false;

  private readonly maxRadius = 46;
  private readonly followRadius = 66;

  constructor(
    private readonly els: ControlsElements,
    private readonly onFirstGesture: () => void,
  ) {
    this.bindJoystick();
    this.bindActionButton();
    this.bindKeyboard();
    this.bindWindowSafety();
  }

  private positionBase(x: number, y: number): void {
    this.els.joystickBase.style.left = `${x.toFixed(1)}px`;
    this.els.joystickBase.style.top = `${y.toFixed(1)}px`;
  }

  private resetStick(): void {
    this.stickPointerId = null;
    this.stickX = 0;
    this.stickY = 0;
    this.els.joystickBase.classList.remove('is-active');
    this.els.joystickBase.style.left = '';
    this.els.joystickBase.style.top = '';
    this.els.joystickKnob.style.transform = 'translate3d(0px, 0px, 0px)';
  }

  private bindJoystick(): void {
    const { joystickZone, joystickBase } = this.els;

    joystickZone.addEventListener('pointerdown', (e) => {
      if (this.stickPointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.onFirstGesture();
      e.preventDefault();
      this.stickPointerId = e.pointerId;
      joystickZone.setPointerCapture(e.pointerId);
      this.stickOriginX = e.clientX;
      this.stickOriginY = e.clientY;
      this.positionBase(e.clientX, e.clientY);
      joystickBase.classList.add('is-active');
      this.updateStick(e.clientX, e.clientY);
    });

    joystickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickPointerId) return;
      e.preventDefault();
      this.updateStick(e.clientX, e.clientY);
    });

    const end = (e: PointerEvent) => {
      if (e.pointerId === this.stickPointerId) this.resetStick();
    };
    joystickZone.addEventListener('pointerup', end);
    joystickZone.addEventListener('pointercancel', end);
    joystickZone.addEventListener('lostpointercapture', end);
  }

  private updateStick(clientX: number, clientY: number): void {
    let dx = clientX - this.stickOriginX;
    let dy = clientY - this.stickOriginY;
    let dist = Math.hypot(dx, dy);

    if (dist > this.followRadius) {
      const pull = dist - this.followRadius;
      this.stickOriginX += (dx / dist) * pull;
      this.stickOriginY += (dy / dist) * pull;
      this.positionBase(this.stickOriginX, this.stickOriginY);
      dx = clientX - this.stickOriginX;
      dy = clientY - this.stickOriginY;
      dist = Math.hypot(dx, dy);
    }

    const clamped = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 1 ? Math.cos(angle) * clamped : 0;
    const ky = dist > 1 ? Math.sin(angle) * clamped : 0;

    this.els.joystickKnob.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0px)`;
    this.stickX = kx / this.maxRadius;
    this.stickY = ky / this.maxRadius;
  }

  private bindActionButton(): void {
    const { actionBtn } = this.els;
    actionBtn.addEventListener('pointerdown', (e) => {
      this.onFirstGesture();
      e.preventDefault();
      e.stopPropagation();
      this.actionTapQueued = true;
      this.actionHeld = true;
      actionBtn.classList.add('is-pressed');
    });
    const up = () => {
      this.actionHeld = false;
      actionBtn.classList.remove('is-pressed');
    };
    actionBtn.addEventListener('pointerup', up);
    actionBtn.addEventListener('pointercancel', up);
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      this.onFirstGesture();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) {
        if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') {
          this.actionTapQueued = true;
        }
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  private bindWindowSafety(): void {
    const clear = () => {
      this.keys.clear();
      this.actionHeld = false;
      this.resetStick();
      this.els.actionBtn.classList.remove('is-pressed');
    };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clear();
    });
  }

  public readInput(): PlayerInput {
    let kx = 0;
    let kz = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kz += 1;

    return {
      moveX: Math.abs(this.stickX) > 0.05 ? this.stickX : kx,
      moveZ: Math.abs(this.stickY) > 0.05 ? this.stickY : kz,
      actionTapQueued: this.actionTapQueued,
      actionHeld: this.actionHeld || this.keys.has('Space'),
    };
  }

  public consumeQueuedTaps(): void {
    this.actionTapQueued = false;
  }
}
