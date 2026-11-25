import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwipeAction, SwipeActions } from './swipe-actions';

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
    const side = () => swipe.querySelector('.swipe-side.end')!;
    expect(side().hasAttribute('inert')).toBe(true);
    expect(action().textContent?.trim()).toBe('Excluir');

    await swipeTo(230);

    expect(offset()).toBe('-96px');
    expect(side().hasAttribute('inert')).toBe(false);
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

@Component({
  imports: [SwipeAction, SwipeActions],
  template: `
    <div (click)="parentClicks = parentClicks + 1">
      <app-swipe-actions startLabel="Editar" (startTriggered)="edits = edits + 1">
        <button appSwipeAction label="Copiar" (click)="copies = copies + 1"></button>
        @if (realizable()) {
          <button
            appSwipeAction
            label="Realizar"
            (click)="realizations = realizations + 1"
          ></button>
        }
        <p class="content">Mercado</p>
      </app-swipe-actions>
    </div>
  `,
})
class ExtrasHost {
  readonly realizable = signal(true);
  edits = 0;
  copies = 0;
  realizations = 0;
  parentClicks = 0;
}

describe('SwipeActions with extra actions', () => {
  let fixture: ComponentFixture<ExtrasHost>;
  let swipe: HTMLElement;
  let content: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ExtrasHost);
    await fixture.whenStable();
    swipe = fixture.nativeElement.querySelector('app-swipe-actions');
    content = swipe.querySelector('.content')!;
    vi.spyOn(swipe, 'clientWidth', 'get').mockReturnValue(400);
  });

  afterEach(() => vi.restoreAllMocks());

  function pointer(type: string, clientX: number): void {
    const event = new MouseEvent(type, { bubbles: true, clientX, clientY: 0, button: 0 });
    Object.assign(event, { pointerId: 1, isPrimary: true });
    content.dispatchEvent(event);
  }

  async function swipeRightTo(clientX: number): Promise<void> {
    pointer('pointerdown', 0);
    pointer('pointermove', 10);
    pointer('pointermove', clientX);
    pointer('pointerup', clientX);
    content.click();
    await fixture.whenStable();
  }

  function offset(): string {
    return swipe.style.getPropertyValue('--swipe-offset');
  }

  function labels(): string[] {
    return [...swipe.querySelectorAll('.swipe-side.start .swipe-action')].map(
      (button) => button.textContent?.trim() ?? '',
    );
  }

  it('should reveal the extra actions next to the main one, widening the opened side', async () => {
    expect(labels()).toEqual(['Editar', 'Copiar', 'Realizar']);

    await swipeRightTo(100);
    expect(offset()).toBe('256px');

    fixture.componentInstance.realizable.set(false);
    await fixture.whenStable();
    expect(labels()).toEqual(['Editar', 'Copiar']);
  });

  it('should run the pressed extra action and close without bubbling up', async () => {
    await swipeRightTo(100);

    swipe.querySelectorAll<HTMLButtonElement>('.swipe-action')[2].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.realizations).toBe(1);
    expect(fixture.componentInstance.edits).toBe(0);
    expect(fixture.componentInstance.parentClicks).toBe(0);
    expect(offset()).toBe('0px');
  });

  it('should only arm the main action past the revealed actions', async () => {
    pointer('pointerdown', 0);
    pointer('pointermove', 10);
    pointer('pointermove', 280);
    await fixture.whenStable();
    expect(swipe.classList).not.toContain('armed');

    pointer('pointermove', 320);
    await fixture.whenStable();
    expect(swipe.classList).toContain('armed');

    pointer('pointerup', 320);
    await fixture.whenStable();
    expect(fixture.componentInstance.edits).toBe(1);
    expect(fixture.componentInstance.copies).toBe(0);
  });
});
