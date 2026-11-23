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
  LOCALE_ID,
  output,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCopy, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ExpensesApi } from '../../expenses/expenses-api';
import { centsFromInput, moveCaretToEnd } from '../amount-input';
import { PlannedGroup, PlannedGroupItem } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';

const MAX_TEXT_LENGTH = 255;

interface DraftItem {
  key: number;
  name: string;
  amountCents: number;
  category: string;
  description: string;
}

interface ItemErrors {
  name: string | null;
  amount: string | null;
  category: string | null;
}

type ItemField = keyof Omit<DraftItem, 'key'>;

let nextId = 0;
let nextKey = 0;

function toDraft(item: PlannedGroupItem): DraftItem {
  return {
    key: nextKey++,
    name: item.name,
    amountCents: Math.round(item.amount * 100),
    category: item.category,
    description: item.description ?? '',
  };
}

function emptyItem(): DraftItem {
  return { key: nextKey++, name: '', amountCents: 0, category: '', description: '' };
}

@Component({
  selector: 'app-group-form',
  imports: [LucideCopy, LucidePlus, LucideTrash2],
  templateUrl: './group-form.html',
  styleUrl: './group-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupForm {
  private readonly api = inject(PlannedGroupsApi);
  private readonly expensesApi = inject(ExpensesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly currency = new Intl.NumberFormat(inject(LOCALE_ID), {
    style: 'currency',
    currency: 'BRL',
  });

  readonly group = input<PlannedGroup | null>(null);
  readonly saved = output<void>();

  protected readonly id = `grupo-${nextId++}`;
  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly editing = computed(() => this.group() !== null);

  private readonly categories = rxResource({ stream: () => this.expensesApi.listCategories() });
  protected readonly categoryOptions = computed(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );

  protected readonly name = linkedSignal(() => this.group()?.name ?? '');
  protected readonly items = linkedSignal<DraftItem[]>(() => {
    const group = this.group();
    return group ? group.items.map(toDraft) : [emptyItem()];
  });
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected readonly totalText = computed(() =>
    this.formatCents(this.items().reduce((sum, { amountCents }) => sum + amountCents, 0)),
  );
  protected readonly nameError = computed(() =>
    this.name().trim() ? null : 'Informe o nome do grupo.',
  );
  protected readonly itemErrors = computed<ItemErrors[]>(() =>
    this.items().map((item) => ({
      name: item.name.trim() ? null : 'Informe o nome do gasto.',
      amount: item.amountCents === 0 ? 'Informe o valor.' : null,
      category: item.category.trim() ? null : 'Informe a categoria.',
    })),
  );
  private readonly invalid = computed(
    () =>
      !!this.nameError() || this.itemErrors().some((errors) => Object.values(errors).some(Boolean)),
  );

  protected formatCents(cents: number): string {
    return this.currency.format(cents / 100);
  }

  protected errorFor(index: number, field: keyof ItemErrors): string | null {
    return this.submitted() ? (this.itemErrors()[index]?.[field] ?? null) : null;
  }

  protected itemError(index: number): string | null {
    return (
      this.errorFor(index, 'name') ??
      this.errorFor(index, 'amount') ??
      this.errorFor(index, 'category')
    );
  }

  protected textValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected updateItem(index: number, field: ItemField, value: string | number): void {
    this.items.update((items) =>
      items.map((item, position) => (position === index ? { ...item, [field]: value } : item)),
    );
  }

  protected onAmountInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const cents = centsFromInput(input.value);
    this.updateItem(index, 'amountCents', cents);
    input.value = this.formatCents(cents);
  }

  protected readonly moveCaretToEnd = moveCaretToEnd;

  protected addItem(): void {
    this.items.update((items) => [...items, emptyItem()]);
    this.focusItemName(this.items().length - 1);
  }

  protected duplicateItem(index: number): void {
    this.items.update((items) => [
      ...items.slice(0, index + 1),
      { ...items[index], key: nextKey++ },
      ...items.slice(index + 1),
    ]);
    this.focusItemName(index + 1);
  }

  protected removeItem(index: number): void {
    this.items.update((items) => items.filter((_, position) => position !== index));
  }

  private focusItemName(index: number): void {
    afterNextRender(
      () => this.host.querySelectorAll<HTMLInputElement>('.item-name')[index]?.focus(),
      { injector: this.injector },
    );
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    if (this.invalid()) {
      afterNextRender(
        () => this.host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const changes = {
      name: this.name().trim(),
      items: this.items().map((item) => ({
        name: item.name.trim(),
        amount: item.amountCents / 100,
        category: item.category.trim(),
        description: item.description.trim() || null,
      })),
    };
    const editing = this.group();
    (editing ? this.api.update(editing.id, changes) : this.api.create(changes))
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
