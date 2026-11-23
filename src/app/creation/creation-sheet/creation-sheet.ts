import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  LucideLandmark,
  LucideLayers,
  LucideReceiptText,
  LucideWalletCards,
} from '@lucide/angular';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { DataChanges } from '../../core/data-changes';
import { EditRequest, EditRequests } from '../../core/edit-requests';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';
import { GroupForm } from '../../planned-groups/group-form/group-form';
import { ExpenseForm } from '../expense-form/expense-form';
import { InstitutionForm } from '../institution-form/institution-form';
import { PaymentMethodForm } from '../payment-method-form/payment-method-form';

export type CreationTab = 'expense' | 'payment-method' | 'institution' | 'group';

const EDIT_TITLES: Readonly<Record<EditRequest['kind'], string>> = {
  expense: 'Editar gasto',
  'copy-expense': 'Copiar gasto',
  'payment-method': 'Editar método',
  'planned-group': 'Editar grupo',
  'new-planned-group': 'Novo grupo',
};

@Component({
  selector: 'app-creation-sheet',
  imports: [
    BottomSheet,
    ExpenseForm,
    GroupForm,
    InstitutionForm,
    LucideLandmark,
    LucideLayers,
    LucideReceiptText,
    LucideWalletCards,
    PaymentMethodForm,
    SegmentedSelector,
  ],
  templateUrl: './creation-sheet.html',
  styleUrl: './creation-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreationSheet {
  private readonly controlBar = inject(ControlBarState);
  private readonly dataChanges = inject(DataChanges);
  private readonly editRequests = inject(EditRequests);
  private readonly sheet = viewChild.required(BottomSheet);
  private readonly openState = signal(false);
  private readonly returnTab = signal<CreationTab | null>(null);

  readonly isOpen = this.openState.asReadonly();

  protected readonly editing = signal<EditRequest | null>(null);
  protected readonly title = computed(() => {
    const editing = this.editing();
    return editing ? EDIT_TITLES[editing.kind] : 'Criar';
  });
  protected readonly editingRequests = computed(() => {
    const editing = this.editing();
    return editing ? [editing] : [];
  });
  protected readonly tab = signal<CreationTab>('expense');
  protected readonly visited = signal<ReadonlySet<CreationTab>>(new Set());
  protected readonly tabs: SelectorOption<CreationTab>[] = [
    { value: 'expense', label: 'Gasto' },
    { value: 'payment-method', label: 'Método' },
    { value: 'institution', label: 'Instituição' },
    { value: 'group', label: 'Grupo' },
  ];

  constructor() {
    effect(() => {
      const request = this.editRequests.request();
      if (request) {
        untracked(() => {
          this.editRequests.consume();
          this.editing.set(request);
          this.show();
        });
      }
    });
  }

  open(): void {
    this.editing.set(null);
    this.returnTab.set(null);
    this.select('expense');
    this.show();
  }

  protected editSaved(): void {
    const kind = this.editing()?.kind;
    if (kind === 'expense' || kind === 'copy-expense') {
      this.dataChanges.expenseSaved();
    } else if (kind === 'planned-group' || kind === 'new-planned-group') {
      this.dataChanges.plannedGroupSaved();
    } else {
      this.dataChanges.paymentMethodSaved();
    }
    this.sheet().close();
  }

  protected select(tab: CreationTab): void {
    this.tab.set(tab);
    this.visited.update((visited) => new Set([...visited, tab]));
  }

  protected chooseTab(tab: CreationTab): void {
    this.returnTab.set(null);
    this.select(tab);
  }

  protected requestInstitution(): void {
    this.returnTab.set('payment-method');
    this.select('institution');
  }

  protected expenseSaved(): void {
    this.dataChanges.expenseSaved();
    this.sheet().close();
  }

  protected groupSaved(): void {
    this.dataChanges.plannedGroupSaved();
    this.sheet().close();
  }

  protected paymentMethodSaved(): void {
    this.dataChanges.paymentMethodSaved();
    this.sheet().close();
  }

  protected institutionSaved(): void {
    this.dataChanges.institutionSaved();
    const returnTab = this.returnTab();
    if (returnTab) {
      this.returnTab.set(null);
      this.visited.update(
        (visited) => new Set([...visited].filter((tab) => tab !== 'institution')),
      );
      this.tab.set(returnTab);
      return;
    }
    this.sheet().close();
  }

  protected onClosed(): void {
    this.openState.set(false);
    this.visited.set(new Set());
    this.controlBar.show();
  }

  private show(): void {
    this.openState.set(true);
    this.sheet().open();
    this.sheet().expand();
    this.controlBar.hide();
  }
}
