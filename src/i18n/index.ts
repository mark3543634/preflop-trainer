import { ru } from './ru';

export type TranslationKey = keyof typeof ru;

/** MVP language is Russian. English strings live separately for a future toggle. */
export function t(key: TranslationKey): string {
  return ru[key];
}
