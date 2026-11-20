import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { stubDialogs } from '../testing/dialog-stub';
import { ConfirmDialog, ConfirmRequest } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: '<app-confirm-dialog />',
})
class Host {
  readonly confirm = viewChild.required(ConfirmDialog);
}

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let restoreDialogs: () => void;
  let result: Subject<void>;
  let run: ReturnType<typeof vi.fn<() => Subject<void>>>;

  beforeEach(async () => {
    restoreDialogs = stubDialogs();
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement;
    await fixture.whenStable();
    result = new Subject<void>();
    run = vi.fn<() => Subject<void>>(() => result);
    const request: ConfirmRequest = {
      title: 'Excluir gasto?',
      message: '"Mercado" será excluído.',
      confirmLabel: 'Excluir',
      runningLabel: 'Excluindo…',
      errorMessage: 'Não foi possível excluir o gasto.',
      run,
    };
    fixture.componentInstance.confirm().open(request);
    await fixture.whenStable();
  });

  afterEach(() => restoreDialogs());

  function dialog(): HTMLDialogElement {
    return element.querySelector('dialog')!;
  }

  function button(selector: string): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>(selector)!;
  }

  it('should ask for confirmation with the request texts', () => {
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute('role')).toBe('alertdialog');
    expect(element.querySelector(`#${dialog().getAttribute('aria-labelledby')}`)?.textContent).toBe(
      'Excluir gasto?',
    );
    expect(
      element.querySelector(`#${dialog().getAttribute('aria-describedby')}`)?.textContent,
    ).toBe('"Mercado" será excluído.');
  });

  it('should close without running the action when cancelled', async () => {
    button('.cancel').click();
    await fixture.whenStable();

    expect(dialog().open).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('should keep the dialog busy while the action runs and close when it finishes', async () => {
    button('.danger').click();
    await fixture.whenStable();

    expect(run).toHaveBeenCalledTimes(1);
    expect(button('.danger').textContent?.trim()).toBe('Excluindo…');
    expect(button('.danger').disabled).toBe(true);
    expect(button('.cancel').disabled).toBe(true);

    result.complete();
    await fixture.whenStable();

    expect(dialog().open).toBe(false);
  });

  it('should stay open and explain the failure when the action fails', async () => {
    button('.danger').click();
    result.error(new Error('falhou'));
    await fixture.whenStable();

    expect(dialog().open).toBe(true);
    expect(element.querySelector('[role="alert"]')?.textContent).toBe(
      'Não foi possível excluir o gasto.',
    );
    expect(button('.danger').disabled).toBe(false);
  });
});
