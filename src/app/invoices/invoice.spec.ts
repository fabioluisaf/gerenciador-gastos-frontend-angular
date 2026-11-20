import { currentInvoice, Invoice, invoiceStatus } from './invoice';

function invoice(id: string, closingDate: string, dueDate: string): Invoice {
  return { id, closingDate, dueDate, total: 0 };
}

describe('invoice', () => {
  const november = invoice('nov', '2026-11-14', '2026-11-21');
  const december = invoice('dez', '2026-12-14', '2026-12-21');

  it('should tell whether an invoice is still open, already closed or past its due date', () => {
    expect(invoiceStatus(december, '2026-12-14')).toBe('open');
    expect(invoiceStatus(december, '2026-12-15')).toBe('closed');
    expect(invoiceStatus(december, '2026-12-21')).toBe('closed');
    expect(invoiceStatus(december, '2026-12-22')).toBe('past');
  });

  it('should pick the first invoice still open, or the last one when all are closed', () => {
    expect(currentInvoice([november, december], '2026-11-20')?.id).toBe('dez');
    expect(currentInvoice([november, december], '2026-11-10')?.id).toBe('nov');
    expect(currentInvoice([november, december], '2027-01-01')?.id).toBe('dez');
    expect(currentInvoice([], '2027-01-01')).toBeNull();
  });
});
