import { enumerateHands, comboCount, handShape, allHands } from '../hands';

describe('enumerateHands', () => {
  const hands = enumerateHands();

  it('produces exactly 169 canonical hands', () => {
    expect(hands.length).toBe(169);
    expect(new Set(hands).size).toBe(169);
  });

  it('contains 13 pairs, 78 suited, 78 offsuit', () => {
    expect(hands.filter((h) => handShape(h) === 'pair').length).toBe(13);
    expect(hands.filter((h) => handShape(h) === 'suited').length).toBe(78);
    expect(hands.filter((h) => handShape(h) === 'offsuit').length).toBe(78);
  });

  it('includes expected sample keys with correct formatting', () => {
    expect(hands).toContain('AA');
    expect(hands).toContain('AKs');
    expect(hands).toContain('AKo');
    expect(hands).toContain('72o');
    expect(hands).not.toContain('KAs'); // higher rank must come first
  });

  it('comboCount: pair=6, suited=4, offsuit=12', () => {
    expect(comboCount('AA')).toBe(6);
    expect(comboCount('AKs')).toBe(4);
    expect(comboCount('AKo')).toBe(12);
  });

  it('allHands() is cached and stable', () => {
    expect(allHands()).toBe(allHands());
    expect(allHands().length).toBe(169);
  });
});
