import {
  allCombinedNodes,
  allNodes,
  getCombinedNode,
  getNode,
  hasNode,
  PROVIDERS,
  RANGE_SOURCES,
} from '../../data/ranges';
import { allHands } from '../hands';
import type { Action } from '../../types';
import { pekarstasLossless } from '../../data/ranges/source/pekarstasLossless';

describe('public range nodes', () => {
  const providerId = 'pekarstas' as const;
  const hands = allHands();

  it('ships the core curriculum nodes', () => {
    expect(hasNode(providerId, 'cash6max_100bb_BTN_RFI')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_CO_RFI')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_BTN_vs_RFI_CO')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_BB_blind_defense_BTN')).toBe(true);
  });

  it('ships the full currently imported provider coverage', () => {
    expect(allNodes('pekarstas')).toHaveLength(54);
    expect(allNodes('greenline')).toHaveLength(41);
  });

  it('exposes one deduplicated library and prefers the primary complete node', () => {
    const combined = allCombinedNodes();
    expect(new Set(combined.map((node) => node.id)).size).toBe(combined.length);
    expect(combined.length).toBeGreaterThanOrEqual(allNodes('pekarstas').length);
    expect(getCombinedNode('cash6max_100bb_BTN_RFI')?.providerId).toBe('pekarstas');
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
      expect(RANGE_SOURCES[provider.id].stackDepthVerified).toBe(false);
    }
  });

  it('fills all 169 hands and includes provenance metadata', () => {
    for (const provider of PROVIDERS) {
      expect(allNodes(provider.id).length).toBeGreaterThan(20);
      for (const node of allNodes(provider.id)) {
        expect(node.providerId).toBe(provider.id);
        expect(node.sourceId).toBe(provider.id);
        expect(node.sizing.effectiveStackBB).toBe(100);
        expect(node.strategyConfidence).toMatch(/^community_/);
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

  it('imports every Pekarstas visual split without discarding colors or heights', () => {
    expect(pekarstasLossless.PLACEHOLDER).toBe(false);
    expect(pekarstasLossless.charts).toHaveLength(41);
    let multiColorCells = 0;
    let weightedCells = 0;
    for (const chart of pekarstasLossless.charts) {
      for (const colors of Object.values(chart.cells)) {
        const values = Object.values(colors);
        if (values.length > 1) multiColorCells += 1;
        if (values.some((frequency) => frequency !== 1)) weightedCells += 1;
        expect(values.reduce((sum, frequency) => sum + frequency, 0)).toBeLessThanOrEqual(1);
      }
    }
    expect(multiColorCells).toBe(315);
    expect(weightedCells).toBe(391);
  });

  it('preserves a real 75/25 split instead of collapsing it to the first color', () => {
    const node = getNode(providerId, 'cash6max_100bb_HJ_vs_RFI_UTG')!;
    expect(node.sourceChartId).toBe(29);
    expect(node.hands.AQs['3bet']?.freq).toBe(0.75);
    expect(node.hands.AQs.call?.freq).toBe(0.25);
    expect(node.sizing.openBB).toBe(2.5);
    expect(node.sizing.raiseMultiplier).toBe(3);
    expect(node.sizing.raiseBB).toBe(7.5);
  });

  it('derives displayed bet amounts only from linked source sizing', () => {
    const sbVsBtn = getNode(providerId, 'cash6max_100bb_SB_vs_RFI_BTN')!;
    expect(sbVsBtn.sizing.openBB).toBe(2.5);
    expect(sbVsBtn.sizing.raiseMultiplier).toBe(4.5);
    expect(sbVsBtn.sizing.raiseBB).toBe(11.25);

    const bbVsSb = getNode(providerId, 'cash6max_100bb_BB_blind_defense_SB')!;
    expect(bbVsSb.sizing.openBB).toBe(3);
    expect(bbVsSb.sizing.raiseMultiplier).toBe(3);
    expect(bbVsSb.sizing.raiseBB).toBe(9);
  });

  it('maps the source Fold color to pure fold in vs-4bet charts', () => {
    const node = getNode(providerId, 'cash6max_100bb_HJ_vs_4bet_UTG')!;
    expect(node.sourceChartId).toBe(58);
    expect(node.hands.AJs.fold?.freq).toBe(1);
    expect(node.hands.AJs.call).toBeUndefined();
  });

  it('ships source-declared EP/MP aliases instead of silently dropping HJ spots', () => {
    expect(hasNode(providerId, 'cash6max_100bb_CO_vs_RFI_HJ')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_BTN_vs_RFI_HJ')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_CO_vs_4bet_HJ')).toBe(true);
    expect(hasNode(providerId, 'cash6max_100bb_BTN_vs_4bet_HJ')).toBe(true);
  });

  it('has unique deterministic ids and reach weights for advanced nodes with parents', () => {
    for (const provider of PROVIDERS) {
      const nodes = allNodes(provider.id);
      expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
      for (const node of nodes) {
        if (node.scenario !== 'vs_3bet' && node.scenario !== 'vs_4bet') continue;
        expect(node.reachWeights).toBeDefined();
        expect(Object.keys(node.reachWeights ?? {})).toHaveLength(169);
        expect(Object.values(node.reachWeights ?? {}).some((weight) => (weight ?? 0) > 0)).toBe(
          true,
        );
      }
    }
  });
});
