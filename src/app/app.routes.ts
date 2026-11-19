import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'gastos' },
  {
    path: 'gastos',
    title: 'Gastos',
    loadComponent: () => import('./expenses/expense-list/expense-list').then((m) => m.ExpenseList),
  },
];
