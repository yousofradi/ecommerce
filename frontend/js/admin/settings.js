const SETTINGS_KEY = 'sundura_global_settings';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  
  // Load settings
  try {
    const settings = await api.getSetting(SETTINGS_KEY);
    if (settings) {
      document.getElementById('setting-store-name').value = settings.storeName || '';
      document.getElementById('setting-store-logo').value = settings.storeLogo || '';
      document.getElementById('setting-store-favicon').value = settings.storeFavicon || '';
      document.getElementById('setting-social-fb').value = settings.socialFb || '';
      document.getElementById('setting-social-ig').value = settings.socialIg || '';
      document.getElementById('setting-social-tt').value = settings.socialTt || '';
      document.getElementById('setting-social-wa').value = settings.socialWa || '';
      
      updateLogoPreview();
    }
  } catch (err) {
    showToast('فشل تحميل الإعدادات', 'error');
  }
  
  // Preview handlers
  document.getElementById('setting-store-logo').addEventListener('input', updateLogoPreview);
});

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
