// =============================================================================
// presetsStore — user-saved sandbox spots (named). Persisted.
// =============================================================================
import { create } from 'zustand';
import { LegacyStorageKeys, readMigratedJSON, writeJSON, StorageKeys } from '../storage';
import { migrateProviderItemsV1 } from '../storage/migrations';
import type { GameFormat, Position, ProviderId, ScenarioType } from '../types';

export interface Preset {
  id: string; // uuid-ish (timestamp + rand)
  name: string;
  providerId: ProviderId;
  format: GameFormat;
  stackBB: number;
  hero: Position;
  scenario: ScenarioType;
  villainPosition?: Position;
  mix: boolean; // false = single node, true = whole-position mix
  length: number; // drill length
}

interface Persisted {
  presets: Preset[];
}

export interface PresetsState extends Persisted {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addPreset: (p: Omit<Preset, 'id'>) => Preset;
  removePreset: (id: string) => void;
  resetAll: () => void;
}

const DEFAULTS: Persisted = { presets: [] };

function persist(s: Persisted): void {
  void writeJSON<Persisted>(StorageKeys.presets, s);
}

function makeId(): string {
  return `${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export const usePresets = create<PresetsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const p = await readMigratedJSON<Persisted, { presets?: Omit<Preset, 'providerId'>[] }>(
      StorageKeys.presets,
      LegacyStorageKeys.presets,
      DEFAULTS,
      (legacy) => ({ presets: migrateProviderItemsV1(legacy.presets) }),
    );
    set({ presets: p.presets, hydrated: true });
  },

  addPreset: (p) => {
    const preset: Preset = { ...p, id: makeId() };
    const presets = [preset, ...get().presets];
    set({ presets });
    persist({ presets });
    return preset;
  },

  removePreset: (id) => {
    const presets = get().presets.filter((x) => x.id !== id);
    set({ presets });
    persist({ presets });
  },

  resetAll: () => {
    set({ ...DEFAULTS });
    persist(DEFAULTS);
  },
}));
