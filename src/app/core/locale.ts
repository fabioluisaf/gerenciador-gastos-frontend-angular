import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  DEFAULT_CURRENCY_CODE,
  EnvironmentProviders,
  LOCALE_ID,
  makeEnvironmentProviders,
} from '@angular/core';

export function provideAppLocale(): EnvironmentProviders {
  registerLocaleData(localePt, 'pt-BR');
  return makeEnvironmentProviders([
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
  ]);
}
