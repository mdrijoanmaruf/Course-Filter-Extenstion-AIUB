import '../../content.css';

// OfferedCourses: placeholder — no functionality in original source.

(function mount() {
  if (window.__aiubOfferedMounted) return;
  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;
    window.__aiubOfferedMounted = true;
  });
})();
