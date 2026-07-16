# Maestro smoke flows

Запускаются на установленном APK с package id `com.prefloptrainer.app`:

```bash
maestro test .maestro/smoke-sandbox.yml
maestro test .maestro/persistence.yml
maestro test .maestro/reset-progress.yml
```

`smoke-sandbox.yml` проверяет первый запуск, сборку BTN RFI, 10 решений,
feedback и summary. `persistence.yml` проверяет AsyncStorage после перезапуска,
`reset-progress.yml` — удаление локального прогресса.

Полный due-review flow требует тестовых часов или заранее подготовленного state;
он будет добавлен после появления production APK и Android test fixture.
