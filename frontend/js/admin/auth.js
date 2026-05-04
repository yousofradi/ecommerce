/** Admin auth helpers */
function requireAdmin() {
  const key = localStorage.getItem('adminKey');
  const timestamp = localStorage.getItem('loginTimestamp');
  
  if (!key) {
    window.location.href = 'login';
    return false;
  }

  // Check for 30-day timeout (30 * 24 * 60 * 60 * 1000)
  if (timestamp) {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(timestamp) > thirtyDays) {
      logout();
      return false;
    }
  }

  return true;
}
function logout() {
  localStorage.removeItem('adminKey');
  localStorage.removeItem('loginTimestamp');
  window.location.href = 'login';
}

// Global UI Helpers
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Toggle (Delegated)
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.sidebar-toggle');
    if (toggleBtn) {
      e.stopPropagation();
      const sidebar = document.querySelector('.admin-sidebar');
      if (sidebar) sidebar.classList.toggle('open');
    } else {
      // Close sidebar when clicking outside
      const sidebar = document.querySelector('.admin-sidebar');
      if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Unsaved Changes Bar
  initUnsavedChangesBar();
});

function initUnsavedChangesBar() {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    .unsaved-bar {
      position: fixed;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 600px;
      background: #1e293b;
      color: #fff;
      padding: 12px 24px;
      border-radius: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      z-index: 2000;
      transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      direction: rtl;
    }
    .unsaved-bar.visible {
      top: 20px;
    }
    .unsaved-bar span {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .unsaved-actions {
      display: flex;
      gap: 12px;
    }
    .unsaved-btn {
      padding: 8px 24px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-save-changes {
      background: #10b981;
      color: #fff;
    }
    .btn-save-changes:hover {
      background: #059669;
      transform: translateY(-1px);
    }
    .btn-discard-changes {
      background: #475569;
      color: #fff;
    }
    .btn-discard-changes:hover {
      background: #334155;
    }
    @media (max-width: 600px) {
      .unsaved-bar {
        width: 95%;
        padding: 10px 16px;
        flex-direction: column;
        gap: 12px;
        border-radius: 16px;
        top: -150px;
      }
      .unsaved-bar.visible {
        top: 10px;
      }
      .unsaved-actions {
        width: 100%;
      }
      .unsaved-btn {
        flex: 1;
        padding: 10px;
      }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const bar = document.createElement('div');
  bar.className = 'unsaved-bar';
  bar.id = 'unsaved-changes-bar';
  bar.innerHTML = `
    <span>لديك تغييرات غير محفوظة</span>
    <div class="unsaved-actions">
      <button class="unsaved-btn btn-discard-changes" id="btn-global-discard">تجاهل</button>
      <button class="unsaved-btn btn-save-changes" id="btn-global-save">احفظ التغييرات</button>
    </div>
  `;
  document.body.appendChild(bar);

  let hasChanges = false;

  window.markAsModified = () => {
    if (!hasChanges) {
      hasChanges = true;
      bar.classList.add('visible');
    }
  };

  const hideBar = () => {
    hasChanges = false;
    bar.classList.remove('visible');
  };

  const isSelectionControl = (el) => {
    if (!el) return false;
    return el.id && el.id.startsWith('select-all') || 
           el.classList.contains('order-checkbox') || 
           el.classList.contains('product-checkbox') || 
           el.classList.contains('collection-checkbox') ||
           el.classList.contains('selection-checkbox') ||
           el.classList.contains('pli-checkbox') ||
           el.classList.contains('product-select-cb') ||
           el.classList.contains('product-variant-cb');
  };

  // Detect changes
  document.addEventListener('input', (e) => {
    // Ignore inputs inside modals (like product selection modal)
    if (e.target.closest('.modal-overlay') || e.target.closest('.modal-box') || e.target.closest('.hp-modal')) return;
    
    // Ignore selection controls
    if (isSelectionControl(e.target)) return;

    if (e.target.closest('form') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      window.markAsModified();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.closest('.modal-overlay') || e.target.closest('.modal-box') || e.target.closest('.hp-modal')) return;

    // Ignore selection controls
    if (isSelectionControl(e.target)) return;

    if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox' || e.target.type === 'radio') {
      window.markAsModified();
    }
  });

  // Action: Discard
  document.getElementById('btn-global-discard').addEventListener('click', () => {
    location.reload();
  });

  // Action: Save
  document.getElementById('btn-global-save').addEventListener('click', async () => {
    if (window.handleGlobalSave) {
      const success = await window.handleGlobalSave();
      if (success !== false) hideBar();
    } else {
      // Fallback: try to find a primary save button and click it
      const primaryBtn = document.querySelector('button[type="submit"], .btn-primary, #save-btn');
      if (primaryBtn) {
        primaryBtn.click();
        hideBar();
      } else {
        console.warn('Global save handler not implemented for this page.');
      }
    }
  });
}
