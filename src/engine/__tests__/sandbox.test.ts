import { allNodes } from '../../data/ranges';
import type { RangeNode } from '../../types';
import {
  availableSandboxPositions,
  missingSandboxSpots,
  resolveSandboxNodes,
  sandboxCoverage,
  sandboxScenarioAvailability,
} from '../sandbox';

describe('sandbox availability', () => {
  const nodes = allNodes('pekarstas');
  const btnScope = { format: 'cash_6max' as const, stackBB: 100, hero: 'BTN' as const };

  it('derives positions only from actually shipped legal nodes', () => {
    const positions = availableSandboxPositions(nodes, 'cash_6max', 100);
    expect(positions).toContain('BTN');
    expect(positions).toContain('BB');
    expect(availableSandboxPositions(nodes, 'cash_6max', 40)).toEqual([]);
  });

  it('resolves one exact spot without falling back to another node', () => {
    const exact = resolveSandboxNodes(nodes, {
      ...btnScope,
      mode: 'single',
      scenario: 'vs_RFI',
      villainPosition: 'CO',
    });
    expect(exact).toHaveLength(1);
    expect(exact[0].id).toBe('cash6max_100bb_BTN_vs_RFI_CO');

    expect(
      resolveSandboxNodes(nodes, {
        ...btnScope,
        mode: 'single',
        scenario: 'vs_RFI',
        villainPosition: 'BB',
      }),
    ).toEqual([]);
  });

  it('builds an honest whole-position mix from every available legal node', () => {
    const mix = resolveSandboxNodes(nodes, { ...btnScope, mode: 'mix' });
    const coverage = sandboxCoverage(nodes, btnScope);
    expect(mix).toHaveLength(coverage.available);
    expect(new Set(mix.map((node) => node.id)).size).toBe(mix.length);
    expect(mix.every((node) => node.hero === 'BTN')).toBe(true);
    expect(coverage.legal).toBeGreaterThanOrEqual(coverage.available);
  });

  it('keeps legal-but-missing villains visible as unavailable metadata', () => {
    const onlyCo = nodes.filter(
      (node) => node.id === 'cash6max_100bb_BTN_vs_RFI_CO',
    ) as RangeNode[];
    const vsRfi = sandboxScenarioAvailability(onlyCo, btnScope).find(
      (item) => item.scenario === 'vs_RFI',
    );
    expect(vsRfi?.legalVillainPositions).toEqual(['UTG', 'HJ', 'CO']);
    expect(vsRfi?.availableVillainPositions).toEqual(['CO']);
    expect(vsRfi?.availableNodeCount).toBe(1);
  });

  it('reports every missing Pekarstas 100bb spot exactly', () => {
    expect(missingSandboxSpots(nodes, 'cash_6max', 100)).toEqual([
      { hero: 'BTN', scenario: 'squeeze', villainPosition: 'UTG' },
      { hero: 'BTN', scenario: 'squeeze', villainPosition: 'HJ' },
      { hero: 'BTN', scenario: 'squeeze', villainPosition: 'CO' },
      { hero: 'BB', scenario: 'squeeze', villainPosition: 'UTG' },
      { hero: 'BB', scenario: 'squeeze', villainPosition: 'HJ' },
      { hero: 'BB', scenario: 'squeeze', villainPosition: 'CO' },
      { hero: 'BB', scenario: 'squeeze', villainPosition: 'BTN' },
      { hero: 'BB', scenario: 'squeeze', villainPosition: 'SB' },
    ]);
  });

  it('reports Greenline gaps without mixing providers', () => {
    const missing = missingSandboxSpots(allNodes('greenline'), 'cash_6max', 100);
    expect(missing).toHaveLength(10);
    expect(missing).toContainEqual({ hero: 'CO', scenario: 'vs_RFI', villainPosition: 'UTG' });
    expect(missing).toContainEqual({ hero: 'CO', scenario: 'vs_RFI', villainPosition: 'HJ' });
    expect(missing.filter((spot) => spot.scenario === 'squeeze')).toHaveLength(8);
  });

  it('reports all 46 legal nodes missing at an unsupported stack', () => {
    expect(missingSandboxSpots(nodes, 'cash_6max', 40)).toHaveLength(46);
  });
});
