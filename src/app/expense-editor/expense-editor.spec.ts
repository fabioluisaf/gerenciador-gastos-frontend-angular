import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, Subject } from 'rxjs';
import { ExpenseEditor } from './expense-editor';
import { ExpenseApi } from '../expense-api';
import { Expense, ExpenseDraft, PaymentDraft, PaymentMethod } from '../expense-models';
import { DateSelector } from '../shared/date-selector';

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
    if (field === 'paymentId') {
      const method = [payment, pixPayment].find((item) => item.value === value)!;
      const menu = container.querySelector<HTMLElement>('#editor-payment-menu')!;
      menu.hidePopover = vi.fn();
      container.querySelector<HTMLButtonElement>('.payment-trigger')!.click();
      menu.querySelector<HTMLButtonElement>(`[aria-label="Selecionar pagamento: ${method.name}"]`)!.click();
      expect(menu.hidePopover).toHaveBeenCalledOnce();
      return;
    }
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

  it('should anchor creation to its trigger and close from the appendix, Escape or transparent space', async () => {
    const { fixture, compiled, dialog } = await setup();
    const trigger = document.createElement('button');
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(66, 10, 44, 44));
    for (const method of ['appendix', 'Escape', 'transparent space']) {
      fixture.componentInstance.openCreate(trigger);
      await fixture.whenStable();
      expect(dialog.style.left).toBe('66px');
      expect(dialog.style.top).toBe('10px');
      expect(dialog.style.getPropertyValue('--dialog-appendix-width')).toBe('44px');
      expect(dialog.style.getPropertyValue('--dialog-appendix-height')).toBe('44px');
      expect(compiled.querySelector('.dialog-appendix svg[lucidePlus]')).not.toBeNull();
      expect(compiled.querySelector('.expense-dialog-close')).toBeNull();
      compiled.querySelector('.editor-panel')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dialog.open).toBe(true);
      if (method === 'appendix') compiled.querySelector<HTMLButtonElement>('.dialog-appendix-close')!.click();
      else if (method === 'Escape') dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      else dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 20 }));
      await fixture.whenStable();
      expect(dialog.open).toBe(false);
    }
  });

  it('should block expense creation with no methods and unlock it after registering a method', async () => {
    api.getPaymentMethods.mockReturnValueOnce(of([])).mockReturnValue(of([payment]));
    const { fixture, compiled, dialog } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    expect(compiled.textContent).toContain('Cadastre um método de pagamento antes de criar gastos');
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelector('[aria-label="Fechar criação"] svg')).not.toBeNull();
    expect(api.saveExpense).not.toHaveBeenCalled();
    const navigation = compiled.querySelectorAll<HTMLButtonElement>('.editor-tabs button');
    navigation[1].click();
    await fixture.whenStable();
    fill(compiled, 'name', 'Novo Pix');
    fill(compiled, 'type', 'PIX');
    fill(compiled, 'institution', 'CAIXA');
    await fixture.whenStable();
    expect(compiled.querySelector('.editor-footer [aria-label="Salvar"] svg')).not.toBeNull();
    submit(compiled);
    await fixture.whenStable();
    expect(api.createPaymentMethod).toHaveBeenCalledWith({
      nome: 'Novo Pix', tipo: 'PIX', instituicaoFinanceira: 'CAIXA', diaFechamento: null, diaVencimento: null,
    });
    expect(api.getPaymentMethods).toHaveBeenCalledTimes(2);
    expect(dialog.open).toBe(true);
    expect(compiled.querySelector('.payment-trigger')?.textContent).toContain(payment.name);
    expect(compiled.querySelector('#editor-title')?.textContent).toContain('Criar gasto');
    expect(compiled.querySelector('.editor-footer [aria-label="Salvar"] svg')).not.toBeNull();
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
    fill(compiled, 'date', '09/11/2026');
    fill(compiled, 'paymentId', payment.value);
    expect(compiled.querySelectorAll('#editor-payment-menu button')).toHaveLength(2);
    const categoryMenu = compiled.querySelector<HTMLElement>('#editor-category-menu')!;
    categoryMenu.hidePopover = vi.fn();
    compiled.querySelector<HTMLButtonElement>('.category-trigger')!.click();
    categoryMenu.querySelector<HTMLButtonElement>('.tag-options button')!.click();
    expect(categoryMenu.hidePopover).toHaveBeenCalledOnce();
    await fixture.whenStable();
    expect(compiled.querySelector('.category-trigger')?.textContent?.trim()).toBe('Casa');
    fill(compiled, 'description', 'Uma descrição');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith({
      nome: 'Novo gasto', valor: 12.34, categoria: 'Casa', metodoPagamentoId: 'server-payment',
      data: '2026-11-09', descricao: 'Uma descrição', realizado: true, parcelado: false, quantidadeParcelas: 1, faturaPeriodo: null,
    }, undefined);
    expect(compiled.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    expect(compiled.querySelector<HTMLButtonElement>('.dialog-appendix-close')?.disabled).toBe(true);
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

    fill(compiled, 'paymentId', pixPayment.value);
    const parcelled = compiled.querySelector<HTMLInputElement>('[formControlName="parcelled"]')!;
    expect(parcelled.checked).toBe(false);
    expect(compiled.querySelector('[formControlName="quantity"]')).toBeNull();
    parcelled.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[formControlName="quantity"]')).not.toBeNull();
    expect(Array.from(compiled.querySelectorAll('#editor-payment-menu button'), (option) => option.textContent?.trim()))
      .toEqual([payment.name]);
    expect(compiled.querySelector('.payment-trigger')?.textContent?.trim()).toBe('Método de pagamento');

    fill(compiled, 'name', 'Compra');
    fill(compiled, 'amount', '120');
    fill(compiled, 'date', '09/11/2026');
    fill(compiled, 'quantity', '3');
    fill(compiled, 'category', 'Casa');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).not.toHaveBeenCalled();

    fill(compiled, 'paymentId', payment.value);
    await fixture.whenStable();
    expect(compiled.textContent).not.toContain('Parcelamento exige cartão de crédito.');
    expect(Array.from(compiled.querySelectorAll<HTMLInputElement>('.installment-value input'), (input) => input.value))
      .toEqual(['', '', '']);
    expect(compiled.querySelector('.automatic-installments em')?.textContent).toContain('calculadas pela aplicação');
    expect(compiled.querySelector('.automatic-calculation')).toBeNull();
    expect(compiled.querySelector('[role="switch"][formControlName="realized"]')).toBeNull();
    fill(compiled, 'quantity', '1000');
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.installment-value input')).toHaveLength(1000);
    fill(compiled, 'quantity', '3');
    await fixture.whenStable();
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith(expect.objectContaining({
      parcelado: true, quantidadeParcelas: 3, metodoPagamentoId: payment.value,
    }), undefined);
    expect(api.saveExpense.mock.lastCall![0]).not.toHaveProperty('valoresParcelas');
  });

  it('should preserve manual installment values and block partial, invalid or mismatched sums using exact cents', async () => {
    const response = new Subject<void>();
    api.saveExpense.mockReturnValue(response);
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    fill(compiled, 'name', 'Compra');
    fill(compiled, 'amount', '0,30');
    fill(compiled, 'category', 'Casa');
    fill(compiled, 'paymentId', payment.value);
    compiled.querySelector<HTMLInputElement>('[formControlName="parcelled"]')!.click();
    await fixture.whenStable();
    fill(compiled, 'quantity', '2');
    await fixture.whenStable();
    const amount = (index: number, value: string) => {
      const input = compiled.querySelectorAll<HTMLInputElement>('.installment-value input')[index];
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    amount(0, '0,10');
    submit(compiled);
    await fixture.whenStable();
    expect(compiled.querySelector('.installment-warning')?.textContent).toContain('Preencha todas');
    expect(api.saveExpense).not.toHaveBeenCalled();
    amount(1, '0,20');
    await fixture.whenStable();
    expect(compiled.querySelector('.installment-warning')).toBeNull();
    fill(compiled, 'amount', '0,40');
    await fixture.whenStable();
    expect(compiled.querySelector('.installment-warning')?.textContent).toContain('0,30');
    expect(compiled.querySelector('.installment-warning')?.textContent).toContain('0,10');
    submit(compiled);
    expect(api.saveExpense).not.toHaveBeenCalled();
    fill(compiled, 'quantity', '1');
    fill(compiled, 'quantity', '');
    fill(compiled, 'quantity', '3');
    await fixture.whenStable();
    expect(Array.from(compiled.querySelectorAll<HTMLInputElement>('.installment-value input'), (input) => input.value))
      .toEqual(['0,10', '0,20', '']);
    for (const invalid of ['0.001', '-1', '90071992547409.92']) {
      amount(2, invalid);
      submit(compiled);
      await fixture.whenStable();
      expect(compiled.querySelector('.installment-warning')?.textContent).toContain('valores válidos');
      expect(api.saveExpense).not.toHaveBeenCalled();
    }
    amount(2, '0,10');
    fill(compiled, 'quantity', '1001');
    submit(compiled);
    await fixture.whenStable();
    expect(compiled.querySelector('[formControlName="quantity"]')?.getAttribute('aria-invalid')).toBe('true');
    expect(api.saveExpense).not.toHaveBeenCalled();
    fill(compiled, 'quantity', '3');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith(
      expect.objectContaining({ valor: 0.4, quantidadeParcelas: 3, valoresParcelas: [0.1, 0.2, 0.1] }), undefined,
    );
    response.next();
    response.complete();
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
        { id: 'second', number: 2, year: 2026, month: 11, date: '2026-12-01', amountInCents: 1666, realized: false },
        { id: 'first', number: 1, year: 2026, month: 10, date: '2026-11-09', amountInCents: 1670, realized: true },
      ] },
    };
    const { fixture, compiled, dialog } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.dialog-appendix-close')!.click();
    fixture.componentInstance.openEdit(expense);
    await fixture.whenStable();
    expect(Array.from(compiled.querySelectorAll('#editor-payment-menu button'), (option) => option.textContent?.trim()))
      .toEqual([payment.name]);
    expect(compiled.querySelector('.payment-trigger')?.textContent).toContain(payment.name);
    expect(compiled.querySelector('app-dialog-appendix')).toBeNull();
    expect(compiled.querySelector('.editor-sidebar')).toBeNull();
    expect(dialog.style.left).toBe('');
    expect(dialog.style.top).toBe('');
    expect(dialog.style.maxWidth).toBe('');
    expect(compiled.querySelector<HTMLInputElement>('[formControlName="amount"]')?.value).toBe('33.36');
    expect(compiled.querySelector<HTMLInputElement>('[formControlName="date"]')?.value).toBe('09/11/2026');
    expect(Array.from(compiled.querySelectorAll<HTMLInputElement>('.installment-value input'), (input) => input.value))
      .toEqual(['16.70', '16.66']);
    expect(compiled.querySelector('.installment-values h3')?.textContent).toBe('Parcelas da compra');
    expect(Array.from(compiled.querySelectorAll('.installment-value td:first-child'), (cell) => cell.textContent?.trim()))
      .toEqual(['1/2', '2/2']);
    expect(Array.from(compiled.querySelectorAll('.installment-invoice'), (cell) => cell.textContent?.trim()))
      .toEqual(['Nov/2026', 'Dez/2026']);
    const realized = compiled.querySelector<HTMLInputElement>('[role="switch"][formControlName="realized"]')!;
    expect(realized.checked).toBe(false);
    realized.click();
    fill(compiled, 'name', 'Compra corrigida');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Compra corrigida', valor: 33.36, parcelado: true, quantidadeParcelas: 2, faturaPeriodo: '2026-11',
      data: '2026-11-09', realizado: true,
      valoresParcelas: [16.70, 16.66],
    }), expense);

    fixture.componentInstance.openEdit(expense);
    await fixture.whenStable();
    fill(compiled, 'quantity', '1');
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.automatic-calculation')!.click();
    fill(compiled, 'quantity', '2');
    await fixture.whenStable();
    expect(Array.from(compiled.querySelectorAll<HTMLInputElement>('.installment-value input'), (input) => input.value))
      .toEqual(['', '']);
    expect(compiled.querySelector('.installment-warning')).toBeNull();
    expect(compiled.querySelector('.automatic-installments')).not.toBeNull();
    expect(api.saveExpense).toHaveBeenCalledOnce();
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledTimes(2);
    expect(api.saveExpense.mock.lastCall![0]).not.toHaveProperty('valoresParcelas');
    expect(api.saveExpense.mock.lastCall![0].realizado).toBe(false);
  });

  it('should preview monthly installment invoices from the first period or the card closing date', async () => {
    api.getPaymentMethods.mockReturnValue(of([{ ...payment, closingDay: 31 }]));
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    fill(compiled, 'paymentId', payment.value);
    compiled.querySelector<HTMLInputElement>('[formControlName="parcelled"]')!.click();
    await fixture.whenStable();
    fill(compiled, 'quantity', '3');
    const invoices = () => Array.from(compiled.querySelectorAll('.installment-invoice'), (cell) => cell.textContent?.trim());
    for (const [date, expected] of [
      ['30/12/2026', ['Dez/2026', 'Jan/2027', 'Fev/2027']],
      ['31/12/2026', ['Jan/2027', 'Fev/2027', 'Mar/2027']],
      ['28/02/2024', ['Fev/2024', 'Mar/2024', 'Abr/2024']],
      ['29/02/2024', ['Mar/2024', 'Abr/2024', 'Mai/2024']],
      ['28/02/2025', ['Mar/2025', 'Abr/2025', 'Mai/2025']],
      ['', ['—', '—', '—']],
      ['31/02/2026', ['—', '—', '—']],
    ] as const) {
      fill(compiled, 'date', date);
      await fixture.whenStable();
      expect(invoices()).toEqual(expected);
    }
    expect(compiled.querySelector('.invoice-field')?.textContent).toContain('Fatura da primeira parcela (opcional com data)');
    const picker = fixture.debugElement.queryAll(By.directive(DateSelector))
      .map((element) => element.componentInstance as DateSelector).find((component) => component.mode() === 'month')!;
    picker.valueChange.emit('2027-12');
    await fixture.whenStable();
    expect(invoices()).toEqual(['Dez/2027', 'Jan/2028', 'Fev/2028']);
    fill(compiled, 'date', '01/01/2026');
    fill(compiled, 'quantity', '2');
    await fixture.whenStable();
    expect(invoices()).toEqual(['Dez/2027', 'Jan/2028']);
    picker.valueChange.emit('');
    await fixture.whenStable();
    expect(invoices()).toEqual(['Jan/2026', 'Fev/2026']);
  });

  it('should validate Brazilian dates and keep calendar selection synchronized with the API date', async () => {
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    const date = compiled.querySelector<HTMLInputElement>('[formControlName="date"]')!;
    const today = new Date();
    expect(date.value).toBe(`${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`);
    fill(compiled, 'name', 'Gasto');
    fill(compiled, 'amount', '10');
    fill(compiled, 'category', 'Casa');
    fill(compiled, 'paymentId', payment.value);
    for (const invalid of ['31/02/2026', '29/02/2025', '01/13/2026', '00/11/2026', '2026-11-09', '09/11/0000']) {
      fill(compiled, 'date', invalid);
      submit(compiled);
      await fixture.whenStable();
      expect(api.saveExpense).not.toHaveBeenCalled();
      expect(compiled.textContent).toContain('Informe uma data válida no formato dd/mm/aaaa.');
    }

    fill(compiled, 'date', '29/02/2024');
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('[aria-label="Abrir calendário da data"]')!.click();
    await fixture.whenStable();
    const picker = compiled.querySelector<HTMLElement>('#editor-date-menu')!;
    picker.hidePopover = vi.fn();
    expect(picker.querySelector('[aria-label="Selecionar data: 29/02/2024"]')?.getAttribute('aria-pressed')).toBe('true');
    picker.querySelector<HTMLButtonElement>('[aria-label="Escolher mês e ano"]')!.click();
    await fixture.whenStable();
    picker.querySelector<HTMLButtonElement>('[aria-label="Escolher mês e ano"]')!.click();
    await fixture.whenStable();
    picker.querySelector<HTMLButtonElement>('[aria-label="Próximo período"]')!.click();
    await fixture.whenStable();
    Array.from(picker.querySelectorAll<HTMLButtonElement>('.year-choice')).find((button) => button.textContent?.trim() === '2026')!.click();
    await fixture.whenStable();
    picker.querySelector<HTMLButtonElement>('[aria-label="Dezembro de 2026"]')!.click();
    await fixture.whenStable();
    picker.querySelector<HTMLButtonElement>('[aria-label="Selecionar data: 25/12/2026"]')!.click();
    expect(picker.hidePopover).toHaveBeenCalledOnce();
    await fixture.whenStable();
    expect(date.value).toBe('25/12/2026');
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith(expect.objectContaining({ data: '2026-12-25' }), undefined);
  });

  it('should display and save Brazilian dates or no date when editing planned expenses', async () => {
    const { fixture, compiled } = await setup();
    for (const day of [9, null]) {
      const expense: Expense = {
        id: 'planned', year: 2026, month: 10, day, name: 'Planejado', amountInCents: 1000,
        description: '', category: 'Casa', paymentId: payment.value, paymentMethod: payment.paymentMethod,
        paymentName: payment.name, institution: payment.institution, realized: false, invoicePeriod: '2026-11',
      };
      fixture.componentInstance.openEdit(expense);
      await fixture.whenStable();
      expect(compiled.querySelector<HTMLInputElement>('[formControlName="date"]')!.value)
        .toBe(day === null ? '' : '09/11/2026');
      submit(compiled);
      await fixture.whenStable();
      expect(api.saveExpense).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: day === null ? null : '2026-11-09' }), expense,
      );
    }
  });

  it('should highlight missing fields, clear errors when corrected and allow a new category and a planned status', async () => {
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    expect(compiled.querySelector('[aria-invalid="true"]')).toBeNull();
    fill(compiled, 'date', '');
    submit(compiled);
    await fixture.whenStable();
    for (const field of ['name', 'amount', 'category', 'date']) {
      expect(compiled.querySelector(`[formControlName="${field}"]`)?.getAttribute('aria-invalid')).toBe('true');
    }
    expect(compiled.querySelector('.payment-trigger')?.getAttribute('aria-invalid')).toBe('true');
    expect(compiled.querySelector('.category-trigger')?.getAttribute('aria-invalid')).toBe('true');
    fill(compiled, 'name', 'Novo');
    fill(compiled, 'amount', '15');
    fill(compiled, 'category', 'Categoria nova');
    await fixture.whenStable();
    expect(compiled.querySelector('.category-trigger')?.textContent?.trim()).toBe('Categoria nova');
    const categoryMenu = compiled.querySelector<HTMLElement>('#editor-category-menu')!;
    categoryMenu.hidePopover = vi.fn();
    Array.from(categoryMenu.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Usar categoria')!.click();
    expect(categoryMenu.hidePopover).toHaveBeenCalledOnce();
    const categoryEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    compiled.querySelector<HTMLInputElement>('[formControlName="category"]')!.dispatchEvent(categoryEnter);
    expect(categoryEnter.defaultPrevented).toBe(true);
    expect(categoryMenu.hidePopover).toHaveBeenCalledTimes(2);
    expect(api.saveExpense).not.toHaveBeenCalled();
    fill(compiled, 'paymentId', payment.value);
    await fixture.whenStable();
    expect(compiled.querySelector('[aria-label="Selecionar mês da fatura"]')?.getAttribute('aria-invalid')).toBe('true');
    const realized = compiled.querySelector<HTMLInputElement>('[role="switch"]')!;
    expect(realized.checked).toBe(true);
    realized.click();
    const invoicePicker: DateSelector = fixture.debugElement.queryAll(By.directive(DateSelector))[1].componentInstance;
    invoicePicker.valueChange.emit('2026-11');
    await fixture.whenStable();
    expect(realized.checked).toBe(false);
    expect(compiled.querySelector('[aria-invalid="true"]')).toBeNull();
    submit(compiled);
    await fixture.whenStable();
    expect(api.saveExpense).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: 'Categoria nova', realizado: false, data: null, faturaPeriodo: '2026-11' }),
      undefined,
    );
  });

  it('should highlight missing credit days and clear them for non-credit methods', async () => {
    const { fixture, compiled } = await setup();
    fixture.componentInstance.openCreate(document.createElement('button'));
    await fixture.whenStable();
    compiled.querySelectorAll<HTMLButtonElement>('.editor-tabs button')[1].click();
    await fixture.whenStable();
    submit(compiled);
    await fixture.whenStable();
    for (const field of ['name', 'closingDay', 'dueDay']) {
      expect(compiled.querySelector(`[formControlName="${field}"]`)?.getAttribute('aria-invalid')).toBe('true');
    }
    expect(api.createPaymentMethod).not.toHaveBeenCalled();
    fill(compiled, 'name', 'Novo Pix');
    fill(compiled, 'type', 'PIX');
    await fixture.whenStable();
    expect(compiled.querySelector('[aria-invalid="true"]')).toBeNull();
    submit(compiled);
    await fixture.whenStable();
    expect(api.createPaymentMethod).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Novo Pix', tipo: 'PIX' }));
  });
});
