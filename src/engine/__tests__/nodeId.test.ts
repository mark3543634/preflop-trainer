import { buildNodeId } from '../nodeId';

describe('buildNodeId', () => {
  it('builds RFI ids without a villain', () => {
    expect(
      buildNodeId({ format: 'cash_6max', stackBB: 100, hero: 'BTN', scenario: 'RFI' }),
    ).toBe('cash6max_100bb_BTN_RFI');
  });

  it('appends the villain position when present', () => {
    expect(
      buildNodeId({
        format: 'cash_6max',
        stackBB: 100,
        hero: 'BTN',
        scenario: 'vs_RFI',
        villainPosition: 'CO',
      }),
    ).toBe('cash6max_100bb_BTN_vs_RFI_CO');
  });

  it('handles blind defense ids', () => {
    expect(
      buildNodeId({
        format: 'cash_6max',
        stackBB: 100,
        hero: 'BB',
        scenario: 'blind_defense',
        villainPosition: 'BTN',
      }),
    ).toBe('cash6max_100bb_BB_blind_defense_BTN');
  });
});
