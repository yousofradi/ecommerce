const API_BASE = window.API_BASE || 'https://sundurashop-manage.onrender.com/api';

const api = {
  _adminKey() { return localStorage.getItem('adminKey') || ''; },

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
  reorderProducts(order) { return this._request('/products/reorder/batch', { method: 'PUT', body: JSON.stringify({ order }), admin: true }); },

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
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#fff; border-radius:16px; max-width:450px; width:90%; padding:0; box-shadow:0 20px 60px rgba(0,0,0,0.15); overflow:hidden;">
        <div style="padding:24px 24px 8px; text-align:center;">
          <div style="width:48px;height:48px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </div>
          <h3 style="margin:0 0 8px; font-size:1.15rem; color:#1e293b; font-weight:700;">${title}</h3>
          ${message ? `<p style="margin:0; color:#64748b; font-size:0.95rem; line-height:1.5;">${message}</p>` : ''}
        </div>
        <div style="padding:16px 24px 24px; display:flex; gap:12px; justify-content:center;">
          <button type="button" id="confirm-yes" style="background:#ef4444; color:#fff; border:none; border-radius:12px; padding:10px 36px; font-weight:600; font-size:0.95rem; cursor:pointer; transition:background 0.2s;">تأكيد</button>
          <button type="button" id="confirm-no" style="background:#f8fafc; color:#1e293b; border:1px solid #e2e8f0; border-radius:12px; padding:10px 36px; font-weight:600; font-size:0.95rem; cursor:pointer; transition:background 0.2s;">إلغاء</button>
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
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });

    // Close sidebar when a nav link is clicked (mobile)
    sidebar.querySelectorAll('.admin-nav a').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth < 960) sidebar.classList.remove('open');
      });
    });

    // Close sidebar when clicking outside (on the overlay area)
    document.addEventListener('click', (e) => {
      if (window.innerWidth < 960 && sidebar.classList.contains('open')) {
        const nav = sidebar.querySelector('.admin-nav');
        const header = sidebar.querySelector('.admin-sidebar-header');
        // If click is NOT inside the nav or header, close
        if (!nav.contains(e.target) && !header.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
});
