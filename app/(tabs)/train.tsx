// Train tab: Scenario Builder — Table -> Position (oval picker) -> Scenario.
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Position, ScenarioType, RangeNode } from '../../src/types';
import { legalScenarios } from '../../src/engine/scenarios';
import { buildNodeId } from '../../src/engine/nodeId';
import { getNode, allNodes, PROVIDERS, rangeSource } from '../../src/data/ranges';
import { useSession } from '../../src/store/sessionStore';
import { useSettings } from '../../src/store/settingsStore';
import { usePresets, type Preset } from '../../src/store/presetsStore';
import { AppText, Button } from '../../src/components/primitives';
import { Table } from '../../src/components/Table';
import { spotTitle } from '../../src/components/labels';
import { colors, glow, radius, spacing } from '../../src/theme';

const STACK_OPTIONS = [100, 40, 20, 12] as const;
const LENGTHS = [10, 15, 25] as const;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Canonical scenario rows (shown for every position; illegal ones are disabled).
const SCENARIO_ROWS: {
  id: ScenarioType;
  icon: IoniconName;
  title: string;
  desc: string;
  villainLabel: string;
}[] = [
  { id: 'RFI', icon: 'hand-left-outline', title: 'Все сфолдили до меня', desc: 'рейз или фолд', villainLabel: '' },
  { id: 'vs_RFI', icon: 'arrow-up-outline', title: 'Против опен-рейза', desc: '3-бет / колл / фолд', villainLabel: 'Позиция рейзера' },
  { id: 'vs_3bet', icon: 'trending-up-outline', title: 'Я открылся и получил 3-бет', desc: '4-бет / колл / фолд', villainLabel: 'Позиция 3-беттера' },
  { id: 'vs_4bet', icon: 'rocket-outline', title: 'Против 4-бета', desc: '5-бет / колл / фолд', villainLabel: 'Позиция 4-беттера' },
  { id: 'squeeze', icon: 'play-forward-outline', title: 'Сквиз', desc: '3-бет / колл / фолд', villainLabel: 'Первоначальный рейзер' },
  { id: 'blind_defense', icon: 'shield-half-outline', title: 'Защита блайнда', desc: 'защитите свой блайнд', villainLabel: 'Позиция рейзера' },
];

function GlowCard({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <View
      style={[
        styles.card,
        active ? [{ borderColor: 'rgba(39,224,161,0.5)' }, glow(colors.primary, 12, 0.12)] : null,
      ]}
    >
      {children}
    </View>
  );
}

function MiniChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.miniChip,
        { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      <AppText weight="semibold" variant="caption" color={selected ? colors.bg : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function TrainScreen() {
  const router = useRouter();
  const presets = usePresets((s) => s.presets);
  const addPreset = usePresets((s) => s.addPreset);
  const removePreset = usePresets((s) => s.removePreset);
  const start = useSession((s) => s.start);
  const provider = useSettings((s) => s.provider);
  const setProvider = useSettings((s) => s.setProvider);
  const examMode = useSettings((s) => s.examMode);
  const examMistakeCap = useSettings((s) => s.examMistakeCap);

  const dataStacks = useMemo(() => new Set(allNodes(provider).map((n) => n.stackBB)), [provider]);

  const [stackBB, setStackBB] = useState<number>(100);
  const [hero, setHero] = useState<Position | null>(null);
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [villain, setVillain] = useState<Position | null>(null);
  const [mix, setMix] = useState(false);
  const [length, setLength] = useState<number>(15);

  const legal = useMemo(() => (hero ? legalScenarios(hero) : []), [hero]);
  const legalIds = useMemo(() => new Set(legal.map((l) => l.scenario)), [legal]);
  const villainOptions = useMemo(
    () => legal.find((l) => l.scenario === scenario)?.villainPositions ?? [],
    [legal, scenario],
  );

  function collectNodes(): { nodes: RangeNode[]; missing: boolean } {
    if (!hero) return { nodes: [], missing: true };
    if (mix) {
      const nodes: RangeNode[] = [];
      for (const ls of legal) {
        if (ls.villainPositions.length === 0) {
          const n = getNode(provider, buildNodeId({ format: 'cash_6max', stackBB, hero, scenario: ls.scenario }));
          if (n) nodes.push(n);
        } else {
          for (const vp of ls.villainPositions) {
            const n = getNode(provider, buildNodeId({ format: 'cash_6max', stackBB, hero, scenario: ls.scenario, villainPosition: vp }));
            if (n) nodes.push(n);
          }
        }
      }
      return { nodes, missing: nodes.length === 0 };
    }
    if (!scenario) return { nodes: [], missing: true };
    const needsVillain = villainOptions.length > 0;
    if (needsVillain && !villain) return { nodes: [], missing: true };
    const n = getNode(provider,
      buildNodeId({ format: 'cash_6max', stackBB, hero, scenario, villainPosition: needsVillain ? villain ?? undefined : undefined }),
    );
    return { nodes: n ? [n] : [], missing: !n };
  }

  function launch() {
    const { nodes, missing } = collectNodes();
    if (missing || nodes.length === 0) {
      Alert.alert('Скоро', 'Для этого спота пока нет диапазона. Выберите доступную комбинацию на 100 BB.');
      return;
    }
    const title = mix ? `${hero} · Микс всей позиции` : spotTitle(hero!, scenario!, villain ?? undefined);
    start(nodes, length, { title, origin: 'sandbox', examMode, examMistakeCap, awardProgress: true });
    router.push('/training');
  }

  function saveCurrentPreset() {
    if (!hero) return;
    if (!mix && !scenario) return;
    addPreset({
      name: mix ? `${hero} · микс` : spotTitle(hero, scenario!, villain ?? undefined),
      providerId: provider,
      format: 'cash_6max',
      stackBB,
      hero,
      scenario: mix ? legal[0].scenario : scenario!,
      villainPosition: villain ?? undefined,
      mix,
      length,
    });
  }

  function launchPreset(p: Preset) {
    const nodes: RangeNode[] = [];
    if (p.mix) {
      for (const ls of legalScenarios(p.hero)) {
        if (ls.villainPositions.length === 0) {
          const n = getNode(p.providerId, buildNodeId({ format: p.format, stackBB: p.stackBB, hero: p.hero, scenario: ls.scenario }));
          if (n) nodes.push(n);
        } else {
          for (const vp of ls.villainPositions) {
            const n = getNode(p.providerId, buildNodeId({ format: p.format, stackBB: p.stackBB, hero: p.hero, scenario: ls.scenario, villainPosition: vp }));
            if (n) nodes.push(n);
          }
        }
      }
    } else {
      const n = getNode(p.providerId, buildNodeId({ format: p.format, stackBB: p.stackBB, hero: p.hero, scenario: p.scenario, villainPosition: p.villainPosition }));
      if (n) nodes.push(n);
    }
    if (nodes.length === 0) {
      Alert.alert('Скоро', 'Для этого пресета пока нет диапазона.');
      return;
    }
    start(nodes, p.length, { title: p.name, origin: 'sandbox', examMode, examMistakeCap, awardProgress: true });
    router.push('/training');
  }

  const canLaunch = !!hero && (mix || !!scenario) && (mix || villainOptions.length === 0 || !!villain);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="heading" weight="black" center>
          Соберите свой спот
        </AppText>

        {/* TABLE */}
        <SectionLabel text="Стол" />
        <GlowCard active>
          <View style={styles.segment}>
            <SegmentItem label="Кэш 6-max" selected onPress={() => {}} />
            <SegmentItem label="MTT · скоро" disabled onPress={() => {}} />
          </View>

          <View style={styles.stackPill}>
            {STACK_OPTIONS.map((s, i) => {
              const hasData = dataStacks.has(s);
              const sel = stackBB === s;
              return (
                <React.Fragment key={s}>
                  {i > 0 ? <AppText color={colors.muted}>·</AppText> : null}
                  <Pressable
                    disabled={!hasData}
                    onPress={() => hasData && setStackBB(s)}
                    style={[styles.stackItem, sel ? styles.stackItemSel : null]}
                  >
                    <AppText weight={sel ? 'bold' : 'regular'} color={sel ? colors.text : colors.muted}>
                      {s} BB{!hasData ? ' · скоро' : ''}
                    </AppText>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>

          <AppText variant="caption" color={colors.muted}>
            Набор диапазонов
          </AppText>
          <View style={styles.rowWrap}>
            {PROVIDERS.map((p) => (
              <MiniChip key={p.id} label={p.label} selected={provider === p.id} onPress={() => setProvider(p.id)} />
            ))}
          </View>
          <AppText variant="caption" color={colors.muted}>
            Размер открытия: {rangeSource(provider).openSizeLabel} · Рейк: {rangeSource(provider).rakeLabel}
          </AppText>
          {!dataStacks.has(stackBB) ? (
            <AppText variant="caption" color={colors.gold} style={{ marginTop: 6 }}>
              Для {stackBB} BB данных пока нет — выберите 100 BB.
            </AppText>
          ) : null}
        </GlowCard>

        {/* POSITION */}
        <SectionLabel text="Ваша позиция" />
        <GlowCard active={!!hero}>
          <Table
            mode="picker"
            hero={hero ?? 'BTN'}
            selected={hero ?? undefined}
            onSelectSeat={(p) => {
              setHero(p);
              setScenario(null);
              setVillain(null);
              setMix(false);
            }}
            width={300}
            height={190}
          />
          <AppText variant="caption" color={colors.muted} center>
            {hero ? `Герой: ${hero}` : 'Нажмите на место, чтобы выбрать позицию'}
          </AppText>
        </GlowCard>

        {/* SCENARIO */}
        {hero ? (
          <>
            <SectionLabel text="Сценарий" />
            <GlowCard active={!!scenario || mix}>
              {SCENARIO_ROWS.map((row) => {
                const enabled = legalIds.has(row.id);
                const sel = !mix && scenario === row.id;
                return (
                  <View key={row.id}>
                    <Pressable
                      disabled={!enabled}
                      onPress={() => {
                        setMix(false);
                        setScenario(row.id);
                        setVillain(null);
                      }}
                      style={[styles.scenarioRow, sel ? styles.scenarioRowSel : null, { opacity: enabled ? 1 : 0.35 }]}
                    >
                      <Ionicons name={row.icon} size={20} color={sel ? colors.primary : colors.muted} />
                      <View style={{ flex: 1 }}>
                        <AppText weight={sel ? 'bold' : 'semibold'} color={sel ? colors.text : colors.text}>
                          {row.title}
                          <AppText color={colors.muted}> — {row.desc}</AppText>
                        </AppText>
                      </View>
                      {!enabled ? <Ionicons name="lock-closed" size={13} color={colors.muted} /> : null}
                    </Pressable>

                    {sel && villainOptions.length > 0 ? (
                      <View style={styles.villainRow}>
                        <AppText variant="caption" color={colors.muted}>
                          {row.villainLabel}:
                        </AppText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {villainOptions.map((vp) => (
                            <MiniChip key={vp} label={vp} selected={villain === vp} onPress={() => setVillain(vp)} />
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </GlowCard>

            {/* DRILL */}
            <SectionLabel text="Тренировка" />
            <GlowCard>
              <View style={styles.rowWrap}>
                <MiniChip label="Один спот" selected={!mix} onPress={() => setMix(false)} />
                <MiniChip label="Микс всей позиции" selected={mix} onPress={() => setMix(true)} />
              </View>
              <View style={[styles.rowWrap, { marginTop: spacing.sm }]}>
                {LENGTHS.map((l) => (
                  <MiniChip key={l} label={`${l} рук`} selected={length === l} onPress={() => setLength(l)} />
                ))}
              </View>
            </GlowCard>
          </>
        ) : null}

        {presets.length > 0 ? (
          <>
            <SectionLabel text="Сохранённые пресеты" />
            {presets.map((p) => (
              <View key={p.id} style={styles.presetRow}>
                <Pressable style={{ flex: 1 }} onPress={() => launchPreset(p)}>
                  <AppText weight="bold">{p.name}</AppText>
                  <AppText variant="caption" color={colors.muted}>
                    {p.stackBB} BB · {p.mix ? 'микс' : 'один спот'} · {p.length} рук
                  </AppText>
                </Pressable>
                <Pressable onPress={() => removePreset(p.id)} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* sticky launch */}
      <View style={styles.footer}>
        <Button label="Сохранить" variant="surface" onPress={saveCurrentPreset} style={{ flex: 1 }} />
        <Button label="Начать" onPress={launch} disabled={!canLaunch} style={{ flex: 1.6 }} />
      </View>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <AppText variant="caption" color={colors.muted} weight="bold" style={styles.sectionLabel}>
      {text.toUpperCase()}
    </AppText>
  );
}

function SegmentItem({ label, selected, disabled, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.segmentItem, { backgroundColor: selected ? colors.primary : 'transparent', opacity: disabled ? 0.4 : 1 }]}
    >
      <AppText weight="bold" color={selected ? colors.bg : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  sectionLabel: { marginTop: spacing.md, letterSpacing: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  stackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 8,
  },
  stackItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  stackItemSel: { borderWidth: 1.5, borderColor: colors.primary },
  providerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniChip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  scenarioRowSel: { borderColor: 'rgba(39,224,161,0.6)', backgroundColor: 'rgba(39,224,161,0.06)' },
  villainRow: { gap: 6, paddingHorizontal: spacing.sm, paddingBottom: spacing.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  delBtn: { padding: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
