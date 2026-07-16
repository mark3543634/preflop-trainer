// =============================================================================
// labels.ts — display strings for actions/scenarios. Pure, no UI.
// =============================================================================
import type { Action, ScenarioType, Verdict } from '../types';
import { t } from '../i18n';

export function actionLabel(action: Action): string {
  switch (action) {
    case 'fold':
      return t('action.fold');
    case 'call':
      return t('action.call');
    case 'raise':
      return t('action.raise');
    case '3bet':
      return t('action.3bet');
    case '4bet':
      return t('action.4bet');
    case '5bet':
      return t('action.5bet');
  }
}

export function scenarioLabel(scenario: ScenarioType): string {
  switch (scenario) {
    case 'RFI':
      return t('scenario.RFI');
    case 'vs_RFI':
      return t('scenario.vs_RFI');
    case 'vs_3bet':
      return t('scenario.vs_3bet');
    case 'vs_4bet':
      return t('scenario.vs_4bet');
    case 'squeeze':
      return t('scenario.squeeze');
    case 'blind_defense':
      return t('scenario.blind_defense');
  }
}

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case 'best':
      return t('verdict.best');
    case 'correct':
      return t('verdict.correct');
    case 'inaccuracy':
      return t('verdict.inaccuracy');
    case 'blunder':
      return t('verdict.blunder');
  }
}

/** The action the villain has taken that hero is responding to (for the badge). */
export function villainBadgeFor(scenario: ScenarioType): string | undefined {
  switch (scenario) {
    case 'RFI':
      return undefined; // folded to hero, no villain action
    case 'vs_RFI':
    case 'blind_defense':
    case 'squeeze':
      return 'RAISE';
    case 'vs_3bet':
      return '3-BET';
    case 'vs_4bet':
      return '4-BET';
  }
}

/** Short human title for a spot, e.g. "BTN · Open" or "BB vs BTN · Blind Defense". */
export function spotTitle(hero: string, scenario: ScenarioType, villainPosition?: string): string {
  if (villainPosition) return `${hero} vs ${villainPosition} · ${scenarioLabel(scenario)}`;
  return `${hero} · ${scenarioLabel(scenario)}`;
}
