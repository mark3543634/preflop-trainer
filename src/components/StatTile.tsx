// =============================================================================
// StatTile — a labeled numeric tile with big bold numerals (scores / EV / etc).
// =============================================================================
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight, radius, spacing } from '../theme';

export function StatTile({
  label,
  value,
  color = colors.text,
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 26,
    fontWeight: fontWeight.black,
  },
  sub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
});
