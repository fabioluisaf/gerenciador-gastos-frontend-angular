import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export interface ScrubberMark {
  id: string;
  label: string;
  position: number;
}

const HIDE_DELAY_MS = 1500;

const KEY_STEPS: Readonly<Record<string, (index: number, last: number) => number>> = {
  ArrowDown: (index) => index + 1,
  PageDown: (index) => index + 1,
  ArrowUp: (index) => index - 1,
  PageUp: (index) => index - 1,
  Home: () => 0,
  End: (_, last) => last,
};

@Component({
  selector: 'app-timeline-scrubber',
  templateUrl: './timeline-scrubber.html',
  styleUrl: './timeline-scrubber.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.active]': 'active()',
    '(window:scroll)': 'revealTemporarily()',
  },
})
export class TimelineScrubber {
  readonly marks = input.required<readonly ScrubberMark[]>();
  readonly activeId = input<string | null>(null);
  readonly label = input.required<string>();
  readonly selected = output<string>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly previewId = signal<string | null>(null);
  private readonly scrolling = signal(false);
  protected readonly dragging = signal(false);
  private hideTimer?: ReturnType<typeof setTimeout>;

  protected readonly active = computed(() => this.scrolling() || this.dragging());
  protected readonly currentIndex = computed(() => {
    const id = this.previewId() ?? this.activeId();
    return Math.max(
      0,
      this.marks().findIndex((mark) => mark.id === id),
    );
  });
  protected readonly current = computed<ScrubberMark | undefined>(
    () => this.marks()[this.currentIndex()],
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.hideTimer));
  }

  protected revealTemporarily(): void {
    this.scrolling.set(true);
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.scrolling.set(false), HIDE_DELAY_MS);
  }

  protected startDrag(event: PointerEvent): void {
    this.track().nativeElement.setPointerCapture(event.pointerId);
    this.dragging.set(true);
    this.previewAt(event.clientY);
  }

  protected drag(event: PointerEvent): void {
    if (this.dragging()) {
      this.previewAt(event.clientY);
    }
  }

  protected endDrag(): void {
    const id = this.previewId();
    this.cancelDrag();
    if (id) {
      this.selected.emit(id);
    }
  }

  protected cancelDrag(): void {
    this.dragging.set(false);
    this.previewId.set(null);
    this.revealTemporarily();
  }

  protected navigateWithKeyboard(event: KeyboardEvent): void {
    const step = KEY_STEPS[event.key];
    const marks = this.marks();
    if (!step || marks.length === 0) {
      return;
    }
    event.preventDefault();
    const last = marks.length - 1;
    const index = Math.min(last, Math.max(0, step(this.currentIndex(), last)));
    this.revealTemporarily();
    this.selected.emit(marks[index].id);
  }

  private previewAt(clientY: number): void {
    const { top, height } = this.track().nativeElement.getBoundingClientRect();
    const fraction = height > 0 ? Math.min(1, Math.max(0, (clientY - top) / height)) : 0;
    const marks = this.marks();
    const firstAfter = marks.findIndex((mark) => mark.position > fraction);
    const index = (firstAfter === -1 ? marks.length : firstAfter) - 1;
    this.previewId.set(marks[Math.max(0, index)]?.id ?? null);
  }
}
