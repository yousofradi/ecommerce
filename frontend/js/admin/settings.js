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
  document.getElementById('setting-payment-notes').value = s.paymentNotes || '';
  document.getElementById('setting-primary-color').value = s.primaryColor || '#916C4F';
  
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
    paymentMethods.push({ id, logo: '', label: '', number: '', note: '' });
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
        <div class="admin-card" style="margin:0; border:1px solid #e2e8f0; background:#f8fafc; padding:20px; border-radius:16px; position:relative;">
            <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:20px;">
                <!-- Right: Logo (Circular Shape) -->
                <div style="width:70px; height:70px; background:#fff; border:2px solid #e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    ${m.logo ? `<img src="${m.logo}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'}
                </div>

                <!-- Middle: Change Button (Grey Rectangular Shape) -->
                <button class="btn-change-shape" onclick="document.getElementById('pay-logo-${m.id}').click()" style="width:70px; height:44px; background:#f1f5f9; color:#475569; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.8rem; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                    تغيير
                </button>
                <input type="file" id="pay-logo-${m.id}" style="display:none" accept="image/*" onchange="handlePaymentLogoUpload(this, '${m.id}')">

                <!-- Left: Delete Button (Red Square Shape) -->
                <button class="btn-delete-shape" onclick="removePaymentMethod('${m.id}')" style="width:44px; height:44px; background:#fee2e2; border:1.5px solid #ef4444; border-radius:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;" title="حذف">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>

            <div class="form-group mb-12">
                <input type="text" class="form-control" style="text-align:center; font-weight:bold;" value="${m.label}" placeholder="اسم الوسيلة (مثال: فودافون كاش)" oninput="updatePaymentField('${m.id}', 'label', this.value)">
            </div>
            <div class="form-group mb-0">
                <input type="text" class="form-control" style="text-align:center; font-size:0.9rem;" value="${m.number}" placeholder="الرقم أو الحساب" oninput="updatePaymentField('${m.id}', 'number', this.value)">
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
    paymentNotes: document.getElementById('setting-payment-notes').value.trim(),
    primaryColor: document.getElementById('setting-primary-color').value,
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
