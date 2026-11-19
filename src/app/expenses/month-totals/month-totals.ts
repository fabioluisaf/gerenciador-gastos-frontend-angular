import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  ExpenseFilter,
  ExpenseKind,
  filterKey,
  MonthTotals as MonthTotalsData,
  PaymentTotalLine,
  TotalLine,
} from '../expense';
import { TotalRow } from './total-row';

interface FilterRow<T extends TotalLine> {
  key: string;
  line: T;
  filter: ExpenseFilter;
  active: boolean;
  selectable: boolean;
}

let nextId = 0;

function largestPlanned(lines: readonly TotalLine[]): number {
  return Math.max(0, ...lines.map((line) => line.planned));
}

@Component({
  selector: 'app-month-totals',
  imports: [CurrencyPipe, TotalRow],
  templateUrl: './month-totals.html',
  styleUrl: './month-totals.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthTotals {
  protected readonly idPrefix = `totais-${nextId++}`;
  readonly totals = input.required<MonthTotalsData>();
  readonly periodLabel = input.required<string>();
  readonly kind = input<ExpenseKind>('realized');
  readonly activeFilters = input<readonly ExpenseFilter[]>([]);
  readonly filterToggled = output<ExpenseFilter>();

  protected readonly rejectedKey = signal<string | null>(null);

  private readonly activeKeys = computed(
    () => new Set(this.activeFilters().map((filter) => filterKey(filter))),
  );

  protected readonly paymentRows = computed(() =>
    this.totals().byPayment.map((line) =>
      this.toRow<PaymentTotalLine>(line, {
        kind: 'payment',
        id: line.id,
        label: line.label,
        institution: line.institution,
      }),
    ),
  );
  protected readonly categoryRows = computed(() =>
    this.totals().byCategory.map((line) =>
      this.toRow(line, { kind: 'category', id: line.id, label: line.label }),
    ),
  );

  protected readonly largestPaymentPlanned = computed(() =>
    largestPlanned(this.totals().byPayment),
  );
  protected readonly largestCategoryPlanned = computed(() =>
    largestPlanned(this.totals().byCategory),
  );

  protected select(row: FilterRow<TotalLine>): void {
    if (row.selectable) {
      this.filterToggled.emit(row.filter);
      return;
    }
    this.rejectedKey.set(null);
    requestAnimationFrame(() => this.rejectedKey.set(row.key));
  }

  protected clearRejection(): void {
    this.rejectedKey.set(null);
  }

  private toRow<T extends TotalLine>(line: T, filter: ExpenseFilter): FilterRow<T> {
    const key = filterKey(filter);
    const active = this.activeKeys().has(key);
    const listed = this.kind() === 'planned' ? line.planned - line.realized : line.realized;
    return { key, line, filter, active, selectable: active || listed !== 0 };
  }
}
