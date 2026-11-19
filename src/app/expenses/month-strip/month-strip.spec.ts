import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../../core/locale';
import { MonthStrip } from './month-strip';

describe('MonthStrip', () => {
  let fixture: ComponentFixture<MonthStrip>;
  let element: HTMLElement;

  beforeEach(async () => {
    Element.prototype.scrollTo = vi.fn();
    TestBed.configureTestingModule({ providers: [provideAppLocale()] });
    fixture = TestBed.createComponent(MonthStrip);
    fixture.componentRef.setInput('months', ['2026-11', '2026-12', '2027-01']);
    fixture.componentRef.setInput('selected', '2026-12');
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  function months(): HTMLButtonElement[] {
    return [...element.querySelectorAll<HTMLButtonElement>('.month')];
  }

  it('should group the months under the year they belong to', () => {
    const years = [...element.querySelectorAll('.year')].map((year) => ({
      year: year.querySelector('.year-label')?.textContent?.trim(),
      months: [...year.querySelectorAll('.month')].map((month) => month.textContent?.trim()),
    }));

    expect(years).toEqual([
      { year: '2026', months: ['nov', 'dez'] },
      { year: '2027', months: ['jan'] },
    ]);
    expect(months().map((month) => month.getAttribute('aria-label'))).toEqual([
      'novembro de 2026',
      'dezembro de 2026',
      'janeiro de 2027',
    ]);
  });

  it('should mark the selected month and report the month the user picks', async () => {
    const picked: string[] = [];
    fixture.componentInstance.monthSelected.subscribe((key) => picked.push(key));

    expect(months().map((month) => month.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);

    months()[2].click();

    expect(picked).toEqual(['2027-01']);
  });

  it('should fade only the edges that have hidden months', async () => {
    const scroller = element.querySelector<HTMLElement>('.scroller')!;
    vi.spyOn(scroller, 'scrollWidth', 'get').mockReturnValue(600);
    vi.spyOn(scroller, 'clientWidth', 'get').mockReturnValue(200);

    scroller.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();

    expect(scroller.classList).toContain('fade-end');
    expect(scroller.classList).not.toContain('fade-start');

    scroller.scrollLeft = 400;
    scroller.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();

    expect(scroller.classList).toContain('fade-start');
    expect(scroller.classList).not.toContain('fade-end');
    vi.restoreAllMocks();
  });

  it('should slide the highlight to the picked month with the liquid stretch, but not on the first render', async () => {
    const indicator = element.querySelector<HTMLElement>('.indicator')!;
    const animate = vi.fn();
    indicator.animate = animate;
    expect(indicator.hidden).toBe(false);
    expect(indicator.classList).not.toContain('moving');

    fixture.componentRef.setInput('selected', '2027-01');
    await fixture.whenStable();

    expect(indicator.classList).toContain('moving');
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ scale: '1.3 0.82' })]),
      expect.objectContaining({ duration: 420 }),
    );
  });

  it('should move the highlight without the stretch when the user prefers less motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    const indicator = element.querySelector<HTMLElement>('.indicator')!;
    const animate = vi.fn();
    indicator.animate = animate;

    fixture.componentRef.setInput('selected', '2026-11');
    await fixture.whenStable();

    expect(indicator.classList).not.toContain('moving');
    expect(animate).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
