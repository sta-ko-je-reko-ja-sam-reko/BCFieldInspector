document.addEventListener('DOMContentLoaded', async () => {
  const toggleEl = document.getElementById('toggleEnabled');
  const refreshBtn = document.getElementById('refreshBtn');

  const settings = await chrome.storage.local.get({ enabled: false });
  toggleEl.checked = settings.enabled;

  toggleEl.addEventListener('change', async () => {
    await chrome.storage.local.set({ enabled: toggleEl.checked });
    sendToActiveTab({ action: toggleEl.checked ? 'enable' : 'disable' });
  });

  refreshBtn.addEventListener('click', () => {
    sendToActiveTab({ action: 'refresh' });
  });

  function sendToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, message);
    });
  }
});
