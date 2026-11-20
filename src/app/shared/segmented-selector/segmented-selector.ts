import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SlidingIndicator } from '../sliding-indicator';

export interface SelectorOption<T extends string = string> {
  value: T;
  label: string;
  link?: string;
  exact?: boolean;
}

export interface SelectorOptionContext<T extends string = string> {
  $implicit: SelectorOption<T>;
}

let nextId = 0;

@Component({
  selector: 'app-segmented-selector',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, SlidingIndicator],
  templateUrl: './segmented-selector.html',
  styleUrl: './segmented-selector.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedSelector<T extends string = string> {
  readonly label = input.required<string>();
  readonly labelVisible = input(false, { transform: booleanAttribute });
  readonly options = input.required<readonly SelectorOption<T>[]>();
  readonly value = input<T>();
  readonly memoryKey = input('');
  readonly columns = input<number | null>(null);
  readonly valueChange = output<T>();

  protected readonly icon = contentChild<TemplateRef<SelectorOptionContext<T>>>(TemplateRef);
  protected readonly id = `segmented-selector-${nextId++}`;
  protected readonly navigates = computed(() =>
    this.options().every((option) => option.link !== undefined),
  );
  protected readonly exactMatch = { exact: true };
  protected readonly prefixMatch = { exact: false };
}
