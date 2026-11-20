import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';

const DRAG_THRESHOLD = 4;

@Directive({
  selector: '[appSheetHandle]',
  host: {
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'end($event)',
    '[style.touch-action]': '"none"',
  },
})
export class SheetHandle {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly appSheetHandle = input.required<HTMLElement>();
  readonly dragged = output<number>();
  readonly released = output<number>();

  private pointerId: number | null = null;
  private startY = 0;
  private startHeight = 0;
  private height = 0;
  private dragging = false;
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
    this.startHeight = this.appSheetHandle().getBoundingClientRect().height;
    this.dragging = false;
    this.element.setPointerCapture?.(event.pointerId);
  }

  protected move(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    const distance = event.clientY - this.startY;
    if (!this.dragging) {
      if (Math.abs(distance) < DRAG_THRESHOLD) {
        return;
      }
      this.dragging = true;
    }
    this.height = Math.max(0, this.startHeight - distance);
    this.dragged.emit(this.height);
  }

  protected end(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.pointerId = null;
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false));
    this.released.emit(event.type === 'pointercancel' ? this.startHeight : this.height);
  }
}
