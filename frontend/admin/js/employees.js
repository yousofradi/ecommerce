/**
 * employees.js - Employee & Permissions Management Controller
 */

// Available sections configuration with labels and icons
const SECTIONS_CONFIG = [
  {
    key: 'orders',
    name: 'الطلبات',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
  },
  {
    key: 'abandoned_carts',
    name: 'السلّات المتروكة',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`
  },
  {
    key: 'products',
    name: 'المنتجات',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`
  },
  {
    key: 'customers',
    name: 'العملاء',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
  },
  {
    key: 'collections',
    name: 'المجموعات',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
  },
  {
    key: 'homepage',
    name: 'تخصيص المتجر',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`
  },
  {
    key: 'promotions',
    name: 'العروض',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`
  },
  {
    key: 'expenses',
    name: 'المصروفات',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`
  },
  {
    key: 'dashboard',
    name: 'الرئيسية',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`
  },
  {
    key: 'settings',
    name: 'الاعدادات',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
  },
  {
    key: 'shipment',
    name: 'الشحن',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`
  },
  {
    key: 'webhooks',
    name: 'Webhooks',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`
  },
  {
    key: 'employees',
    name: 'الموظفون',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
  }
];

let allEmployees = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  renderPermissionsTable();
  await loadEmployees();
});

// Render the permissions grid rows into modal table
function renderPermissionsTable() {
  const tbody = document.getElementById('permissions-tbody');
  if (!tbody) return;

  tbody.innerHTML = SECTIONS_CONFIG.map(sec => `
    <tr data-sec-row="${sec.key}">
      <td>
        <div class="section-title-cell">
          <span class="section-icon">${sec.icon}</span>
          <span>${sec.name}</span>
        </div>
      </td>
      <td class="col-check">
        <input type="checkbox" class="custom-cb cb-full" 
          id="cb-full-${sec.key}" 
          data-sec="${sec.key}" 
          data-type="full"
          onchange="onFullPermChanged('${sec.key}')">
      </td>
      <td class="col-check">
        <input type="checkbox" class="custom-cb cb-read" 
          id="cb-read-${sec.key}" 
          data-sec="${sec.key}" 
          data-type="read"
          onchange="onReadPermChanged('${sec.key}')">
      </td>
    </tr>
  `).join('');
}

// When "Full" checkbox toggles
function onFullPermChanged(secKey) {
  const cbFull = document.getElementById(`cb-full-${secKey}`);
  const cbRead = document.getElementById(`cb-read-${secKey}`);
  if (cbFull.checked) {
    cbRead.checked = true; // Full access automatically implies read access
  }
}

// When "Read" checkbox toggles
function onReadPermChanged(secKey) {
  const cbFull = document.getElementById(`cb-full-${secKey}`);
  const cbRead = document.getElementById(`cb-read-${secKey}`);
  if (!cbRead.checked) {
    cbFull.checked = false; // Unchecking read revokes full access
  }
}

// Quick action presets for permissions
function setAllPermissions(level) {
  SECTIONS_CONFIG.forEach(sec => {
    const cbFull = document.getElementById(`cb-full-${sec.key}`);
    const cbRead = document.getElementById(`cb-read-${sec.key}`);
    if (!cbFull || !cbRead) return;

    if (level === 'full') {
      cbFull.checked = true;
      cbRead.checked = true;
    } else if (level === 'read') {
      cbFull.checked = false;
      cbRead.checked = true;
    } else {
      cbFull.checked = false;
      cbRead.checked = false;
    }
  });
}

// Fetch and render employees
async function loadEmployees() {
  const spinner = document.getElementById('page-content-spinner');
  const mainContent = document.getElementById('main-content-layout');

  try {
    const res = await api.getEmployees();
    allEmployees = res.employees || [];
    updateStats(allEmployees);
    renderEmployeesList(allEmployees);
  } catch (err) {
    console.error('Failed to load employees:', err);
    const tbody = document.getElementById('employees-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#ef4444;">حدث خطأ أثناء تحميل بيانات الموظفين: ${err.message}</td></tr>`;
    }
  } finally {
    if (spinner) spinner.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    document.body.classList.remove('is-loading');
  }
}

function updateStats(employees) {
  const total = employees.length;
  const active = employees.filter(e => e.isActive).length;
  const inactive = total - active;

  document.getElementById('stat-total-emp').textContent = total;
  document.getElementById('stat-active-emp').textContent = active;
  document.getElementById('stat-inactive-emp').textContent = inactive;
}

