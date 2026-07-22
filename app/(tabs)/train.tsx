// Train tab: data-aware Sandbox builder — Table -> Position -> Scenario -> Drill.
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { GameFormat, Position, RangeNode, ScenarioType } from '../../src/types';
import {
  availableSandboxPositions,
  resolveSandboxNodes,
  sandboxCoverage,
  sandboxNodesForTable,
  sandboxScenarioAvailability,
} from '../../src/engine/sandbox';
import { allCombinedNodes } from '../../src/data/ranges';
import { useSession } from '../../src/store/sessionStore';
import { useSettings } from '../../src/store/settingsStore';
import { usePresets, type Preset } from '../../src/store/presetsStore';
import { AppText, Button } from '../../src/components/primitives';
import { Table } from '../../src/components/Table';
import { actionLabel, spotTitle } from '../../src/components/labels';
import { colors, glow, radius, spacing } from '../../src/theme';

const FORMAT: GameFormat = 'cash_6max';
const STACK_OPTIONS = [100, 40, 20, 12] as const;
const LENGTHS = [10, 15, 25] as const;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const SCENARIO_META: Record<
  ScenarioType,
  { icon: IoniconName; title: string; desc: string; villainLabel: string }
> = {
  RFI: {
    icon: 'hand-left-outline',
    title: 'Все сфолдили до меня',
    desc: 'опен-рейз или фолд',
    villainLabel: '',
  },
  vs_RFI: {
    icon: 'arrow-up-outline',
    title: 'Против опен-рейза',
    desc: '3-бет / колл / фолд',
    villainLabel: 'Позиция рейзера',
  },
  vs_3bet: {
    icon: 'trending-up-outline',
    title: 'Я открылся и получил 3-бет',
    desc: '4-бет / колл / фолд',
    villainLabel: 'Позиция 3-беттера',
  },
  vs_4bet: {
    icon: 'rocket-outline',
    title: 'После моего 3-бета пришёл 4-бет',
    desc: '5-бет / колл / фолд',
    villainLabel: 'Позиция 4-беттера',
  },
  squeeze: {
    icon: 'play-forward-outline',
    title: 'Опен и колл передо мной',
    desc: 'сквиз / колл / фолд',
    villainLabel: 'Первоначальный рейзер',
  },
  blind_defense: {
    icon: 'shield-half-outline',
    title: 'Защита блайнда',
    desc: '3-бет / колл / фолд',
    villainLabel: 'Позиция рейзера',
  },
};

function GlowCard({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <View
      style={[
        styles.card,
        active ? [{ borderColor: colors.primaryDim }, glow(colors.primary, 12, 0.12)] : null,
      ]}
    >
      {children}
    </View>
  );
}

