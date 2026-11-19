import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { provideAppLocale } from './core/locale';
import { ThemeService } from './core/theme';
import { tagViewTransitionTypes } from './core/view-transition-types';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppLocale(),
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    provideHttpClient(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: tagViewTransitionTypes,
      }),
    ),
  ],
};
