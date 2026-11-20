import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucidePencil, LucideTrash } from '@lucide/angular';
import { tap } from 'rxjs';
import { DataChanges } from '../../core/data-changes';
import { EditRequests } from '../../core/edit-requests';
import { ActionsMenu } from '../../shared/actions-menu/actions-menu';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { SwipeActions } from '../../shared/swipe-actions/swipe-actions';
import { PaymentMethod } from '../payment-method';
import { PaymentMethodCard } from '../payment-method-card/payment-method-card';
import { PaymentMethodsApi } from '../payment-methods-api';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const REVEAL_DWELL_MS = 250;

function mostUsed(methods: readonly PaymentMethod[]): PaymentMethod {
  return methods.reduce((best, method) => (method.usageCount > best.usageCount ? method : best));
}

@Component({
  selector: 'app-payment-methods-page',
  imports: [ActionsMenu, ConfirmDialog, LucidePencil, LucideTrash, PaymentMethodCard, SwipeActions],
  templateUrl: './payment-methods-page.html',
  styleUrl: './payment-methods-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsPage {
  private readonly api = inject(PaymentMethodsApi);
  private readonly dataChanges = inject(DataChanges);
  protected readonly editRequests = inject(EditRequests);
  private readonly document = inject(DOCUMENT);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);
  private readonly chosenId = signal<string | null>(null);
  private revealTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly methods = rxResource({
    params: () => this.dataChanges.paymentMethods(),
    stream: () => this.api.list(),
  });
  protected readonly expanded = signal(false);
  protected readonly animating = signal(false);

  private readonly loaded = computed(() => (this.methods.hasValue() ? this.methods.value() : []));
  protected readonly principal = computed(() => {
    const methods = this.loaded();
    if (methods.length === 0) {
      return null;
    }
    return methods.find(({ id }) => id === this.chosenId()) ?? mostUsed(methods);
  });
  protected readonly others = computed(() => {
    const principal = this.principal();
    return this.loaded().filter((method) => method !== principal);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelReveal());
  }

  protected transitionName(method: PaymentMethod): string | null {
    return this.animating() ? `metodo-${method.id}` : null;
  }

  protected scheduleReveal(item: HTMLElement, event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || (event.movementX === 0 && event.movementY === 0)) {
      return;
    }
    this.cancelReveal();
    this.revealTimer = setTimeout(() => this.reveal(item), REVEAL_DWELL_MS);
  }

  protected cancelReveal(): void {
    clearTimeout(this.revealTimer);
  }

  protected reveal(item: HTMLElement): void {
    if (this.expanded() && !this.animating()) {
      item.scrollIntoView?.({
        block: 'nearest',
        behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }

  protected expand(): void {
    this.animate(() => this.expanded.set(true));
  }

  protected collapse(): void {
    this.animate(() => this.expanded.set(false));
  }

  protected bringToTop(method: PaymentMethod): void {
    this.animate(() => {
      this.chosenId.set(method.id);
      this.expanded.set(false);
      this.document.defaultView?.scrollTo({ top: 0 });
    });
  }

  protected confirmDelete(method: PaymentMethod): void {
    this.confirmDialog().open({
      title: 'Excluir método de pagamento?',
      message: `"${method.name}" será excluído.`,
      confirmLabel: 'Excluir',
      runningLabel: 'Excluindo…',
      errorMessage:
        'Não foi possível excluir. Métodos usados em gastos ou faturas não podem ser excluídos.',
      run: () =>
        this.api
          .delete(method)
          .pipe(
            tap(() =>
              this.methods.update((methods) => methods?.filter(({ id }) => id !== method.id)),
            ),
          ),
    });
  }

  private animate(update: () => void): void {
    if (!this.document.startViewTransition || this.prefersReducedMotion()) {
      update();
      return;
    }
    this.animating.set(true);
    this.changeDetector.detectChanges();
    const transition = this.document.startViewTransition(() => {
      update();
      this.changeDetector.detectChanges();
    });
    const done = () => this.animating.set(false);
    transition.finished.then(done, done);
  }

  private prefersReducedMotion(): boolean {
    return this.document.defaultView?.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
  }
}
