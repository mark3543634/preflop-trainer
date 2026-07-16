import {
  migrateProviderItemsV1,
  migrateReviewItemsV1,
  migrateSettingsV1,
  migrateStatsV1,
  PUBLIC_DEFAULT_PROVIDER,
} from '../migrations';

describe('persistence schema v1 -> v2', () => {
  it('keeps valid public settings and adds the exam mistake cap', () => {
    expect(migrateSettingsV1({ rngMode: true, examMode: true, provider: 'greenline' })).toEqual({
      rngMode: true,
      examMode: true,
      examMistakeCap: 3,
      provider: 'greenline',
    });
  });

  it('moves removed private providers to the public default', () => {
    const migrated = migrateSettingsV1({ provider: 'texassolver' });
    expect(migrated.provider).toBe(PUBLIC_DEFAULT_PROVIDER);
  });

  it('adds provider identity to legacy presets without changing their fields', () => {
    const [preset] = migrateProviderItemsV1([{ id: 'p1', name: 'BTN RFI' }]);
    expect(preset).toEqual({ id: 'p1', name: 'BTN RFI', providerId: 'pekarstas' });
  });

  it('rebuilds legacy review ids so packs cannot collide', () => {
    const [item] = migrateReviewItemsV1([
      {
        id: 'old-id',
        nodeId: 'cash6max_100bb_BTN_RFI',
        hand: 'A5s',
        box: 1,
        dueDate: '2026-07-20',
        addedDate: '2026-07-16',
        lastVerdict: 'blunder',
        lastChosen: 'fold',
      },
    ]);
    expect(item.providerId).toBe('pekarstas');
    expect(item.id).toBe('pekarstas::cash6max_100bb_BTN_RFI::A5s');
  });

  it('rekeys legacy node stats by provider + node id', () => {
    const migrated = migrateStatsV1({
      perNode: {
        cash6max_100bb_BTN_RFI: {
          nodeId: 'cash6max_100bb_BTN_RFI',
          hands: 10,
          sumScore: 750,
          sumEvLoss: 0,
          evHands: 0,
          mistakes: 2,
        },
      },
      gtoHistory: [75],
      totalDecisions: 10,
      globalScoreSum: 750,
    });
    expect(migrated.perNode['pekarstas::cash6max_100bb_BTN_RFI']?.providerId).toBe(
      'pekarstas',
    );
  });
});
