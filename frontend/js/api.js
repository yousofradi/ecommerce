const API_BASE = window.API_BASE || 'https://sundurashop-manage.onrender.com/api';

const api = {
  _adminKey() { return sessionStorage.getItem('adminKey') || ''; },

  async _request(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (opts.admin) headers['x-admin-key'] = this._adminKey();
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  // Products
  getProducts() { return this._request('/products'); },
  getProduct(id) { return this._request(`/products/${id}`); },
  createProduct(d) { return this._request('/products', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateProduct(id, d) { return this._request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteProduct(id) { return this._request(`/products/${id}`, { method: 'DELETE', admin: true }); },

  // Collections
  getCollections() { return this._request('/collections'); },
  createCollection(d) { return this._request('/collections', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateCollection(id, d) { return this._request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteCollection(id) { return this._request(`/collections/${id}`, { method: 'DELETE', admin: true }); },

  // Orders
  createOrder(d) { return this._request('/orders', { method: 'POST', body: JSON.stringify(d) }); },
  getOrders() { return this._request('/orders', { admin: true }); },
  getOrder(id) { return this._request(`/orders/${id}`, { admin: true }); },
  updateOrder(id, d) { return this._request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteOrder(id) { return this._request(`/orders/${id}`, { method: 'DELETE', admin: true }); },

  // Shipping
  getShipping() { return this._request('/shipping'); },
  getShippingList() { return this._request('/shipping/list', { admin: true }); },
  createShipping(d) { return this._request('/shipping', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateShipping(id, d) { return this._request(`/shipping/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteShipping(id) { return this._request(`/shipping/${id}`, { method: 'DELETE', admin: true }); },

  // Webhooks
  getWebhooks() { return this._request('/webhooks', { admin: true }); },
  createWebhook(d) { return this._request('/webhooks', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateWebhook(id, d) { return this._request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteWebhook(id) { return this._request(`/webhooks/${id}`, { method: 'DELETE', admin: true }); },

  // Auth check
  async checkAdmin() {
    try { await this._request('/orders', { admin: true }); return true; }
    catch { return false; }
  }
};

// ── Toast notification ─────────────────────────────────
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' error' : type === 'success' ? ' success' : ''}`;
  toast.innerHTML = `
    <span style="flex:1">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove?.(), 4500);
}

// ── Global Confirm Modal ────────────────────────────────
window.showConfirmModal = function(title, message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 450px; border-radius: 16px;">
        <div class="modal-header" style="border:none; padding-bottom:8px;">
          <h3 style="width:100%; text-align:right; font-size:1.1rem; color:#1e293b; font-weight:600;">${title}</h3>
        </div>
        ${message ? `<div class="modal-body" style="padding: 16px; text-align:right;">${message}</div>` : ''}
        <div class="modal-footer" style="border:none; justify-content: flex-start; gap: 12px; flex-direction: row-reverse; border-top: 1px solid #f1f5f9; padding-top:20px;">
          <button type="button" id="confirm-yes" class="btn" style="background:#ef4444; color:#fff; border-radius:24px; padding:8px 40px; font-weight:600;">تأكيد</button>
          <button type="button" id="confirm-no" class="btn" style="background:#fff; border:1px solid #e2e8f0; color:#1e293b; border-radius:24px; padding:8px 40px; font-weight:600;">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#confirm-yes').onclick = () => {
      modal.remove();
      resolve(true);
    };
    modal.querySelector('#confirm-no').onclick = () => {
      modal.remove();
      resolve(false);
    };
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };
  });
};

// ── Currency formatter ─────────────────────────────────
function formatPrice(p) {
  return `${Number(p || 0).toLocaleString('ar-EG')} ج.م`;
}

// ── Mobile sidebar toggle (auto-init) ─────────────────
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.admin-sidebar');
  const toggle  = document.querySelector('.sidebar-toggle');
  if (sidebar && toggle) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    // Close sidebar when a nav link is clicked (mobile)
    sidebar.querySelectorAll('.admin-nav a').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth < 960) sidebar.classList.remove('open');
      });
    });
  }
});
