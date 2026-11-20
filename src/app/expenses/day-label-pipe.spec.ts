import { TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../core/locale';
import { DayLabelPipe } from './day-label-pipe';

describe('DayLabelPipe', () => {
  let pipe: DayLabelPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideAppLocale()] });
    pipe = TestBed.runInInjectionContext(() => new DayLabelPipe());
  });

  it('should format the day with a three-letter month and the full weekday', () => {
    expect(pipe.transform('2026-11-19')).toBe('19 de nov de 2026 — Quinta-feira');
  });

  it('should keep two-digit days and handle weekdays without hyphen', () => {
    expect(pipe.transform('2026-03-07')).toBe('07 de mar de 2026 — Sábado');
    expect(pipe.transform('2026-02-01')).toBe('01 de fev de 2026 — Domingo');
  });

  it('should label the expenses without a date', () => {
    expect(pipe.transform(null)).toBe('Sem data definida');
  });
});
