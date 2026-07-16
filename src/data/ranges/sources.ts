import type { ProviderId, RangeSource } from '../../types';

/**
 * Public range-source manifest. A provider is included in release builds only
 * when redistribution is explicitly allowed by its upstream license.
 */
export const RANGE_SOURCES: Record<ProviderId, RangeSource> = {
  pekarstas: {
    id: 'pekarstas',
    title: 'Pekarstas (GG community charts)',
    license: 'MIT',
    sourceUrl: 'https://github.com/AHTOOOXA/poker-charts',
    sourceRevision: 'c7192b3bda783d4a0f12f37a6f9876daaf25151c',
    publicDistributionAllowed: true,
    format: 'cash_6max',
    stackBB: 100,
    openSizeLabel: 'не указан в источнике',
    rakeLabel: 'не указан в источнике',
    importedAt: '2026-07-16',
  },
  greenline: {
    id: 'greenline',
    title: 'Greenline community charts',
    license: 'MIT',
    sourceUrl: 'https://github.com/AHTOOOXA/poker-charts',
    sourceRevision: 'c7192b3bda783d4a0f12f37a6f9876daaf25151c',
    publicDistributionAllowed: true,
    format: 'cash_6max',
    stackBB: 100,
    openSizeLabel: 'зависит от чарта; не закодирован в данных',
    rakeLabel: 'не указан в источнике',
    importedAt: '2026-07-16',
  },
};

export function rangeSource(providerId: ProviderId): RangeSource {
  return RANGE_SOURCES[providerId];
}
