import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { FontSizeService } from '../../core/font-size';
import { ThemeService } from '../../core/theme';
import { stubDialogs } from '../../shared/testing/dialog-stub';
import { BackupApi } from '../backup-api';
import { SettingsSheet } from './settings-sheet';

describe('SettingsSheet', () => {
  let restoreDialogs: () => void;

  beforeEach(() => {
    restoreDialogs = stubDialogs();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    restoreDialogs();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  async function render(download: () => Observable<Blob> = () => of(new Blob())) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: BackupApi, useValue: { download } }],
    });
    const fixture = TestBed.createComponent(SettingsSheet);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  function group(element: HTMLElement, label: string): HTMLElement {
    const labelElement = [...element.querySelectorAll('.label')].find(
      (candidate) => candidate.textContent === label,
    );
    return element.querySelector(`[aria-labelledby="${labelElement?.id}"]`)!;
  }

  function choices(groupElement: HTMLElement): HTMLInputElement[] {
    return [...groupElement.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  }

  function labels(groupElement: HTMLElement): string[] {
    return choices(groupElement).map((choice) => choice.closest('label')!.textContent!.trim());
  }

  it('should hide the control bar while open and show it again once closed', async () => {
    const fixture = await render();
    const controlBar = TestBed.inject(ControlBarState);

    fixture.componentInstance.open();
    await fixture.whenStable();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');

    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(dialog.open).toBe(true);
    expect(controlBar.hidden()).toBe(true);

    dialog.close();
    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(controlBar.hidden()).toBe(false);
  });

  it('should start on the system theme and switch when another option is picked', async () => {
    const fixture = await render();
    const theme = group(fixture.nativeElement, 'Tema');

    expect(labels(theme)).toEqual(['Sistema', 'Claro', 'Escuro']);
    expect(choices(theme).find((choice) => choice.checked)?.value).toBe('system');

    choices(theme)[1].click();
    fixture.detectChanges();

    expect(TestBed.inject(ThemeService).preference()).toBe('light');
    expect(theme.querySelector('label.active')?.textContent?.trim()).toBe('Claro');
  });

  it('should start on the small font size and switch when a bigger one is picked', async () => {
    const fixture = await render();
    const fontSize = group(fixture.nativeElement, 'Tamanho da fonte');

    expect(labels(fontSize)).toEqual(['Pequena', 'Média', 'Grande']);
    expect(choices(fontSize).find((choice) => choice.checked)?.value).toBe('small');

    choices(fontSize)[2].click();
    fixture.detectChanges();

    expect(TestBed.inject(FontSizeService).size()).toBe('large');
    expect(fontSize.querySelector('label.active')?.textContent?.trim()).toBe('Grande');
  });

  it('should download the backup zip named with today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 21, 19, 30));
    const zip = new Blob(['PK']);
    URL.createObjectURL = vi.fn(() => 'blob:backup');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('backup-gastos-2026-11-21.zip');
      expect(this.href).toBe('blob:backup');
    });
    const fixture = await render(() => of(zip));

    fixture.nativeElement.querySelector('button.action-button').click();

    expect(URL.createObjectURL).toHaveBeenCalledWith(zip);
    expect(click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
    click.mockRestore();
    vi.useRealTimers();
  });

  it('should show progress and an error when the backup fails', async () => {
    const response = new Subject<Blob>();
    const fixture = await render(() => response);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.action-button');

    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Gerando backup…');

    response.error(new Error());
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível gerar o backup',
    );
  });
});
