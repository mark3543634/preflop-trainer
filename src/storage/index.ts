// =============================================================================
// storage/index.ts — typed AsyncStorage wrapper with schema versioning.
// Components/stores NEVER call AsyncStorage directly; they go through here.
// =============================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bump when a persisted shape changes incompatibly; migrate in migrate().
export const SCHEMA_VERSION = 2;

// All persisted keys live under one namespace prefix.
const PREFIX = `pft.v${SCHEMA_VERSION}.`;
const LEGACY_PREFIX = 'pft.v1.';

export const StorageKeys = {
  settings: `${PREFIX}settings`,
  progress: `${PREFIX}progress`,
  stats: `${PREFIX}stats`,
  presets: `${PREFIX}presets`,
  review: `${PREFIX}review`,
} as const;

export const LegacyStorageKeys = {
  settings: `${LEGACY_PREFIX}settings`,
  progress: `${LEGACY_PREFIX}progress`,
  stats: `${LEGACY_PREFIX}stats`,
  presets: `${LEGACY_PREFIX}presets`,
  review: `${LEGACY_PREFIX}review`,
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
export type LegacyStorageKey = (typeof LegacyStorageKeys)[keyof typeof LegacyStorageKeys];

export async function readOptionalJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/** Read a JSON value, returning `fallback` if missing or corrupt. */
export async function readJSON<T>(key: StorageKey, fallback: T): Promise<T> {
  return (await readOptionalJSON<T>(key)) ?? fallback;
}

/** Read v2 data, or migrate the corresponding v1 entry exactly once. */
export async function readMigratedJSON<T, Legacy>(
  key: StorageKey,
  legacyKey: LegacyStorageKey,
  fallback: T,
  migrate: (legacy: Legacy) => T,
): Promise<T> {
  const current = await readOptionalJSON<T>(key);
  if (current !== null) return current;
  const legacy = await readOptionalJSON<Legacy>(legacyKey);
  const value = legacy === null ? fallback : migrate(legacy);
  await writeJSON(key, value);
  return value;
}

/** Write a JSON value. Swallows errors (persistence is best-effort offline). */
export async function writeJSON<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore write failures (e.g. quota) — in-memory state remains source of truth.
  }
}

/** Delete persisted values left by versions that had gamification. */
export async function clearRetiredGamification(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([StorageKeys.progress, LegacyStorageKeys.progress]);
  } catch {
    // Best-effort cleanup; no retired values are read by the application.
  }
}

/** Remove every key this app owns (used by "reset progress"). */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      ...Object.values(StorageKeys),
      ...Object.values(LegacyStorageKeys),
    ]);
  } catch {
    // ignore
  }
}
