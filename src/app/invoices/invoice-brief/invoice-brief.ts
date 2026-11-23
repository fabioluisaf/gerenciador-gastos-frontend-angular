import { CurrencyPipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DataChanges } from '../../core/data-changes';
import { ExpensesApi } from '../../expenses/expenses-api';
import { Invoice } from '../invoice';

@Component({
  selector: 'app-invoice-brief',
  imports: [CurrencyPipe],
  templateUrl: './invoice-brief.html',
  styleUrl: './invoice-brief.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceBrief {
  private readonly expensesApi = inject(ExpensesApi);
  private readonly dataChanges = inject(DataChanges);
  private readonly locale = inject(LOCALE_ID);

  readonly invoice = input.required<Invoice>();
  readonly label = input.required<string>();

  private readonly entries = rxResource({
    params: () => ({ id: this.invoice().id, version: this.dataChanges.expenses() }),
    stream: ({ params }) => this.expensesApi.listByInvoice(params.id),
  });

  protected readonly month = computed(() => {
    const [year, month] = this.invoice().dueDate.split('-').map(Number);
    return formatDate(new Date(year, month - 1, 1), 'MMMM', this.locale);
  });
  protected readonly plannedTotal = computed(
    () =>
      this.invoice().total +
      (this.entries.hasValue() ? this.entries.value().planned : []).reduce(
        (sum, { amount }) => sum + amount,
        0,
      ),
  );
}
