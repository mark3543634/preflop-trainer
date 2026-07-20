// =============================================================================
// TrainingView — the shared training surface. Reads the session store, renders
// the felt table / hole cards / selectable actions, and the feedback overlay.
// Fires onComplete(summary) once the session finishes.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { actionLabel, spotTitle } from './labels';
import { tableActionBadges } from './tableStory';

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

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

  const feedbackNode = lastResult
    ? session.nodeFor(lastResult.providerId, lastResult.nodeId)
    : undefined;
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
  const instantSandboxDecision = meta?.origin === 'sandbox';
  const rngAvailable = rngMode && displayNode.frequencyBasis === 'solver_frequency';
  const handNo = Math.min(session.position + (showFeedback ? 0 : 1), total);
  const liveScore = session.runningGtoScore();
  const actionBadges = tableActionBadges(
    displayNode,
    showFeedback ? lastResult?.chosen : undefined,
  );
  const wideLayout = windowWidth >= 900 && windowHeight >= 650;
  const tableWidth = wideLayout
    ? Math.round(Math.min(620, Math.max(480, windowHeight * 0.72, windowWidth * 0.34)))
    : Math.round(Math.min(370, Math.max(280, windowWidth - spacing.xl * 2)));
  const tableHeight = Math.round(tableWidth * 0.68);
  const holeCardSize = Math.round(
    wideLayout
      ? Math.min(58, Math.max(48, tableWidth * 0.095))
      : Math.min(44, Math.max(35, tableWidth * 0.12)),
  );
  const progress = total === 0 ? 0 : Math.min(100, (session.position / total) * 100);
  const advance = () => {
    setSelected(null);
    next();
  };
  const chooseAction = (action: Action) => {
    setSelected(action);
    if (instantSandboxDecision) submit(action);
  };

  return (
    <Screen>
      <View style={[styles.workspace, wideLayout ? styles.workspaceWide : null]}>
        <View style={styles.topBar}>
          <View style={styles.spotBlock}>
            <AppText variant="caption" color={colors.muted} weight="bold">
              ТЕКУЩИЙ СПОТ
            </AppText>
            <AppText variant="title" weight="black" numberOfLines={1}>
              {spotTitle(displayNode.hero, displayNode.scenario, displayNode.villainPosition)}
            </AppText>
          </View>
          {rngAvailable ? (
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
                По чарту
              </AppText>
              <AppText weight="black" color={colors.primary} style={{ fontSize: 20 }}>
                {liveScore}
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* felt + hole cards */}
        <View style={[styles.tableArea, wideLayout ? styles.tableAreaWide : null]}>
          <View style={styles.tableWrap}>
            <Table
              mode="play"
              hero={displayNode.hero}
              villainPosition={displayNode.villainPosition}
              actionBadges={actionBadges}
              potLabel={
                displayNode.sizing.potBB === undefined
                  ? 'Банк —'
                  : `Банк ${displayNode.sizing.potBB}bb`
              }
              stackBB={displayNode.stackBB}
              width={tableWidth}
              height={tableHeight}
            />
            <View
              style={[styles.cardsOverlay, { marginTop: tableHeight * 0.22 }]}
              pointerEvents="none"
            >
              <HoleCards hand={displayHand} size={holeCardSize} />
            </View>
          </View>
        </View>

        {/* controls */}
        <View style={[styles.controls, wideLayout ? styles.controlsWide : null]}>
          <AppText variant="caption" color={colors.muted} weight="bold" center>
            ВАШЕ РЕШЕНИЕ
          </AppText>
          <ActionButtons
            actions={displayNode.actions}
            selected={selected}
            onSelect={chooseAction}
            disabled={showFeedback}
          />
          {!instantSandboxDecision ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                selected ? `Подтвердить: ${actionLabel(selected)}` : 'Выберите действие'
              }
              accessibilityState={{ disabled: showFeedback || !selected }}
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
              <AppText
                weight="black"
                color={selected ? colors.bg : colors.muted}
                style={{ fontSize: 18, letterSpacing: 0.5 }}
              >
                {selected ? actionLabel(selected).toUpperCase() : 'ВЫБЕРИТЕ ДЕЙСТВИЕ'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {showFeedback && lastResult && feedbackNode ? (
        <FeedbackOverlay
          node={feedbackNode}
          result={lastResult}
          rngMode={rngAvailable}
          onNext={advance}
          autoOpenRange={instantSandboxDecision}
          nextLabel={feedbackNextLabel}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  workspace: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  workspaceWide: {
    maxWidth: 1120,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  spotBlock: { flex: 1, minWidth: 0, gap: 2 },
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
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  tableArea: {
    flex: 1,
    minHeight: 270,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  tableAreaWide: {
    width: '100%',
    maxWidth: 920,
    minHeight: 450,
    alignSelf: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  tableWrap: { alignItems: 'center', justifyContent: 'center' },
  cardsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  controlsWide: {
    maxWidth: 760,
    paddingTop: spacing.lg,
    paddingBottom: 0,
  },
  confirm: {
    borderRadius: radius.button,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
