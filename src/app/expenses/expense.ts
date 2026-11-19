export type PaymentType = 'CREDITO' | 'DEBITO' | 'PIX' | 'BOLETO' | 'DOC' | 'TED';

export const PAYMENT_TYPE_LABELS: Readonly<Record<PaymentType, string>> = {
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  PIX: 'Pix',
  BOLETO: 'Boleto',
  DOC: 'DOC',
  TED: 'TED',
};

export interface Institution {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface Installment {
  number: number;
  total: number;
}

export interface Expense {
  id: string;
  date: string;
  name: string;
  amount: number;
  category: string;
  description: string | null;
  paymentType: PaymentType;
  institution: Institution;
  installment: Installment | null;
}
