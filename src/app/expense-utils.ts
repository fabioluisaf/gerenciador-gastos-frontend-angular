export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const formatCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format;

export function formatExpenseDate(day: number, year: number, month: number, monthOffset = 0): string {
  const monthIndex = month + monthOffset;
  return `${String(day).padStart(2, '0')}/${String(monthIndex % 12 + 1).padStart(2, '0')}/${year + Math.floor(monthIndex / 12)}`;
}

export function invoiceIsPastDue(year: number, month: number, closingDay?: number, today = new Date()): boolean {
  const invoiceMonth = year * 12 + month;
  const currentMonth = today.getFullYear() * 12 + today.getMonth();
  return invoiceMonth < currentMonth ||
    (invoiceMonth === currentMonth && closingDay !== undefined && today.getDate() > closingDay);
}

export function closeOnBackdrop(event: MouseEvent, dialog: HTMLDialogElement): void {
  if (event.target !== dialog) {
    return;
  }
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) {
    dialog.close();
  }
}
