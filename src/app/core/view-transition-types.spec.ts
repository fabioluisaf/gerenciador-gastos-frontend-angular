import { SECTION_BACK, SECTION_FORWARD, sectionSlide } from './view-transition-types';

describe('sectionSlide', () => {
  it('should slide forward when moving to a section further right in the control bar', () => {
    expect(sectionSlide('gastos/planejados', 'metodos-pagamento')).toEqual([SECTION_FORWARD]);
    expect(sectionSlide('metodos-pagamento', 'faturas')).toEqual([SECTION_FORWARD]);
  });

  it('should slide back when returning to a section further left in the control bar', () => {
    expect(sectionSlide('metodos-pagamento', 'gastos')).toEqual([SECTION_BACK]);
  });

  it('should not slide within the same section or towards unknown sections', () => {
    expect(sectionSlide('gastos', 'gastos/planejados')).toEqual([]);
    expect(sectionSlide('gastos', 'desconhecida')).toEqual([]);
  });
});
