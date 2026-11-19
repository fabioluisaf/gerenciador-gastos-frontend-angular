import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

export const CONTROL_BAR_MOVE = 'control-bar-move';
export const EXPENSE_KIND_MOVE = 'expense-kind-move';
export const SECTION_FORWARD = 'section-forward';
export const SECTION_BACK = 'section-back';

const EXPENSES_SECTION = 'gastos';
const SECTION_ORDER = [EXPENSES_SECTION, 'metodos-pagamento'];

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

export function highlightMoves(from: string, to: string): string[] {
  const fromSection = from.split('/')[0];
  const toSection = to.split('/')[0];
  if (fromSection !== toSection) {
    return [CONTROL_BAR_MOVE];
  }
  return fromSection === EXPENSES_SECTION && from !== to ? [EXPENSE_KIND_MOVE] : [];
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
  const fromPath = leafPath(from);
  const toPath = leafPath(to);
  for (const type of [...highlightMoves(fromPath, toPath), ...sectionSlide(fromPath, toPath)]) {
    transition.types?.add(type);
  }
}
