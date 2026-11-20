import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideArrowLeftRight,
  LucideBarcode,
  LucideCreditCard,
  LucideQrCode,
  LucideWallet,
} from '@lucide/angular';
import { DataChanges } from '../../core/data-changes';
import {
  Institution,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPE_ORDER,
  PaymentType,
} from '../../expenses/expense';
import { InstitutionsApi } from '../../payment-methods/institutions-api';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodCard } from '../../payment-methods/payment-method-card/payment-method-card';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';

const MAX_TEXT_LENGTH = 255;

type Field = 'institution' | 'name' | 'closingDay' | 'dueDay';

function parseDay(value: string): number | null {
  const day = Number(value);
  return value !== '' && Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

let nextId = 0;

@Component({
  selector: 'app-payment-method-form',
  imports: [
    LucideArrowLeftRight,
    LucideBarcode,
    LucideCreditCard,
    LucideQrCode,
    LucideWallet,
    NgOptimizedImage,
    PaymentMethodCard,
    SegmentedSelector,
  ],
  templateUrl: './payment-method-form.html',
  styleUrl: './payment-method-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodForm {
  private readonly paymentMethodsApi = inject(PaymentMethodsApi);
  private readonly institutionsApi = inject(InstitutionsApi);
  private readonly dataChanges = inject(DataChanges);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly method = input<PaymentMethod | null>(null);
  readonly saved = output<void>();
  readonly institutionRequested = output<void>();

  protected readonly id = `metodo-${nextId++}`;
  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly typeOptions: SelectorOption<PaymentType>[] = PAYMENT_TYPE_ORDER.map(
    (type) => ({ value: type, label: PAYMENT_TYPE_LABELS[type] }),
  );

  private readonly institutions = rxResource({
    params: () => this.dataChanges.institutions(),
    stream: () => this.institutionsApi.list(),
  });

  protected readonly editing = computed(() => this.method() !== null);
  protected readonly paymentType = linkedSignal<PaymentType>(
    () => this.method()?.paymentType ?? 'CREDITO',
  );
  protected readonly institutionOptions = computed<SelectorOption[]>(() =>
    this.loadedInstitutions().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly institutionId = linkedSignal<readonly Institution[], string | null>({
    source: () => this.loadedInstitutions(),
    computation: (institutions, previous) => {
      const preferred = previous?.value ?? this.method()?.institution.id;
      return institutions.find(({ id }) => id === preferred)?.id ?? institutions[0]?.id ?? null;
    },
  });
  protected readonly typedName = linkedSignal<string | null>(() => this.method()?.name ?? null);
  protected readonly closingDay = linkedSignal(() => this.method()?.closingDay?.toString() ?? '');
  protected readonly dueDay = linkedSignal(() => this.method()?.dueDay?.toString() ?? '');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected readonly loadedInstitutions = computed(() =>
    this.institutions.hasValue() ? this.institutions.value() : [],
  );
  protected readonly institutionsLoaded = computed(() => this.institutions.hasValue());
  protected readonly institutionsFailed = computed(() => this.institutions.status() === 'error');
  protected readonly institution = computed(
    () => this.loadedInstitutions().find(({ id }) => id === this.institutionId()) ?? null,
  );
  protected readonly isCredit = computed(() => this.paymentType() === 'CREDITO');
  protected readonly suggestedName = computed(() => {
    const institution = this.institution();
    const type = PAYMENT_TYPE_LABELS[this.paymentType()];
    return institution ? `${type} ${institution.name}` : type;
  });
  protected readonly name = computed(() => this.typedName() ?? this.suggestedName());

  protected readonly preview = computed<PaymentMethod>(() => ({
    id: 'previa',
    name: this.name().trim() || this.suggestedName(),
    paymentType: this.paymentType(),
    institution: this.institution() ?? {
      id: 'previa',
      name: 'Instituição',
      iconUrl: null,
      color: null,
    },
    closingDay: this.isCredit() ? parseDay(this.closingDay()) : null,
    dueDay: this.isCredit() ? parseDay(this.dueDay()) : null,
    usageCount: 0,
  }));

  protected readonly errors = computed<Record<Field, string | null>>(() => ({
    institution: this.institutionId() ? null : 'Escolha a instituição.',
    name: this.name().trim() ? null : 'Informe o nome do método.',
    closingDay:
      this.isCredit() && parseDay(this.closingDay()) === null ? 'Dia entre 1 e 31.' : null,
    dueDay: this.isCredit() && parseDay(this.dueDay()) === null ? 'Dia entre 1 e 31.' : null,
  }));

  protected errorFor(field: Field): string | null {
    return this.submitted() ? this.errors()[field] : null;
  }

  protected textValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    const institutionId = this.institutionId();
    if (Object.values(this.errors()).some(Boolean) || !institutionId) {
      afterNextRender(
        () => this.host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const changes = {
      paymentType: this.paymentType(),
      institutionId,
      name: this.name().trim(),
      closingDay: this.isCredit() ? parseDay(this.closingDay()) : null,
      dueDay: this.isCredit() ? parseDay(this.dueDay()) : null,
    };
    const editing = this.method();
    (editing
      ? this.paymentMethodsApi.update(editing, changes)
      : this.paymentMethodsApi.create(changes)
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.saved.emit(),
        error: () => {
          this.saving.set(false);
          this.failed.set(true);
        },
      });
  }
}
