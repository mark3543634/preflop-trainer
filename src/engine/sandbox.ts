// =============================================================================
// sandbox.ts — pure availability/resolution logic for the Sandbox builder.
//
// This module never invents strategy. It only intersects the legal scenario
// matrix with the RangeNodes that are actually present in a selected pack.
// The UI and session launcher use these same functions so an unavailable spot
// can never look playable or be silently skipped from a position mix.
// =============================================================================
import { legalScenarios, isLegalScenario } from './scenarios';
import { POSITIONS, type GameFormat, type Position, type RangeNode, type ScenarioType } from '../types';

export interface SandboxScope {
  format: GameFormat;
  stackBB: number;
  hero: Position;
}

export interface SandboxSelection extends SandboxScope {
  mode: 'single' | 'mix';
  scenario?: ScenarioType;
  villainPosition?: Position;
}

export interface ScenarioAvailability {
  scenario: ScenarioType;
  legalVillainPositions: Position[];
  availableVillainPositions: Position[];
  availableNodeCount: number;
  legalNodeCount: number;
  available: boolean;
}

/** A legal spot that has no RangeNode in the selected pack/table. */
export interface MissingSandboxSpot {
  hero: Position;
  scenario: ScenarioType;
  villainPosition?: Position;
}

function uniqueNodes(nodes: RangeNode[]): RangeNode[] {
  return [...new Map(nodes.map((node) => [node.id, node])).values()];
}

/** All shipped, legal nodes in one table/stack/position scope. */
export function sandboxNodesInScope(nodes: RangeNode[], scope: SandboxScope): RangeNode[] {
  return uniqueNodes(
    nodes.filter(
      (node) =>
        node.format === scope.format &&
        node.stackBB === scope.stackBB &&
        node.hero === scope.hero &&
        isLegalScenario(node.hero, node.scenario, node.villainPosition),
    ),
  );
}

/** Positions that have at least one trainable node for the selected table. */
export function availableSandboxPositions(
  nodes: RangeNode[],
  format: GameFormat,
  stackBB: number,
): Position[] {
  const positions = new Set(
    nodes
      .filter(
        (node) =>
          node.format === format &&
          node.stackBB === stackBB &&
          isLegalScenario(node.hero, node.scenario, node.villainPosition),
      )
      .map((node) => node.hero),
  );
  return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].filter((position): position is Position =>
    positions.has(position as Position),
  );
}

/** Legal scenarios annotated with exact coverage in the selected range pack. */
export function sandboxScenarioAvailability(
  nodes: RangeNode[],
  scope: SandboxScope,
): ScenarioAvailability[] {
  const scoped = sandboxNodesInScope(nodes, scope);

  return legalScenarios(scope.hero).map((legal) => {
    const matching = scoped.filter((node) => node.scenario === legal.scenario);
    const availableVillainPositions = legal.villainPositions.filter((position) =>
      matching.some((node) => node.villainPosition === position),
    );
    const legalNodeCount = legal.villainPositions.length || 1;
    const availableNodeCount =
      legal.villainPositions.length === 0
        ? Number(matching.some((node) => node.villainPosition === undefined))
        : availableVillainPositions.length;

    return {
      scenario: legal.scenario,
      legalVillainPositions: legal.villainPositions,
      availableVillainPositions,
      availableNodeCount,
      legalNodeCount,
      available: availableNodeCount > 0,
    };
  });
}

/**
 * Resolve the exact nodes that will be drilled. Mix mode returns every shipped
 * legal node in the position scope; single mode returns only the exact story.
 */
export function resolveSandboxNodes(nodes: RangeNode[], selection: SandboxSelection): RangeNode[] {
  const scoped = sandboxNodesInScope(nodes, selection);
  if (selection.mode === 'mix') return scoped;
  if (!selection.scenario) return [];

  return scoped.filter(
    (node) =>
      node.scenario === selection.scenario && node.villainPosition === selection.villainPosition,
  );
}

/** Honest coverage text can be derived from these two counts. */
export function sandboxCoverage(
  nodes: RangeNode[],
  scope: SandboxScope,
): { available: number; legal: number } {
  const legal = legalScenarios(scope.hero).reduce(
    (total, scenario) => total + (scenario.villainPositions.length || 1),
    0,
  );
  return { available: sandboxNodesInScope(nodes, scope).length, legal };
}

/**
 * Enumerate every legal-but-missing node for a format and stack. This is the
 * canonical coverage audit used by tests and import tooling; it never infers
 * or fabricates strategy for a missing spot.
 */
export function missingSandboxSpots(
  nodes: RangeNode[],
  format: GameFormat,
  stackBB: number,
): MissingSandboxSpot[] {
  const missing: MissingSandboxSpot[] = [];

  for (const hero of POSITIONS) {
    for (const legal of legalScenarios(hero)) {
      const villainPositions: (Position | undefined)[] = legal.villainPositions.length
        ? legal.villainPositions
        : [undefined];

      for (const villainPosition of villainPositions) {
        const exists = nodes.some(
          (node) =>
            node.format === format &&
            node.stackBB === stackBB &&
            node.hero === hero &&
            node.scenario === legal.scenario &&
            node.villainPosition === villainPosition,
        );

        if (!exists) {
          missing.push({
            hero,
            scenario: legal.scenario,
            ...(villainPosition === undefined ? {} : { villainPosition }),
          });
        }
      }
    }
  }

  return missing;
}
