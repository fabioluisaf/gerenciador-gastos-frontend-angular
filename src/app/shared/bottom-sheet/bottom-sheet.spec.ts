import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubDialogs } from '../testing/dialog-stub';
import { BottomSheet } from './bottom-sheet';

@Component({
  imports: [BottomSheet],
  template: `
    <app-bottom-sheet label="Totais do mês" (closed)="closed = closed + 1">
      <p class="content">Conteúdo</p>
    </app-bottom-sheet>
  `,
})
class Host {
  readonly sheet = viewChild.required(BottomSheet);
  closed = 0;
}

describe('BottomSheet', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let restoreDialogs: () => void;

  beforeEach(async () => {
    restoreDialogs = stubDialogs();
    vi.stubGlobal('innerHeight', 1000);
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement;
    await fixture.whenStable();
    fixture.componentInstance.sheet().open();
    await fixture.whenStable();
  });

  afterEach(() => {
    restoreDialogs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function dialog(): HTMLDialogElement {
    return element.querySelector('dialog')!;
  }

  function handle(): HTMLButtonElement {
    return element.querySelector('.sheet-handle')!;
  }

  function pointer(type: string, clientY: number): void {
    const event = new MouseEvent(type, { bubbles: true, clientY, button: 0 });
    Object.assign(event, { pointerId: 1, isPrimary: true });
    handle().dispatchEvent(event);
  }

  async function drag(from: number, to: number, sheetHeight: number): Promise<void> {
    vi.spyOn(dialog(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ y: 1000 - sheetHeight, width: 400, height: sheetHeight }),
    );
    pointer('pointerdown', from);
    pointer('pointermove', (from + to) / 2);
    pointer('pointermove', to);
    pointer('pointerup', to);
    await fixture.whenStable();
  }

  it('should show the projected content without a close button and report when it closes', async () => {
    expect(dialog().getAttribute('aria-label')).toBe('Totais do mês');
    expect(element.querySelector('.sheet-body .content')?.textContent).toBe('Conteúdo');
    expect(element.querySelector('.sheet-close')).toBeNull();

    fixture.componentInstance.sheet().close();
    await fixture.whenStable();

    expect(dialog().open).toBe(false);
    expect(fixture.componentInstance.closed).toBe(1);
  });

  it('should only close on clicks that land outside the sheet', () => {
    vi.spyOn(dialog(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 400, width: 400, height: 600 }),
    );
    const click = (down: [number, number], up: [number, number]) => {
      const [downX, downY] = down;
      const [upX, upY] = up;
      dialog().dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, clientX: downX, clientY: downY }),
      );
      dialog().dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: upX, clientY: upY }));
    };

    click([200, 500], [200, 500]);
    expect(dialog().open).toBe(true);

    click([200, 500], [200, 100]);
    expect(dialog().open).toBe(true);

    click([200, 100], [200, 500]);
    expect(dialog().open).toBe(true);

    click([200, 100], [200, 100]);
    expect(dialog().open).toBe(false);
  });

  it('should toggle between half and full height when the handle is clicked', async () => {
    expect(handle().getAttribute('aria-label')).toBe('Expandir painel');

    handle().click();
    await fixture.whenStable();

    expect(dialog().classList).toContain('expanded');
    expect(handle().getAttribute('aria-expanded')).toBe('true');
    expect(handle().getAttribute('aria-label')).toBe('Reduzir painel');
  });

  it('should follow the finger while dragging and snap to the nearest height', async () => {
    vi.spyOn(dialog(), 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ y: 400, width: 400, height: 600 }),
    );
    pointer('pointerdown', 410);
    pointer('pointermove', 310);
    await fixture.whenStable();

    expect(dialog().style.blockSize).toBe('700px');
    expect(dialog().classList).toContain('dragging');

    pointer('pointermove', 60);
    pointer('pointerup', 60);
    handle().click();
    await fixture.whenStable();

    expect(dialog().classList).toContain('expanded');
    expect(dialog().classList).not.toContain('dragging');
    expect(dialog().style.blockSize).toBe('');

    await drag(40, 500, 976);
    expect(dialog().classList).not.toContain('expanded');
    expect(dialog().open).toBe(true);
  });

  it('should close when dragged down far enough', async () => {
    await drag(410, 800, 600);

    expect(dialog().open).toBe(false);
    expect(fixture.componentInstance.closed).toBe(1);
  });
});
