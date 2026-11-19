import { DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

const DRAG_THRESHOLD = 4;

@Directive({
  selector: '[appDragScroll]',
  host: {
    class: 'drag-scroll',
    '[class.dragging]': 'dragging()',
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'end($event)',
  },
})
export class DragScroll {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private pointerId: number | null = null;
  private startX = 0;
  private startScroll = 0;
  private suppressClick = false;
  protected readonly dragging = signal(false);

  constructor() {
    const swallowClick = (event: MouseEvent) => {
      if (this.suppressClick) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    this.element.addEventListener('click', swallowClick, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      this.element.removeEventListener('click', swallowClick, { capture: true }),
    );
  }

  protected start(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startScroll = this.element.scrollLeft;
  }

  protected move(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    const distance = event.clientX - this.startX;
    if (!this.dragging()) {
      if (Math.abs(distance) < DRAG_THRESHOLD) {
        return;
      }
      this.dragging.set(true);
      this.element.setPointerCapture?.(event.pointerId);
    }
    this.element.scrollLeft = this.startScroll - distance;
  }

  protected end(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.pointerId = null;
    if (this.element.hasPointerCapture?.(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
    if (this.dragging()) {
      this.dragging.set(false);
      this.suppressClick = true;
      setTimeout(() => (this.suppressClick = false));
    }
  }
}
