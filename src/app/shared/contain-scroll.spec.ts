import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContainScroll } from './contain-scroll';

@Component({
  imports: [ContainScroll],
  template: '<div appContainScroll></div>',
})
class Host {}

function scrollable(element: HTMLElement, scrollTop: number, scrollHeight: number): void {
  Object.defineProperties(element, {
    scrollTop: { value: scrollTop, configurable: true },
    scrollHeight: { value: scrollHeight, configurable: true },
    clientHeight: { value: 100, configurable: true },
  });
}

function wheel(element: HTMLElement, deltaY: number): boolean {
  const event = new WheelEvent('wheel', { deltaY, cancelable: true, bubbles: true });
  element.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('ContainScroll', () => {
  let element: HTMLElement;

  beforeEach(() => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    element = fixture.nativeElement.querySelector('[appContainScroll]');
  });

  it('should contain the overscroll of the element', () => {
    expect(element.style.overscrollBehavior).toBe('contain');
  });

  it('should let the element scroll while it has room in the wheel direction', () => {
    scrollable(element, 50, 300);

    expect(wheel(element, 40)).toBe(false);
    expect(wheel(element, -40)).toBe(false);
  });

  it('should keep the wheel from reaching the page at the edges', () => {
    scrollable(element, 0, 300);
    expect(wheel(element, -40)).toBe(true);
    expect(wheel(element, 40)).toBe(false);

    scrollable(element, 200, 300);
    expect(wheel(element, 40)).toBe(true);
    expect(wheel(element, -40)).toBe(false);
  });

  it('should keep the wheel from reaching the page when the content fits without scrolling', () => {
    scrollable(element, 0, 100);

    expect(wheel(element, 40)).toBe(true);
    expect(wheel(element, -40)).toBe(true);
  });
});
