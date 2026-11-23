import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataChanges } from '../../core/data-changes';
import { provideAppLocale } from '../../core/locale';
import { ExpensesApi } from '../../expenses/expenses-api';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { stubDialogs } from '../../shared/testing/dialog-stub';
import { PlannedGroup } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';
import { GroupsPanel } from './groups-panel';

const GROUP: PlannedGroup = {
  id: 'contas',
  name: 'Contas fixas',
  total: 219.9,
  items: [
    { name: 'Luz', amount: 120, category: 'Casa', description: null },
    { name: 'Internet', amount: 99.9, category: 'Casa', description: 'Fibra' },
  ],
};

describe('GroupsPanel', () => {
  let restoreDialogs: () => void;
  let groups: PlannedGroup[];

  beforeEach(() => {
    restoreDialogs = stubDialogs();
    groups = [GROUP];
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        { provide: PlannedGroupsApi, useValue: { list: () => of(groups) } },
        { provide: PaymentMethodsApi, useValue: { list: () => of([]) } },
        { provide: ExpensesApi, useValue: { listCategories: () => of([]) } },
      ],
    });
  });

  afterEach(() => restoreDialogs());

  async function render() {
    const fixture = TestBed.createComponent(GroupsPanel);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('should list the groups with how many expenses and their total', async () => {
    const { element } = await render();

    expect(element.querySelector('.group-name')?.textContent).toBe('Contas fixas');
    expect(element.querySelector('.group-meta')?.textContent?.replace(/\s+/g, ' ').trim()).toMatch(
      /^2 gastos · R\$\s219,90$/,
    );
  });

  it('should say when there is no group yet', async () => {
    groups = [];
    const { element } = await render();

    expect(element.querySelector('.status')?.textContent).toContain('Nenhum grupo ainda.');
  });

  it('should open the new group form and come back to the list', async () => {
    const { fixture, element } = await render();

    element.querySelector<HTMLButtonElement>('.new')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.view-title')?.textContent).toBe('Novo grupo');
    expect(element.querySelector('app-group-form')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('.back')!.click();
    fixture.detectChanges();
    expect(element.querySelector('app-group-form')).toBeNull();
    expect(element.querySelector('.group-name')).not.toBeNull();
  });

  it('should edit a group and refresh the list when saved', async () => {
    const { fixture, element } = await render();

    fixture.debugElement
      .query((node) => node.name === 'app-actions-menu')
      .triggerEventHandler('editRequested');
    fixture.detectChanges();
    expect(element.querySelector('.view-title')?.textContent).toBe('Editar grupo');

    fixture.debugElement
      .query((node) => node.name === 'app-group-form')
      .triggerEventHandler('saved');
    fixture.detectChanges();

    expect(TestBed.inject(DataChanges).plannedGroups()).toBe(1);
    expect(element.querySelector('.group-name')).not.toBeNull();
  });

  it('should apply a group and tell the sheet', async () => {
    const applied = vi.fn();
    const { fixture, element } = await render();
    fixture.componentInstance.applied.subscribe(applied);

    element.querySelector<HTMLButtonElement>('.apply')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.view-title')?.textContent).toBe('Aplicar "Contas fixas"');

    fixture.debugElement
      .query((node) => node.name === 'app-apply-group-form')
      .triggerEventHandler('applied', 2);
    fixture.detectChanges();

    expect(applied).toHaveBeenCalled();
    expect(element.querySelector('app-apply-group-form')).toBeNull();
  });
});
