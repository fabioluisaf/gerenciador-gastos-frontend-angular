import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideBan, LucideImagePlus, LucidePipette, LucideX } from '@lucide/angular';
import { prefersDarkText } from '../../payment-methods/payment-method-card/payment-method-card';
import { InstitutionsApi, MAX_ICON_BYTES } from '../../payment-methods/institutions-api';

const MAX_TEXT_LENGTH = 255;
const ACCEPTED_ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const INSTITUTION_COLORS: readonly string[] = [
  '#820AD1',
  '#005CA9',
  '#EC7000',
  '#CC092F',
  '#00A868',
  '#FFC800',
  '#1F1F24',
];

type Field = 'name' | 'icon';

let nextId = 0;

@Component({
  selector: 'app-institution-form',
  imports: [LucideBan, LucideImagePlus, LucidePipette, LucideX],
  templateUrl: './institution-form.html',
  styleUrl: './institution-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionForm {
  private readonly api = inject(InstitutionsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly saved = output<void>();

  protected readonly id = `instituicao-${nextId++}`;
  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly presetColors = INSTITUTION_COLORS;
  protected readonly acceptedIconTypes = ACCEPTED_ICON_TYPES.join(',');

  protected readonly name = signal('');
  protected readonly color = signal<string | null>(INSTITUTION_COLORS[0]);
  protected readonly icon = signal<File | null>(null);
  protected readonly iconPreview = signal<string | null>(null);
  protected readonly iconRejected = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected readonly customColor = computed(() => {
    const color = this.color();
    return color && !INSTITUTION_COLORS.includes(color) ? color : null;
  });
  protected readonly darkText = computed(() => {
    const color = this.color();
    return color !== null && prefersDarkText(color);
  });
  protected readonly initial = computed(() => this.name().trim().charAt(0).toUpperCase() || '?');

  protected readonly errors = computed<Record<Field, string | null>>(() => ({
    name: this.name().trim() ? null : 'Informe o nome da instituição.',
    icon: this.iconRejected(),
  }));

  constructor() {
    this.destroyRef.onDestroy(() => this.revokePreview());
  }

  protected errorFor(field: Field): string | null {
    return field === 'icon' || this.submitted() ? this.errors()[field] : null;
  }

  protected textValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected pickIcon(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }
    if (!ACCEPTED_ICON_TYPES.includes(file.type)) {
      this.iconRejected.set('Use uma imagem PNG, JPG, WEBP ou GIF.');
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      this.iconRejected.set('A imagem precisa ter até 1 MB.');
      return;
    }
    this.iconRejected.set(null);
    this.revokePreview();
    this.icon.set(file);
    this.iconPreview.set(URL.createObjectURL(file));
  }

  protected removeIcon(): void {
    this.revokePreview();
    this.icon.set(null);
    this.iconPreview.set(null);
    this.iconRejected.set(null);
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    if (this.errors().name) {
      afterNextRender(
        () => this.host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    this.api
      .create({ name: this.name().trim(), color: this.color(), icon: this.icon() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.saved.emit(),
        error: () => {
          this.saving.set(false);
          this.failed.set(true);
        },
      });
  }

  private revokePreview(): void {
    const preview = this.iconPreview();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }
}
