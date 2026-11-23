export interface PlannedGroupItem {
  name: string;
  amount: number;
  category: string;
  description: string | null;
}

export interface NewPlannedGroup {
  name: string;
  items: PlannedGroupItem[];
}

export interface PlannedGroup extends NewPlannedGroup {
  id: string;
  total: number;
}

export interface GroupApplication {
  paymentMethodId: string;
  date: string | null;
  invoicePeriod: string | null;
  items: PlannedGroupItem[];
}
