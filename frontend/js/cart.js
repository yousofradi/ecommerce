const Cart = {
  KEY: 'ecommerce_cart',
};
window.Cart = Cart;

Object.assign(Cart, {

  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  _save(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); this._updateBadge(); },

  getItems() { return this._load(); },

  addItem(product, selectedOptions = []) {
    const items = this._load();
    selectedOptions = selectedOptions || [];
    const key = product._id + '_' + selectedOptions.map(o => `${o.groupName}:${o.label}`).sort().join('|');
    const existing = items.find(i => i.key === key);
    if (existing) {
      existing.quantity++;
    } else {
      const optionsPrice = selectedOptions.reduce((s, o) => s + (o.price || 0), 0);
      const effectivePrice = (product.salePrice && product.salePrice < product.basePrice) ? product.salePrice : product.basePrice;
      items.push({
        key,
        productId: product._id,
        name: product.name,
        imageUrl: (product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || ''),
        basePrice: product.basePrice,
        salePrice: product.salePrice || null,
        selectedOptions,
        unitPrice: effectivePrice + optionsPrice,
        quantity: 1
      });
    }
    this._save(items);
  },

  updateQty(key, qty) {
    if (qty <= 0) return; // Must use delete button to remove
    const items = this._load();
    const item = items.find(i => i.key === key);
    if (item) {
      item.quantity = qty;
    }
    this._save(items);
  },

  removeItem(key) {
    const items = this._load().filter(i => i.key !== key);
    this._save(items);
  },

  clear() { localStorage.removeItem(this.KEY); this._updateBadge(); },

  getTotal() {
    return this._load().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  },

  getCount() {
    return this._load().reduce((sum, i) => sum + i.quantity, 0);
  },

  _updateBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  },

  init() { this._updateBadge(); }
});

