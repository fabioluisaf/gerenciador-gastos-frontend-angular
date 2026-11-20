import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { storedChoice } from './stored-choice';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = Exclude<ThemePreference, 'system'>;

export const THEME_STORAGE_KEY = 'tema';
const LIGHT_SCHEME_QUERY = '(prefers-color-scheme: light)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly lightScheme = this.document.defaultView?.matchMedia?.(LIGHT_SCHEME_QUERY);
  private readonly systemPrefersLight = signal(this.lightScheme?.matches ?? false);
  private readonly choice = storedChoice<ThemePreference>(
    THEME_STORAGE_KEY,
    ['system', 'light', 'dark'],
    'system',
  );

  readonly preference = this.choice.value;
  readonly theme = computed<Theme>(() => {
    const preference = this.preference();
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
    effect(() => (this.document.documentElement.dataset['theme'] = this.theme()));
  }

  setPreference(preference: ThemePreference): void {
    this.choice.set(preference);
  }
}
