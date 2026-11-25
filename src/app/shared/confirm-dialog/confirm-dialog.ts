import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { BackdropClick } from '../backdrop-click';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  runningLabel: string;
  errorMessage: string;
  tone?: 'danger' | 'success';
  run: () => Observable<unknown>;
}

let nextId = 0;

@Component({
  selector: 'app-confirm-dialog',
  imports: [BackdropClick],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly titleId = `confirmacao-titulo-${nextId}`;
  protected readonly messageId = `confirmacao-mensagem-${nextId++}`;
  protected readonly request = signal<ConfirmRequest | null>(null);
  protected readonly running = signal(false);
  protected readonly failed = signal(false);

  open(request: ConfirmRequest): void {
    this.request.set(request);
    this.running.set(false);
    this.failed.set(false);
    afterNextRender(() => this.dialog().nativeElement.showModal(), { injector: this.injector });
  }

  protected close(): void {
    if (!this.running()) {
      this.dialog().nativeElement.close();
    }
  }

  protected preventCloseWhileRunning(event: Event): void {
    if (this.running()) {
      event.preventDefault();
    }
  }

  protected confirm(): void {
    const request = this.request();
    if (!request || this.running()) {
      return;
    }
    this.running.set(true);
    this.failed.set(false);
    request
      .run()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => {
          this.running.set(false);
          this.close();
        },
        error: () => {
          this.running.set(false);
          this.failed.set(true);
        },
      });
  }
}
