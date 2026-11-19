import {
  CONTROL_BAR_MOVE,
  EXPENSE_KIND_MOVE,
  highlightMoves,
  SECTION_BACK,
  SECTION_FORWARD,
  sectionSlide,
} from './view-transition-types';

describe('highlightMoves', () => {
  it('should swell only the expense kind toggle when switching between realized and planned', () => {
    expect(highlightMoves('gastos', 'gastos/planejados')).toEqual([EXPENSE_KIND_MOVE]);
    expect(highlightMoves('gastos/planejados', 'gastos')).toEqual([EXPENSE_KIND_MOVE]);
  });

  it('should swell the control bar when moving to another section', () => {
    expect(highlightMoves('gastos/planejados', 'faturas')).toEqual([CONTROL_BAR_MOVE]);
  });

  it('should not swell anything when the highlights stay put', () => {
    expect(highlightMoves('gastos', 'gastos')).toEqual([]);
  });
});

describe('sectionSlide', () => {
  it('should slide forward when moving to a section further right in the control bar', () => {
    expect(sectionSlide('gastos/planejados', 'metodos-pagamento')).toEqual([SECTION_FORWARD]);
  });

  it('should slide back when returning to a section further left in the control bar', () => {
    expect(sectionSlide('metodos-pagamento', 'gastos')).toEqual([SECTION_BACK]);
  });

  it('should not slide within the same section or towards unknown sections', () => {
    expect(sectionSlide('gastos', 'gastos/planejados')).toEqual([]);
    expect(sectionSlide('gastos', 'desconhecida')).toEqual([]);
  });
});
