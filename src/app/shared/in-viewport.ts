import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

@Directive({ selector: '[appInViewport]' })
export class InViewport {
  readonly rootMargin = input('0px');
  readonly inViewportChange = output<boolean>();

  constructor() {
    const element: HTMLElement = inject(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => this.inViewportChange.emit(entries.some((entry) => entry.isIntersecting)),
        { rootMargin: this.rootMargin() },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
