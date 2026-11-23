import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideArrowLeft, LucideListPlus, LucidePlus } from '@lucide/angular';
import { tap } from 'rxjs';
import { DataChanges } from '../../core/data-changes';
import { ActionsMenu } from '../../shared/actions-menu/actions-menu';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ApplyGroupForm } from '../apply-group-form/apply-group-form';
import { GroupForm } from '../group-form/group-form';
import { PlannedGroup } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';

type PanelView =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'edit'; group: PlannedGroup }
  | { kind: 'apply'; group: PlannedGroup };

@Component({
  selector: 'app-groups-panel',
  imports: [
    ActionsMenu,
    ApplyGroupForm,
    ConfirmDialog,
    CurrencyPipe,
    GroupForm,
    LucideArrowLeft,
    LucideListPlus,
    LucidePlus,
  ],
  templateUrl: './groups-panel.html',
  styleUrl: './groups-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsPanel {
  private readonly api = inject(PlannedGroupsApi);
  private readonly dataChanges = inject(DataChanges);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  readonly applied = output<void>();

  protected readonly groups = rxResource({
    params: () => this.dataChanges.plannedGroups(),
    stream: () => this.api.list(),
  });
  protected readonly view = signal<PanelView>({ kind: 'list' });
  protected readonly viewTitle = computed(() => {
    const view = this.view();
    switch (view.kind) {
      case 'new':
        return 'Novo grupo';
      case 'edit':
        return 'Editar grupo';
      case 'apply':
        return `Aplicar "${view.group.name}"`;
      default:
        return null;
    }
  });
  protected readonly viewGroups = computed(() => {
    const view = this.view();
    return view.kind === 'edit' || view.kind === 'apply' ? [view.group] : [];
  });

  protected show(view: PanelView): void {
    this.view.set(view);
  }

  protected backToList(): void {
    this.view.set({ kind: 'list' });
  }

  protected onSaved(): void {
    this.dataChanges.plannedGroupSaved();
    this.backToList();
  }

  protected onApplied(): void {
    this.backToList();
    this.applied.emit();
  }

  protected confirmDelete(group: PlannedGroup): void {
    this.confirmDialog().open({
      title: 'Excluir grupo?',
      message: `"${group.name}" será excluído. Os gastos já criados com ele continuam.`,
      confirmLabel: 'Excluir',
      runningLabel: 'Excluindo…',
      errorMessage: 'Não foi possível excluir o grupo. Tente novamente.',
      run: () =>
        this.api
          .delete(group.id)
          .pipe(
            tap(() => this.groups.update((groups) => groups?.filter(({ id }) => id !== group.id))),
          ),
    });
  }
}
