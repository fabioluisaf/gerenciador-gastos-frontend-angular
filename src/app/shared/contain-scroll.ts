import { Directive } from '@angular/core';

@Directive({
  selector: '[appContainScroll]',
  host: {
    '(wheel)': 'keepWheelInside($event)',
    '[style.overscroll-behavior]': '"contain"',
  },
})
export class ContainScroll {
  protected keepWheelInside(event: WheelEvent): void {
    const element = event.currentTarget as HTMLElement;
    const atTop = element.scrollTop <= 0;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
      event.preventDefault();
    }
  }
}
