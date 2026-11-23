import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideChevronDown, LucideListPlus } from '@lucide/angular';
import { tap } from 'rxjs';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { DataChanges } from '../../core/data-changes';
import { EditRequests } from '../../core/edit-requests';
import { ActionsMenu } from '../../shared/actions-menu/actions-menu';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ApplyGroupForm } from '../apply-group-form/apply-group-form';
import { PlannedGroup } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';

@Component({
  selector: 'app-planned-groups-page',
  imports: [
    ActionsMenu,
    ApplyGroupForm,
    BottomSheet,
    ConfirmDialog,
    CurrencyPipe,
    LucideChevronDown,
    LucideListPlus,
  ],
  templateUrl: './planned-groups-page.html',
  styleUrl: './planned-groups-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannedGroupsPage {
  private readonly api = inject(PlannedGroupsApi);
  private readonly dataChanges = inject(DataChanges);
  private readonly controlBar = inject(ControlBarState);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);
  private readonly applySheet = viewChild.required(BottomSheet);
  protected readonly editRequests = inject(EditRequests);

  protected readonly groups = rxResource({
    params: () => this.dataChanges.plannedGroups(),
    stream: () => this.api.list(),
  });
  protected readonly applying = signal<PlannedGroup | null>(null);
  protected readonly applyingList = computed(() => {
    const group = this.applying();
    return group ? [group] : [];
  });
  protected readonly appliedMessage = signal<string | null>(null);

  protected openApply(group: PlannedGroup): void {
    this.appliedMessage.set(null);
    this.applying.set(group);
    this.applySheet().open();
    this.applySheet().expand();
    this.controlBar.hide();
  }

  protected onApplied(group: PlannedGroup, count: number): void {
    this.dataChanges.expenseSaved();
    this.appliedMessage.set(
      count === 1
        ? `1 gasto planejado de "${group.name}" foi criado.`
        : `${count} gastos planejados de "${group.name}" foram criados.`,
    );
    this.applySheet().close();
  }

  protected onApplyClosed(): void {
    this.applying.set(null);
    this.controlBar.show();
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
