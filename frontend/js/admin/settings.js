const SETTINGS_KEY = 'sundura_global_settings';
let originalSettings = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  
  try {
    const settings = await api.getSetting(SETTINGS_KEY);
    if (settings) {
      originalSettings = JSON.parse(JSON.stringify(settings));
      populateSettingsForm(settings);
    }
  } catch (err) {
    showToast('فشل تحميل الإعدادات', 'error');
  }

  window.handleGlobalSave = async () => {
    await saveSettings();
    return true;
  };

  window.handleGlobalDiscard = () => {
    if (originalSettings) {
      populateSettingsForm(JSON.parse(JSON.stringify(originalSettings)));
      if (window.hideBar) window.hideBar();
    }
  };
  
  // Preview handlers
  document.getElementById('setting-store-logo').addEventListener('input', updateLogoPreview);
});

function populateSettingsForm(s) {
  document.getElementById('setting-store-name').value = s.storeName || '';
  document.getElementById('setting-store-logo').value = s.storeLogo || '';
  document.getElementById('setting-store-favicon').value = s.storeFavicon || '';
  document.getElementById('setting-social-fb').value = s.socialFb || '';
  document.getElementById('setting-social-ig').value = s.socialIg || '';
  document.getElementById('setting-social-tt').value = s.socialTt || '';
  document.getElementById('setting-social-wa').value = s.socialWa || '';
  updateLogoPreview();
}

function updateLogoPreview() {
  const url = document.getElementById('setting-store-logo').value;
  const img = document.getElementById('setting-logo-preview');
  if (url) {
    img.src = url;
    img.style.display = 'inline-block';
  } else {
    img.style.display = 'none';
  }
}

async function saveSettings() {
  const settings = {
    storeName: document.getElementById('setting-store-name').value.trim(),
    storeLogo: document.getElementById('setting-store-logo').value.trim(),
    storeFavicon: document.getElementById('setting-store-favicon').value.trim(),
    socialFb: document.getElementById('setting-social-fb').value.trim(),
    socialIg: document.getElementById('setting-social-ig').value.trim(),
    socialTt: document.getElementById('setting-social-tt').value.trim(),
    socialWa: document.getElementById('setting-social-wa').value.trim(),
  };
  
  const btn = document.querySelector('.btn-primary');
  const originalText = btn.textContent;
  btn.textContent = 'جاري الحفظ...';
  btn.disabled = true;
  
  try {
    await api.setSetting(SETTINGS_KEY, settings);
    showToast('تم حفظ الإعدادات بنجاح', 'success');
  } catch (err) {
    showToast('فشل حفظ الإعدادات', 'error');
    console.error(err);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
