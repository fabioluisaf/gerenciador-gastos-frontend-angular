import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideArrowLeftRight, LucideBarcode, LucideNfc, LucideQrCode } from '@lucide/angular';
import { PAYMENT_TYPE_LABELS } from '../../expenses/expense';
import { PaymentMethod } from '../payment-method';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function prefersDarkText(color: string): boolean {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    channel(Number.parseInt(color.slice(start, start + 2), 16)),
  );
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05);
}

@Component({
  selector: 'app-payment-method-card',
  imports: [NgOptimizedImage, LucideArrowLeftRight, LucideBarcode, LucideNfc, LucideQrCode],
  templateUrl: './payment-method-card.html',
  styleUrl: './payment-method-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--card-color]': 'color()',
    '[class.neutral]': '!color()',
    '[class.dark-text]': 'darkText()',
  },
})
export class PaymentMethodCard {
  readonly method = input.required<PaymentMethod>();

  protected readonly typeLabel = computed(() => PAYMENT_TYPE_LABELS[this.method().paymentType]);
  protected readonly color = computed(() => {
    const color = this.method().institution.color;
    return color && HEX_COLOR.test(color) ? color : null;
  });
  protected readonly darkText = computed(() => {
    const color = this.color();
    return color !== null && prefersDarkText(color);
  });
  protected readonly billing = computed(() => {
    const { closingDay, dueDay } = this.method();
    return closingDay && dueDay ? { closingDay, dueDay } : null;
  });
}
