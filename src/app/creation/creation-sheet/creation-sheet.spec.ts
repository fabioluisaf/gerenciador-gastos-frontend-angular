import { ComponentFixture, DeferBlockState, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { DataChanges } from '../../core/data-changes';
import { EditRequests } from '../../core/edit-requests';
import { ExpensesApi } from '../../expenses/expenses-api';
import { InstitutionsApi } from '../../payment-methods/institutions-api';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { PlannedGroupsApi } from '../../planned-groups/planned-groups-api';
import { stubDialogs } from '../../shared/testing/dialog-stub';
import { CreationSheet } from './creation-sheet';

const LOADING_MINIMUM_MS = 250;

describe('CreationSheet', () => {
  let restoreDialogs: () => void;

  beforeEach(() => {
    restoreDialogs = stubDialogs();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ExpensesApi,
          useValue: { listCategories: () => of([]), create: () => of(undefined) },
        },
        {
          provide: PaymentMethodsApi,
          useValue: { list: () => of([]), create: () => of(undefined) },
        },
        {
          provide: InstitutionsApi,
          useValue: { list: () => of([]), create: () => of(undefined) },
        },
        { provide: PlannedGroupsApi, useValue: { list: () => of([]) } },
      ],
    });
  });

  afterEach(() => restoreDialogs());

  async function renderDeferred(fixture: ComponentFixture<CreationSheet>): Promise<void> {
    for (const block of await fixture.getDeferBlocks()) {
      await block.render(DeferBlockState.Complete);
    }
    await new Promise((resolve) => setTimeout(resolve, LOADING_MINIMUM_MS));
    fixture.detectChanges();
  }

  async function openSheet() {
    const fixture = TestBed.createComponent(CreationSheet);
    fixture.detectChanges();
    fixture.componentInstance.open();
    await fixture.whenStable();
    fixture.detectChanges();
    await renderDeferred(fixture);
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  async function chooseTab(fixture: ComponentFixture<CreationSheet>, label: string) {
    const element: HTMLElement = fixture.nativeElement;
    [...element.querySelectorAll<HTMLLabelElement>('.tabs label.option')]
      .find((option) => option.textContent?.trim() === label)!
      .querySelector('input')!
      .click();
    fixture.detectChanges();
    await renderDeferred(fixture);
  }

  function visiblePanel(element: HTMLElement): string | null | undefined {
    return element.querySelector('.panel:not([hidden])')?.getAttribute('aria-label');
  }

  it('should open on the expense tab with the other kinds as tabs', async () => {
    const { element } = await openSheet();

    expect(
      [...element.querySelectorAll('.tabs label.option')].map((tab) => tab.textContent?.trim()),
    ).toEqual(['Gasto', 'Método', 'Instituição', 'Grupo']);
    expect(element.querySelector<HTMLInputElement>('.tabs input:checked')?.value).toBe('expense');
    expect(visiblePanel(element)).toBe('Novo gasto');
    expect(element.querySelector('app-expense-form')).not.toBeNull();
    expect(element.querySelector('dialog')?.classList).toContain('expanded');
    expect(TestBed.inject(ControlBarState).hidden()).toBe(true);
  });

  it('should keep what was filled in a tab while visiting another one', async () => {
    const { fixture, element } = await openSheet();
    const expenseForm = element.querySelector('app-expense-form');

    await chooseTab(fixture, 'Método');
    expect(visiblePanel(element)).toBe('Novo método de pagamento');

    await chooseTab(fixture, 'Gasto');
    expect(visiblePanel(element)).toBe('Novo gasto');
    expect(element.querySelector('app-expense-form')).toBe(expenseForm);
  });

  it('should close and announce the change after saving an expense', async () => {
    const { fixture, element } = await openSheet();

    fixture.debugElement
      .query((node) => node.name === 'app-expense-form')
      .triggerEventHandler('saved');
    fixture.detectChanges();

    expect(TestBed.inject(DataChanges).expenses()).toBe(1);
    expect(element.querySelector('dialog')?.open).toBe(false);
    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(TestBed.inject(ControlBarState).hidden()).toBe(false);
  });

  it('should return to the method tab after creating the missing institution', async () => {
    const { fixture, element } = await openSheet();
    await chooseTab(fixture, 'Método');

    fixture.debugElement
      .query((node) => node.name === 'app-payment-method-form')
      .triggerEventHandler('institutionRequested');
    fixture.detectChanges();
    await renderDeferred(fixture);
    expect(visiblePanel(element)).toBe('Nova instituição');

    fixture.debugElement
      .query((node) => node.name === 'app-institution-form')
      .triggerEventHandler('saved');
    fixture.detectChanges();

    expect(TestBed.inject(DataChanges).institutions()).toBe(1);
    expect(visiblePanel(element)).toBe('Novo método de pagamento');
    expect(element.querySelector('dialog')?.open).toBe(true);
  });

  it('should start fresh on the expense tab every time it opens', async () => {
    const { fixture, element } = await openSheet();
    await chooseTab(fixture, 'Instituição');

    element.querySelector('dialog')!.close();
    fixture.detectChanges();
    fixture.componentInstance.open();
    await fixture.whenStable();
    fixture.detectChanges();
    await renderDeferred(fixture);

    expect(visiblePanel(element)).toBe('Novo gasto');
    expect(element.querySelector('app-institution-form')).toBeNull();
  });

  it('should open the matching form without tabs when an edit is requested', async () => {
    const fixture = TestBed.createComponent(CreationSheet);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    TestBed.inject(EditRequests).editPaymentMethod({
      id: 'cartao',
      name: 'Cartao Nubank',
      paymentType: 'CREDITO',
      institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: null },
      closingDay: 14,
      dueDay: 21,
      usageCount: 0,
    });
    TestBed.tick();
    await fixture.whenStable();
    fixture.detectChanges();
    await renderDeferred(fixture);

    expect(element.querySelector('.edit-title')?.textContent).toBe('Editar método');
    expect(element.querySelector('.tabs')).toBeNull();
    expect(element.querySelector('app-payment-method-form')).not.toBeNull();
    expect(TestBed.inject(EditRequests).request()).toBeNull();

    fixture.debugElement
      .query((node) => node.name === 'app-payment-method-form')
      .triggerEventHandler('saved');
    fixture.detectChanges();

    expect(TestBed.inject(DataChanges).paymentMethods()).toBe(1);
    expect(element.querySelector('dialog')?.open).toBe(false);
  });

  it('should manage and apply planned groups in the group tab', async () => {
    const { fixture, element } = await openSheet();

    await chooseTab(fixture, 'Grupo');
    expect(visiblePanel(element)).toBe('Grupos de gastos planejados');
    expect(element.querySelector('app-groups-panel')).not.toBeNull();

    fixture.debugElement
      .query((node) => node.name === 'app-groups-panel')
      .triggerEventHandler('applied');
    fixture.detectChanges();

    expect(TestBed.inject(DataChanges).expenses()).toBe(1);
    expect(element.querySelector('dialog')?.open).toBe(false);
  });
});
