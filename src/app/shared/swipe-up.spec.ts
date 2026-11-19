import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwipeUp } from './swipe-up';

@Component({
  imports: [SwipeUp],
  template:
    '<button type="button" (appSwipeUp)="swipes = swipes + 1" (click)="clicks = clicks + 1"></button>',
})
class Host {
  swipes = 0;
  clicks = 0;
}

describe('SwipeUp', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let button: HTMLButtonElement;

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    host = fixture.componentInstance;
    button = fixture.nativeElement.querySelector('button');
  });

  afterEach(() => vi.useRealTimers());

  function pointer(type: string, clientY: number): void {
    const event = new MouseEvent(type, { bubbles: true, clientY, button: 0 });
    Object.assign(event, { pointerId: 1, isPrimary: true });
    button.dispatchEvent(event);
  }

  it('should emit once when dragged upwards past the threshold and swallow the trailing click', () => {
    pointer('pointerdown', 300);
    pointer('pointermove', 290);
    expect(host.swipes).toBe(0);

    pointer('pointermove', 270);
    pointer('pointermove', 200);
    pointer('pointerup', 200);
    button.click();

    expect(host.swipes).toBe(1);
    expect(host.clicks).toBe(0);

    vi.runAllTimers();
    button.click();
    expect(host.clicks).toBe(1);
  });

  it('should ignore downward drags and keep plain taps as clicks', () => {
    pointer('pointerdown', 300);
    pointer('pointermove', 360);
    pointer('pointerup', 360);
    button.click();

    expect(host.swipes).toBe(0);
    expect(host.clicks).toBe(1);
  });
});
