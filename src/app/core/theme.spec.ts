import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme';

describe('ThemeService', () => {
  let listeners: ((event: MediaQueryListEvent) => void)[];

  function stubSystemScheme(dark: boolean): void {
    listeners = [];
    vi.stubGlobal('matchMedia', () => ({
      matches: !dark,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.push(listener),
      removeEventListener: () => undefined,
    }));
  }

  function appliedTheme(): string | null {
    TestBed.tick();
    return document.documentElement.getAttribute('data-theme');
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should follow the system scheme by default, including later changes', () => {
    stubSystemScheme(false);
    const service = TestBed.inject(ThemeService);

    expect(service.preference()).toBe('system');
    expect(appliedTheme()).toBe('light');

    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    expect(appliedTheme()).toBe('dark');
  });

  it('should apply and remember an explicit choice, forgetting it when back to system', () => {
    stubSystemScheme(true);
    const service = TestBed.inject(ThemeService);

    service.setPreference('light');
    expect(appliedTheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    service.setPreference('system');
    expect(appliedTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('should restore the remembered choice', () => {
    stubSystemScheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    expect(TestBed.inject(ThemeService).preference()).toBe('light');
    expect(appliedTheme()).toBe('light');
  });
});
