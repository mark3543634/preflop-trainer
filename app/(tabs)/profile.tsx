// Settings tab: training options, local data controls, and app information.
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../src/store/statsStore';
import { useSettings } from '../../src/store/settingsStore';
import { usePresets } from '../../src/store/presetsStore';
import { useReview } from '../../src/store/reviewStore';
import { allCombinedNodes } from '../../src/data/ranges';
import { AppText, Button, Card } from '../../src/components/primitives';
import { colors, radius, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const rngMode = useSettings((s) => s.rngMode);
  const examMode = useSettings((s) => s.examMode);
  const setRngMode = useSettings((s) => s.setRngMode);
  const setExamMode = useSettings((s) => s.setExamMode);
  const examMistakeCap = useSettings((s) => s.examMistakeCap);
  const setExamMistakeCap = useSettings((s) => s.setExamMistakeCap);

  const rngSupported = allCombinedNodes().every(
    (node) => node.frequencyBasis === 'solver_frequency',
  );

  function resetProgress() {
    Alert.alert(
      'Сбросить локальные данные?',
      'Будут удалены статистика тренировок, пресеты и очередь повторения.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: () => {
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
      <View>
        <AppText variant="heading" weight="black">
          Настройки тренажёра
        </AppText>
        <AppText color={colors.muted} style={{ marginTop: spacing.xs }}>
          Только параметры практики и управление локальными данными.
        </AppText>
      </View>

      <Card style={styles.settingsCard}>
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
        <View style={styles.divider} />
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
                accessibilityRole="button"
                accessibilityLabel={`Лимит ошибок ${cap}`}
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
      </Card>

      <AppText variant="title" weight="bold">
        Данные
      </AppText>
      <Card style={styles.settingsCard}>
        <InfoRow
          icon="grid-outline"
          title="Библиотека диапазонов"
          subtitle={`${allCombinedNodes().length} доступных preflop-спотов`}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="phone-portrait-outline"
          title="Локальное хранение"
          subtitle="Пресеты, статистика и ошибки остаются только на этом устройстве"
        />
        <View style={styles.divider} />
        <InfoRow
          icon="cloud-offline-outline"
          title="Офлайн-режим"
          subtitle="Аккаунт, сервер и подключение к интернету не требуются"
        />
      </Card>

      <Button label="Сбросить локальные данные" variant="danger" onPress={resetProgress} />

      <Card style={styles.aboutCard}>
        <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText weight="bold">Preflop Trainer</AppText>
          <AppText variant="caption" color={colors.muted} style={{ marginTop: spacing.xs }}>
            Бесплатный инструмент для тренировки preflop-решений и чтения диапазонов. Без аккаунта и
            соревновательных механик.
          </AppText>
        </View>
      </Card>
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
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
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

function InfoRow({
  icon,
  title,
  subtitle,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <AppText weight="semibold">{title}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {subtitle}
        </AppText>
      </View>
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
  settingsCard: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.border },
  capRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  aboutCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
});
