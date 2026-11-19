import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

@Directive({ selector: '[appInViewport]' })
export class InViewport {
  readonly inViewportChange = output<boolean>();

  constructor() {
    const element: HTMLElement = inject(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => this.inViewportChange.emit(entries.some((entry) => entry.isIntersecting)),
        { rootMargin: '0px 0px 600px 0px' },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
