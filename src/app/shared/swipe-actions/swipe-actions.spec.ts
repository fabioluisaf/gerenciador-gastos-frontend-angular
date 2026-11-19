import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwipeActions } from './swipe-actions';

@Component({
  imports: [SwipeActions],
  template: `
    <div (click)="parentClicks = parentClicks + 1">
      <app-swipe-actions endLabel="Excluir" (endTriggered)="triggered = triggered + 1">
        <span swipeEndIcon class="icon"></span>
        <p class="content">Mercado</p>
      </app-swipe-actions>
    </div>
  `,
})
class Host {
  triggered = 0;
  parentClicks = 0;
}

describe('SwipeActions', () => {
  let fixture: ComponentFixture<Host>;
  let swipe: HTMLElement;
  let content: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    swipe = fixture.nativeElement.querySelector('app-swipe-actions');
    content = swipe.querySelector('.content')!;
    vi.spyOn(swipe, 'clientWidth', 'get').mockReturnValue(400);
  });

  afterEach(() => vi.restoreAllMocks());

  function pointer(type: string, clientX: number, clientY = 0, target: Element = content): void {
    const event = new MouseEvent(type, { bubbles: true, clientX, clientY, button: 0 });
    Object.assign(event, { pointerId: 1, isPrimary: true });
    target.dispatchEvent(event);
  }

  async function swipeTo(clientX: number): Promise<void> {
    pointer('pointerdown', 300);
    pointer('pointermove', 290);
    pointer('pointermove', clientX);
    pointer('pointerup', clientX);
    content.click();
    await fixture.whenStable();
  }

  function offset(): string {
    return swipe.style.getPropertyValue('--swipe-offset');
  }

  function action(): HTMLButtonElement {
    return swipe.querySelector('.swipe-action.end')!;
  }

  it('should keep the action hidden from assistive tech until it is revealed', async () => {
    expect(action().hasAttribute('inert')).toBe(true);
    expect(action().textContent?.trim()).toBe('Excluir');

    await swipeTo(230);

    expect(offset()).toBe('-96px');
    expect(action().hasAttribute('inert')).toBe(false);
    expect(fixture.componentInstance.parentClicks).toBe(0);
  });

  it('should close back when the content is tapped while the action is revealed', async () => {
    await swipeTo(230);
    await new Promise((resolve) => setTimeout(resolve));

    content.click();
    await fixture.whenStable();

    expect(offset()).toBe('0px');
    expect(fixture.componentInstance.parentClicks).toBe(0);
  });

  it('should snap back when the drag is too short to reveal the action', async () => {
    await swipeTo(270);

    expect(offset()).toBe('0px');
  });

  it('should trigger the action when the revealed button is pressed without bubbling up', async () => {
    await swipeTo(230);

    action().click();
    await fixture.whenStable();

    expect(fixture.componentInstance.triggered).toBe(1);
    expect(fixture.componentInstance.parentClicks).toBe(0);
    expect(offset()).toBe('0px');
  });

  it('should trigger the action when swiped far enough', async () => {
    pointer('pointerdown', 300);
    pointer('pointermove', 280);
    pointer('pointermove', 60);
    await fixture.whenStable();

    expect(swipe.classList).toContain('armed');

    pointer('pointerup', 60);
    await fixture.whenStable();

    expect(fixture.componentInstance.triggered).toBe(1);
    expect(offset()).toBe('0px');
  });

  it('should not move sideways while the user scrolls vertically or towards a side without action', async () => {
    pointer('pointerdown', 300, 0);
    pointer('pointermove', 295, 40);
    pointer('pointermove', 200, 60);
    pointer('pointerup', 200, 60);
    await fixture.whenStable();

    expect(offset()).toBe('0px');

    pointer('pointerdown', 100);
    pointer('pointermove', 120);
    pointer('pointermove', 300);
    await fixture.whenStable();

    expect(offset()).toBe('0px');
  });
});
