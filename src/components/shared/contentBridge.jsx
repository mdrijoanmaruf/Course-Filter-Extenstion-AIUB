(function () {
  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    try {
      localStorage.setItem('__aiubPortalEnabled', r.extensionEnabled ? '1' : '0');
    } catch (_) {}
  });
})();
