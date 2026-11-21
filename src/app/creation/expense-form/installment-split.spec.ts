import { isEvenSplit, splitEvenly } from './installment-split';

describe('installment split', () => {
  it('should split like the server, leaving the remainder on the first installment', () => {
    expect(splitEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEvenly(300, 3)).toEqual([100, 100, 100]);
    expect(splitEvenly(2, 3)).toEqual([2, 0, 0]);
  });

  it('should tell when the installments were adjusted by hand', () => {
    expect(isEvenSplit([3334, 3333, 3333])).toBe(true);
    expect(isEvenSplit([5000, 2500, 2500])).toBe(false);
  });
});
