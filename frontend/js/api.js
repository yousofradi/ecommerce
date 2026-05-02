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
  getProducts(page, limit, admin = true) {
    let url = `/products?admin=${admin}`;
    if (page) url += `&page=${page}`;
    if (limit) url += `&limit=${limit}`;
    return this._request(url);
  },
  searchProducts(query) {
    return this._request(`/products?admin=false&search=${encodeURIComponent(query)}`);
  },
  getProductsByCollection(collectionId) {
    return this._request(`/products?collectionId=${collectionId}`);
  },
  getProduct(id) { return this._request(`/products/${id}`); },
  getProductByHandle(handle) { return this._request(`/products/handle/${handle}`); },
  createProduct(d) { return this._request('/products', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateProduct(id, d) { return this._request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteProduct(id) { return this._request(`/products/${id}`, { method: 'DELETE', admin: true }); },
  deleteProductsBatch(productIds) { return this._request('/products/delete/batch', { method: 'POST', body: JSON.stringify({ productIds }), admin: true }); },
  deactivateProductsBatch(productIds) { return this._request('/products/deactivate/batch', { method: 'POST', body: JSON.stringify({ productIds }), admin: true }); },
  reorderProducts(order) { return this._request('/products/reorder/batch', { method: 'PUT', body: JSON.stringify({ order }), admin: true }); },

  // Collections
  getCollections() { return this._request('/collections'); },
  getCollection(id) { return this._request(`/collections/${id}`); },
  createCollection(d) { return this._request('/collections', { method: 'POST', body: JSON.stringify(d), admin: true }); },
  updateCollection(id, d) { return this._request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteCollection(id) { return this._request(`/collections/${id}`, { method: 'DELETE', admin: true }); },

  // Orders
  createOrder(d) { return this._request('/orders', { method: 'POST', body: JSON.stringify(d) }); },
  getOrders(archived = false) { return this._request(`/orders?archived=${archived}`, { admin: true }); },
  getOrder(id) { return this._request(`/orders/${id}`, { admin: true }); },
  updateOrder(id, d) { return this._request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(d), admin: true }); },
  deleteOrder(id) { return this._request(`/orders/${id}`, { method: 'DELETE', admin: true }); },
  archiveOrders(orderIds) { return this._request('/orders/archive/batch', { method: 'POST', body: JSON.stringify({ orderIds }), admin: true }); },
  unarchiveOrders(orderIds) { return this._request('/orders/unarchive/batch', { method: 'POST', body: JSON.stringify({ orderIds }), admin: true }); },
  cancelOrder(id) { return this._request(`/orders/${id}/cancel`, { method: 'POST', admin: true }); },

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

  // Settings
  getSetting(key) { return this._request(`/settings/${key}`); },
  updateSetting(key, value) { return this._request(`/settings/${key}`, { method: 'POST', body: JSON.stringify({ value }), admin: true }); },

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
        // If click is NOT inside the nav, close it
        if (nav && !nav.contains(e.target) && !toggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
});

// ── Apply Global Settings ──────────────────────────────
          socialHtml += '</div>';
          
          // Append socials after nav links
          footerNav.insertAdjacentHTML('afterend', socialHtml);
        }
      }
    } catch(e) {
      console.log('No global settings found or failed to load');
    }
  }
});


// --- Global Slide Menu Logic ---
api.openMenu = function() {
  if(!document.getElementById('slide-menu-overlay')) {
    const menuHTML = `
      <div class="slide-cart-overlay" id="slide-menu-overlay" onclick="api.closeMenu()"></div>
      <div class="slide-menu" id="slide-menu-container">
        <div class="slide-menu-header">
          <h3 style="margin:0; font-size:1.15rem; font-weight:700">?????????</h3>
          <button class="slide-cart-back" onclick="api.closeMenu()" style="transform:scaleX(-1)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="slide-menu-body" id="slide-menu-body">
          <div style="text-align:center;padding:20px;color:#999;">???? ???????...</div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', menuHTML);
    
    api.getCollections().then(cols => {
      const body = document.getElementById('slide-menu-body');
      if(!cols || cols.length === 0) {
        body.innerHTML = '<div style="padding:20px;text-align:center;color:#999">?? ???? ???????</div>';
        return;
      }
      body.innerHTML = cols.map(c => `<a href="collection?id=${c._id}" class="slide-menu-item" onclick="api.closeMenu()">${c.name}</a>`).join('');
    }).catch(err => {
      document.getElementById('slide-menu-body').innerHTML = '<div style="padding:20px;text-align:center;color:red">??? ???</div>';
    });
  }
  
  document.getElementById('slide-menu-overlay').classList.add('open');
  document.getElementById('slide-menu-container').classList.add('open');
};

api.closeMenu = function() {
  const overlay = document.getElementById('slide-menu-overlay');
  const container = document.getElementById('slide-menu-container');
  if(overlay) overlay.classList.remove('open');
  if(container) container.classList.remove('open');
};

