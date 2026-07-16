async function loadRelease() {
  const buttons = document.querySelectorAll('[data-download]');
  const version = document.querySelector('[data-version]');
  const checksum = document.querySelector('[data-checksum]');
  const releaseDate = document.querySelector('[data-release-date]');

  try {
    const response = await fetch('./release.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('release metadata unavailable');
    const release = await response.json();
    version.textContent = release.version;
    checksum.textContent = release.sha256;
    releaseDate.textContent = release.date;
    if (release.apkUrl) {
      buttons.forEach((button) => {
        button.href = release.apkUrl;
        button.classList.remove('disabled');
        button.removeAttribute('aria-disabled');
        button.textContent = release.status === 'preview' ? 'Скачать тестовый APK' : 'Скачать APK';
      });
    }
  } catch {
    checksum.textContent = 'Метаданные релиза временно недоступны';
  }
}

loadRelease();
