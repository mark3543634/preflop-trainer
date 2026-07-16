// =============================================================================
// curriculum.ts — the learning PATH as data (Units -> Lessons -> Steps).
// Screens are generic; they render whatever this config describes. Lessons
// reference node ids; if a node isn't shipped yet the lesson shows "coming soon"
// instead of crashing (see lessonAvailability()).
// =============================================================================
import { hasNode } from './ranges';
import type { HandKey, ProviderId } from '../types';

export type LessonStep =
  | { kind: 'concept'; title: string; body: string }
  | { kind: 'worked'; nodeId: string; hands: HandKey[]; prompt?: string }
  | { kind: 'drill'; nodeId: string; length: number }
  | { kind: 'checkpoint'; nodeIds: string[]; length: number; threshold: number };

export interface Lesson {
  id: string;
  title: string;
  subtitle?: string;
  scoring: boolean; // Unit 0 fundamentals are non-scoring
  steps: LessonStep[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

const CHECKPOINT_THRESHOLD = 80; // must reach >=80 GTO score to complete

export const CURRICULUM: Unit[] = [
  {
    id: 'unit0',
    title: 'Юнит 0 · Основы',
    description: 'Как работает тренажёр — знакомство без оценок.',
    lessons: [
      {
        id: 'u0_positions',
        title: 'Позиции',
        scoring: false,
        steps: [
          {
            kind: 'concept',
            title: 'Позиция имеет значение',
            body: 'В 6-max игроки действуют по порядку: UTG, HJ, CO, BTN, SB, BB. Поздние позиции получают больше информации и могут прибыльно разыгрывать больше рук.',
          },
          {
            kind: 'concept',
            title: 'Баттон — лучшая позиция',
            body: 'После BTN действуют только блайнды. Поэтому с баттона обычно открывают самый широкий диапазон.',
          },
        ],
      },
      {
        id: 'u0_notation',
        title: 'Обозначения рук',
        scoring: false,
        steps: [
          {
            kind: 'concept',
            title: '169 типов рук',
            body: 'Каждая стартовая рука относится к одному из 169 типов: 13 пар (AA), 78 одномастных (AKs) и 78 разномастных (AKo). Одномастных комбинаций 4, разномастных 12, пар — 6.',
          },
        ],
      },
      {
        id: 'u0_ranges',
        title: 'Что такое диапазон',
        scoring: false,
        steps: [
          {
            kind: 'concept',
            title: 'Частоты вместо «да или нет»',
            body: 'Многие руки разыгрываются миксом: например, 3-бет 40% и колл 60%. Тренажёр сравнивает ответ с частотами: самое частое действие считается лучшим, а допустимая часть микса — верной.',
          },
          {
            kind: 'concept',
            title: 'Как читать обратную связь',
            body: 'После решения показываются частоты действий, GTO Score и потеря EV, если EV есть в источнике. Ошибки попадают в очередь повторения и никогда не блокируют обучение.',
          },
        ],
      },
    ],
  },
  {
    id: 'unit1',
    title: 'Юнит 1 · RFI с поздних позиций',
    description: 'Опен-рейзы с баттона и катоффа.',
    lessons: [
      {
        id: 'u1_btn_rfi',
        title: 'Открытие с BTN',
        subtitle: 'Raise-first-in на баттоне',
        scoring: true,
        steps: [
          {
            kind: 'concept',
            title: 'Широкие открытия с баттона',
            body: 'После баттона остаются только два игрока, поэтому BTN открывает широкий диапазон. Излишне частый фолд теряет прибыль.',
          },
          {
            kind: 'worked',
            nodeId: 'cash6max_100bb_BTN_RFI',
            hands: ['A5s', 'KQo', '76s'],
            prompt: 'Посмотрите, как разыгрываются пограничные руки.',
          },
          { kind: 'drill', nodeId: 'cash6max_100bb_BTN_RFI', length: 10 },
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_BTN_RFI'],
            length: 12,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
      {
        id: 'u1_co_rfi',
        title: 'Открытие с CO',
        subtitle: 'Raise-first-in на катоффе',
        scoring: true,
        steps: [
          {
            kind: 'concept',
            title: 'Уже, чем с баттона',
            body: 'Катофф открывает широко, но за ним ещё остаётся баттон, поэтому диапазон немного уже, чем на BTN.',
          },
          { kind: 'drill', nodeId: 'cash6max_100bb_CO_RFI', length: 10 },
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_CO_RFI'],
            length: 12,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
    ],
  },
  {
    id: 'unit2',
    title: 'Юнит 2 · RFI с ранних и средних позиций',
    description: 'Опен-рейзы с UTG, HJ и SB.',
    lessons: [
      {
        id: 'u2_utg_rfi',
        title: 'Открытие с UTG',
        scoring: true,
        steps: [
          {
            kind: 'concept',
            title: 'Тайтовая игра из ранней позиции',
            body: 'После UTG действуют ещё пять игроков. Сильный и узкий диапазон защищает от сложных спотов без позиции.',
          },
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_UTG_RFI'],
            length: 12,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
      {
        id: 'u2_hj_rfi',
        title: 'Открытие с HJ',
        scoring: true,
        steps: [
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_HJ_RFI'],
            length: 12,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
    ],
  },
  {
    id: 'unit3',
    title: 'Юнит 3 · Защита блайндов',
    description: 'Защита большого блайнда против стилов.',
    lessons: [
      {
        id: 'u3_bb_vs_btn',
        title: 'BB против стила BTN',
        subtitle: 'Широкий колл и микс 3-бетов',
        scoring: true,
        steps: [
          {
            kind: 'concept',
            title: 'Вы закрываете торговлю',
            body: 'На BB после колла вы увидите флоп и получаете хорошие pot odds. Защищайтесь широко коллами, добавляя 3-беты с сильными руками и частью блефов.',
          },
          {
            kind: 'worked',
            nodeId: 'cash6max_100bb_BB_blind_defense_BTN',
            hands: ['K9o', 'QJs', 'A8o'],
          },
          { kind: 'drill', nodeId: 'cash6max_100bb_BB_blind_defense_BTN', length: 12 },
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_BB_blind_defense_BTN'],
            length: 15,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
    ],
  },
  {
    id: 'unit4',
    title: 'Юнит 4 · 3-беты',
    description: 'Против одного рейза: 3-бет, колл или фолд.',
    lessons: [
      {
        id: 'u4_btn_vs_co',
        title: 'BTN против открытия CO',
        subtitle: '3-бет или колл в позиции',
        scoring: true,
        steps: [
          {
            kind: 'concept',
            title: 'В позиции против стила',
            body: 'На баттоне против открытия катоффа можно 3-бетить на вэлью и в блеф, а позиция позволяет коллировать часть сильных рук.',
          },
          {
            kind: 'worked',
            nodeId: 'cash6max_100bb_BTN_vs_RFI_CO',
            hands: ['AJs', 'KQs', '55'],
          },
          { kind: 'drill', nodeId: 'cash6max_100bb_BTN_vs_RFI_CO', length: 12 },
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_BTN_vs_RFI_CO'],
            length: 15,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
    ],
  },
  {
    id: 'unit5',
    title: 'Юнит 5 · Против 3-бета',
    description: 'Вы открылись и получили 3-бет: 4-бет, колл или фолд.',
    lessons: [
      {
        id: 'u5_co_vs_3bet',
        title: 'CO против 3-бета BTN',
        scoring: true,
        steps: [
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_CO_vs_3bet_BTN'],
            length: 12,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
    ],
  },
  {
    id: 'unit6',
    title: 'Юнит 6 · 4-бет и 5-бет',
    description: 'Крупные префлоп-банки: игра против 4-бета.',
    lessons: [
      {
        id: 'u6_4bet',
        title: 'Против 4-бета',
        scoring: true,
        steps: [
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_BTN_vs_4bet_CO'],
            length: 12,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
    ],
  },
  {
    id: 'unit7',
    title: 'Юнит 7 · Сквиз',
    description: 'Опен-рейз и колл перед вами: сквиз, колл или фолд.',
    lessons: [
      {
        id: 'u7_bb_squeeze',
        title: 'Сквиз BB против CO',
        subtitle: 'Атака опен-рейза и колла',
        scoring: true,
        steps: [
          {
            kind: 'concept',
            title: 'Почему сквиз делают крупным',
            body: 'Когда один игрок открывается, а другой коллирует, 3-бет атакует два ограниченных диапазона и мёртвые деньги в банке. Сквизьте полярно: сильное вэлью и часть рук с блокерами.',
          },
          {
            kind: 'worked',
            nodeId: 'cash6max_100bb_BB_squeeze_CO',
            hands: ['A5s', 'KQs', '99'],
          },
          { kind: 'drill', nodeId: 'cash6max_100bb_BB_squeeze_CO', length: 12 },
          {
            kind: 'checkpoint',
            nodeIds: ['cash6max_100bb_BB_squeeze_CO'],
            length: 15,
            threshold: CHECKPOINT_THRESHOLD,
          },
        ],
      },
    ],
  },
];

/** Node ids a lesson needs (from worked/drill/checkpoint steps). */
export function lessonNodeIds(lesson: Lesson): string[] {
  const ids = new Set<string>();
  for (const step of lesson.steps) {
    if (step.kind === 'worked' || step.kind === 'drill') ids.add(step.nodeId);
    if (step.kind === 'checkpoint') step.nodeIds.forEach((id) => ids.add(id));
  }
  return [...ids];
}

/** A lesson is "available" if every node it references is shipped. */
export function lessonAvailable(lesson: Lesson, providerId: ProviderId): boolean {
  return lessonNodeIds(lesson).every((id) => hasNode(providerId, id));
}

/** Flat ordered list of lessons across all units (for unlock gating). */
export function orderedLessons(): { unit: Unit; lesson: Lesson }[] {
  const out: { unit: Unit; lesson: Lesson }[] = [];
  for (const unit of CURRICULUM) {
    for (const lesson of unit.lessons) out.push({ unit, lesson });
  }
  return out;
}

export function findLesson(lessonId: string): { unit: Unit; lesson: Lesson } | undefined {
  return orderedLessons().find((x) => x.lesson.id === lessonId);
}
