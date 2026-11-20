import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../../core/locale';
import { DateField, DateFieldMode } from './date-field';

@Component({
  imports: [DateField],
  template: `
    <app-date-field
      label="Data"
      emptyLabel="Sem data"
      [mode]="mode()"
      [clearLabel]="clearLabel()"
      [value]="value()"
      (valueChange)="value.set($event)"
    />
  `,
})
class Host {
  readonly value = signal('2026-11-19');
  readonly mode = signal<DateFieldMode>('date');
  readonly clearLabel = signal<string | null>(null);
}

describe('DateField', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideAppLocale()] });
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  function trigger(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('.trigger')!;
  }

  function open(): void {
    trigger().click();
    fixture.detectChanges();
  }

  it('should show the chosen date written out and open the calendar on its month', () => {
    expect(trigger().textContent?.trim()).toBe('19 de novembro de 2026');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    open();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.panel-title')?.textContent).toBe('Novembro de 2026');
    expect(element.querySelectorAll('.day').length).toBe(42);
    expect(element.querySelector('.day.selected')?.textContent?.trim()).toBe('19');
    expect(element.querySelector('.day')?.textContent?.trim()).toBe('1');
    expect(element.querySelector('.day.outside')?.textContent?.trim()).toBe('1');
  });

  it('should pick a day, close the calendar and give focus back to the field', () => {
    open();
    const day = [...element.querySelectorAll<HTMLButtonElement>('.day:not(.outside)')].find(
      (button) => button.textContent?.trim() === '5',
    )!;

    day.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('2026-11-05');
    expect(element.querySelector('.panel')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('should move between months', () => {
    open();

    element.querySelector<HTMLButtonElement>('button[aria-label="Próximo mês"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.panel-title')?.textContent).toBe('Dezembro de 2026');

    element.querySelector<HTMLButtonElement>('button[aria-label="Mês anterior"]')!.click();
    element.querySelector<HTMLButtonElement>('button[aria-label="Mês anterior"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.panel-title')?.textContent).toBe('Outubro de 2026');
  });

  it('should offer clearing only when allowed', () => {
    open();
    expect(
      [...element.querySelectorAll('.shortcuts .chip')].map((chip) => chip.textContent?.trim()),
    ).toEqual(['Hoje', 'Ontem']);

    fixture.componentInstance.clearLabel.set('Sem data');
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('.shortcuts .chip')].at(-1)!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('');
    expect(trigger().textContent?.trim()).toBe('Sem data');
  });

  it('should pick whole months in month mode', () => {
    fixture.componentInstance.mode.set('month');
    fixture.componentInstance.value.set('2026-11');
    fixture.detectChanges();
    expect(trigger().textContent?.trim()).toBe('novembro de 2026');

    open();
    expect(element.querySelector('.panel-title')?.textContent).toBe('2026');
    expect(element.querySelectorAll('.month').length).toBe(12);
    element.querySelector<HTMLButtonElement>('button[aria-label="Próximo ano"]')!.click();
    fixture.detectChanges();
    element.querySelectorAll<HTMLButtonElement>('.month')[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('2027-01');
  });
});
