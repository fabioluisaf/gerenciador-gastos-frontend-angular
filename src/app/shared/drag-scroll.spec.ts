import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragScroll } from './drag-scroll';

@Component({
  imports: [DragScroll],
  template:
    '<div appDragScroll><button type="button" (click)="clicks = clicks + 1"></button></div>',
})
class Host {
  clicks = 0;
}

describe('DragScroll', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let element: HTMLElement;
  let button: HTMLButtonElement;

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    host = fixture.componentInstance;
    element = fixture.nativeElement.querySelector('[appDragScroll]');
    button = element.querySelector('button')!;
    element.scrollLeft = 200;
  });

  afterEach(() => vi.useRealTimers());

  function pointer(type: string, clientX: number, pointerType = 'mouse'): void {
    const event = new MouseEvent(type, { bubbles: true, clientX, button: 0 });
    Object.assign(event, { pointerId: 1, pointerType });
    button.dispatchEvent(event);
  }

  it('should scroll sideways while the mouse drags and swallow the click that ends the drag', () => {
    pointer('pointerdown', 100);
    pointer('pointermove', 60);

    expect(element.scrollLeft).toBe(240);
    fixture.detectChanges();
    expect(element.classList).toContain('dragging');

    pointer('pointerup', 60);
    button.click();

    expect(host.clicks).toBe(0);
    fixture.detectChanges();
    expect(element.classList).not.toContain('dragging');

    vi.runAllTimers();
    button.click();

    expect(host.clicks).toBe(1);
  });

  it('should treat a tiny mouse movement as a plain click', () => {
    pointer('pointerdown', 100);
    pointer('pointermove', 98);
    pointer('pointerup', 98);
    button.click();

    expect(element.scrollLeft).toBe(200);
    expect(host.clicks).toBe(1);
  });

  it('should leave touch dragging to the native scroll', () => {
    pointer('pointerdown', 100, 'touch');
    pointer('pointermove', 20, 'touch');

    expect(element.scrollLeft).toBe(200);
  });

  it('should keep dragging when the mouse leaves the strip before the drag starts', () => {
    pointer('pointerdown', 100);
    document.dispatchEvent(
      Object.assign(new MouseEvent('pointermove', { clientX: 40 }), { pointerId: 1 }),
    );

    expect(element.scrollLeft).toBe(260);

    document.dispatchEvent(
      Object.assign(new MouseEvent('pointerup', { clientX: 40 }), { pointerId: 1 }),
    );
    document.dispatchEvent(
      Object.assign(new MouseEvent('pointermove', { clientX: 0 }), { pointerId: 1 }),
    );

    expect(element.scrollLeft).toBe(260);
  });

  it('should block the native drag of images inside the strip', () => {
    const dragStart = new Event('dragstart', { bubbles: true, cancelable: true });
    button.dispatchEvent(dragStart);

    expect(dragStart.defaultPrevented).toBe(true);
  });
});
