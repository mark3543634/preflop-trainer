import { act, fireEvent, render } from '@testing-library/react-native';
import TrainScreen from '../../../app/(tabs)/train';
import RangeReadingScreen from '../../../app/(tabs)/index';
import ProfileScreen from '../../../app/(tabs)/profile';
import StatsScreen from '../../../app/(tabs)/stats';
import { getNode } from '../../data/ranges';
import { useSession } from '../../store/sessionStore';
import { usePresets } from '../../store/presetsStore';
import { useSettings } from '../../store/settingsStore';
import type { DecisionResult } from '../../types';
import { FeedbackOverlay } from '../FeedbackOverlay';
import { RangeHeatmap } from '../RangeHeatmap';
import { TrainingView } from '../TrainingView';
import { tableActionBadges } from '../tableStory';

const node = getNode('pekarstas', 'cash6max_100bb_BTN_RFI');

if (!node) throw new Error('Core test node is missing');

describe('основные компоненты MVP', () => {
  afterEach(() => {
    act(() => {
      useSession.getState().abort();
      usePresets.setState({ presets: [] });
      useSettings.setState({ provider: 'pekarstas', examMode: false });
    });
  });

  it('рендерит песочницу и помечает недоступные глубины', () => {
    const view = render(<TrainScreen />);
    expect(view.getByText('Соберите свой спот')).toBeTruthy();
    expect(view.getByText('Основной набор диапазонов')).toBeTruthy();
    expect(view.queryByText(/Pekarstas/i)).toBeNull();
    expect(view.queryByText(/Greenline/i)).toBeNull();
    expect(view.getByText('40 BB · скоро')).toBeTruthy();
    expect(view.getByText('MTT · нет данных')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Начать' }).props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it('разрешает запуск только после выбора реально доступного спота', () => {
    const view = render(<TrainScreen />);
    fireEvent.press(view.getByLabelText('Позиция BTN'));
    expect(view.getByText('Все сфолдили до меня')).toBeTruthy();
    expect(
      view.getByLabelText('Опен и колл передо мной, нет данных').props.accessibilityState.disabled,
    ).toBe(true);
    fireEvent.press(view.getByText('Все сфолдили до меня'));
    expect(view.getAllByText('BTN · Опен-рейз (RFI)').length).toBeGreaterThan(0);
    expect(view.getByRole('button', { name: 'Начать' }).props.accessibilityState.disabled).toBe(
      false,
    );
    fireEvent.press(view.getByText('Начать'));
    expect(useSession.getState().session?.length).toBe(15);
  });

  it('сохраняет именованный provider-aware пресет', () => {
    const view = render(<TrainScreen />);
    fireEvent.press(view.getByLabelText('Позиция BTN'));
    fireEvent.press(view.getByText('Все сфолдили до меня'));
    fireEvent.press(view.getByText('Сохранить'));
    const input = view.getByLabelText('Название пресета');
    fireEvent.changeText(input, 'Мой BTN RFI');
    fireEvent.press(view.getAllByText('Сохранить')[1]);
    expect(usePresets.getState().presets[0]).toMatchObject({
      name: 'Мой BTN RFI',
      providerId: 'pekarstas',
      stackBB: 100,
      hero: 'BTN',
      scenario: 'RFI',
      mix: false,
      length: 15,
    });
  });

  it('рендерит чтение диапазонов, Stats и Profile без циклических Zustand-селекторов', () => {
    expect(render(<RangeReadingScreen />).getByText('Чтение диапазонов')).toBeTruthy();
    expect(render(<StatsScreen />).getByText('Главные зоны повторения')).toBeTruthy();
    expect(render(<ProfileScreen />).getByText('Настройки тренажёра')).toBeTruthy();
  });

  it('позволяет выбрать любой доступный спот для просмотра в статистике', () => {
    const view = render(<StatsScreen />);
    fireEvent.press(view.getByRole('button', { name: 'Сменить' }));
    expect(view.getByText('Выберите спот')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Выбрать спот HJ · Опен-рейз (RFI)'));
    expect(view.queryByText('Выберите спот')).toBeNull();
    expect(view.getByText('HJ · Опен-рейз (RFI)')).toBeTruthy();
  });

  it('показывает только инструментальные настройки и честно отключает RNG', () => {
    const view = render(<ProfileScreen />);
    expect(view.getByLabelText('RNG-режим').props.accessibilityState.disabled).toBe(true);
    expect(view.getByText('Настройки тренажёра')).toBeTruthy();
    expect(view.getByText('Локальное хранение')).toBeTruthy();
    expect(view.queryByText(/SqueezeQueen|XP|лига/i)).toBeNull();
  });

  it('показывает ответ и equity после выбора в чтении диапазонов', () => {
    const view = render(<RangeReadingScreen />);
    expect(view.getByText('Чей диапазон лучше попал во флоп?')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'UTG · рейзер' }));
    expect(view.getByText(/Ответ по расчёту:/)).toBeTruthy();
    expect(view.getByRole('button', { name: 'СЛЕДУЮЩИЙ ФЛОП' })).toBeTruthy();
  });

  it('рисует 13x13 heatmap из данных узла', () => {
    const view = render(<RangeHeatmap node={node} width={338} />);
    expect(view.getByText('AA')).toBeTruthy();
    expect(view.getByText('AKs')).toBeTruthy();
    expect(view.getByText('72o')).toBeTruthy();
  });

  it('показывает feedback и честный прочерк без EV', () => {
    const result: DecisionResult = {
      providerId: 'pekarstas',
      nodeId: node.id,
      hand: 'AA',
      chosen: 'raise',
      grade: {
        verdict: 'best',
        score: 100,
        evLoss: null,
        bestActions: ['raise'],
        frequencies: { raise: 1 },
      },
    };
    const view = render(
      <FeedbackOverlay node={node} result={result} rngMode={false} onNext={jest.fn()} />,
    );
    expect(view.getByText('Лучшее действие')).toBeTruthy();
    expect(view.getByText('Потеря EV (bb)')).toBeTruthy();
    expect(view.getByText('—')).toBeTruthy();
    expect(view.getByText(/самое частое действие/)).toBeTruthy();
  });

  it('открывает диапазон текущего спота после решения и выделяет сыгранную руку', () => {
    const result: DecisionResult = {
      providerId: 'pekarstas',
      nodeId: node.id,
      hand: 'AA',
      chosen: 'raise',
      grade: {
        verdict: 'best',
        score: 100,
        evLoss: null,
        bestActions: ['raise'],
        frequencies: { raise: 1 },
      },
    };
    const view = render(
      <FeedbackOverlay
        node={node}
        result={result}
        rngMode={false}
        autoOpenRange
        onNext={jest.fn()}
      />,
    );

    expect(view.getByText('Диапазон спота')).toBeTruthy();
    expect(view.getByText('AA · Вы выбрали: Рейз')).toBeTruthy();
    expect(view.getByText('Ваш выбор')).toBeTruthy();
    expect(view.getByText('В диапазоне')).toBeTruthy();
    expect(view.getByLabelText('Рука AA, сыграна, выбрана').props.accessibilityState.selected).toBe(
      true,
    );

    fireEvent.press(view.getByLabelText('Рука KQs'));
    expect(view.getByText('Выбранная рука диапазона')).toBeTruthy();
    expect(view.getByLabelText('Рука AA, сыграна')).toBeTruthy();
    expect(view.getByLabelText('Рука KQs, выбрана').props.accessibilityState.selected).toBe(true);
    fireEvent.press(view.getByRole('button', { name: 'Вернуться к разбору' }));
    expect(view.queryByText('Диапазон спота')).toBeNull();
  });

  it('показывает на столе фолды до героя и действие героя после ответа', () => {
    const beforeDecision = tableActionBadges(node);
    expect(beforeDecision.UTG?.label).toBe('ФОЛД');
    expect(beforeDecision.HJ?.label).toBe('ФОЛД');
    expect(beforeDecision.CO?.label).toBe('ФОЛД');
    expect(beforeDecision.BTN).toBeUndefined();

    const afterDecision = tableActionBadges(node, 'raise');
    expect(afterDecision.BTN?.label).toMatch(/^РЕЙЗ(?: [\d.]+ BB)?$/);
  });

  it('показывает рейз оппонента и не придумывает действия после него', () => {
    const facingRaise = {
      ...node,
      hero: 'BTN' as const,
      scenario: 'vs_RFI' as const,
      villainPosition: 'CO' as const,
    };
    const badges = tableActionBadges(facingRaise);

    expect(badges.UTG?.label).toBe('ФОЛД');
    expect(badges.HJ?.label).toBe('ФОЛД');
    expect(badges.CO?.label).toMatch(/^РЕЙЗ(?: [\d.]+ BB)?$/);
    expect(badges.BTN).toBeUndefined();
    expect(badges.SB).toBeUndefined();
    expect(badges.BB).toBeUndefined();
  });

  it('проводит решение через общий TrainingView', () => {
    act(() => {
      useSession.getState().start([node], 1, {
        title: 'Тест',
        origin: 'sandbox',
        examMode: false,
      });
    });
    const view = render(<TrainingView onComplete={jest.fn()} />);
    expect(view.getByText('Банк —')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Рейз' }));
    expect(view.getByText('Диапазон спота')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Вернуться к разбору' }));
    expect(view.getByRole('button', { name: 'Следующая рука' })).toBeTruthy();
  });

  it('оставляет подтверждение действия в режиме повторения', () => {
    act(() => {
      useSession.getState().start([node], 1, {
        title: 'Тест повторения',
        origin: 'review',
        examMode: false,
      });
    });
    const view = render(<TrainingView onComplete={jest.fn()} />);
    fireEvent.press(view.getByRole('button', { name: 'Рейз' }));

    expect(view.queryByText('Диапазон спота')).toBeNull();
    expect(view.getByRole('button', { name: 'Подтвердить: Рейз' })).toBeTruthy();
  });
});
