import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { stubDialogs } from '../../shared/testing/dialog-stub';
import { PaymentMethod } from '../payment-method';
import { PaymentMethodsApi } from '../payment-methods-api';
import { PaymentMethodsPage } from './payment-methods-page';

function method(id: string, name: string, usageCount = 0): PaymentMethod {
  return {
    id,
    name,
    paymentType: 'PIX',
    institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: '#820AD1' },
    closingDay: null,
    dueDay: null,
    usageCount,
  };
}

describe('PaymentMethodsPage', () => {
  let responses: Subject<PaymentMethod[]>[];
  let deleted: string[];
  let restoreDialogs: () => void;

  beforeEach(() => {
    responses = [];
    deleted = [];
    restoreDialogs = stubDialogs();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PaymentMethodsApi,
          useValue: {
            list: () => {
              const response = new Subject<PaymentMethod[]>();
              responses.push(response);
              return response;
            },
            delete: (removed: PaymentMethod) => {
              deleted.push(removed.id);
              return of(undefined);
            },
          },
        },
      ],
    });
  });

  afterEach(() => restoreDialogs());

  function render() {
    const fixture = TestBed.createComponent(PaymentMethodsPage);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    return fixture;
  }

  async function settle(fixture: ReturnType<typeof render>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function renderWith(methods: PaymentMethod[]) {
    const fixture = render();
    responses[0].next(methods);
    await settle(fixture);
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function principalName(element: HTMLElement): string | null | undefined {
    return element.querySelector('.principal .name')?.textContent;
  }

  function pileNames(element: HTMLElement): (string | null)[] {
    return [...element.querySelectorAll('.pile-item .name')].map((name) => name.textContent);
  }

  it('should put the most used method on top and keep the others in order below', async () => {
    const { element } = await renderWith([
      method('a', 'Cartao Nubank', 3),
      method('b', 'Pix nubank', 9),
      method('c', 'Pix caixa', 1),
    ]);

    expect(element.querySelector('h1')?.textContent).toBe('Métodos de pagamento');
    expect(principalName(element)).toBe('Pix nubank');
    expect(pileNames(element)).toEqual(['Cartao Nubank', 'Pix caixa']);
    expect(element.querySelector('.wallet')?.classList).not.toContain('expanded');
  });

  it('should open the pile and bring the picked method to the top', async () => {
    const { fixture, element } = await renderWith([
      method('a', 'Cartao Nubank', 9),
      method('b', 'Pix nubank', 3),
      method('c', 'Pix caixa', 1),
    ]);
    const pileButton = element.querySelector<HTMLButtonElement>('.pile-hit')!;
    expect(pileButton.getAttribute('aria-label')).toBe('Mostrar os outros 2 métodos');

    pileButton.click();
    fixture.detectChanges();
    expect(element.querySelector('.wallet')?.classList).toContain('expanded');

    const pick = [...element.querySelectorAll<HTMLButtonElement>('.pile-item .card-hit')][1];
    expect(pick.getAttribute('aria-label')).toBe('Colocar Pix caixa no topo');
    pick.click();
    fixture.detectChanges();

    expect(principalName(element)).toBe('Pix caixa');
    expect(pileNames(element)).toEqual(['Cartao Nubank', 'Pix nubank']);
    expect(element.querySelector('.wallet')?.classList).not.toContain('expanded');
  });

  it('should collapse the pile again when the method on top is clicked', async () => {
    const { fixture, element } = await renderWith([method('a', 'A', 2), method('b', 'B', 1)]);

    element.querySelector<HTMLButtonElement>('.pile-hit')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.principal .card-hit')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.wallet')?.classList).not.toContain('expanded');
    expect(principalName(element)).toBe('A');
  });

  it('should tell when nothing is registered', async () => {
    const { element } = await renderWith([]);

    expect(element.querySelector('.status')?.textContent?.trim()).toBe(
      'Nenhum método de pagamento cadastrado.',
    );
  });

  it('should offer a retry when loading fails', async () => {
    const fixture = render();
    const element: HTMLElement = fixture.nativeElement;

    responses[0].error(new Error('offline'));
    await settle(fixture);
    element.querySelector<HTMLButtonElement>('.retry')!.click();
    TestBed.tick();
    fixture.detectChanges();
    responses[1].next([method('a', 'Pix caixa')]);
    await settle(fixture);

    expect(principalName(element)).toBe('Pix caixa');
  });

  it('should promote the next most used method after deleting the one on top', async () => {
    const { fixture, element } = await renderWith([
      method('a', 'Pix caixa', 5),
      method('b', 'Pix nubank', 2),
    ]);

    element.querySelector<HTMLButtonElement>('.principal .swipe-action.end')!.click();
    await settle(fixture);
    expect(element.querySelector('dialog .message')?.textContent).toBe(
      '"Pix caixa" será excluído.',
    );
    element.querySelector<HTMLButtonElement>('dialog .danger')!.click();
    await settle(fixture);

    expect(deleted).toEqual(['a']);
    expect(principalName(element)).toBe('Pix nubank');
    expect(pileNames(element)).toEqual([]);
  });

  it('should always offer the actions menu on top and only on the open pile below', async () => {
    const { fixture, element } = await renderWith([method('a', 'A', 2), method('b', 'B', 1)]);
    HTMLElement.prototype.hidePopover ??= vi.fn();

    expect(element.querySelector('.principal .more')?.getAttribute('aria-label')).toBe(
      'Ações de A',
    );
    expect(element.querySelector('.pile-item .more')).toBeNull();

    element.querySelector<HTMLButtonElement>('.pile-hit')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.pile-item .more')?.getAttribute('aria-label')).toBe(
      'Ações de B',
    );

    element.querySelector<HTMLButtonElement>('.pile-item .menu-item.danger')!.click();
    await settle(fixture);
    expect(element.querySelector('dialog .message')?.textContent).toBe('"B" será excluído.');
  });
});
