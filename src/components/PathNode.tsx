// =============================================================================
// PathNode — a single lesson node in the Learn path (Duolingo-style).
// =============================================================================
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight, radius } from '../theme';
import type { MasteryTier } from '../engine/progression';

export type PathNodeState = 'locked' | 'available' | 'current' | 'completed';

const TIER_LABEL: Record<MasteryTier, string> = {
  none: '',
  learned: '★',
  practiced: '★★',
  mastered: '★★★',
};

export function PathNode({
  title,
  subtitle,
  state,
  tier = 'none',
  comingSoon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  state: PathNodeState;
  tier?: MasteryTier;
  comingSoon?: boolean;
  onPress?: () => void;
}) {
  const locked = state === 'locked' || comingSoon;
  const ringColor =
    state === 'completed' ? colors.primary : state === 'current' ? colors.gold : colors.border;
  const icon = comingSoon ? '🚧' : state === 'completed' ? '✓' : state === 'locked' ? '🔒' : '▶';

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={({ pressed }) => [styles.row, { opacity: locked ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.badge, { borderColor: ringColor }]}>
        <Text style={[styles.icon, { color: ringColor }]}>{icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {comingSoon ? (
          <Text style={styles.coming}>Скоро — ожидаются лицензированные данные</Text>
        ) : subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {tier !== 'none' ? <Text style={styles.tier}>{TIER_LABEL[tier]}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 3,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  coming: {
    color: colors.gold,
    fontSize: 12,
    marginTop: 2,
  },
  tier: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
});
