import { act, fireEvent, render } from '@testing-library/react-native';
import TrainScreen from '../../../app/(tabs)/train';
import LearnScreen from '../../../app/(tabs)/index';
import ProfileScreen from '../../../app/(tabs)/profile';
import StatsScreen from '../../../app/(tabs)/stats';
import { getNode } from '../../data/ranges';
import { useSession } from '../../store/sessionStore';
import { usePresets } from '../../store/presetsStore';
import { useSettings } from '../../store/settingsStore';
import type { DecisionResult } from '../../types';
import { FeedbackOverlay } from '../FeedbackOverlay';
import { PathNode } from '../PathNode';
import { RangeHeatmap } from '../RangeHeatmap';
import { TrainingView } from '../TrainingView';

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

  it('рендерит Learn, Stats и Profile без циклических Zustand-селекторов', () => {
    expect(render(<LearnScreen />).getByText('Юнит 0 · Основы')).toBeTruthy();
    expect(render(<StatsScreen />).getByText('Главные зоны повторения')).toBeTruthy();
    expect(render(<ProfileScreen />).getByText('Настройки')).toBeTruthy();
  });

  it('показывает заблокированное состояние узла пути', () => {
    const onPress = jest.fn();
    const view = render(<PathNode title="Защита блайндов" state="locked" onPress={onPress} />);
    expect(view.getByText('🔒')).toBeTruthy();
    expect(onPress).not.toHaveBeenCalled();
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

  it('проводит решение через общий TrainingView', () => {
    act(() => {
      useSession.getState().start([node], 1, {
        title: 'Тест',
        origin: 'sandbox',
        examMode: false,
        awardProgress: false,
      });
    });
    const view = render(<TrainingView onComplete={jest.fn()} />);
    const raises = view.getAllByText('РЕЙЗ');
    fireEvent.press(raises[0]);
    fireEvent.press(view.getAllByText('РЕЙЗ')[1]);
    expect(view.getByRole('button', { name: 'Следующая рука' })).toBeTruthy();
  });
});
