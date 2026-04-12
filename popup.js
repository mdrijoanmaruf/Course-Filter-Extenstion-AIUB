document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url && tab.url.includes('portal.aiub.edu/Student/Section/Offered')) {
      statusDiv.className = 'status active';
      statusDiv.textContent = 'Filter panel is active on this page.';
    } else {
      statusDiv.className = 'status inactive';
      statusDiv.textContent = 'Navigate to the Offered Courses page to use filters.';
    }
  } catch (e) {
    statusDiv.className = 'status inactive';
    statusDiv.textContent = 'Unable to detect current page.';
  }
});
