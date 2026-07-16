import { emptyNodeStat, estimateBb100, mergeStatsByNodeId, type NodeStat } from '../leaks';
import { rangeRefKey } from '../rangeRef';

const base: NodeStat = {
  providerId: 'pekarstas',
  nodeId: 'cash6max_100bb_BTN_RFI',
  hands: 10,
  sumScore: 800,
  sumEvLoss: 0,
  evHands: 0,
  mistakes: 1,
};

describe('provider-aware leak metrics', () => {
  it('keeps identical node ids separate across providers', () => {
    expect(rangeRefKey('pekarstas', base.nodeId)).not.toBe(
      rangeRefKey('greenline', base.nodeId),
    );
  });

  it('does not invent bb/100 without source EV and spot frequency', () => {
    expect(estimateBb100(base, 0.05)).toBeNull();
    expect(estimateBb100({ ...base, evHands: 10, sumEvLoss: 2 })).toBeNull();
  });

  it('calculates an estimate only when all inputs are explicit', () => {
    expect(estimateBb100({ ...base, evHands: 10, sumEvLoss: 2 }, 0.05)).toBe(1);
  });
});

describe('combined range statistics', () => {
  it('merges duplicate logical spots and keeps one replay reference', () => {
    const merged = mergeStatsByNodeId(
      [
        { ...emptyNodeStat('pekarstas', 'spot'), hands: 4, sumScore: 300, mistakes: 1 },
        { ...emptyNodeStat('greenline', 'spot'), hands: 6, sumScore: 420, mistakes: 2 },
      ],
      () => 'pekarstas',
    );
    expect(merged).toEqual([
      {
        providerId: 'pekarstas',
        nodeId: 'spot',
        hands: 10,
        sumScore: 720,
        sumEvLoss: 0,
        evHands: 0,
        mistakes: 3,
      },
    ]);
  });
});
