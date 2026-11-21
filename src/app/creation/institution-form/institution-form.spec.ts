import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InstitutionsApi, NewInstitution } from '../../payment-methods/institutions-api';
import { INSTITUTION_COLORS, InstitutionForm } from './institution-form';

describe('InstitutionForm', () => {
  let created: NewInstitution[];
  let fixture: ComponentFixture<InstitutionForm>;
  let element: HTMLElement;

  beforeEach(() => {
    created = [];
    URL.createObjectURL = vi.fn(() => 'blob:icone');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: InstitutionsApi,
          useValue: {
            create: (institution: NewInstitution) => {
              created.push(institution);
              return of(undefined);
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(InstitutionForm);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  function type(value: string): void {
    const input = element.querySelector<HTMLInputElement>('input[placeholder="Ex.: Inter"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function choose(file: File): void {
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('should preview the name with its initial on the chosen color', () => {
    type('inter');

    expect(element.querySelector('.preview-name')?.textContent).toBe('inter');
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('I');
    expect(
      element.querySelector<HTMLElement>('.preview')!.style.getPropertyValue('--preview-color'),
    ).toBe(INSTITUTION_COLORS[0]);
  });

  it('should require the name before saving', () => {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.field-error')?.textContent).toBe(
      'Informe o nome da instituição.',
    );
    expect(created).toEqual([]);
  });

  it('should reject icons that are too big or not images', () => {
    choose(new File(['x'], 'nota.pdf', { type: 'application/pdf' }));
    expect(element.querySelector('.field-error')?.textContent).toBe(
      'Use uma imagem PNG, JPG, WEBP ou GIF.',
    );

    choose(new File([new Uint8Array(1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }));
    expect(element.querySelector('.field-error')?.textContent).toBe(
      'A imagem precisa ter até 1 MB.',
    );
  });

  it('should save the name, the color and the icon', () => {
    const icon = new File(['png'], 'inter.png', { type: 'image/png' });
    type(' Inter ');
    element.querySelectorAll<HTMLInputElement>('.swatch input[type="radio"]')[2].click();
    choose(icon);
    expect(element.querySelector<HTMLImageElement>('.avatar-image')?.getAttribute('src')).toBe(
      'blob:icone',
    );

    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    expect(created).toEqual([{ name: 'Inter', color: INSTITUTION_COLORS[2], icon }]);
  });

  it('should allow an institution without color', () => {
    type('Carteira');
    [...element.querySelectorAll<HTMLInputElement>('.swatch input[type="radio"]')].at(-1)!.click();

    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    expect(created[0]).toEqual({ name: 'Carteira', color: null, icon: null });
  });
  it('should open the color picker and save a typed custom color', () => {
    type('Inter');
    const toggle = element.querySelector<HTMLButtonElement>('button[aria-label="Outra cor"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const hex = element.querySelector<HTMLInputElement>('app-color-picker .hex-input')!;
    expect(hex.value).toBe(INSTITUTION_COLORS[0]);
    hex.value = '#12ab9f';
    hex.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(toggle.classList).toContain('selected');
    expect(
      element.querySelector<HTMLElement>('.preview')!.style.getPropertyValue('--preview-color'),
    ).toBe('#12AB9F');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    expect(created[0].color).toBe('#12AB9F');
  });
});
