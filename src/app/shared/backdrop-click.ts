import { Directive, ElementRef, inject, input, output } from '@angular/core';

@Directive({
  selector: 'dialog[appBackdropClick]',
  host: {
    '(mousedown)': 'onMouseDown($event)',
    '(mouseup)': 'onMouseUp($event)',
    '(click)': 'onClick($event)',
    '(close)': 'reset()',
  },
})
export class BackdropClick {
  readonly backdropBounds = input(false);
  readonly backdropClick = output<void>();
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private downOutside: boolean | undefined;
  private upOutside: boolean | undefined;

  protected onMouseDown(event: MouseEvent): void {
    this.downOutside = this.isOutside(event);
    this.upOutside = undefined;
  }

  protected onMouseUp(event: MouseEvent): void {
    this.upOutside = this.isOutside(event);
  }

  protected onClick(event: MouseEvent): void {
    if (this.downOutside !== false && this.upOutside !== false && this.isOutside(event)) {
      this.backdropClick.emit();
    }
    this.reset();
  }

  protected reset(): void {
    this.downOutside = undefined;
    this.upOutside = undefined;
  }

  private isOutside(event: MouseEvent): boolean {
    if (event.target !== this.dialog) return false;
    if (!this.backdropBounds()) return true;
    const bounds = this.dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
}
