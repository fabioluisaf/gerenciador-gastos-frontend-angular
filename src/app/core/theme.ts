import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = Exclude<ThemePreference, 'system'>;

export const THEME_STORAGE_KEY = 'tema';
const LIGHT_SCHEME_QUERY = '(prefers-color-scheme: light)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = this.document.defaultView?.localStorage;
  private readonly lightScheme = this.document.defaultView?.matchMedia?.(LIGHT_SCHEME_QUERY);
  private readonly systemPrefersLight = signal(this.lightScheme?.matches ?? false);
  private readonly preferenceState = signal<ThemePreference>(this.readStoredPreference());

  readonly preference = this.preferenceState.asReadonly();
  readonly theme = computed<Theme>(() => {
    const preference = this.preferenceState();
    if (preference !== 'system') {
      return preference;
    }
    return this.systemPrefersLight() ? 'light' : 'dark';
  });

  constructor() {
    const followSystem = (event: MediaQueryListEvent) => this.systemPrefersLight.set(event.matches);
    this.lightScheme?.addEventListener?.('change', followSystem);
    inject(DestroyRef).onDestroy(() =>
      this.lightScheme?.removeEventListener?.('change', followSystem),
    );
    effect(() => this.document.documentElement.setAttribute('data-theme', this.theme()));
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    try {
      if (preference === 'system') {
        this.storage?.removeItem(THEME_STORAGE_KEY);
      } else {
        this.storage?.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      return;
    }
  }

  private readStoredPreference(): ThemePreference {
    try {
      const stored = this.storage?.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
