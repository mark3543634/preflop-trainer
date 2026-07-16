import { allNodes, getNode, hasNode, PROVIDERS, RANGE_SOURCES } from '../../data/ranges';
import { allHands } from '../hands';
import type { Action } from '../../types';

describe('public range nodes', () => {
  const providerId = 'pekarstas' as const;
  const hands = allHands();

  it('ships the core curriculum nodes', () => {
    expect(hasNode(providerId, 'cash6max_100bb_BTN_RFI')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_CO_RFI')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_BTN_vs_RFI_CO')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_BB_blind_defense_BTN')).toBe(true);
  });

  it('returns undefined for an unavailable depth', () => {
    expect(getNode(providerId, 'cash6max_40bb_BTN_RFI')).toBeUndefined();
  });

  it('includes only explicitly redistributable providers', () => {
    expect(PROVIDERS.map((provider) => provider.id)).toEqual(['pekarstas', 'greenline']);
    for (const provider of PROVIDERS) {
      expect(RANGE_SOURCES[provider.id].publicDistributionAllowed).toBe(true);
      expect(RANGE_SOURCES[provider.id].license).toBe('MIT');
      expect(RANGE_SOURCES[provider.id].sourceUrl).toMatch(/^https:\/\//);
      expect(RANGE_SOURCES[provider.id].sourceRevision).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it('fills all 169 hands and includes provenance metadata', () => {
    for (const provider of PROVIDERS) {
      expect(allNodes(provider.id).length).toBeGreaterThan(20);
      for (const node of allNodes(provider.id)) {
        expect(node.providerId).toBe(provider.id);
        expect(node.sourceId).toBe(provider.id);
        expect(node.sizing.effectiveStackBB).toBe(100);
        expect(node.PLACEHOLDER).toBeFalsy();
        expect(Object.keys(node.hands)).toHaveLength(169);
        for (const hand of hands) expect(node.hands[hand]).toBeDefined();
      }
    }
  });

  it('uses finite legal frequencies summing to approximately one', () => {
    for (const provider of PROVIDERS) {
      for (const node of allNodes(provider.id)) {
        for (const hand of hands) {
          const strategy = node.hands[hand];
          const entries = Object.entries(strategy) as [Action, { freq: number }][];
          const sum = entries.reduce((total, [action, value]) => {
            expect(node.actions).toContain(action);
            expect(Number.isFinite(value.freq)).toBe(true);
            expect(value.freq).toBeGreaterThanOrEqual(0);
            expect(value.freq).toBeLessThanOrEqual(1);
            return total + value.freq;
          }, 0);
          expect(sum).toBeGreaterThan(0.97);
          expect(sum).toBeLessThan(1.03);
        }
      }
    }
  });

  it('maps source actions into the application vocabulary', () => {
    const btnRfi = getNode(providerId, 'cash6max_100bb_BTN_RFI')!;
    expect(btnRfi.actions).toEqual(['raise', 'fold']);
    expect(btnRfi.hands.AA.raise?.freq).toBeGreaterThan(0.9);
    expect(btnRfi.hands['72o'].fold?.freq).toBe(1);

    const bbDef = getNode(providerId, 'cash6max_100bb_BB_blind_defense_BTN')!;
    expect(bbDef.actions).toEqual(['3bet', 'call', 'fold']);
    expect(bbDef.hands.AA['3bet']?.freq).toBeGreaterThan(0.9);
  });
});
