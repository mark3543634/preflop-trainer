import { create } from 'zustand';
import { LegacyStorageKeys, readMigratedJSON, StorageKeys, writeJSON } from '../storage';
import { isPublicProvider, migrateSettingsV1, PUBLIC_DEFAULT_PROVIDER } from '../storage/migrations';
import type { ProviderId } from '../types';

interface Persisted {
  rngMode: boolean;
  examMode: boolean;
  examMistakeCap: number;
  provider: ProviderId;
}

export interface SettingsState extends Persisted {
  theme: 'dark';
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setRngMode: (value: boolean) => void;
  setExamMode: (value: boolean) => void;
  setExamMistakeCap: (value: number) => void;
  setProvider: (providerId: ProviderId) => void;
}

const DEFAULTS: Persisted = {
  rngMode: false,
  examMode: false,
  examMistakeCap: 3,
  provider: PUBLIC_DEFAULT_PROVIDER,
};

function normalize(value: Persisted): Persisted {
  return {
    rngMode: value.rngMode === true,
    examMode: value.examMode === true,
    examMistakeCap: Math.max(1, Math.min(10, Math.round(value.examMistakeCap || 3))),
    provider: isPublicProvider(value.provider) ? value.provider : PUBLIC_DEFAULT_PROVIDER,
  };
}

function persist(value: Persisted): void {
  void writeJSON(StorageKeys.settings, value);
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  theme: 'dark',
  hydrated: false,

  hydrate: async () => {
    const value = normalize(
      await readMigratedJSON(StorageKeys.settings, LegacyStorageKeys.settings, DEFAULTS, migrateSettingsV1),
    );
    set({ ...value, hydrated: true });
  },

  setRngMode: (rngMode) => {
    set({ rngMode });
    persist(snapshot(get()));
  },
  setExamMode: (examMode) => {
    set({ examMode });
    persist(snapshot(get()));
  },
  setExamMistakeCap: (value) => {
    const examMistakeCap = Math.max(1, Math.min(10, Math.round(value)));
    set({ examMistakeCap });
    persist(snapshot(get()));
  },
  setProvider: (provider) => {
    set({ provider });
    persist(snapshot(get()));
  },
}));

function snapshot(state: SettingsState): Persisted {
  return {
    rngMode: state.rngMode,
    examMode: state.examMode,
    examMistakeCap: state.examMistakeCap,
    provider: state.provider,
  };
}