function renderEmployeesList(employees) {
  const tbody = document.getElementById('employees-tbody');
  if (!tbody) return;

  if (employees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:48px 20px; color:#64748b;">
          <div style="font-size:1.1rem; font-weight:600; margin-bottom:8px; color:#1e293b;">لا يوجد موظفون مسجلون حالياً</div>
          <p style="margin:0 0 16px 0; font-size:0.9rem;">يمكنك إضافة موظف جديد وتخصيص صلاحياته بالنقر على الزر أعلاه.</p>
          <button class="btn-create-emp" onclick="openAddEmployeeModal()">+ إضافة موظف الآن</button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = employees.map(emp => {
    const perms = emp.permissions || {};
    let fullCount = 0;
    let readCount = 0;

    Object.values(perms).forEach(val => {
      if (val === 'full') fullCount++;
      else if (val === 'read') readCount++;
    });

    const totalAllowed = fullCount + readCount;
    const initial = (emp.name || 'م').trim().charAt(0);
    const createdDate = emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="emp-avatar">${initial}</div>
            <div>
              <div style="font-weight:700; color:#1e293b;">${escapeHtml(emp.name)}</div>
              <div style="font-size:0.8rem; color:#64748b;">${emp.role === 'admin' ? 'مدير' : 'موظف'}</div>
            </div>
          </div>
        </td>
        <td>
          <code style="background:#f1f5f9; padding:3px 8px; border-radius:6px; font-size:0.85rem; color:#0f766e; direction:ltr; display:inline-block;">${escapeHtml(emp.username)}</code>
        </td>
        <td>
          <div>
            ${totalAllowed === 0 ? '<span class="perm-summary-tag" style="background:#fee2e2;color:#991b1b;">لا توجد صلاحيات</span>' : ''}
            ${fullCount > 0 ? `<span class="perm-summary-tag" style="background:#ecfdf5;color:#065f46;">كاملة: ${fullCount}</span>` : ''}
            ${readCount > 0 ? `<span class="perm-summary-tag" style="background:#fef3c7;color:#92400e;">قراءة: ${readCount}</span>` : ''}
          </div>
        </td>
        <td>
          <span class="status-badge ${emp.isActive ? 'active' : 'inactive'}">
            <span style="width:6px;height:6px;border-radius:50%;background:currentColor;"></span>
            ${emp.isActive ? 'نشط' : 'معطل'}
          </span>
        </td>
        <td style="color:#64748b; font-size:0.85rem;">${createdDate}</td>
        <td>
          <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
            <button class="action-btn" onclick="openEditEmployeeModal('${emp._id}')" title="تعديل">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              تعديل
            </button>
            <button class="action-btn" onclick="toggleStatus('${emp._id}')" title="${emp.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}">
              ${emp.isActive ? 'تعطيل' : 'تفعيل'}
            </button>
            <button class="action-btn btn-del" onclick="deleteEmployee('${emp._id}', '${escapeHtml(emp.name)}')" title="حذف">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterEmployeesList() {
  const query = (document.getElementById('emp-search').value || '').trim().toLowerCase();
  if (!query) {
    renderEmployeesList(allEmployees);
    return;
  }

  const filtered = allEmployees.filter(e =>
    (e.name && e.name.toLowerCase().includes(query)) ||
    (e.username && e.username.toLowerCase().includes(query))
  );
  renderEmployeesList(filtered);
}

function showModalError(msg) {
  // 1. Trigger global toast notification
  if (typeof showToast === 'function') {
    showToast(msg, 'error');
  }

  // 2. Display prominent floating popup at top of modal
  let popup = document.getElementById('emp-modal-error-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'emp-modal-error-popup';
    popup.style.cssText = `
      position: absolute;
      top: 68px;
      left: 20px;
      right: 20px;
      z-index: 50;
      background: #fef2f2;
      border: 1px solid #f87171;
      color: #991b1b;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: slideDownFade 0.25s ease;
    `;
    const form = document.getElementById('employee-form');
    if (form) form.appendChild(popup);
  }

  popup.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>${escapeHtml(msg)}</span>
    </div>
    <button type="button" onclick="this.parentElement.style.display='none'" style="background:none; border:none; color:#991b1b; font-size:1.3rem; cursor:pointer; padding:0 4px; line-height:1;">✕</button>
  `;
  popup.style.display = 'flex';

  // Smoothly scroll modal body to top so user sees the fields that need attention
  const body = document.querySelector('.emp-modal-body');
  if (body) body.scrollTo({ top: 0, behavior: 'smooth' });

  // Auto-dismiss after 6 seconds
  clearTimeout(popup._timer);
  popup._timer = setTimeout(() => {
    if (popup) popup.style.display = 'none';
  }, 6000);
}

function clearModalError() {
  const popup = document.getElementById('emp-modal-error-popup');
  if (popup) popup.style.display = 'none';
  const errBox = document.getElementById('modal-error-box');
  if (errBox) errBox.style.display = 'none';
}

// Modal Handlers
function openAddEmployeeModal() {
  clearModalError();
  document.getElementById('modal-title').textContent = 'إضافة موظف جديد';
  document.getElementById('save-emp-text').textContent = 'حفظ الموظف';
  document.getElementById('edit-emp-id').value = '';
  document.getElementById('emp-name').value = '';
  document.getElementById('emp-username').value = '';
  document.getElementById('emp-username').disabled = false;
  document.getElementById('emp-password').value = '';
  document.getElementById('emp-password').required = true;
  document.getElementById('pwd-required-star').style.display = 'inline';
  document.getElementById('pwd-hint').style.display = 'none';
  document.getElementById('emp-status').value = 'true';

  // Default permissions: all unselected
  setAllPermissions('none');

  const modal = document.getElementById('employee-modal');
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function openEditEmployeeModal(empId) {
  clearModalError();
  const emp = allEmployees.find(e => e._id === empId);
  if (!emp) return;

  document.getElementById('modal-title').textContent = 'تعديل بيانات الموظف';
  document.getElementById('save-emp-text').textContent = 'تحديث البيانات';
  document.getElementById('edit-emp-id').value = emp._id;
  document.getElementById('emp-name').value = emp.name || '';
  document.getElementById('emp-username').value = emp.username || '';
  document.getElementById('emp-username').disabled = true; // username is fixed
  document.getElementById('emp-password').value = '';
  document.getElementById('emp-password').required = false;
  document.getElementById('pwd-required-star').style.display = 'none';
  document.getElementById('pwd-hint').style.display = 'block';
  document.getElementById('emp-status').value = emp.isActive ? 'true' : 'false';

  // Set existing permissions
  const perms = emp.permissions || {};
  SECTIONS_CONFIG.forEach(sec => {
    const val = perms[sec.key] || 'none';
    const cbFull = document.getElementById(`cb-full-${sec.key}`);
    const cbRead = document.getElementById(`cb-read-${sec.key}`);
    if (!cbFull || !cbRead) return;

    if (val === 'full') {
      cbFull.checked = true;
      cbRead.checked = true;
    } else if (val === 'read') {
      cbFull.checked = false;
      cbRead.checked = true;
    } else {
      cbFull.checked = false;
      cbRead.checked = false;
    }
  });

  const modal = document.getElementById('employee-modal');
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeEmployeeModal() {
  clearModalError();
  const modal = document.getElementById('employee-modal');
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('employee-modal');
    if (modal && modal.classList.contains('open')) {
      closeEmployeeModal();
    }
  }
});

// Save Employee (Create or Update)
async function saveEmployee() {
  const empId = document.getElementById('edit-emp-id').value;
  const name = document.getElementById('emp-name').value.trim();
  const username = document.getElementById('emp-username').value.trim();
  const password = document.getElementById('emp-password').value;
  const isActive = document.getElementById('emp-status').value === 'true';
  const btn = document.getElementById('btn-save-emp');

  clearModalError();

  if (!name || (!empId && !username)) {
    showModalError('يرجى استكمال الحقول المطلوبة');
    return;
  }

  if (!empId && (!password || password.length < 6)) {
    showModalError('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل');
    return;
  }

  if (empId && password && password.length < 6) {
    showModalError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    return;
  }

  // Build permissions object
  const permissions = {};
  SECTIONS_CONFIG.forEach(sec => {
    const cbFull = document.getElementById(`cb-full-${sec.key}`);
    const cbRead = document.getElementById(`cb-read-${sec.key}`);
    if (cbFull && cbFull.checked) {
      permissions[sec.key] = 'full';
    } else if (cbRead && cbRead.checked) {
      permissions[sec.key] = 'read';
    } else {
      permissions[sec.key] = 'none';
    }
  });

  const payload = {
    name,
    permissions,
    isActive
  };

  if (!empId) {
    payload.username = username;
    payload.password = password;
  } else if (password) {
    payload.password = password;
  }

  const oldBtnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;margin-left:6px;"></span> جاري الحفظ...';

  try {
    if (empId) {
      await api.updateEmployee(empId, payload);
      if (typeof showToast === 'function') showToast('تم تحديث بيانات الموظف بنجاح');
    } else {
      await api.createEmployee(payload);
      if (typeof showToast === 'function') showToast('تمت إضافة الموظف بنجاح');
    }

    closeEmployeeModal();
    await loadEmployees();
  } catch (err) {
    showModalError(err.message || 'حدث خطأ أثناء حفظ بيانات الموظف');
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldBtnHtml;
  }
}

// Toggle status
async function toggleStatus(empId) {
  try {
    await api.toggleEmployeeStatus(empId);
    await loadEmployees();
  } catch (err) {
    alert('فشل تغيير حالة الموظف: ' + err.message);
  }
}

// Delete Employee
async function deleteEmployee(empId, name) {
  if (!confirm(`هل أنت متأكد من رغبتك في حذف الموظف "${name}" نهائياً؟`)) {
    return;
  }

  try {
    await api.deleteEmployee(empId);
    await loadEmployees();
  } catch (err) {
    alert('فشل حذف الموظف: ' + err.message);
  }
}

// Helper to escape HTML characters
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
