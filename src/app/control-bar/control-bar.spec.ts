import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ControlBar } from './control-bar';

describe('ControlBar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('should expose the labelled controls inside a navigation landmark', () => {
    const fixture = TestBed.createComponent(ControlBar);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const controls = [...element.querySelectorAll('nav[aria-label="Controles"] .control')];

    expect(controls.map((control) => control.getAttribute('aria-label'))).toEqual([
      'Listar gastos',
      'Criar',
      'Configurações',
    ]);
    expect(controls.every((control) => control.querySelector('svg[aria-hidden="true"]'))).toBe(
      true,
    );
  });

  it('should navigate to the expense list and keep the actions as buttons', () => {
    const fixture = TestBed.createComponent(ControlBar);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('a[aria-label="Listar gastos"]')?.getAttribute('href')).toBe(
      '/gastos',
    );
    expect(
      [...element.querySelectorAll<HTMLButtonElement>('button.control')].map(
        (button) => button.type,
      ),
    ).toEqual(['button', 'button']);
  });
});
