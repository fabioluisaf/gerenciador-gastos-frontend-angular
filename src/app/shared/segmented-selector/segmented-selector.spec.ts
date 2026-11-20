import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SegmentedSelector, SelectorOption } from './segmented-selector';

type Size = 'small' | 'large';

@Component({
  imports: [SegmentedSelector],
  template: `
    <app-segmented-selector
      label="Tamanho"
      labelVisible
      [options]="options"
      [value]="value()"
      (valueChange)="value.set($event)"
    >
      <ng-template let-option
        ><i class="icon">{{ option.value }}</i></ng-template
      >
    </app-segmented-selector>
  `,
})
class ChoiceHost {
  readonly options: SelectorOption<Size>[] = [
    { value: 'small', label: 'Pequena' },
    { value: 'large', label: 'Grande' },
  ];
  readonly value = signal<Size>('small');
}

@Component({
  imports: [SegmentedSelector],
  template: `<app-segmented-selector label="Seções" [options]="options" />`,
})
class LinkHost {
  readonly options: SelectorOption[] = [
    { value: 'home', label: 'Início', link: '/inicio', exact: true },
    { value: 'more', label: 'Mais', link: '/inicio/mais' },
  ];
}

@Component({ template: '' })
class Blank {}

describe('SegmentedSelector', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'inicio', component: Blank },
          { path: 'inicio/mais', component: Blank },
        ]),
      ],
    });
  });

  it('should offer the choices as a labelled radio group and report the picked one', async () => {
    const fixture = TestBed.createComponent(ChoiceHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const group = element.querySelector('[role="radiogroup"]')!;
    const radios = [...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')];

    expect(element.querySelector(`#${group.getAttribute('aria-labelledby')}`)?.textContent).toBe(
      'Tamanho',
    );
    expect(radios.map((radio) => radio.checked)).toEqual([true, false]);
    expect([...element.querySelectorAll('.icon')].map((icon) => icon.textContent)).toEqual([
      'small',
      'large',
    ]);

    radios[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('large');
    expect(element.querySelector('label.active')?.textContent?.trim()).toContain('Grande');
  });

  it('should render navigation links marking only the current page', async () => {
    await TestBed.inject(Router).navigateByUrl('/inicio/mais');
    const fixture = TestBed.createComponent(LinkHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const links = [...element.querySelectorAll('nav[aria-label="Seções"] a')];

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/inicio', '/inicio/mais']);
    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page']);
    expect(element.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it('should scroll sideways instead of squeezing the choices when asked to', async () => {
    const fixture = TestBed.createComponent(SegmentedSelector);
    fixture.componentRef.setInput('label', 'Cartão');
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'Cartão A' },
      { value: 'b', label: 'Cartão B' },
      { value: 'c', label: 'Cartão C' },
    ]);
    fixture.componentRef.setInput('value', 'b');
    fixture.componentRef.setInput('scrollable', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const group: HTMLElement = fixture.nativeElement.querySelector('[role="radiogroup"]');

    expect(group.classList).toContain('scrollable');
    expect(group.classList).toContain('drag-scroll');
    expect(group.querySelector('label.active')?.textContent?.trim()).toBe('Cartão B');
  });
});
