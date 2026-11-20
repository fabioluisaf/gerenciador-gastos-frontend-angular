export type InvoiceStatus = 'open' | 'closed' | 'past';

export interface Invoice {
  id: string;
  closingDate: string;
  dueDate: string;
  total: number;
}

export function invoiceStatus(invoice: Invoice, today: string): InvoiceStatus {
  if (today <= invoice.closingDate) {
    return 'open';
  }
  return today <= invoice.dueDate ? 'closed' : 'past';
}

export function currentInvoice(invoices: readonly Invoice[], today: string): Invoice | null {
  return invoices.find((invoice) => invoice.closingDate >= today) ?? invoices.at(-1) ?? null;
}
