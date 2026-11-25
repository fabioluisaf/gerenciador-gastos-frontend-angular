import { formatDate } from '@angular/common';
import { Observable } from 'rxjs';
import { ConfirmRequest } from '../shared/confirm-dialog/confirm-dialog';
import { Expense } from './expense';

export function realizeConfirmation(
  expense: Expense,
  locale: string,
  run: () => Observable<unknown>,
): ConfirmRequest {
  const when = expense.date
    ? `em ${formatDate(`${expense.date}T00:00`, 'dd/MM/y', locale)}`
    : 'com a data de hoje';
  const installment = expense.installment;
  return {
    title: 'Realizar gasto?',
    message: installment
      ? `"${expense.name}" e as ${installment.count} parcelas da compra serão marcados como realizados${expense.date ? '' : ', com a data de hoje'}.`
      : `"${expense.name}" será marcado como realizado ${when}.`,
    confirmLabel: 'Realizar',
    runningLabel: 'Realizando…',
    errorMessage: 'Não foi possível realizar o gasto. Tente novamente.',
    tone: 'success',
    run,
  };
}
