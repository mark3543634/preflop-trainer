# Preflop Trainer

[![Проверки](https://github.com/mark3543634/preflop-trainer/actions/workflows/ci.yml/badge.svg)](https://github.com/mark3543634/preflop-trainer/actions/workflows/ci.yml)
[![Сайт](https://github.com/mark3543634/preflop-trainer/actions/workflows/pages.yml/badge.svg)](https://mark3543634.github.io/preflop-trainer/)

Сайт проекта: https://mark3543634.github.io/preflop-trainer/

Бесплатный офлайн-тренажёр префлопа: обучающий путь в стиле Duolingo и
песочница для самостоятельных drills. Приложение написано на React Native,
Expo Router и TypeScript strict; Android — первая целевая платформа.

## Достоверность диапазонов

Стратегия полностью data-driven: движок читает действия, частоты и опциональный
EV из `RangeNode` и не содержит условий для отдельных рук.

Публичная сборка включает только диапазоны с подтверждённым правом
распространения:

- `pekarstas` — community charts из
  [AHTOOOXA/poker-charts](https://github.com/AHTOOOXA/poker-charts), MIT;
- `greenline` — тот же лицензированный источник, MIT.

Это общественные чарты, а не документированные solver runs. Поэтому интерфейс
не называет их «exact GTO», не придумывает EV и не показывает bb/100 без EV и
достоверной частоты возникновения спота. Полные сведения находятся в
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) и
[`src/data/ranges/range-sources.json`](src/data/ranges/range-sources.json).

Импортеры локальных TexasSolver/Pio-экспортов сохранены в `scripts/`, но их
результаты записываются в игнорируемую папку `.local/` и не входят в release.

## Запуск

Требуется Node.js 22.

```bash
npm install --legacy-peer-deps
npx expo start
npx expo start --web
```

После `npx expo start` приложение можно открыть в Expo Go на поддерживаемом
телефоне. Web-preview доступен клавишей `w`.

## Проверки

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo-doctor
npm run export:web
npm run check
```

`npm run check` запускает TypeScript, ESLint и Jest с coverage. CI дополнительно
проверяет Expo Doctor, static web export и отсутствие локальных solver-паков в
публичном bundle.

## Что работает

- 169 канонических рук и sampling с весами 6/4/12 комбинаций;
- grading: best / correct / inaccuracy / blunder, RNG и EV-ready расчёт;
- песочница по реально доступным format/stack/provider комбинациям;
- путь из 8 юнитов, checkpoint ≥80, unlock gating и mastery;
- очередь ошибок по интервалам 1/3/7 дней;
- provider-aware presets, review и per-node stats;
- XP, streak, уровни и явно обозначенная локальная mock-лига;
- Exam mode с лимитом ошибок и досрочным summary;
- 13×13 heatmap и приоритеты повторения;
- schema v2 для AsyncStorage и экран гидрации.

Сейчас данные покрывают `cash_6max` на 100 BB. MTT и 40/20/12 BB видны как
будущие режимы, но не запускаются без диапазонов. Squeeze доступен только если
соответствующий узел действительно есть в выбранном паке.

## Android release

В [`eas.json`](eas.json) настроены профили:

- `development` — внутренний тестовый APK;
- `preview` — устанавливаемый APK;
- `production` — будущий Google Play AAB.

Для ручной сборки:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

Release workflow требует GitHub secret `EXPO_TOKEN`. Тег `v*` запускает
проверки, EAS Build, вычисляет SHA-256 и прикладывает
`preflop-trainer.apk` к GitHub Release.

## Сайт

Статический русский лендинг лежит в `site/`. Workflow `Сайт` публикует его в
GitHub Pages и автоматически подставляет APK, версию и SHA-256 из последнего
GitHub Release. До появления APK кнопка честно показывает «APK готовится».

## Лицензия

Код проекта распространяется по MIT License. Сторонние данные сохраняют свои
лицензии и уведомления.
