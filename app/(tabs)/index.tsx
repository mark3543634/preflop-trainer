// Learn tab: the curriculum path with streak / XP / GTO header and unlock gating.
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CURRICULUM, lessonAvailable, orderedLessons } from '../../src/data/curriculum';
import { PathNode, type PathNodeState } from '../../src/components/PathNode';
import { AppText, Card } from '../../src/components/primitives';
import { colors, radius, spacing } from '../../src/theme';
import { useProgress } from '../../src/store/progressStore';
import { useStats } from '../../src/store/statsStore';
import { useReview } from '../../src/store/reviewStore';
import { useSettings } from '../../src/store/settingsStore';
import { PROVIDERS } from '../../src/data/ranges';

export default function LearnScreen() {
  const router = useRouter();
  const lessons = useProgress((s) => s.lessons);
  const currentStreak = useProgress((s) => s.currentStreak);
  const xp = useProgress((s) => s.xp);
  const level = useProgress((s) => s.level());
  const globalScore = useStats((s) => s.globalGtoScore());
  const dueCount = useReview((s) => s.dueCount());
  const provider = useSettings((s) => s.provider);
  const providerLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? provider;

  const ordered = orderedLessons();

  // A lesson unlocks once the previous one in global order is completed.
  function stateFor(lessonId: string): PathNodeState {
    const idx = ordered.findIndex((x) => x.lesson.id === lessonId);
    const prog = lessons[lessonId];
    if (prog?.completed) return 'completed';
    if (idx === 0) return 'current';
    const prev = ordered[idx - 1];
    const prevDone = lessons[prev.lesson.id]?.completed;
    if (!prevDone) return 'locked';
    return 'current';
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* progress header */}
      <Card style={styles.header}>
        <View style={styles.headerRow}>
          <HeaderStat label="🔥 Серия" value={`${currentStreak}`} />
          <HeaderStat label="GTO" value={`${globalScore}`} color={colors.primary} />
          <HeaderStat label={`Ур. ${level.level}`} value={`${xp} XP`} color={colors.gold} />
        </View>
        <View style={styles.xpBarTrack}>
          <View style={[styles.xpBarFill, { width: `${Math.round(level.progress * 100)}%` }]} />
        </View>
        <AppText variant="caption" color={colors.muted}>
          Набор: {providerLabel} · изменить можно во вкладке «Тренировка»
        </AppText>
      </Card>

      {dueCount > 0 ? (
        <Pressable onPress={() => router.push('/review')}>
          <Card style={styles.reviewBanner}>
            <AppText weight="bold" color={colors.bg}>
              🔁 Ошибок к повторению: {dueCount}
            </AppText>
            <AppText variant="caption" color={colors.bg}>
              Нажмите, чтобы повторить сейчас
            </AppText>
          </Card>
        </Pressable>
      ) : null}

      {CURRICULUM.map((unit) => (
        <View key={unit.id} style={styles.unit}>
          <AppText variant="title" weight="bold">
            {unit.title}
          </AppText>
          <AppText variant="caption" color={colors.muted} style={{ marginBottom: spacing.sm }}>
            {unit.description}
          </AppText>
          <Card>
            {unit.lessons.map((lesson, i) => {
              const available = lessonAvailable(lesson, provider);
              const prog = lessons[lesson.id];
              return (
                <View key={lesson.id}>
                  {i > 0 ? <View style={styles.sep} /> : null}
                  <PathNode
                    title={lesson.title}
                    subtitle={lesson.subtitle}
                    state={stateFor(lesson.id)}
                    tier={prog?.tier ?? 'none'}
                    comingSoon={!available}
                    onPress={() => router.push(`/lesson/${lesson.id}`)}
                  />
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

function HeaderStat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.headerStat}>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      <AppText weight="black" color={color} style={{ fontSize: 22 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  headerStat: { alignItems: 'center', flex: 1 },
  xpBarTrack: {
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  xpBarFill: { height: 8, backgroundColor: colors.gold },
  reviewBanner: { backgroundColor: colors.primary, gap: 2 },
  unit: { gap: 2 },
  sep: { height: 1, backgroundColor: colors.border },
});
