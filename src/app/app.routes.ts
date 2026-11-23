import { Routes } from '@angular/router';

const loadExpensesPage = () =>
  import('./expenses/expenses-page/expenses-page').then((m) => m.ExpensesPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'gastos' },
  {
    path: 'gastos',
    title: 'Gastos realizados',
    data: { kind: 'realized' },
    loadComponent: loadExpensesPage,
  },
  {
    path: 'gastos/planejados',
    title: 'Gastos planejados',
    data: { kind: 'planned' },
    loadComponent: loadExpensesPage,
  },
  {
    path: 'faturas',
    title: 'Faturas',
    loadComponent: () =>
      import('./invoices/invoices-page/invoices-page').then((m) => m.InvoicesPage),
  },
  {
    path: 'metodos-pagamento',
    title: 'Métodos de pagamento',
    loadComponent: () =>
      import('./payment-methods/payment-methods-page/payment-methods-page').then(
        (m) => m.PaymentMethodsPage,
      ),
  },
  {
    path: 'grupos',
    title: 'Grupos de gastos planejados',
    loadComponent: () =>
      import('./planned-groups/planned-groups-page/planned-groups-page').then(
        (m) => m.PlannedGroupsPage,
      ),
  },
];
