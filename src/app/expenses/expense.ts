export type PaymentType = 'CREDITO' | 'DEBITO' | 'PIX' | 'BOLETO' | 'DOC' | 'TED';

export const PAYMENT_TYPE_LABELS: Readonly<Record<PaymentType, string>> = {
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  PIX: 'Pix',
  BOLETO: 'Boleto',
  DOC: 'DOC',
  TED: 'TED',
};

export const PAYMENT_TYPE_ORDER: readonly PaymentType[] = [
  'CREDITO',
  'PIX',
  'DEBITO',
  'BOLETO',
  'DOC',
  'TED',
];

interface RankedPayment {
  id: string;
  paymentType: PaymentType;
  institution: { name: string };
}

export function byPaymentTypeThenUsage(
  usage: ReadonlyMap<string, number>,
): (a: RankedPayment, b: RankedPayment) => number {
  return (a, b) =>
    PAYMENT_TYPE_ORDER.indexOf(a.paymentType) - PAYMENT_TYPE_ORDER.indexOf(b.paymentType) ||
    (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) ||
    a.institution.name.localeCompare(b.institution.name, 'pt-BR');
}

export type ExpenseKind = 'realized' | 'planned';

export interface Institution {
  id: string;
  name: string;
  iconUrl: string | null;
  color: string | null;
}

export interface Installment {
  number: number;
  count: number;
  purchaseId: string;
  purchaseAmount: number;
}

export interface InstallmentPart {
  number: number;
  amount: number;
  invoiceDueDate: string | null;
}

export interface Expense {
  id: string;
  date: string | null;
  name: string;
  amount: number;
  category: string;
  description: string | null;
  realized: boolean;
  paymentType: PaymentType;
  institution: Institution;
  installment: Installment | null;
}

export interface TotalLine {
  id: string;
  label: string;
  realized: number;
  planned: number;
}

export interface PaymentTotalLine extends TotalLine {
  paymentType: PaymentType;
  institution: Institution;
}

export interface MonthTotals {
  realized: number;
  planned: number;
  byPayment: PaymentTotalLine[];
  byCategory: TotalLine[];
}

export type ExpenseFilter =
  | { kind: 'payment'; id: string; label: string; institution: Institution }
  | { kind: 'category'; id: string; label: string };

export function filterKey(filter: ExpenseFilter): string {
  return `${filter.kind}:${filter.id}`;
}

export interface NewExpense {
  name: string;
  amount: number;
  category: string;
  paymentMethodId: string;
  date: string | null;
  description: string | null;
  realized: boolean;
  installments: number;
  invoicePeriod: string | null;
}

export interface ExpensePeriod {
  year: number | null;
  month: number | null;
  count: number;
}