document.addEventListener('DOMContentLoaded', () => {
  Cart.init();
  
  // Create slide cart HTML dynamically if it doesn't exist on the page (but only on storefront, not admin)
  if (!document.querySelector('.admin-layout') && !document.getElementById('slide-cart-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'slide-cart-overlay';
    overlay.id = 'slide-cart-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) Cart.closeCart(); };

    const cartEl = document.createElement('div');
    cartEl.className = 'slide-cart';
    cartEl.id = 'slide-cart';
    
    cartEl.innerHTML = `
      <div class="slide-cart-header">
        <button class="slide-cart-back" onclick="Cart.closeCart()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div style="display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <h3 style="margin:0; font-size:1.15rem; font-weight:700">السلة</h3>
        </div>
      </div>
      <div class="slide-cart-body" id="slide-cart-body"></div>
      <div class="slide-cart-footer">
        <div class="slide-cart-subtotal">
          <span class="slide-cart-subtotal-label">مجموع جزئي:</span>
          <span id="slide-cart-total" class="slide-cart-subtotal-value">0 ج.م</span>
        </div>
        <a href="checkout" class="btn btn-primary btn-block slide-cart-checkout-btn">الدفع ←</a>
        <a href="cart" class="btn btn-secondary btn-block slide-cart-view-btn">عرض محتويات السلة</a>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(cartEl);

    // Make the cart badge open the slide cart instead of navigating to cart.html
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
      cartBadge.removeAttribute('href');
      cartBadge.style.cursor = 'pointer';
      cartBadge.addEventListener('click', (e) => {
        e.preventDefault();
        Cart.openCart();
      });
    }
  }
});

Cart.openCart = function() {
  const overlay = document.getElementById('slide-cart-overlay');
  const cart = document.getElementById('slide-cart');
  if (overlay && cart) {
    this.renderSlideCart();
    overlay.classList.add('open');
    cart.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  } else {
    // Fallback if not injected
    window.location.href = 'cart';
  }
};

Cart.closeCart = function() {
  const overlay = document.getElementById('slide-cart-overlay');
  const cart = document.getElementById('slide-cart');
  if (overlay && cart) {
    overlay.classList.remove('open');
    cart.classList.remove('open');
    document.body.style.overflow = '';
  }
};

Cart.renderSlideCart = function() {
  const items = this.getItems();
  const body = document.getElementById('slide-cart-body');
  const totalEl = document.getElementById('slide-cart-total');
  
  if (totalEl) totalEl.textContent = formatPrice(this.getTotal());

  if (items.length === 0) {
    body.innerHTML = '<div style="text-align:center; color:var(--text-muted); margin-top:60px; padding:20px;"><div style="font-size:3rem;margin-bottom:12px">🛒</div><p>سلة التسوق فارغة</p></div>';
    return;
  }

  body.innerHTML = items.map(item => {
    const imgSrc = item.imageUrl || '';
    const opts = item.selectedOptions.map(o => `${o.groupName}: ${o.label}`).join(', ');
    return `
      <div class="sc-item">
        <div class="sc-item-top">
          <button class="sc-delete-btn" onclick="Cart.removeItem('${item.key}'); Cart.renderSlideCart()" title="حذف">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="sc-item-info">
            <div class="sc-item-name">${item.name}</div>
            ${opts ? `<div class="sc-item-opts">${opts}</div>` : ''}
            <div class="sc-item-price">${formatPrice(item.unitPrice)}</div>
          </div>
          ${imgSrc ? `<img src="${imgSrc}" class="sc-item-img" alt="${item.name}" onerror="this.style.display='none'">` : '<div class="sc-item-img sc-item-img-placeholder"></div>'}
        </div>
        <div class="sc-item-qty-row">
          <div class="sc-qty-control">
            <button class="sc-qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity + 1}); Cart.renderSlideCart()">+</button>
            <span class="sc-qty-value">${item.quantity}</span>
            <button class="sc-qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity - 1}); Cart.renderSlideCart()" ${item.quantity <= 1 ? 'disabled style="opacity:0.35;cursor:not-allowed"' : ''}>−</button>
          </div>
          <div class="sc-item-total">${formatPrice(item.unitPrice * item.quantity)}</div>
        </div>
      </div>
    `;
  }).join('');
};


// ── Mobile bottom nav cart count update ───────────────
Cart._updateBadge = (function(original) {
  return function() {
    original.call(this);
    const mobileBadge = document.getElementById('mobile-cart-count');
    if (mobileBadge) {
      const count = this.getCount();
      mobileBadge.textContent = count;
      mobileBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  };
})(Cart._updateBadge);

// ── Global Storefront Search ───────────────────────────
(function() {
  let searchDebounceTimer = null;

  function injectSearch() {
    if (document.querySelector('.admin-layout')) return; // Skip admin pages

    // Inject overlay HTML
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-box" id="search-box">
        <div class="search-input-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-input" placeholder="ابحث عن منتج..." autocomplete="off" dir="rtl">
          <button class="search-close-btn" onclick="window.closeSearch()">×</button>
        </div>
        <div class="search-results" id="search-results">
          <div class="search-empty">ابدأ الكتابة للبحث عن المنتجات</div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Close when clicking outside the box
    overlay.addEventListener('click', function(e) {
      if (!document.getElementById('search-box').contains(e.target)) {
        window.closeSearch();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') window.closeSearch();
    });

    // Search input handler with debounce
    document.getElementById('search-input').addEventListener('input', function() {
      const q = this.value.trim();
      clearTimeout(searchDebounceTimer);
      if (!q) {
        document.getElementById('search-results').innerHTML = '<div class="search-empty">ابدأ الكتابة للبحث عن المنتجات</div>';
        return;
      }
      document.getElementById('search-results').innerHTML = '<div class="search-loading">جاري البحث...</div>';
      searchDebounceTimer = setTimeout(() => doSearch(q), 350);
    });

    // Add search icons to headers
    document.querySelectorAll('.store-header .header-icons').forEach(iconsDiv => {
      if (iconsDiv.querySelector('.search-icon-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'search-icon-btn';
      btn.setAttribute('aria-label', 'بحث');
      btn.onclick = () => window.openSearch();
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
      iconsDiv.insertBefore(btn, iconsDiv.firstChild);
    });
  }

  async function doSearch(q) {
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;
    try {
      const products = await api.searchProducts(q);
      if (!products || products.length === 0) {
        resultsEl.innerHTML = '<div class="search-empty">لا توجد نتائج لـ «' + q + '»</div>';
        return;
      }
      resultsEl.innerHTML = products.slice(0, 12).map(p => {
        const img = (p.images && p.images[0]) || p.imageUrl || '';
        const price = p.salePrice || p.basePrice;
        const link = p.handle ? `product?name=${encodeURIComponent(p.handle)}` : `product?id=${p._id}`;
        return `
          <a href="${link}" class="search-result-item" onclick="window.closeSearch()">
            ${img ? `<img src="${img}" class="search-result-img" alt="${p.name}" onerror="this.style.display='none'">` : '<div class="search-result-img"></div>'}
            <div class="search-result-info">
              <div class="search-result-name">${p.name}</div>
              <div class="search-result-price">${formatPrice(price)}</div>
            </div>
          </a>`;
      }).join('');
    } catch(e) {
      resultsEl.innerHTML = '<div class="search-empty">فشل البحث، يرجى المحاولة مرة أخرى</div>';
    }
  }

  window.openSearch = function() {
    const overlay = document.getElementById('search-overlay');
    if (overlay) {
      overlay.classList.add('open');
      setTimeout(() => document.getElementById('search-input')?.focus(), 100);
    }
  };

  window.closeSearch = function() {
    const overlay = document.getElementById('search-overlay');
    if (overlay) overlay.classList.remove('open');
  };

  document.addEventListener('DOMContentLoaded', injectSearch);
})();
