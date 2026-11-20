import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HorizontalWheelScroll } from './horizontal-wheel-scroll';

@Component({
  imports: [HorizontalWheelScroll],
  template: '<div appHorizontalWheelScroll></div>',
})
class Host {}

describe('HorizontalWheelScroll', () => {
  let element: HTMLElement;

  beforeEach(() => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    element = fixture.nativeElement.querySelector('[appHorizontalWheelScroll]');
  });

  function overflowing(scrollWidth: number): void {
    Object.defineProperties(element, {
      scrollWidth: { value: scrollWidth, configurable: true },
      clientWidth: { value: 300, configurable: true },
    });
  }

  function wheel(deltaY: number, deltaX = 0): boolean {
    const event = new WheelEvent('wheel', { deltaY, deltaX, cancelable: true });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it('should turn the vertical wheel into sideways scrolling when the content overflows', () => {
    overflowing(900);

    expect(wheel(120)).toBe(true);
    expect(element.scrollLeft).toBe(120);
  });

  it('should leave the wheel alone when everything fits or the gesture is already sideways', () => {
    overflowing(300);
    expect(wheel(120)).toBe(false);

    overflowing(900);
    expect(wheel(0, 40)).toBe(false);
    expect(element.scrollLeft).toBe(0);
  });
});
