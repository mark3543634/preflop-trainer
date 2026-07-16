// =============================================================================
// ActionButtons — legal-action chips from node.actions. The parent decides
// whether a tap submits instantly (Sandbox) or needs confirmation (lessons).
// =============================================================================
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Action } from '../types';
import { colors, fontWeight, radius } from '../theme';
import { actionLabel } from './labels';

export function ActionButtons({
  actions,
  selected,
  onSelect,
  disabled,
}: {
  actions: Action[];
  selected?: Action | null;
  onSelect: (a: Action) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {actions.map((action) => {
        const isSel = selected === action;
        return (
          <Pressable
            key={action}
            accessibilityRole="button"
            accessibilityLabel={actionLabel(action)}
            accessibilityState={{ selected: isSel, disabled }}
            disabled={disabled}
            onPress={() => onSelect(action)}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: isSel ? colors.primary : colors.surface,
                borderColor: isSel ? colors.primary : colors.border,
                opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.label, { color: isSel ? colors.bg : colors.text }]}>
              {actionLabel(action).toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
});
