// Profile tab: streak / XP / level, the (MOCK) league, and settings.
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProgress } from '../../src/store/progressStore';
import { useStats } from '../../src/store/statsStore';
import { useSettings } from '../../src/store/settingsStore';
import { usePresets } from '../../src/store/presetsStore';
import { useReview } from '../../src/store/reviewStore';
import { rankedLeague, LEAGUE_NAME } from '../../src/data/mockLeague';
import { allCombinedNodes } from '../../src/data/ranges';
import { AppText, Button, Card } from '../../src/components/primitives';
import { StatTile } from '../../src/components/StatTile';
import { colors, radius, spacing } from '../../src/theme';
import { levelFromXp } from '../../src/engine/progression';

export default function ProfileScreen() {
  const xp = useProgress((s) => s.xp);
  const level = levelFromXp(xp);
  const currentStreak = useProgress((s) => s.currentStreak);
  const globalScore = useStats((s) => s.globalGtoScore());

  const rngMode = useSettings((s) => s.rngMode);
  const examMode = useSettings((s) => s.examMode);
  const setRngMode = useSettings((s) => s.setRngMode);
  const setExamMode = useSettings((s) => s.setExamMode);
  const examMistakeCap = useSettings((s) => s.examMistakeCap);
  const setExamMistakeCap = useSettings((s) => s.setExamMistakeCap);
  const [leagueExpanded, setLeagueExpanded] = useState(false);

  const league = rankedLeague(xp);
  const rngSupported = allCombinedNodes().every(
    (node) => node.frequencyBasis === 'solver_frequency',
  );
  const you = league.find((item) => item.isYou);
  const leaguePreview = leagueExpanded
    ? league
    : [
        ...league.slice(0, 3),
        ...(you && !league.slice(0, 3).some((item) => item.id === you.id) ? [you] : []),
      ];

  function resetProgress() {
    Alert.alert(
      'Сбросить прогресс?',
      'Будут удалены XP, серия, уроки, статистика, пресеты и очередь повторения.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: () => {
            useProgress.getState().resetAll();
            useStats.getState().resetAll();
            usePresets.getState().resetAll();
            useReview.getState().resetAll();
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.tiles}>
        <StatTile label="🔥 Серия" value={`${currentStreak}`} />
        <StatTile label="Уровень" value={`${level.level}`} color={colors.gold} sub={`${xp} XP`} />
        <StatTile label="По чарту" value={`${globalScore}`} color={colors.primary} />
      </View>

      <Card style={{ gap: spacing.sm }}>
        <AppText variant="caption" color={colors.muted}>
          Уровень {level.level} · {level.xpIntoLevel}/{level.xpForNextLevel} XP до следующего
        </AppText>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${Math.round(level.progress * 100)}%` }]} />
        </View>
      </Card>

      {/* Settings */}
      <AppText variant="title" weight="bold">
        Настройки
      </AppText>
      <Card style={{ gap: spacing.lg }}>
        <SettingRow
          title="RNG-режим"
          subtitle={
            rngSupported
              ? 'Показывает действие случайного ролла, но не меняет оценку ответа.'
              : 'Недоступно: в основной библиотеке нет подтверждённых solver-frequency.'
          }
          value={rngSupported && rngMode}
          onChange={setRngMode}
          disabled={!rngSupported}
        />
        <SettingRow
          title="Экзамен"
          subtitle={`Сессия завершится после ${examMistakeCap} ошибок.`}
          value={examMode}
          onChange={setExamMode}
        />
        {examMode ? (
          <View style={styles.capRow}>
            <AppText variant="caption" color={colors.muted}>
              Лимит ошибок
            </AppText>
            {[1, 3, 5].map((cap) => (
              <Pressable
                key={cap}
                onPress={() => setExamMistakeCap(cap)}
                style={[styles.chip, cap === examMistakeCap ? styles.chipSelected : null]}
              >
                <AppText weight="bold" color={cap === examMistakeCap ? colors.bg : colors.text}>
                  {cap}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">Диапазоны</AppText>
            <AppText variant="caption" color={colors.muted}>
              Единая библиотека · {allCombinedNodes().length} доступных спотов.
            </AppText>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">Тема</AppText>
            <AppText variant="caption" color={colors.muted}>
              Тёмная тема по умолчанию.
            </AppText>
          </View>
          <AppText color={colors.muted}>Тёмная</AppText>
        </View>
      </Card>

      <Button label="Сбросить прогресс" variant="danger" onPress={resetProgress} />

      {/* MOCK league: intentionally secondary to useful settings. */}
      <View>
        <View style={styles.leagueHead}>
          <View>
            <AppText variant="title" weight="bold">
              🏆 {LEAGUE_NAME}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              Локальная демонстрация · не онлайн-рейтинг
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              leagueExpanded ? 'Свернуть таблицу лиги' : 'Показать всю таблицу лиги'
            }
            onPress={() => setLeagueExpanded((value) => !value)}
            style={styles.leagueToggle}
          >
            <AppText variant="caption" weight="bold" color={colors.primary}>
              {leagueExpanded ? 'Свернуть' : 'Все места'}
            </AppText>
          </Pressable>
        </View>
        <Card>
          {leaguePreview.map((u, i) => {
            const rank = league.findIndex((item) => item.id === u.id) + 1;
            return (
              <View
                key={u.id}
                style={[
                  styles.leagueRow,
                  i > 0 ? styles.leagueSep : null,
                  u.isYou ? styles.leagueYou : null,
                ]}
              >
                <AppText
                  weight="bold"
                  color={u.isYou ? colors.primary : colors.muted}
                  style={styles.rank}
                >
                  {rank}
                </AppText>
                <AppText
                  style={{ flex: 1 }}
                  color={u.isYou ? colors.primary : colors.text}
                  weight={u.isYou ? 'bold' : 'regular'}
                >
                  {u.name}
                </AppText>
                <AppText color={colors.muted}>{u.xp} XP</AppText>
              </View>
            );
          })}
        </Card>
      </View>

      <AppText variant="caption" color={colors.muted} center style={{ marginTop: spacing.sm }}>
        100% офлайн · бесплатно · только префлоп. Стратегия загружается из лицензированных
        MIT-наборов.
      </AppText>
    </ScrollView>
  );
}

function SettingRow({
  title,
  subtitle,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <AppText weight="semibold">{title}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {subtitle}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityState={{ disabled }}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  xpTrack: { height: 8, backgroundColor: colors.bg, borderRadius: radius.pill, overflow: 'hidden' },
  xpFill: { height: 8, backgroundColor: colors.gold },
  leagueHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  leagueToggle: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  leagueSep: { borderTopWidth: 1, borderTopColor: colors.border },
  leagueYou: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.button,
    paddingHorizontal: spacing.sm,
  },
  rank: { width: 22, textAlign: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  capRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
