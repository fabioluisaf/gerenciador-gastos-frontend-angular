import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAppLocale } from '../../core/locale';
import { ExpensesApi } from '../../expenses/expenses-api';
import { PlannedGroup } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';
import { GroupForm } from './group-form';

const GROUP: PlannedGroup = {
  id: 'contas',
  name: 'Contas fixas',
  total: 219.9,
  items: [
    { name: 'Luz', amount: 120, category: 'Casa', description: null },
    { name: 'Internet', amount: 99.9, category: 'Casa', description: 'Fibra' },
  ],
};

describe('GroupForm', () => {
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn(() => of(GROUP));
    update = vi.fn(() => of(GROUP));
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        { provide: ExpensesApi, useValue: { listCategories: () => of(['Casa', 'Lazer']) } },
        { provide: PlannedGroupsApi, useValue: { create, update } },
      ],
    });
  });

  function render(group: PlannedGroup | null = null) {
    const fixture = TestBed.createComponent(GroupForm);
    fixture.componentRef.setInput('group', group);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function type(fixture: ComponentFixture<GroupForm>, input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function itemInputs(element: HTMLElement, index: number) {
    const item = element.querySelectorAll('.item')[index];
    const [name, amount, category, description] = [
      ...item.querySelectorAll<HTMLInputElement>('input'),
    ];
    return { name, amount, category, description };
  }

  function submit(fixture: ComponentFixture<GroupForm>) {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('should require a name and a name, amount and category for every item', () => {
    const { fixture, element } = render();

    submit(fixture);

    expect(create).not.toHaveBeenCalled();
    expect(element.querySelector('.field-error')?.textContent).toBe('Informe o nome do grupo.');
    expect(element.querySelector('.item .field-error')?.textContent?.trim()).toBe(
      'Informe o nome do gasto.',
    );
    expect(element.querySelector('.remove')?.hasAttribute('disabled')).toBe(true);
  });

  it('should create a group with several items and show their total', () => {
    const { fixture, element } = render();
    type(fixture, element.querySelector<HTMLInputElement>('.field-input')!, ' Contas fixas ');
    let inputs = itemInputs(element, 0);
    type(fixture, inputs.name, 'Luz');
    type(fixture, inputs.amount, '12000');
    type(fixture, inputs.category, 'Casa');

    element.querySelector<HTMLButtonElement>('.add')!.click();
    fixture.detectChanges();
    inputs = itemInputs(element, 1);
    type(fixture, inputs.name, 'Internet');
    type(fixture, inputs.amount, '9990');
    type(fixture, inputs.category, 'Casa');
    type(fixture, inputs.description, 'Fibra');

    expect(element.querySelector('.items-total')?.textContent).toMatch(/R\$\s219,90/);
    expect(
      [...element.querySelectorAll('datalist option')].map((option) =>
        option.getAttribute('value'),
      ),
    ).toEqual(['Casa', 'Lazer']);

    submit(fixture);

    expect(create).toHaveBeenCalledWith({
      name: 'Contas fixas',
      items: [
        { name: 'Luz', amount: 120, category: 'Casa', description: null },
        { name: 'Internet', amount: 99.9, category: 'Casa', description: 'Fibra' },
      ],
    });
  });

  it('should load the group being edited, remove an item and save the changes', () => {
    const saved = vi.fn();
    const { fixture, element } = render(GROUP);
    fixture.componentInstance.saved.subscribe(saved);

    expect(element.querySelectorAll('.item')).toHaveLength(2);
    expect(itemInputs(element, 1).amount.value).toMatch(/R\$\s99,90/);

    element.querySelectorAll<HTMLButtonElement>('.remove')[0].click();
    fixture.detectChanges();
    submit(fixture);

    expect(update).toHaveBeenCalledWith('contas', {
      name: 'Contas fixas',
      items: [{ name: 'Internet', amount: 99.9, category: 'Casa', description: 'Fibra' }],
    });
    expect(saved).toHaveBeenCalled();
  });

  it('should tell when saving fails', () => {
    update.mockReturnValue(throwError(() => new Error('falhou')));
    const { fixture, element } = render(GROUP);

    submit(fixture);

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível salvar o grupo.',
    );
    expect(element.querySelector<HTMLButtonElement>('.primary-button')?.disabled).toBe(false);
  });
});
