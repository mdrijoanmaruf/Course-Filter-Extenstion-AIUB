document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('pu-toggle');
  const desc = document.getElementById('pu-toggle-desc');
  const statusDiv = document.getElementById('pu-status');

  const { extensionEnabled = true } = await chrome.storage.sync.get('extensionEnabled');
  toggle.checked = extensionEnabled;
  updateDesc(extensionEnabled);

  let currentTab = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    updateStatus(extensionEnabled, tab.url);
  } catch (e) {
    statusDiv.className = 'pu-status inactive';
    statusDiv.textContent = 'Unable to detect current page.';
  }

  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    await chrome.storage.sync.set({ extensionEnabled: enabled });
    updateDesc(enabled);
    if (currentTab) {
      updateStatus(enabled, currentTab.url);
      try { chrome.tabs.reload(currentTab.id); } catch (_) {}
    }
  });

  function updateDesc(enabled) {
    desc.textContent = enabled ? 'Enabled' : 'Disabled';
    desc.className = 'pu-toggle-desc ' + (enabled ? 'on' : 'off');
  }

  function updateStatus(enabled, url) {
    if (!enabled) {
      statusDiv.className = 'pu-status disabled';
      statusDiv.textContent = 'Extension is disabled. Toggle ON to activate.';
      return;
    }
    if (url && url.includes('portal.aiub.edu/Student/Section/Offered')) {
      statusDiv.className = 'pu-status active';
      statusDiv.textContent = '✓ Filter panel is active on this page.';
    } else {
      statusDiv.className = 'pu-status inactive';
      statusDiv.textContent = 'Go to Offered Courses page to use filters.';
    }
  }
});
