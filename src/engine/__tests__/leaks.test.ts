import { estimateBb100, type NodeStat } from '../leaks';
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
