import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ContainScroll } from '../contain-scroll';
import { SheetHandle } from '../sheet-handle';
import { isBackdropClick } from '../backdrop-click';

const HALF_RATIO = 0.6;
const CLOSE_RATIO = 0.75;
const FULL_GAP_PX = 24;

@Component({
  selector: 'app-bottom-sheet',
  imports: [ContainScroll, SheetHandle],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheet {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly label = input.required<string>();
  readonly closed = output<void>();

  protected readonly expanded = signal(false);
  protected readonly dragging = signal(false);
  protected readonly height = signal<number | null>(null);

  open(): void {
    this.expanded.set(false);
    this.height.set(null);
    afterNextRender(() => this.dialog().nativeElement.showModal(), { injector: this.injector });
  }

  expand(): void {
    this.expanded.set(true);
    this.height.set(null);
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected toggleSize(): void {
    this.expanded.update((expanded) => !expanded);
  }

  protected resize(height: number): void {
    this.dragging.set(true);
    this.height.set(height);
  }

  protected settle(height: number): void {
    this.dragging.set(false);
    const viewport = this.view?.innerHeight ?? 0;
    const half = viewport * HALF_RATIO;
    const full = viewport - FULL_GAP_PX;
    if (height < half * CLOSE_RATIO) {
      afterNextRender(() => this.close(), { injector: this.injector });
      return;
    }
    this.expanded.set(height > (half + full) / 2);
    this.height.set(null);
  }

  protected onClosed(): void {
    this.dragging.set(false);
    this.closed.emit();
  }

  protected closeOnBackdropClick(event: MouseEvent): void {
    if (isBackdropClick(event, this.dialog().nativeElement)) {
      this.close();
    }
  }
}
