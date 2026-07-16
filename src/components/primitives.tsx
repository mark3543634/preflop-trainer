// =============================================================================
// primitives.tsx — small shared building blocks. All colors come from theme.ts.
// =============================================================================
import {
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

export function Screen({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  );
}

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

type AppTextProps = TextProps & {
  variant?: 'caption' | 'body' | 'title' | 'heading' | 'display';
  color?: string;
  weight?: keyof typeof fontWeight;
  center?: boolean;
};

export function AppText({
  variant = 'body',
  color = colors.text,
  weight,
  center,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        { fontSize: fontSize[variant], color },
        weight ? { fontWeight: fontWeight[weight] } : undefined,
        center ? { textAlign: 'center' } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'surface' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const bg = disabled
    ? colors.surface
    : variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'ghost'
          ? 'transparent'
          : colors.surface;
  const fg = disabled
    ? colors.muted
    : variant === 'primary' || variant === 'danger'
      ? colors.bg
      : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.72 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({
  label,
  color = colors.muted,
  filled,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  return (
    <View
      style={[styles.pill, { borderColor: color, backgroundColor: filled ? color : 'transparent' }]}
    >
      <Text
        style={{
          color: filled ? colors.bg : color,
          fontSize: fontSize.caption,
          fontWeight: fontWeight.semibold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});
