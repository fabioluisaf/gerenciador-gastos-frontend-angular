import { Directive, ElementRef, inject, output } from '@angular/core';

@Directive({
  selector: 'dialog[appBackdropClick]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(click)': 'onClick($event)',
  },
})
export class BackdropClick {
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;

  readonly appBackdropClick = output<void>();

  private pressedOutside = false;

  protected onPointerDown(event: PointerEvent): void {
    this.pressedOutside = this.isOutside(event);
  }

  protected onClick(event: MouseEvent): void {
    const pressedOutside = this.pressedOutside;
    this.pressedOutside = false;
    if (pressedOutside && this.isOutside(event)) {
      this.appBackdropClick.emit();
    }
  }

  private isOutside(event: MouseEvent): boolean {
    if (event.target !== this.dialog) {
      return false;
    }
    const { top, right, bottom, left } = this.dialog.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    return x < left || x > right || y < top || y > bottom;
  }
}
