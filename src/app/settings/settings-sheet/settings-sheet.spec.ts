import { TestBed } from '@angular/core/testing';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { ThemeService } from '../../core/theme';
import { stubDialogs } from '../../shared/testing/dialog-stub';
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

  it('should hide the control bar while open and show it again once closed', async () => {
    const fixture = TestBed.createComponent(SettingsSheet);
    const controlBar = TestBed.inject(ControlBarState);
    fixture.detectChanges();

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

  it('should start on the system theme and switch when another option is picked', () => {
    const fixture = TestBed.createComponent(SettingsSheet);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const options = [...element.querySelectorAll<HTMLInputElement>('input[name="tema"]')];

    expect(options.map((option) => option.closest('label')?.textContent?.trim())).toEqual([
      'Sistema',
      'Claro',
      'Escuro',
    ]);
    expect(options.find((option) => option.checked)?.value).toBe('system');

    options[1].click();
    fixture.detectChanges();

    expect(TestBed.inject(ThemeService).preference()).toBe('light');
    expect(element.querySelector('label.active')?.textContent?.trim()).toBe('Claro');
  });
});
