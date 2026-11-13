import { Expense } from '../expense-models';

export type PaymentDetails = Pick<Expense, 'institution' | 'paymentMethod'>;

type PaymentPaletteKey = 'boleto' | 'pix' | 'credito' | 'debito' | 'doc' | 'ted';

interface PaymentPalette {
  background: string;
  border: string;
  hover: string;
}

const DEFAULT_PAYMENT_PALETTE: PaymentPalette = {
  background: 'var(--color-selected)',
  border: 'var(--color-primary)',
  hover: 'var(--color-hover)',
};

const PAYMENT_PALETTES: Readonly<Record<PaymentPaletteKey, PaymentPalette>> = {
  boleto: { background: 'var(--payment-boleto-bg)', border: 'var(--payment-boleto-border)', hover: 'var(--payment-boleto-hover)' },
  pix: { background: 'var(--payment-pix-bg)', border: 'var(--payment-pix-border)', hover: 'var(--payment-pix-hover)' },
  credito: { background: 'var(--payment-credito-bg)', border: 'var(--payment-credito-border)', hover: 'var(--payment-credito-hover)' },
  debito: { background: 'var(--payment-debito-bg)', border: 'var(--payment-debito-border)', hover: 'var(--payment-debito-hover)' },
  doc: { background: 'var(--payment-doc-bg)', border: 'var(--payment-doc-border)', hover: 'var(--payment-doc-hover)' },
  ted: { background: 'var(--payment-ted-bg)', border: 'var(--payment-ted-border)', hover: 'var(--payment-ted-hover)' },
};

const CAIXA_PAYMENT_PALETTE: PaymentPalette = {
  background: 'var(--color-payment-caixa-selected)',
  border: 'var(--color-payment-caixa-border)',
  hover: 'var(--color-payment-caixa-hover)',
};

const INSTITUTION_ICONS: Readonly<Record<string, string>> = {
  caixa: '/caixa.png',
  nubank: '/nubank.png',
};

export function institutionIcon(payment: PaymentDetails): string | null {
  return INSTITUTION_ICONS[payment.institution.trim().toLowerCase()] ?? null;
}

function paymentMethodKey(paymentMethod: string): PaymentPaletteKey | null {
  const method = paymentMethod.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (method.includes('boleto')) {
    return 'boleto';
  }
  if (method.includes('pix')) {
    return 'pix';
  }
  if (method.includes('credito')) {
    return 'credito';
  }
  if (method.includes('debito')) {
    return 'debito';
  }
  if (method.includes('doc')) {
    return 'doc';
  }
  if (method.includes('ted')) {
    return 'ted';
  }
  return null;
}

export function paymentMethodIcon(paymentMethod: string): string | null {
  switch (paymentMethodKey(paymentMethod)) {
    case 'boleto':
      return 'barcode';
    case 'pix':
      return 'qr-code';
    case 'credito':
      return 'credit-card';
    case 'debito':
      return 'wallet';
    case 'doc':
      return 'arrow-left-right';
    case 'ted':
      return 'landmark';
    default:
      return null;
  }
}

export function paymentTagStyles(payment: PaymentDetails): Record<string, string> {
  const institutionPalette = payment.institution.trim().toLowerCase() === 'caixa'
    ? CAIXA_PAYMENT_PALETTE
    : DEFAULT_PAYMENT_PALETTE;
  const paymentKey = paymentMethodKey(payment.paymentMethod);
  const paymentPalette = paymentKey ? PAYMENT_PALETTES[paymentKey] : DEFAULT_PAYMENT_PALETTE;
  return {
    '--institution-background': institutionPalette.background,
    '--institution-border': institutionPalette.border,
    '--institution-hover': institutionPalette.hover,
    '--payment-background': paymentPalette.background,
    '--payment-border': paymentPalette.border,
    '--payment-hover': paymentPalette.hover,
  };
}
