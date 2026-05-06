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
    return await saveSettings();
  };

  window.handleGlobalDiscard = () => {
    if (originalSettings) {
      populateSettingsForm(JSON.parse(JSON.stringify(originalSettings)));
      if (window.hideBar) window.hideBar();
    }
  };

  // Add change listeners to all inputs
  const inputs = document.querySelectorAll('.form-control, input[type="hidden"]');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      if (window.markAsModified) window.markAsModified();
      if (input.id === 'setting-store-name') {
          updateBranding(input.value);
      }
    });
  });
});

function updateBranding(name) {
    const sidebarTitle = document.querySelector('.admin-brand-title');
    if (sidebarTitle) sidebarTitle.textContent = name || 'Sundura Shop';
}

function populateSettingsForm(s) {
  document.getElementById('setting-store-name').value = s.storeName || '';
  document.getElementById('setting-store-logo').value = s.storeLogo || '';
  document.getElementById('setting-store-favicon').value = s.storeFavicon || '';
  document.getElementById('setting-invoice-prefix').value = s.invoicePrefix || '';
  document.getElementById('setting-social-fb').value = s.socialFb || '';
  document.getElementById('setting-social-ig').value = s.socialIg || '';
  document.getElementById('setting-social-tt').value = s.socialTt || '';
  document.getElementById('setting-social-wa').value = s.socialWa || '';
  
  updateImagePreview('setting-store-logo', 'setting-logo-preview', 'logo-placeholder');
  updateImagePreview('setting-store-favicon', 'setting-favicon-preview', 'favicon-placeholder');
  updateBranding(s.storeName);
}

function updateImagePreview(targetId, previewId, placeholderId) {
    const url = document.getElementById(targetId).value;
    const preview = document.getElementById(previewId);
    const placeholder = document.getElementById(placeholderId);
    
    if (url) {
        preview.src = url;
        preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    } else {
        preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
    }
}

window.handleImageUpload = async function(input, targetId, previewId, placeholderId) {
  const file = input.files[0];
  if (!file) return;

  const btn = input.previousElementSibling;
  const originalText = btn.textContent;
  btn.textContent = 'جاري الرفع...';
  btn.disabled = true;

  try {
    const res = await api.uploadFile(file);
    document.getElementById(targetId).value = res.url;
    updateImagePreview(targetId, previewId, placeholderId);
    if (window.markAsModified) window.markAsModified();
  } catch (err) {
    showToast('فشل رفع الصورة', 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

async function saveSettings() {
  const settings = {
    storeName: document.getElementById('setting-store-name').value.trim(),
    storeLogo: document.getElementById('setting-store-logo').value.trim(),
    storeFavicon: document.getElementById('setting-store-favicon').value.trim(),
    invoicePrefix: document.getElementById('setting-invoice-prefix').value.trim(),
    socialFb: document.getElementById('setting-social-fb').value.trim(),
    socialIg: document.getElementById('setting-social-ig').value.trim(),
    socialTt: document.getElementById('setting-social-tt').value.trim(),
    socialWa: document.getElementById('setting-social-wa').value.trim(),
  };
  
  try {
    await api.updateSetting(SETTINGS_KEY, settings);
    originalSettings = JSON.parse(JSON.stringify(settings));
    showToast('تم حفظ الإعدادات بنجاح', 'success');
    if (window.hideBar) window.hideBar();
    return true;
  } catch (err) {
    showToast('فشل حفظ الإعدادات', 'error');
    console.error(err);
    return false;
  }
}
