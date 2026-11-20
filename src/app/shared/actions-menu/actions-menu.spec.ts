import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionsMenu } from './actions-menu';

@Component({
  imports: [ActionsMenu],
  template: `
    <div (click)="parentClicks = parentClicks + 1">
      <app-actions-menu
        label="Ações do gasto"
        (editRequested)="edits = edits + 1"
        (deleteRequested)="deletes = deletes + 1"
      />
    </div>
  `,
})
class Host {
  edits = 0;
  deletes = 0;
  parentClicks = 0;
}

describe('ActionsMenu', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(async () => {
    HTMLElement.prototype.hidePopover ??= vi.fn();
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('should point the trigger to its own menu', () => {
    const trigger = element.querySelector<HTMLButtonElement>('.more')!;
    const menu = element.querySelector<HTMLElement>('.menu')!;

    expect(trigger.getAttribute('aria-label')).toBe('Ações do gasto');
    expect(trigger.getAttribute('popovertarget')).toBe(menu.id);
    expect(menu.hasAttribute('popover')).toBe(true);
  });

  it('should reflect whether the menu is open', async () => {
    const menu = element.querySelector<HTMLElement>('.menu')!;
    menu.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }));
    await fixture.whenStable();

    expect(element.querySelector('app-actions-menu')?.classList).toContain('open');
    expect(element.querySelector('.more')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('should ask to delete without letting the click reach the card', async () => {
    const hidePopover = vi.spyOn(HTMLElement.prototype, 'hidePopover').mockImplementation(() => {});

    element.querySelector<HTMLButtonElement>('.more')!.click();
    element.querySelector<HTMLButtonElement>('.menu-item.danger')!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.deletes).toBe(1);
    expect(fixture.componentInstance.parentClicks).toBe(0);
    expect(hidePopover).toHaveBeenCalled();
    hidePopover.mockRestore();
  });

  it('should offer editing before deleting and ask for it', async () => {
    const hidePopover = vi.spyOn(HTMLElement.prototype, 'hidePopover').mockImplementation(() => {});
    const items = [...element.querySelectorAll<HTMLButtonElement>('.menu-item')];

    expect(items.map((item) => item.textContent?.trim())).toEqual(['Editar', 'Excluir']);
    items[0].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.edits).toBe(1);
    expect(fixture.componentInstance.deletes).toBe(0);
    expect(fixture.componentInstance.parentClicks).toBe(0);
    hidePopover.mockRestore();
  });
});
