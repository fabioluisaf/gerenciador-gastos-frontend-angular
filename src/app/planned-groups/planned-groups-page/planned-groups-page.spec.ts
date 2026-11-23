import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { DataChanges } from '../../core/data-changes';
import { EditRequests } from '../../core/edit-requests';
import { provideAppLocale } from '../../core/locale';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { stubDialogs } from '../../shared/testing/dialog-stub';
import { PlannedGroup } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';
import { PlannedGroupsPage } from './planned-groups-page';

const GROUP: PlannedGroup = {
  id: 'contas',
  name: 'Contas fixas',
  total: 219.9,
  items: [
    { name: 'Luz', amount: 120, category: 'Casa', description: null },
    { name: 'Internet', amount: 99.9, category: 'Casa', description: 'Fibra' },
  ],
};

describe('PlannedGroupsPage', () => {
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
      ],
    });
  });

  afterEach(() => restoreDialogs());

  async function render() {
    const fixture = TestBed.createComponent(PlannedGroupsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('should list the groups with their items and total', async () => {
    const { element } = await render();

    expect(element.querySelector('.group-name')?.textContent).toBe('Contas fixas');
    expect(element.querySelector('.group-meta')?.textContent?.replace(/\s+/g, ' ').trim()).toMatch(
      /^2 gastos · R\$\s219,90$/,
    );
    expect([...element.querySelectorAll('.item-name')].map((item) => item.textContent)).toEqual([
      'Luz',
      'Internet',
    ]);
  });

  it('should explain how to use groups when there is none', async () => {
    groups = [];
    const { element } = await render();

    expect(element.querySelector('.status')?.textContent).toContain('Nenhum grupo ainda.');
  });

  it('should ask for a new group and for editing one', async () => {
    const { fixture, element } = await render();
    const requests = TestBed.inject(EditRequests);

    element.querySelector<HTMLButtonElement>('.new')!.click();
    expect(requests.request()).toEqual({ kind: 'new-planned-group' });

    fixture.debugElement
      .query((node) => node.name === 'app-actions-menu')
      .triggerEventHandler('editRequested');
    expect(requests.request()).toEqual({ kind: 'planned-group', group: GROUP });
  });

  it('should open the apply sheet and confirm what was created', async () => {
    const { fixture, element } = await render();

    element.querySelector<HTMLButtonElement>('.apply')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.sheet-title')?.textContent).toBe('Aplicar "Contas fixas"');
    expect(element.querySelector('app-apply-group-form')).not.toBeNull();
    expect(TestBed.inject(ControlBarState).hidden()).toBe(true);

    fixture.debugElement
      .query((node) => node.name === 'app-apply-group-form')
      .triggerEventHandler('applied', 2);
    fixture.detectChanges();

    expect(TestBed.inject(DataChanges).expenses()).toBe(1);
    expect(element.querySelector('.applied')?.textContent).toBe(
      '2 gastos planejados de "Contas fixas" foram criados.',
    );
    expect(element.querySelector('dialog')?.open).toBe(false);
  });
});
