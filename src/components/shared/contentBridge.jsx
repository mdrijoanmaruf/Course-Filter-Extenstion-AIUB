(function () {
  function writeEnabled(enabled) {
    try {
      localStorage.setItem('__aiubPortalEnabled', enabled ? '1' : '0');
    } catch (_) {}
  }

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    writeEnabled(Boolean(r && r.extensionEnabled));
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.extensionEnabled) return;
    writeEnabled(Boolean(changes.extensionEnabled.newValue));
  });
})();
