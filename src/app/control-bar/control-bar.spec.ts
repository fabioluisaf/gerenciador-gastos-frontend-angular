import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ControlBar } from './control-bar';
import { ControlBarState } from './control-bar-state';

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
      'Gastos',
      'Métodos de pagamento',
      'Criar',
      'Faturas',
      'Configurações',
    ]);
    expect(controls.every((control) => control.querySelector('svg[aria-hidden="true"]'))).toBe(
      true,
    );
  });

  it('should hide and disable the bar while another surface asks for it', () => {
    const fixture = TestBed.createComponent(ControlBar);
    const state = TestBed.inject(ControlBarState);
    const host: HTMLElement = fixture.nativeElement;

    state.hide();
    fixture.detectChanges();
    expect(host.classList).toContain('hidden');
    expect(host.hasAttribute('inert')).toBe(true);

    state.show();
    fixture.detectChanges();
    expect(host.classList).not.toContain('hidden');
    expect(host.hasAttribute('inert')).toBe(false);
  });

  it('should navigate to the sections and keep the actions as buttons', () => {
    const fixture = TestBed.createComponent(ControlBar);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('a[aria-label="Gastos"]')?.getAttribute('href')).toBe('/gastos');
    expect(
      element.querySelector('a[aria-label="Métodos de pagamento"]')?.getAttribute('href'),
    ).toBe('/metodos-pagamento');
    expect(element.querySelector('a[aria-label="Faturas"]')?.getAttribute('href')).toBe('/faturas');
    expect(
      [...element.querySelectorAll<HTMLButtonElement>('button.control')].map(
        (button) => button.type,
      ),
    ).toEqual(['button', 'button']);
    expect(element.querySelector('nav button.create')?.getAttribute('aria-label')).toBe('Criar');
  });

  it('should ask for the settings sheet and reflect whether it is open', () => {
    const fixture = TestBed.createComponent(ControlBar);
    const requested = vi.fn();
    fixture.componentInstance.settingsRequested.subscribe(requested);
    fixture.detectChanges();
    const settings: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Configurações"]',
    );

    expect(settings.getAttribute('aria-haspopup')).toBe('dialog');
    expect(settings.getAttribute('aria-expanded')).toBe('false');

    settings.click();
    expect(requested).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('settingsOpen', true);
    fixture.detectChanges();
    expect(settings.getAttribute('aria-expanded')).toBe('true');
  });

  it('should ask for the creation sheet and reflect whether it is open', () => {
    const fixture = TestBed.createComponent(ControlBar);
    const requested = vi.fn();
    fixture.componentInstance.createRequested.subscribe(requested);
    fixture.detectChanges();
    const create: HTMLButtonElement = fixture.nativeElement.querySelector('button.create');

    expect(create.getAttribute('aria-haspopup')).toBe('dialog');
    expect(create.getAttribute('aria-expanded')).toBe('false');

    create.click();
    expect(requested).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('createOpen', true);
    fixture.detectChanges();
    expect(create.getAttribute('aria-expanded')).toBe('true');
  });
});
