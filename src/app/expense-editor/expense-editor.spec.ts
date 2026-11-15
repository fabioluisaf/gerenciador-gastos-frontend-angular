import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';
import { ExpenseEditor } from './expense-editor';
import { ExpenseApi } from '../expense-api';
import { Expense, ExpenseDraft, PaymentDraft, PaymentMethod } from '../expense-models';

describe('ExpenseEditor', () => {
  const payment: PaymentMethod = {
    value: 'server-payment', name: 'Meu cartão', institution: 'NUBANK', paymentMethod: 'Cartão de crédito',
    type: 'CREDITO', closingDay: 14, dueDay: 21,
  };
  const pixPayment: PaymentMethod = {
    value: 'pix-payment', name: 'Meu Pix', institution: 'CAIXA', paymentMethod: 'Pix',
    type: 'PIX', closingDay: null, dueDay: null,
  };
  const api = {
    getPaymentMethods: vi.fn((): Observable<PaymentMethod[]> => of([payment])),
    getExpense: vi.fn((expense: Expense): Observable<Expense> => of(expense)),
    saveExpense: vi.fn((_draft: ExpenseDraft, _expense?: Expense): Observable<void> => of(undefined)),
    createPaymentMethod: vi.fn((_draft: PaymentDraft): Observable<PaymentMethod> => of(payment)),
  };
  const setup = async () => {
    TestBed.configureTestingModule({ imports: [ExpenseEditor], providers: [{ provide: ExpenseApi, useValue: api }] });
    const fixture = TestBed.createComponent(ExpenseEditor);
    fixture.componentRef.setInput('period', { year: 2026, month: 10 });
    fixture.componentRef.setInput('categories', [{ value: 'Casa', name: 'Casa', planned: 0, realized: 0 }]);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector<HTMLDialogElement>('dialog')!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    return { fixture, compiled, dialog };
  };
  const fill = (container: HTMLElement, field: string, value: string) => {
    const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(`[formControlName="${field}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  const submit = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

  beforeEach(() => {
    vi.clearAllMocks();
    api.getPaymentMethods.mockReturnValue(of([payment]));
    api.createPaymentMethod.mockReturnValue(of(payment));
    api.saveExpense.mockReturnValue(of(undefined));
    api.getExpense.mockImplementation((expense) => of(expense));
  });
  afterEach(() => TestBed.resetTestingModule());

  it('should block expense creation with no methods and unlock it after registering a method', async () => {
    api.getPaymentMethods.mockReturnValueOnce(of([])).mockReturnValue(of([payment]));
    const { fixture, compiled, dialog } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    expect(compiled.textContent).toContain('Cadastre um método de pagamento antes de criar gastos');
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelectorAll('.dialog-appendix-close svg')).toHaveLength(1);
    expect(api.saveExpense).not.toHaveBeenCalled();
    const navigation = compiled.querySelectorAll<HTMLButtonElement>('.editor-sidebar button');
    navigation[1].click();
    await fixture.whenStable();
    fill(compiled, 'name', 'Novo Pix');
    fill(compiled, 'type', 'PIX');
    fill(compiled, 'institution', 'CAIXA');
    await fixture.whenStable();
    expect(compiled.querySelector('.editor-footer')?.textContent?.trim()).toBe('Salvar');
    submit(compiled);
    await fixture.whenStable();
    expect(api.createPaymentMethod).toHaveBeenCalledWith({
      nome: 'Novo Pix', tipo: 'PIX', instituicaoFinanceira: 'CAIXA', diaFechamento: null, diaVencimento: null,
    });
    expect(api.getPaymentMethods).toHaveBeenCalledTimes(2);
    expect(dialog.open).toBe(true);
    expect(compiled.querySelector('app-payment-options button[aria-pressed="true"]')).not.toBeNull();
    expect(compiled.querySelector('#editor-title')?.textContent).toContain('Criar gasto');
    expect(compiled.querySelector('.editor-footer')?.textContent?.trim()).toBe('Salvar');
  });

  it('should validate, send category text and selected IDs, lock pending saves and preserve input for retries', async () => {
    api.getPaymentMethods.mockReturnValue(of([payment, pixPayment]));
    const response = new Subject<void>();
    api.saveExpense.mockReturnValueOnce(response).mockReturnValueOnce(of(undefined));
    const { fixture, compiled, dialog } = await setup();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).not.toHaveBeenCalled();
    expect(compiled.querySelector('[role="alert"]')).not.toBeNull();
    fill(compiled, 'name', ' Novo gasto ');
    fill(compiled, 'amount', '12,34');
    fill(compiled, 'date', '2026-11-09');
    compiled.querySelector<HTMLButtonElement>('app-payment-options button')!.click();
    expect(compiled.querySelectorAll('app-payment-options button')).toHaveLength(2);
    compiled.querySelector<HTMLButtonElement>('.category-options button')!.click();
    fill(compiled, 'description', 'Uma descrição');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith({
      nome: 'Novo gasto', valor: 12.34, categoria: 'Casa', metodoPagamentoId: 'server-payment',
      data: '2026-11-09', descricao: 'Uma descrição', realizado: true, parcelado: false, quantidadeParcelas: 1, faturaPeriodo: null,
    }, undefined);
    expect(compiled.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    submit(compiled);
    expect(dialog.open).toBe(true);
    expect(api.saveExpense).toHaveBeenCalledOnce();
    response.error(new Error('Falha ao salvar'));
    await fixture.whenStable();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Seus dados foram mantidos');
    expect(compiled.querySelector<HTMLInputElement>('[formControlName="name"]')?.value).toBe(' Novo gasto ');
    expect(saved).not.toHaveBeenCalled();
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledTimes(2);
    expect(saved).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(false);
  });

  it('should show installment quantity when selected and require credit to save', async () => {
    api.getPaymentMethods.mockReturnValue(of([payment, pixPayment]));
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();

    const parcelled = compiled.querySelector<HTMLInputElement>('[formControlName="parcelled"]')!;
    expect(parcelled.checked).toBe(false);
    expect(compiled.querySelector('[formControlName="quantity"]')).toBeNull();
    parcelled.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[formControlName="quantity"]')).not.toBeNull();
    expect(compiled.textContent).toContain('Parcelamento exige cartão de crédito.');

    fill(compiled, 'name', 'Compra');
    fill(compiled, 'amount', '120');
    fill(compiled, 'date', '2026-11-09');
    fill(compiled, 'quantity', '3');
    compiled.querySelector<HTMLButtonElement>('.category-options button')!.click();
    compiled.querySelectorAll<HTMLButtonElement>('app-payment-options button')[1].click();
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).not.toHaveBeenCalled();

    compiled.querySelectorAll<HTMLButtonElement>('app-payment-options button')[0].click();
    await fixture.whenStable();
    expect(compiled.textContent).not.toContain('Parcelamento exige cartão de crédito.');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith(expect.objectContaining({
      parcelado: true, quantidadeParcelas: 3, metodoPagamentoId: payment.value,
    }), undefined);
  });

  it('should hide installment quantity when the checkbox is unchecked', async () => {
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    const parcelled = compiled.querySelector<HTMLInputElement>('[formControlName="parcelled"]')!;
    parcelled.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[formControlName="quantity"]')).not.toBeNull();
    parcelled.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[formControlName="quantity"]')).toBeNull();
  });

  it('should edit the whole purchase using its original date and total, without sidebar or appendix', async () => {
    api.getPaymentMethods.mockReturnValue(of([payment, pixPayment]));
    const expense: Expense = {
      id: 'second-installment', year: 2026, month: 11, day: 1, name: 'Compra', amountInCents: 1666, description: 'Descrição',
      category: 'Casa', paymentId: payment.value, paymentMethod: payment.paymentMethod, paymentName: payment.name,
      institution: payment.institution, realized: false, installment: { number: 2, quantity: 2 }, purchaseId: 'purchase',
      purchase: { id: 'purchase', amountInCents: 3336, quantity: 2, installments: [
        { id: 'first', number: 1, year: 2026, month: 10, date: '2026-11-09', amountInCents: 1670, realized: true },
        { id: 'second', number: 2, year: 2026, month: 11, date: '2026-12-01', amountInCents: 1666, realized: false },
      ] },
    };
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openEdit(expense);
    await fixture.whenStable();
    expect(compiled.querySelectorAll('app-payment-options button')).toHaveLength(1);
    expect(compiled.querySelector('app-payment-options button')?.getAttribute('aria-label'))
      .toBe('Selecionar pagamento: Meu cartão');
    expect(compiled.querySelector('app-dialog-appendix')).toBeNull();
    expect(compiled.querySelector('.editor-sidebar')).toBeNull();
    expect(compiled.querySelector<HTMLInputElement>('[formControlName="amount"]')?.value).toBe('33.36');
    expect(compiled.querySelector<HTMLInputElement>('[formControlName="date"]')?.value).toBe('2026-11-09');
    fill(compiled, 'name', 'Compra corrigida');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Compra corrigida', valor: 33.36, parcelado: true, quantidadeParcelas: 2, faturaPeriodo: '2026-11',
    }), expense);
  });
});
