(function () {
  'use strict';
  chrome.storage.sync.get({ extensionEnabled: true }, function (r) {
    try {
      localStorage.setItem('__aiubPortalEnabled', r.extensionEnabled ? '1' : '0');
    } catch (e) {}
  });
})();
