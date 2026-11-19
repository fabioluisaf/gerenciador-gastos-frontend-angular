import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

const SWIPE_THRESHOLD = 24;

@Directive({
  selector: '[appSwipeUp]',
  host: {
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'end($event)',
    '[style.touch-action]': '"none"',
  },
})
export class SwipeUp {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly appSwipeUp = output<void>();

  private pointerId: number | null = null;
  private startY = 0;
  private swiped = false;
  private suppressClick = false;

  constructor() {
    const swallowClick = (event: MouseEvent) => {
      if (this.suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    this.element.addEventListener('click', swallowClick, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      this.element.removeEventListener('click', swallowClick, { capture: true }),
    );
  }

  protected start(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }
    this.pointerId = event.pointerId;
    this.startY = event.clientY;
    this.swiped = false;
    this.element.setPointerCapture?.(event.pointerId);
  }

  protected move(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId || this.swiped) {
      return;
    }
    if (this.startY - event.clientY >= SWIPE_THRESHOLD) {
      this.swiped = true;
      this.appSwipeUp.emit();
    }
  }

  protected end(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.pointerId = null;
    if (!this.swiped) {
      return;
    }
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false));
  }
}
