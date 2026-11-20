import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

export const SECTION_FORWARD = 'section-forward';
export const SECTION_BACK = 'section-back';

const SECTION_ORDER = ['gastos', 'metodos-pagamento', 'faturas'];

function leafPath(root: ActivatedRouteSnapshot): string {
  let route = root;
  while (route.firstChild) {
    route = route.firstChild;
  }
  return route.pathFromRoot
    .map((snapshot) => snapshot.routeConfig?.path ?? '')
    .filter((path) => path !== '')
    .join('/');
}

export function sectionSlide(from: string, to: string): string[] {
  const fromIndex = SECTION_ORDER.indexOf(from.split('/')[0]);
  const toIndex = SECTION_ORDER.indexOf(to.split('/')[0]);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return [];
  }
  return [toIndex > fromIndex ? SECTION_FORWARD : SECTION_BACK];
}

export function tagViewTransitionTypes({ transition, from, to }: ViewTransitionInfo): void {
  for (const type of sectionSlide(leafPath(from), leafPath(to))) {
    transition.types?.add(type);
  }
}
