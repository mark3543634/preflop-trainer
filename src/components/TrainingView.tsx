// =============================================================================
// TrainingView — the shared training surface. Reads the session store, renders
// the felt table / hole cards / selectable actions, and the feedback overlay.
// Fires onComplete(summary) once the session finishes.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../store/sessionStore';
import { useSettings } from '../store/settingsStore';
import type { Action, SessionSummary } from '../types';
import { colors, glow, radius, spacing } from '../theme';
import { AppText, Screen } from './primitives';
import { Table } from './Table';
import { HoleCards } from './HoleCards';
import { ActionButtons } from './ActionButtons';
import { FeedbackOverlay } from './FeedbackOverlay';
import { actionLabel, spotTitle, villainBadgeFor } from './labels';

export function TrainingView({
  onComplete,
  feedbackNextLabel,
}: {
  onComplete: (summary: SessionSummary) => void;
  feedbackNextLabel?: string;
}) {
  const session = useSession((s) => s.session);
  const showFeedback = useSession((s) => s.showFeedback);
  const lastResult = useSession((s) => s.lastResult);
  const finished = useSession((s) => s.finished);
  const summary = useSession((s) => s.summary);
  const submit = useSession((s) => s.submit);
  const next = useSession((s) => s.next);
  const rngMode = useSettings((s) => s.rngMode);
  const meta = useSession((s) => s.meta);
  const examMistakes = useSession((s) => s.examMistakes);

  const [selected, setSelected] = useState<Action | null>(null);

  const firedRef = useRef(false);
  useEffect(() => {
    if (finished && summary && !firedRef.current) {
      firedRef.current = true;
      onComplete(summary);
    }
  }, [finished, summary, onComplete]);

  if (!session) {
    return (
      <Screen style={styles.center}>
        <AppText color={colors.muted}>Нет активной сессии.</AppText>
      </Screen>
    );
  }
  if (finished) {
    return <Screen style={styles.center} />;
  }

  const feedbackNode = lastResult ? session.nodeFor(lastResult.providerId, lastResult.nodeId) : undefined;
  const liveNode = session.currentNode();
  const liveHand = session.current()?.hand;
  const displayNode = showFeedback && feedbackNode ? feedbackNode : liveNode;
  const displayHand = showFeedback && lastResult ? lastResult.hand : liveHand;

  if (!displayNode || !displayHand) {
    return (
      <Screen style={styles.center}>
        <AppText color={colors.muted}>Данные спота недоступны.</AppText>
      </Screen>
    );
  }

  const total = session.length;
  const handNo = Math.min(session.position + (showFeedback ? 0 : 1), total);
  const liveScore = session.runningGtoScore();
  const villainBadge = villainBadgeFor(displayNode.scenario);
  const advance = () => {
    setSelected(null);
    next();
  };

  return (
    <Screen>
      {/* top-right info cluster */}
      <View style={styles.topBar}>
        <AppText variant="caption" color={colors.muted} style={{ flex: 1 }}>
          {spotTitle(displayNode.hero, displayNode.scenario, displayNode.villainPosition)}
        </AppText>
        {rngMode ? (
          <View style={styles.rngChip}>
            <Ionicons name="dice-outline" size={13} color={colors.gold} />
            <AppText variant="caption" color={colors.gold} weight="bold">
              RNG
            </AppText>
          </View>
        ) : null}
        {meta?.examMode ? (
          <View style={[styles.rngChip, { borderColor: colors.danger }]}>
            <Ionicons name="warning-outline" size={13} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} weight="bold">
              {examMistakes}/{meta.examMistakeCap ?? 3}
            </AppText>
          </View>
        ) : null}
        <View style={styles.infoChip}>
          <View>
            <AppText variant="caption" color={colors.muted}>
              Рука
            </AppText>
            <AppText weight="bold">
              {handNo} / {total}
            </AppText>
          </View>
          <View style={styles.infoDivider} />
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="caption" color={colors.muted}>
              GTO сейчас
            </AppText>
            <AppText weight="black" color={colors.primary} style={{ fontSize: 20 }}>
              {liveScore}
            </AppText>
          </View>
        </View>
      </View>

      {/* felt + hole cards */}
      <View style={styles.tableWrap}>
        <Table
          mode="play"
          hero={displayNode.hero}
          villainPosition={displayNode.villainPosition}
          villainBadge={villainBadge}
          potLabel={displayNode.sizing.potBB === undefined ? 'Pot —' : `Pot ${displayNode.sizing.potBB}bb`}
          stackBB={displayNode.stackBB}
          width={330}
          height={250}
        />
        <View style={styles.cardsOverlay} pointerEvents="none">
          <HoleCards hand={displayHand} size={58} />
        </View>
      </View>

      {/* controls */}
      <View style={styles.controls}>
        <ActionButtons
          actions={displayNode.actions}
          selected={selected}
          onSelect={setSelected}
          disabled={showFeedback}
        />
        <Pressable
          disabled={showFeedback || !selected}
          onPress={() => selected && submit(selected)}
          style={({ pressed }) => [
            styles.confirm,
            {
              backgroundColor: selected ? colors.primary : colors.surface,
              opacity: showFeedback ? 0.5 : pressed ? 0.85 : 1,
            },
            selected ? glow(colors.primary, 16, 0.35) : null,
          ]}
        >
          <AppText weight="black" color={selected ? colors.bg : colors.muted} style={{ fontSize: 18, letterSpacing: 0.5 }}>
            {selected ? actionLabel(selected).toUpperCase() : 'ВЫБЕРИТЕ ДЕЙСТВИЕ'}
          </AppText>
        </Pressable>
      </View>

      {showFeedback && lastResult && feedbackNode ? (
        <FeedbackOverlay
          node={feedbackNode}
          result={lastResult}
          rngMode={rngMode}
          onNext={advance}
          nextLabel={feedbackNextLabel}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  rngChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  infoDivider: { width: 1, height: 28, backgroundColor: colors.border },
  tableWrap: { marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  cardsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  controls: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    gap: spacing.md,
  },
  confirm: {
    borderRadius: radius.button,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
