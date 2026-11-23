import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataChanges {
  private readonly expensesState = signal(0);
  private readonly paymentMethodsState = signal(0);
  private readonly institutionsState = signal(0);
  private readonly plannedGroupsState = signal(0);

  readonly expenses = this.expensesState.asReadonly();
  readonly paymentMethods = this.paymentMethodsState.asReadonly();
  readonly institutions = this.institutionsState.asReadonly();
  readonly plannedGroups = this.plannedGroupsState.asReadonly();

  expenseSaved(): void {
    this.expensesState.update((version) => version + 1);
    this.paymentMethodsState.update((version) => version + 1);
  }

  paymentMethodSaved(): void {
    this.paymentMethodsState.update((version) => version + 1);
  }

  institutionSaved(): void {
    this.institutionsState.update((version) => version + 1);
    this.paymentMethodsState.update((version) => version + 1);
  }

  plannedGroupSaved(): void {
    this.plannedGroupsState.update((version) => version + 1);
  }
}
