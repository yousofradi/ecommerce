/** Cart — localStorage-backed cart system */
const Cart = {
  KEY: 'ecommerce_cart',

  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  _save(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); this._updateBadge(); },

  getItems() { return this._load(); },

  addItem(product, selectedOptions) {
    const items = this._load();
    const key = product._id + '_' + selectedOptions.map(o => `${o.groupName}:${o.label}`).sort().join('|');
    const existing = items.find(i => i.key === key);
    if (existing) {
      existing.quantity++;
    } else {
      const optionsPrice = selectedOptions.reduce((s, o) => s + (o.price || 0), 0);
      items.push({
        key,
        productId: product._id,
        name: product.name,
        imageUrl: (product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || ''),
        basePrice: product.basePrice,
        selectedOptions,
        unitPrice: product.basePrice + optionsPrice,
        quantity: 1
      });
    }
    this._save(items);
  },

  updateQty(key, qty) {
    const items = this._load();
    const item = items.find(i => i.key === key);
    if (item) {
      if (qty <= 0) { this.removeItem(key); return; }
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
};

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
        <h3 style="margin:0; font-size:1.2rem">سلة التسوق (<span id="slide-cart-count">0</span>)</h3>
        <button class="modal-close" onclick="Cart.closeCart()">×</button>
      </div>
      <div class="slide-cart-body" id="slide-cart-body"></div>
      <div class="slide-cart-footer">
        <div class="flex-between mb-16" style="font-weight:700; font-size:1.1rem">
          <span>المجموع:</span>
          <span id="slide-cart-total">0 EGP</span>
        </div>
        <a href="checkout.html" class="btn btn-primary btn-block">إتمام الشراء</a>
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
    window.location.href = 'cart.html';
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
  
  document.getElementById('slide-cart-count').textContent = this.getCount();
  document.getElementById('slide-cart-total').textContent = formatPrice(this.getTotal());

  if (items.length === 0) {
    body.innerHTML = '<div style="text-align:center; color:var(--text-muted); margin-top:40px;">سلة التسوق فارغة</div>';
    return;
  }

  body.innerHTML = items.map(item => {
    const imgSrc = item.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjFmNWY5Ii8+PC9zdmc+';
    const opts = item.selectedOptions.map(o => `${o.groupName}: ${o.label}`).join(', ');
    return `
      <div class="cart-item" style="padding:12px 0; border:none; border-bottom:1px solid var(--border-color); border-radius:0; gap:12px;">
        <img src="${imgSrc}" class="cart-item-img" style="width:60px; height:60px;" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-name" style="font-size:0.95rem; margin-bottom:2px;">${item.name}</div>
          ${opts ? `<div class="cart-item-options" style="font-size:0.8rem; margin-bottom:6px;">${opts}</div>` : ''}
          <div class="flex-between">
            <div class="qty-control" style="transform: scale(0.85); transform-origin: left center;">
              <button class="qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity - 1}); Cart.renderSlideCart()">-</button>
              <div class="qty-value">${item.quantity}</div>
              <button class="qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity + 1}); Cart.renderSlideCart()">+</button>
            </div>
            <div class="cart-item-price" style="font-size:0.95rem;">${formatPrice(item.unitPrice * item.quantity)}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-danger" style="padding:4px 8px; font-size:1.2rem; line-height:1;" onclick="Cart.removeItem('${item.key}'); Cart.renderSlideCart()">×</button>
      </div>
    `;
  }).join('');
};
