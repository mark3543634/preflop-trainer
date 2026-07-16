import { legalScenarios, isLegalScenario } from '../scenarios';
import type { ScenarioType } from '../../types';

function scenarioTypes(hero: Parameters<typeof legalScenarios>[0]): ScenarioType[] {
  return legalScenarios(hero).map((s) => s.scenario);
}

describe('legalScenarios matrix', () => {
  it('UTG can only open (RFI)', () => {
    expect(scenarioTypes('UTG')).toEqual(['RFI']);
  });

  it('HJ has RFI and vs_3bet only', () => {
    expect(scenarioTypes('HJ').sort()).toEqual(['RFI', 'vs_3bet']);
  });

  it('CO faces RFI from UTG/HJ', () => {
    const vsRfi = legalScenarios('CO').find((s) => s.scenario === 'vs_RFI');
    expect(vsRfi?.villainPositions).toEqual(['UTG', 'HJ']);
  });

  it('BTN can squeeze and 3bet earlier openers', () => {
    expect(scenarioTypes('BTN')).toContain('squeeze');
    const vsRfi = legalScenarios('BTN').find((s) => s.scenario === 'vs_RFI');
    expect(vsRfi?.villainPositions).toEqual(['UTG', 'HJ', 'CO']);
  });

  it('BB defends vs every earlier raiser', () => {
    const def = legalScenarios('BB').find((s) => s.scenario === 'blind_defense');
    expect(def?.villainPositions).toEqual(['UTG', 'HJ', 'CO', 'BTN', 'SB']);
  });

  it('models BB facing a raise-back as vs_4bet, not an impossible vs_3bet', () => {
    expect(scenarioTypes('BB')).toContain('vs_4bet');
    expect(scenarioTypes('BB')).not.toContain('vs_3bet');
  });

  it('RFI entries carry no villain', () => {
    const rfi = legalScenarios('BTN').find((s) => s.scenario === 'RFI');
    expect(rfi?.villainPositions).toEqual([]);
  });
});

describe('isLegalScenario', () => {
  it('accepts a valid villainful combo', () => {
    expect(isLegalScenario('BTN', 'vs_RFI', 'CO')).toBe(true);
  });

  it('rejects an out-of-position raiser for vs_RFI', () => {
    expect(isLegalScenario('CO', 'vs_RFI', 'BTN')).toBe(false);
  });

  it('requires no villain for RFI', () => {
    expect(isLegalScenario('UTG', 'RFI')).toBe(true);
    expect(isLegalScenario('UTG', 'RFI', 'BB')).toBe(false);
  });

  it('rejects illegal scenario for a position', () => {
    expect(isLegalScenario('UTG', 'squeeze', 'HJ')).toBe(false);
  });
});
