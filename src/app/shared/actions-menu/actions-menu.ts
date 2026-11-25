import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import {
  LucideCircleCheck,
  LucideCopy,
  LucideEllipsis,
  LucidePencil,
  LucideTrash,
} from '@lucide/angular';

let nextId = 0;

@Component({
  selector: 'app-actions-menu',
  imports: [LucideCircleCheck, LucideCopy, LucideEllipsis, LucidePencil, LucideTrash],
  templateUrl: './actions-menu.html',
  styleUrl: './actions-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.open]': 'open()',
    '(click)': '$event.stopPropagation()',
  },
})
export class ActionsMenu {
  readonly label = input.required<string>();
  readonly copyable = input(false, { transform: booleanAttribute });
  readonly realizable = input(false);
  readonly editRequested = output<void>();
  readonly copyRequested = output<void>();
  readonly realizeRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly menuId = `acoes-${nextId++}`;
  protected readonly anchorName = `--${this.menuId}`;
  protected readonly open = signal(false);

  protected onToggle(event: Event): void {
    this.open.set((event as ToggleEvent).newState === 'open');
  }

  protected requestEdit(menu: HTMLElement): void {
    menu.hidePopover();
    this.editRequested.emit();
  }

  protected requestCopy(menu: HTMLElement): void {
    menu.hidePopover();
    this.copyRequested.emit();
  }

  protected requestRealize(menu: HTMLElement): void {
    menu.hidePopover();
    this.realizeRequested.emit();
  }

  protected requestDelete(menu: HTMLElement): void {
    menu.hidePopover();
    this.deleteRequested.emit();
  }
}
