import { CurrencyPipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
} from '@angular/core';
import { todayIsoDate } from '../../expenses/timeline';
import { Invoice, invoiceStatus, InvoiceStatus } from '../invoice';

const STATUS_LABELS: Readonly<Record<InvoiceStatus, string>> = {
  open: 'Aberta',
  closed: 'Fechada',
  past: 'Encerrada',
};

function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

@Component({
  selector: 'app-invoice-summary',
  imports: [CurrencyPipe],
  templateUrl: './invoice-summary.html',
  styleUrl: './invoice-summary.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceSummary {
  private readonly locale = inject(LOCALE_ID);
  private readonly today = todayIsoDate();

  readonly invoice = input.required<Invoice>();
  readonly color = input<string | null>(null);
  readonly plannedTotal = input(0);
  readonly direction = input<'forward' | 'back'>('forward');

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly status = computed(() => invoiceStatus(this.invoice(), this.today));
  protected readonly title = computed(
    () => `Fatura de ${formatDate(isoToDate(this.invoice().dueDate), "MMMM 'de' y", this.locale)}`,
  );
  protected readonly closingDay = computed(() => this.dayOf(this.invoice().closingDate));
  protected readonly dueDay = computed(() => this.dayOf(this.invoice().dueDate));

  private dayOf(iso: string): string {
    return formatDate(isoToDate(iso), "d 'de' MMM", this.locale).replace('.', '');
  }
}
