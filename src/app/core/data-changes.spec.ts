import { TestBed } from '@angular/core/testing';
import { DataChanges } from './data-changes';

describe('DataChanges', () => {
  it('should bump the versions of everything a saved item can affect', () => {
    const changes = TestBed.inject(DataChanges);

    changes.expenseSaved();
    expect([changes.expenses(), changes.paymentMethods(), changes.institutions()]).toEqual([
      1, 1, 0,
    ]);

    changes.paymentMethodSaved();
    expect([changes.expenses(), changes.paymentMethods(), changes.institutions()]).toEqual([
      1, 2, 0,
    ]);

    changes.institutionSaved();
    expect([changes.expenses(), changes.paymentMethods(), changes.institutions()]).toEqual([
      1, 3, 1,
    ]);
  });
});
