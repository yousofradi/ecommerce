const SETTINGS_KEY = 'sundura_global_settings';
let originalSettings = null;
let paymentMethods = [];

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

  // Add change listeners to all static inputs
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
  
  paymentMethods = s.paymentMethods || [];
  renderPaymentMethods();

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

// ── Payment Methods Logic ────────────────────────────
window.addPaymentMethod = function() {
    const id = Date.now().toString();
    paymentMethods.push({ id, logo: '', label: '', number: '' });
    renderPaymentMethods();
    if (window.markAsModified) window.markAsModified();
};

window.removePaymentMethod = function(id) {
    paymentMethods = paymentMethods.filter(m => m.id !== id);
    renderPaymentMethods();
    if (window.markAsModified) window.markAsModified();
};

window.updatePaymentField = function(id, field, value) {
    const method = paymentMethods.find(m => m.id === id);
    if (method) {
        method[field] = value;
        if (window.markAsModified) window.markAsModified();
    }
};

window.handlePaymentLogoUpload = async function(input, id) {
    const file = input.files[0];
    if (!file) return;

    const btn = input.previousElementSibling;
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    try {
        const res = await api.uploadFile(file);
        const method = paymentMethods.find(m => m.id === id);
        if (method) {
            method.logo = res.url;
            renderPaymentMethods();
            if (window.markAsModified) window.markAsModified();
        }
    } catch (err) {
        showToast('فشل رفع الشعار', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

function renderPaymentMethods() {
    const container = document.getElementById('payment-methods-container');
    container.innerHTML = paymentMethods.map(m => `
        <div class="admin-card" style="margin:0; border:1px solid #e2e8f0; background:#f8fafc; padding:16px; border-radius:12px; position:relative;">
            <button class="btn btn-text text-danger" onclick="removePaymentMethod('${m.id}')" style="position:absolute; top:8px; left:8px; padding:4px; border:none; background:none; cursor:pointer; opacity:0.6;" title="حذف">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            <div class="flex-between mb-12" style="justify-content: flex-end;">
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pay-logo-${m.id}').click()" style="padding:2px 8px; font-size:0.7rem; min-width:auto; height:24px;">تغيير</button>
                    <input type="file" id="pay-logo-${m.id}" style="display:none" accept="image/*" onchange="handlePaymentLogoUpload(this, '${m.id}')">
                    <div style="width:40px; height:40px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        ${m.logo ? `<img src="${m.logo}" style="max-width:100%; max-height:100%;">` : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'}
                    </div>
                </div>
            </div>
            <div class="form-group mb-8">
                <input type="text" class="form-control form-control-sm" value="${m.label}" placeholder="اسم الوسيلة (مثال: فودافون كاش)" oninput="updatePaymentField('${m.id}', 'label', this.value)">
            </div>
            <div class="form-group mb-0">
                <input type="text" class="form-control form-control-sm" value="${m.number}" placeholder="الرقم أو الحساب" oninput="updatePaymentField('${m.id}', 'number', this.value)">
            </div>
        </div>
    `).join('');
}

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
    paymentMethods: paymentMethods
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
