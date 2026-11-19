import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-payment-methods-page',
  template: `<h1 class="visually-hidden">Métodos de pagamento</h1>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsPage {}
