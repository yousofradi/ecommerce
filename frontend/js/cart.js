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
      // Logic for Absolute Prices:
      // If ANY option is selected, we sum their prices and ignore the global product price.
      let optionsOriginalTotal = 0;
      let optionsSaleTotal = 0;
      let hasOverride = selectedOptions.length > 0;
      
      selectedOptions.forEach(o => {
        optionsOriginalTotal += (o.price || 0);
        optionsSaleTotal += (o.salePrice !== null && o.salePrice !== undefined ? o.salePrice : (o.price || 0));
      });

      const finalBasePrice = hasOverride ? optionsOriginalTotal : product.basePrice;
      const finalSalePrice = hasOverride ? optionsSaleTotal : (product.salePrice || product.basePrice);
      
      const finalUnitPrice = (finalSalePrice < finalBasePrice) ? finalSalePrice : finalBasePrice;

      items.push({
        key,
        productId: product._id,
        name: product.name,
        imageUrl: (product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || ''),
        basePrice: finalBasePrice,
        salePrice: finalSalePrice < finalBasePrice ? finalSalePrice : null,
        selectedOptions,
        unitPrice: finalUnitPrice,
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
          ${imgSrc ? `<img src="${imgSrc}" class="sc-item-img" alt="${item.name}" onerror="this.style.display='none'">` : '<div class="sc-item-img sc-item-img-placeholder"></div>'}
          <div class="sc-item-info">
            <div class="sc-item-name">${item.name}</div>
            ${opts ? `<div class="sc-item-opts">${opts}</div>` : ''}
            <div class="sc-item-price">${formatPrice(item.unitPrice)}</div>
          </div>
          <button class="sc-delete-btn" onclick="Cart.removeItem('${item.key}'); Cart.renderSlideCart()" title="حذف">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="sc-item-qty-row">
          <div class="sc-item-total">${formatPrice(item.unitPrice * item.quantity)}</div>
          <div class="sc-qty-control">
            <button class="sc-qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity + 1}); Cart.renderSlideCart()">+</button>
            <span class="sc-qty-value">${item.quantity}</span>
            <button class="sc-qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity - 1}); Cart.renderSlideCart()" ${item.quantity <= 1 ? 'disabled style="opacity:0.35;cursor:not-allowed"' : ''}>−</button>
          </div>
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
// ── Handle BFcache (close cart when returning via back button) ──
// ── Handle BFcache (close cart when returning via back button) ──
window.addEventListener('pageshow', (event) => {
  if (event.persisted && window.Cart) {
    const overlay = document.getElementById('slide-cart-overlay');
    const cart = document.getElementById('slide-cart');
    if (overlay && cart) {
      overlay.classList.add('no-animation');
      cart.classList.add('no-animation');
      Cart.closeCart();
      setTimeout(() => {
        overlay.classList.remove('no-animation');
        cart.classList.remove('no-animation');
      }, 50);
    }
  }
});
