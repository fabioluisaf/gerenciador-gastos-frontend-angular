import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export type SwipeSide = 'start' | 'end';

const DIRECTION_LOCK_PX = 8;
const REVEAL_PX = 96;
const TRIGGER_RATIO = 0.45;

@Component({
  selector: 'app-swipe-actions',
  templateUrl: './swipe-actions.html',
  styleUrl: './swipe-actions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dragging]': 'dragging()',
    '[class.armed]': 'armed()',
    '[style.--swipe-offset.px]': 'offset()',
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'cancel($event)',
    '(document:pointerdown)': 'closeWhenOutside($event)',
    '(keydown.escape)': 'close()',
  },
})
export class SwipeActions {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly startLabel = input<string | null>(null);
  readonly endLabel = input<string | null>(null);
  readonly startTriggered = output<void>();
  readonly endTriggered = output<void>();

  protected readonly offset = signal(0);
  protected readonly dragging = signal(false);
  protected readonly openSide = computed<SwipeSide | null>(() => {
    const offset = this.offset();
    if (offset > 0) {
      return 'start';
    }
    return offset < 0 ? 'end' : null;
  });
  protected readonly armed = computed(
    () => Math.abs(this.offset()) >= this.host.clientWidth * TRIGGER_RATIO,
  );

  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private startOffset = 0;
  private locked: 'horizontal' | 'vertical' | null = null;
  private suppressClick = false;

  constructor() {
    const swallowClick = (event: MouseEvent) => this.swallowClick(event);
    this.host.addEventListener('click', swallowClick, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      this.host.removeEventListener('click', swallowClick, { capture: true }),
    );
  }

  close(): void {
    this.offset.set(0);
  }

  protected start(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0 || this.isOnAction(event)) {
      return;
    }
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startOffset = this.offset();
    this.locked = null;
  }

  protected move(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId || this.locked === 'vertical') {
      return;
    }
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    if (this.locked === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_LOCK_PX) {
        return;
      }
      this.locked = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (this.locked === 'vertical') {
        return;
      }
      this.dragging.set(true);
      this.host.setPointerCapture?.(event.pointerId);
    }
    this.offset.set(this.clamp(this.startOffset + dx));
  }

  protected end(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.pointerId = null;
    if (!this.dragging()) {
      return;
    }
    this.dragging.set(false);
    this.suppressNextClick();
    const side = this.openSide();
    if (side && this.armed()) {
      this.trigger(side);
    } else if (Math.abs(this.offset()) >= REVEAL_PX / 2) {
      this.offset.set(side === 'start' ? REVEAL_PX : -REVEAL_PX);
    } else {
      this.close();
    }
  }

  protected cancel(event: PointerEvent): void {
    if (event.pointerId === this.pointerId) {
      this.pointerId = null;
      this.dragging.set(false);
      this.close();
    }
  }

  protected trigger(side: SwipeSide, event?: Event): void {
    event?.stopPropagation();
    this.close();
    if (side === 'start') {
      this.startTriggered.emit();
    } else {
      this.endTriggered.emit();
    }
  }

  private swallowClick(event: MouseEvent): void {
    if (this.isOnAction(event)) {
      return;
    }
    if (this.suppressClick || this.offset() !== 0) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.suppressClick) {
      this.close();
    }
  }

  protected closeWhenOutside(event: PointerEvent): void {
    if (this.offset() !== 0 && !this.host.contains(event.target as Node)) {
      this.close();
    }
  }

  private clamp(offset: number): number {
    const max = this.host.clientWidth;
    const min = this.endLabel() ? -max : 0;
    return Math.min(this.startLabel() ? max : 0, Math.max(min, offset));
  }

  private isOnAction(event: Event): boolean {
    return (event.target as Element | null)?.closest?.('.swipe-action') != null;
  }

  private suppressNextClick(): void {
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false));
  }
}
