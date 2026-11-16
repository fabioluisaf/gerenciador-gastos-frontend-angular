import { TestBed } from '@angular/core/testing';
import { DateSelector } from './date-selector';

describe('DateSelector', () => {
  const setup = async (value: string, mode: 'date' | 'month' = 'date') => {
    TestBed.configureTestingModule({ imports: [DateSelector] });
    const fixture = TestBed.createComponent(DateSelector);
    fixture.componentRef.setInput('pickerId', 'test-picker');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('mode', mode);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const popup = element.querySelector<HTMLElement>('[popover]')!;
    popup.hidePopover = vi.fn();
    const changed = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    const click = async (selector: string) => {
      element.querySelector<HTMLButtonElement>(selector)!.click();
      await fixture.whenStable();
    };
    await click('.date-trigger');
    return { fixture, element, popup, changed, click };
  };
  afterEach(() => TestBed.resetTestingModule());

  it('should show real days, navigate months and emit a selected date instead of submitting', async () => {
    const { fixture, element, popup, changed, click } = await setup('2024-02-29');
    expect(element.querySelector('[aria-label="Selecionar data: 29/02/2024"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('[aria-label="Selecionar data: 30/02/2024"]')).toBeNull();
    await click('[aria-label="Próximo período"]');
    await click('[aria-label="Selecionar data: 31/03/2024"]');
    expect(changed).toHaveBeenCalledWith('2024-03-31');
    expect(popup.hidePopover).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('value', '2025-02-01');
    await fixture.whenStable();
    await click('.date-trigger');
    expect(element.querySelector('[aria-label="Selecionar data: 29/02/2025"]')).toBeNull();
    await click('[aria-label="Período anterior"]');
    expect(element.querySelector('[aria-label="Selecionar data: 31/01/2025"]')).not.toBeNull();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    vi.spyOn(popup, 'matches').mockReturnValue(true);
    popup.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(popup.hidePopover).toHaveBeenCalledTimes(2);
  });

  it('should select and clear invoice months and navigate year pages', async () => {
    const { element, popup, changed, click } = await setup('2026-12', 'month');
    expect(element.querySelector('.date-trigger')?.textContent).toContain('Dezembro de 2026');
    await click('[aria-label="Próximo período"]');
    await click('[aria-label="Janeiro de 2027"]');
    expect(changed).toHaveBeenCalledWith('2027-01');
    for (let index = 0; index < 8; index++) await click('[aria-label="Próximo período"]');
    await click('[aria-label="Escolher mês e ano"]');
    expect(element.querySelector('.year-choice')?.textContent?.trim()).toBe('2035');
    await click('[aria-label="Próximo período"]');
    await click('[aria-label="Período anterior"]');
    element.querySelector<HTMLButtonElement>('.year-choice')!.click();
    await element.querySelector<HTMLButtonElement>('.clear-period')!.click();
    expect(changed).toHaveBeenLastCalledWith('');
    expect(popup.hidePopover).toHaveBeenCalledTimes(2);
  });

  it('should prevent navigation outside four-digit years and support early dates', async () => {
    const { fixture, element, changed, click } = await setup('0001-01-01');
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Período anterior"]')!.disabled).toBe(true);
    await click('[aria-label="Selecionar data: 01/01/1"]');
    expect(changed).toHaveBeenCalledWith('0001-01-01');
    fixture.componentRef.setInput('value', '9999-12-01');
    await fixture.whenStable();
    await click('.date-trigger');
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Próximo período"]')!.disabled).toBe(true);
    await click('[aria-label="Escolher mês e ano"]');
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Próximo período"]')!.disabled).toBe(true);
    await click('[aria-label="Escolher mês e ano"]');
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Próximo período"]')!.disabled).toBe(true);
  });
});
