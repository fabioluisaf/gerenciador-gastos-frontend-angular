import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
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
const EXTRA_REVEAL_PX = 80;
const ARMED_MARGIN_PX = 48;
const TRIGGER_RATIO = 0.45;

@Component({
  selector: 'button[appSwipeAction]',
  template: `
    <span class="swipe-icon"><ng-content /></span>
    <span class="swipe-label">{{ label() }}</span>
  `,
  styleUrl: './swipe-action.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    class: 'swipe-action',
    tabindex: '-1',
    '[style.--swipe-action-color]': 'color()',
    '(click)': '$event.stopPropagation()',
  },
})
export class SwipeAction {
  readonly label = input.required<string>();
  readonly color = input<string | null>(null);
}

@Component({
  selector: 'app-swipe-actions',
  imports: [SwipeAction],
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

  private readonly extraStartActions = contentChildren(SwipeAction);

  protected readonly offset = signal(0);
  protected readonly dragging = signal(false);
  protected readonly openSide = computed<SwipeSide | null>(() => {
    const offset = this.offset();
    if (offset > 0) {
      return 'start';
    }
    return offset < 0 ? 'end' : null;
  });
  private readonly startReveal = computed(
    () => REVEAL_PX + this.extraStartActions().length * EXTRA_REVEAL_PX,
  );
  protected readonly armed = computed(() => {
    const reveal = this.openSide() === 'start' ? this.startReveal() : REVEAL_PX;
    const threshold = Math.max(this.host.clientWidth * TRIGGER_RATIO, reveal + ARMED_MARGIN_PX);
    return Math.abs(this.offset()) >= threshold;
  });

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
      this.offset.set(side === 'start' ? this.startReveal() : -REVEAL_PX);
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
      this.close();
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
