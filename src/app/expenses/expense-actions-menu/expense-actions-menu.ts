import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { LucideEllipsis, LucideTrash2 } from '@lucide/angular';

let nextId = 0;

@Component({
  selector: 'app-expense-actions-menu',
  imports: [LucideEllipsis, LucideTrash2],
  templateUrl: './expense-actions-menu.html',
  styleUrl: './expense-actions-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.open]': 'open()',
    '(click)': '$event.stopPropagation()',
  },
})
export class ExpenseActionsMenu {
  readonly deleteRequested = output<void>();

  protected readonly menuId = `gasto-acoes-${nextId++}`;
  protected readonly anchorName = `--${this.menuId}`;
  protected readonly open = signal(false);

  protected onToggle(event: Event): void {
    this.open.set((event as ToggleEvent).newState === 'open');
  }

  protected requestDelete(menu: HTMLElement): void {
    menu.hidePopover();
    this.deleteRequested.emit();
  }
}
