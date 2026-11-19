import { TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../core/locale';
import {
  buildTimeline,
  formatPeriodLabel,
  monthRange,
  periodKeyOf,
  toScrubberMarks,
} from './timeline';

describe('timeline', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideAppLocale()] }));

  it('should accumulate the offset of each month in the order received', () => {
    const timeline = buildTimeline(
      [
        { year: 2026, month: 11, count: 30 },
        { year: 2026, month: 2, count: 15 },
        { year: 2025, month: 12, count: 5 },
      ],
      'pt-BR',
    );

    expect(timeline).toEqual([
      { key: '2026-11', label: 'nov de 2026', offset: 0 },
      { key: '2026-02', label: 'fev de 2026', offset: 30 },
      { key: '2025-12', label: 'dez de 2025', offset: 45 },
    ]);
    expect(toScrubberMarks(timeline, 50).map((mark) => mark.position)).toEqual([0, 0.6, 0.9]);
  });

  it('should place every mark at the top when there are no expenses', () => {
    expect(toScrubberMarks([{ key: '2026-01', label: 'jan de 2026', offset: 0 }], 0)).toEqual([
      { id: '2026-01', label: 'jan de 2026', position: 0 },
    ]);
  });

  it('should extract the month key from an ISO date', () => {
    expect(periodKeyOf('2026-03-07')).toBe('2026-03');
  });

  it('should list every month between the earliest and the latest, crossing years', () => {
    expect(monthRange(['2027-02', 'sem-data', '2026-11', '2026-12', '2026-11'])).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(monthRange(['sem-data'])).toEqual([]);
  });

  it('should keep the expenses without a date in their own period', () => {
    expect(periodKeyOf(null)).toBe('sem-data');
    expect(formatPeriodLabel('sem-data', 'pt-BR')).toBe('Sem data');
    expect(
      buildTimeline(
        [
          { year: 2026, month: 12, count: 2 },
          { year: null, month: null, count: 1 },
        ],
        'pt-BR',
      ).at(-1),
    ).toEqual({ key: 'sem-data', label: 'Sem data', offset: 2 });
  });
});
