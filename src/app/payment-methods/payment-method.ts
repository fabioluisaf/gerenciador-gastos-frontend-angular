import { Institution, PaymentType } from '../expenses/expense';

export interface PaymentMethod {
  id: string;
  name: string;
  paymentType: PaymentType;
  institution: Institution;
  closingDay: number | null;
  dueDay: number | null;
  usageCount: number;
}
