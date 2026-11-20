import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideCheck, LucideClock } from '@lucide/angular';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';
import { ExpenseKind } from '../expense';

@Component({
  selector: 'app-expense-kind-toggle',
  imports: [SegmentedSelector, LucideCheck, LucideClock],
  templateUrl: './expense-kind-toggle.html',
  styleUrl: './expense-kind-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseKindToggle {
  protected readonly options: SelectorOption<ExpenseKind>[] = [
    { value: 'realized', label: 'Realizados', link: '/gastos', exact: true },
    { value: 'planned', label: 'Planejados', link: '/gastos/planejados' },
  ];
}
