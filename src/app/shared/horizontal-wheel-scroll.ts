import { Directive } from '@angular/core';

@Directive({
  selector: '[appHorizontalWheelScroll]',
  host: {
    '(wheel)': 'scrollSideways($event)',
  },
})
export class HorizontalWheelScroll {
  protected scrollSideways(event: WheelEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (event.deltaX !== 0 || element.scrollWidth <= element.clientWidth) {
      return;
    }
    event.preventDefault();
    element.scrollLeft += event.deltaY;
  }
}