function MiniChip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.miniChip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.35 : 1,
        },
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
  const presets = usePresets((state) => state.presets);
  const addPreset = usePresets((state) => state.addPreset);
  const removePreset = usePresets((state) => state.removePreset);
  const start = useSession((state) => state.start);
  const examMode = useSettings((state) => state.examMode);
  const examMistakeCap = useSettings((state) => state.examMistakeCap);

  const [stackBB, setStackBB] = useState<number>(100);
  const [hero, setHero] = useState<Position | null>(null);
  const [randomPositions, setRandomPositions] = useState(false);
  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [villain, setVillain] = useState<Position | null>(null);
  const [mix, setMix] = useState(false);
  const [length, setLength] = useState<number>(15);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const pendingScenarioScrollRef = useRef(false);

  const providerNodes = useMemo(() => allCombinedNodes(), []);
  const dataStacks = useMemo(
    () =>
      new Set(providerNodes.filter((node) => node.format === FORMAT).map((node) => node.stackBB)),
    [providerNodes],
  );
  const availablePositions = useMemo(
    () => availableSandboxPositions(providerNodes, FORMAT, stackBB),
    [providerNodes, stackBB],
  );
  const scenarioOptions = useMemo(
    () =>
      hero ? sandboxScenarioAvailability(providerNodes, { format: FORMAT, stackBB, hero }) : [],
    [providerNodes, stackBB, hero],
  );
  const selectedScenario = scenarioOptions.find((item) => item.scenario === scenario);
  const villainOptions = selectedScenario?.legalVillainPositions ?? [];
  const coverage = useMemo(
    () => (hero ? sandboxCoverage(providerNodes, { format: FORMAT, stackBB, hero }) : null),
    [providerNodes, stackBB, hero],
  );
  const selectedNodes = useMemo(() => {
    if (randomPositions) return sandboxNodesForTable(providerNodes, FORMAT, stackBB);
    if (!hero) return [];
    return resolveSandboxNodes(providerNodes, {
      format: FORMAT,
      stackBB,
      hero,
      mode: mix ? 'mix' : 'single',
      scenario: scenario ?? undefined,
      villainPosition: villain ?? undefined,
    });
  }, [providerNodes, stackBB, hero, mix, scenario, villain, randomPositions]);

  const selectedNode = !mix && !randomPositions ? selectedNodes[0] : undefined;
  const canLaunch = selectedNodes.length > 0;
  const selectionTitle = randomPositions
    ? 'Случайная позиция · каждая рука'
    : hero
      ? mix
        ? `${hero} · Микс всей позиции`
        : scenario
          ? spotTitle(hero, scenario, villain ?? undefined)
          : `${hero} · выберите сценарий`
      : 'Выберите позицию';
  const completedSteps = canLaunch ? 3 : hero ? 2 : 1;
  const footerHint = canLaunch
    ? randomPositions
      ? `${length} решений · ${availablePositions.length} позиций · ${selectedNodes.length} спотов`
      : `${length} решений · ${selectedNodes.length} ${selectedNodes.length === 1 ? 'спот' : 'спотов'}`
    : !hero
      ? 'Выберите позицию за столом'
      : scenario && villainOptions.length > 0 && !villain
        ? 'Выберите позицию соперника'
        : 'Выберите доступный сценарий';

  function resetSpot(): void {
    setHero(null);
    setRandomPositions(false);
    setScenario(null);
    setVillain(null);
    setMix(false);
  }

  function chooseRandomPositions(): void {
    setRandomPositions(true);
    setHero(null);
    setScenario(null);
    setVillain(null);
    setMix(false);
    pendingScenarioScrollRef.current = true;
  }

  function chooseStack(next: number): void {
    if (next === stackBB || !dataStacks.has(next)) return;
    setStackBB(next);
    resetSpot();
  }

  function chooseScenario(next: ScenarioType): void {
    const option = scenarioOptions.find((item) => item.scenario === next);
    if (!option?.available) return;
    setMix(false);
    setScenario(next);
    setVillain(
      option.availableVillainPositions.length === 1 ? option.availableVillainPositions[0] : null,
    );
  }

  function chooseMix(): void {
    if (!coverage || coverage.available === 0) return;
    setMix(true);
    setScenario(null);
    setVillain(null);
  }

  function launch(): void {
    if (selectedNodes.length === 0) {
      Alert.alert('Спот не готов', 'Выберите комбинацию, для которой в наборе есть данные.');
      return;
    }
    start(selectedNodes, length, {
      title: selectionTitle,
      origin: 'sandbox',
      examMode,
      examMistakeCap,
      randomPosition: randomPositions,
    });
    router.push('/training');
  }

  function openPresetModal(): void {
    if (!canLaunch || randomPositions) return;
    setPresetName(selectionTitle);
    setPresetModalOpen(true);
  }

  function saveCurrentPreset(): void {
    if (!hero || !canLaunch) return;
    const name = presetName.trim();
    if (!name) return;
    addPreset({
      name,
      providerId: selectedNodes[0]?.providerId ?? 'pekarstas',
      format: FORMAT,
      stackBB,
      hero,
      scenario: mix ? undefined : (scenario ?? undefined),
      villainPosition: mix ? undefined : (villain ?? undefined),
      mix,
      length,
    });
    setPresetModalOpen(false);
    setPresetName('');
    Alert.alert('Пресет сохранён', `«${name}» появится в быстрых запусках.`);
  }

  function nodesForPreset(preset: Preset): RangeNode[] {
    return resolveSandboxNodes(allCombinedNodes(), {
      format: preset.format,
      stackBB: preset.stackBB,
      hero: preset.hero,
      mode: preset.mix ? 'mix' : 'single',
      scenario: preset.scenario,
      villainPosition: preset.villainPosition,
    });
  }

  function launchPreset(preset: Preset): void {
    const nodes = nodesForPreset(preset);
    if (nodes.length === 0) {
      Alert.alert(
        'Пресет недоступен',
        'В выбранном наборе больше нет данных для этого спота. Пресет можно удалить и собрать заново.',
      );
      return;
    }
    start(nodes, preset.length, {
      title: preset.name,
      origin: 'sandbox',
      examMode,
      examMistakeCap,
    });
    router.push('/training');
  }

  function confirmRemovePreset(preset: Preset): void {
    Alert.alert('Удалить пресет?', `«${preset.name}» будет удалён.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removePreset(preset.id) },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View>
          <AppText variant="heading" weight="black" center>
            Соберите свой спот
          </AppText>
          <AppText variant="caption" color={colors.muted} center style={styles.headingHint}>
            Только комбинации, для которых есть данные
          </AppText>
        </View>

        <View style={styles.stepper}>
          <StepBadge number={1} label="Стол" state="done" />
          <View style={styles.stepLine} />
          <StepBadge
            number={2}
            label="Позиция"
            state={hero || randomPositions ? 'done' : 'current'}
          />
          <View style={styles.stepLine} />
          <StepBadge
            number={3}
            label="Спот"
            state={completedSteps === 3 ? 'done' : hero ? 'current' : 'future'}
          />
        </View>

        <SectionLabel text="1 · Стол и набор" />
        <GlowCard active>
          <View style={styles.segment}>
            <SegmentItem label="Кэш 6-max" selected onPress={() => {}} />
            <SegmentItem label="MTT · нет данных" disabled onPress={() => {}} />
          </View>

          <View style={styles.stackPill}>
            {STACK_OPTIONS.map((value) => {
              const hasData = dataStacks.has(value);
              return (
                <MiniChip
                  key={value}
                  label={`${value} BB${hasData ? '' : ' · скоро'}`}
                  selected={stackBB === value}
                  disabled={!hasData}
                  onPress={() => chooseStack(value)}
                />
              );
            })}
          </View>

          <View style={styles.sourceNote}>
            <Ionicons name="layers-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" weight="bold">
                Основной набор диапазонов
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                Доступные споты объединены в одну библиотеку. Сайзинги берутся из данных каждого
                конкретного спота.
              </AppText>
            </View>
          </View>
        </GlowCard>

        <SectionLabel text="2 · Ваша позиция" />
        <GlowCard active={hero !== null || randomPositions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Случайная позиция в каждой руке"
            accessibilityState={{ selected: randomPositions }}
            onPress={chooseRandomPositions}
            style={[styles.randomSeatCard, randomPositions ? styles.randomSeatCardSelected : null]}
          >
            <View
              style={[styles.randomSeatIcon, randomPositions ? styles.randomSeatIconActive : null]}
            >
              <Ionicons
                name="dice-outline"
                size={23}
                color={randomPositions ? colors.bg : colors.primary}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText weight="black">Случайная позиция</AppText>
              <AppText variant="caption" color={colors.muted}>
                Новая позиция и новый доступный спот перед каждой рукой
              </AppText>
            </View>
            {randomPositions ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            )}
          </Pressable>
          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <AppText variant="caption" color={colors.muted}>
              ИЛИ ВЫБЕРИТЕ МЕСТО
            </AppText>
            <View style={styles.orLine} />
          </View>
          <Table
            mode="picker"
            hero={hero ?? 'BTN'}
            selected={hero ?? undefined}
            availablePositions={availablePositions}
            onSelectSeat={(position) => {
              setRandomPositions(false);
              setHero(position);
              setScenario(null);
              setVillain(null);
              setMix(false);
              pendingScenarioScrollRef.current = true;
            }}
            width={300}
            height={190}
          />
          <AppText variant="caption" color={colors.muted} center>
            {randomPositions
              ? `Режим включён · в сессии участвуют ${availablePositions.length} позиций`
              : hero
                ? `Герой: ${hero} · доступно ${coverage?.available ?? 0} спотов`
                : 'Нажмите доступное место. Замок означает, что в паке нет данных.'}
          </AppText>
        </GlowCard>

        {hero || randomPositions ? (
          <View
            style={styles.scenarioSection}
            onLayout={(event) => {
              if (!pendingScenarioScrollRef.current) return;
              pendingScenarioScrollRef.current = false;
              const y = Math.max(0, event.nativeEvent.layout.y - spacing.md);
              requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: true }));
            }}
          >
            <SectionLabel text="3 · Сценарий" />
            <GlowCard active={canLaunch}>
              {randomPositions ? (
                <View style={styles.randomModeSummary}>
                  <View style={styles.randomModeBadge}>
                    <Ionicons name="shuffle" size={24} color={colors.bg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                    <AppText variant="title" weight="black">
                      Весь стол
                    </AppText>
                    <AppText color={colors.muted}>
                      Перед каждой рукой приложение случайно выберет позицию, доступный сценарий и
                      оппонента. Соседние руки всегда будут на разных позициях.
                    </AppText>
                    <AppText variant="caption" weight="bold" color={colors.primary}>
                      {availablePositions.length} позиций · {selectedNodes.length} доступных спотов
                    </AppText>
                  </View>
                </View>
              ) : (
                <>
                  {scenarioOptions.map((option) => {
                    const meta = SCENARIO_META[option.scenario];
                    const selected = !mix && scenario === option.scenario;
                    return (
                      <View key={option.scenario}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${meta.title}${option.available ? '' : ', нет данных'}`}
                          accessibilityState={{ selected, disabled: !option.available }}
                          disabled={!option.available}
                          onPress={() => chooseScenario(option.scenario)}
                          style={[
                            styles.scenarioRow,
                            selected ? styles.scenarioRowSelected : null,
                            !option.available ? styles.disabled : null,
                          ]}
                        >
                          <Ionicons
                            name={meta.icon}
                            size={21}
                            color={selected ? colors.primary : colors.muted}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <AppText weight={selected ? 'bold' : 'semibold'}>{meta.title}</AppText>
                            <AppText variant="caption" color={colors.muted}>
                              {meta.desc} · {option.availableNodeCount}/{option.legalNodeCount} в
                              наборе
                            </AppText>
                          </View>
                          {option.available ? (
                            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                          ) : (
                            <Ionicons name="lock-closed" size={14} color={colors.muted} />
                          )}
                        </Pressable>

                        {selected && villainOptions.length > 0 ? (
                          <View style={styles.villainRow}>
                            <AppText variant="caption" color={colors.muted} weight="bold">
                              {meta.villainLabel.toUpperCase()}
                            </AppText>
                            <View style={styles.rowWrap}>
                              {villainOptions.map((position) => {
                                const available =
                                  option.availableVillainPositions.includes(position);
                                return (
                                  <MiniChip
                                    key={position}
                                    label={`${position}${available ? '' : ' · нет данных'}`}
                                    selected={villain === position}
                                    disabled={!available}
                                    onPress={() => setVillain(position)}
                                  />
                                );
                              })}
                            </View>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}

                  <View style={styles.mixDivider} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Микс всей позиции"
                    accessibilityState={{
                      selected: mix,
                      disabled: (coverage?.available ?? 0) === 0,
                    }}
                    disabled={(coverage?.available ?? 0) === 0}
                    onPress={chooseMix}
                    style={[styles.mixCard, mix ? styles.mixCardSelected : null]}
                  >
                    <View style={styles.mixIcon}>
                      <Ionicons name="shuffle" size={20} color={mix ? colors.bg : colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText weight="bold">Микс всей позиции</AppText>
                      <AppText variant="caption" color={colors.muted}>
                        Все {coverage?.available ?? 0} доступных спотов; покрытие{' '}
                        {coverage?.available ?? 0}/{coverage?.legal ?? 0}
                      </AppText>
                    </View>
                    {mix ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                </>
              )}
            </GlowCard>

            <SectionLabel text="Параметры тренировки" />
            <GlowCard>
              <View style={styles.optionHeader}>
                <AppText weight="bold">Количество решений</AppText>
                <AppText variant="caption" color={colors.muted}>
                  примерно {Math.max(2, Math.round(length * 0.22))}–
                  {Math.max(4, Math.round(length * 0.4))} мин
                </AppText>
              </View>
              <View style={styles.rowWrap}>
                {LENGTHS.map((value) => (
                  <MiniChip
                    key={value}
                    label={`${value} рук`}
                    selected={length === value}
                    onPress={() => setLength(value)}
                  />
                ))}
              </View>
              {examMode ? (
                <View style={styles.examNote}>
                  <Ionicons name="warning-outline" size={17} color={colors.danger} />
                  <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
                    Экзамен включён: сессия завершится после {examMistakeCap} ошибок.
                  </AppText>
                </View>
              ) : null}
            </GlowCard>

            {canLaunch ? (
              <View style={styles.readyCard}>
                <View style={styles.readyHeader}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText weight="bold">{selectionTitle}</AppText>
                    <AppText variant="caption" color={colors.muted}>
                      {stackBB} BB · {selectedNodes.length}{' '}
                      {selectedNodes.length === 1 ? 'спот' : 'спотов'}
                    </AppText>
                  </View>
                </View>
                {selectedNode ? (
                  <AppText variant="caption" color={colors.muted}>
                    Действия: {selectedNode.actions.map(actionLabel).join(' · ')}
                  </AppText>
                ) : null}
              </View>
            ) : (
              <View style={styles.pendingCard}>
                <Ionicons name="arrow-up-circle-outline" size={20} color={colors.gold} />
                <AppText variant="caption" color={colors.gold} style={{ flex: 1 }}>
                  Выберите доступный сценарий и позицию оппонента либо включите микс.
                </AppText>
              </View>
            )}
          </View>
        ) : null}

        {presets.length > 0 ? (
          <>
            <SectionLabel text="Быстрый запуск" />
            <View style={styles.presetList}>
              {presets.map((preset) => {
                const availableNodes = nodesForPreset(preset);
                const available = availableNodes.length > 0;
                return (
                  <View
                    key={preset.id}
                    style={[styles.presetRow, !available ? styles.disabled : null]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      disabled={!available}
                      style={styles.presetMain}
                      onPress={() => launchPreset(preset)}
                    >
                      <View style={styles.presetIcon}>
                        <Ionicons
                          name={preset.mix ? 'shuffle' : 'flash'}
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText weight="bold" numberOfLines={1}>
                          {preset.name}
                        </AppText>
                        <AppText variant="caption" color={colors.muted}>
                          {preset.stackBB} BB · {preset.length} рук
                        </AppText>
                      </View>
                      <Ionicons
                        name="play-circle"
                        size={25}
                        color={available ? colors.primary : colors.muted}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Удалить пресет ${preset.name}`}
                      onPress={() => confirmRemovePreset(preset)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.scrollSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <AppText
            variant="caption"
            color={canLaunch ? colors.primary : colors.muted}
            weight="bold"
            numberOfLines={1}
          >
            {canLaunch ? selectionTitle : 'Соберите спот'}
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            {footerHint}
          </AppText>
        </View>
        <Button
          label="Сохранить"
          variant="surface"
          onPress={openPresetModal}
          disabled={!canLaunch || randomPositions}
          style={styles.saveButton}
        />
        <Button label="Начать" onPress={launch} disabled={!canLaunch} style={styles.startButton} />
      </View>

      <Modal
        visible={presetModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPresetModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="title" weight="black">
                  Название пресета
                </AppText>
                <AppText variant="caption" color={colors.muted}>
                  Сохранится вместе со спотом, стеком и длиной.
                </AppText>
              </View>
              <Pressable onPress={() => setPresetModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Название пресета"
              autoFocus
              maxLength={48}
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Например, BTN против CO"
              placeholderTextColor={colors.muted}
              selectionColor={colors.primary}
              style={styles.presetInput}
              onSubmitEditing={saveCurrentPreset}
            />
            <View style={styles.modalActions}>
              <Button
                label="Отмена"
                variant="ghost"
                onPress={() => setPresetModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Сохранить"
                onPress={saveCurrentPreset}
                disabled={!presetName.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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

function StepBadge({
  number,
  label,
  state,
}: {
  number: number;
  label: string;
  state: 'done' | 'current' | 'future';
}) {
  return (
    <View style={styles.stepItem}>
      <View
        style={[
          styles.stepCircle,
          state === 'done' ? styles.stepDone : state === 'current' ? styles.stepCurrent : null,
        ]}
      >
        {state === 'done' ? (
          <Ionicons name="checkmark" size={14} color={colors.bg} />
        ) : (
          <AppText
            variant="caption"
            weight="bold"
            color={state === 'current' ? colors.primary : colors.muted}
          >
            {number}
          </AppText>
        )}
      </View>
      <AppText variant="caption" color={state === 'future' ? colors.muted : colors.text}>
        {label}
      </AppText>
    </View>
  );
}

function SegmentItem({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.segmentItem,
        selected ? styles.segmentItemSelected : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <AppText weight="bold" color={selected ? colors.bg : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  headingHint: { marginTop: spacing.xs },
  sectionLabel: { marginTop: spacing.md, letterSpacing: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  stepItem: { alignItems: 'center', gap: spacing.xs, minWidth: 54 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepCurrent: { borderColor: colors.primary },
  stepLine: { width: 44, height: 1, backgroundColor: colors.border, marginBottom: 18 },
  segment: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
  },
  segmentItemSelected: { backgroundColor: colors.primary },
  stackPill: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  miniChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sourceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.button,
    padding: spacing.md,
  },
  randomSeatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  randomSeatCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  randomSeatIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  randomSeatIconActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  randomModeSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  randomModeBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
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
  scenarioRowSelected: { borderColor: colors.primaryDim, backgroundColor: colors.bg },
  scenarioSection: { gap: spacing.sm },
  villainRow: { gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mixDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  mixCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mixCardSelected: { borderColor: colors.primary, backgroundColor: colors.bg },
  mixIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  examNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  readyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primaryDim,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  readyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    padding: spacing.md,
  },
  presetList: { gap: spacing.sm },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  presetIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: { padding: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.border },
  disabled: { opacity: 0.35 },
  scrollSpacer: { height: 110 },
  footer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerInfo: { flex: 1.15, minWidth: 0 },
  saveButton: { flex: 0.9, paddingHorizontal: spacing.sm },
  startButton: { flex: 1, paddingHorizontal: spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  closeButton: { padding: spacing.xs },
  presetInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.primaryDim,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
});
