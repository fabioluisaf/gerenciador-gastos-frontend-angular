export interface Expense {
  id: number;
  year: number;
  month: number;
  day?: number | null;
  name: string;
  amountInCents: number;
  description: string;
  category: string;
  paymentMethod: string;
  paymentName: string;
  institution: string;
  invoiceId?: string;
  realized: boolean;
  closingDay?: number;
  invoiceClosingDay?: number;
  invoiceMonthOffset?: number;
  installment?: { number: number; quantity: number };
}

export interface ExpensePeriod {
  year: number;
  month: number;
}

export interface ExpenseFilter {
  field: 'paymentMethod' | 'paymentName' | 'category';
  value: string;
}

export interface SelectedExpenseFilter extends ExpenseFilter {
  label: string;
  payment?: Pick<Expense, 'institution' | 'paymentMethod'>;
}

export interface ExpenseQuery extends ExpensePeriod {
  filter: ExpenseFilter | null;
  page: number;
  pageSize: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
}

export interface ExpensePage extends PaginationInfo {
  items: readonly Expense[];
}

export interface ExpenseTotal {
  value: string;
  name: string;
  planned: number;
  realized: number;
}

export interface PaymentExpenseTotal extends ExpenseTotal {
  institution: string;
  paymentMethod: string;
}

export interface ExpenseTotals {
  payment: readonly PaymentExpenseTotal[];
  category: readonly ExpenseTotal[];
}

export interface AvailablePeriod {
  months: readonly number[];
  monthOnSelect: number | null;
}

export interface ExpenseMetadata {
  initialPeriod: ExpensePeriod;
  periods: Readonly<Record<number, AvailablePeriod>>;
}
