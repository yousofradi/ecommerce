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
      // Update price to latest resolved price in case it changed
      const latestBase = product.basePrice || 0;
      const latestSale = (product.salePrice !== null && product.salePrice !== undefined) ? product.salePrice : null;
      existing.unitPrice = (latestSale !== null && latestSale < latestBase) ? latestSale : latestBase;
      existing.basePrice = latestBase;
      existing.salePrice = latestSale;
    } else {
      const finalBasePrice = product.basePrice || 0;
      const finalSalePrice = (product.salePrice !== null && product.salePrice !== undefined) ? product.salePrice : null;
      
      const finalUnitPrice = (finalSalePrice !== null && finalSalePrice < finalBasePrice) ? finalSalePrice : finalBasePrice;

      let finalImageUrl = '';
      if (product.variants && product.variants.length > 0 && selectedOptions && selectedOptions.length > 0) {
        const matchingVariant = product.variants.find(v => {
          if (!v.combination) return false;
          return selectedOptions.every(opt => v.combination[opt.groupName] === opt.label);
        });
        if (matchingVariant && matchingVariant.imageUrl) {
          finalImageUrl = matchingVariant.imageUrl;
        }
      }
      if (!finalImageUrl) {
        finalImageUrl = (product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || '');
      }

      items.push({
        key,
        productId: product._id,
        name: product.name,
        imageUrl: finalImageUrl,
        basePrice: finalBasePrice,
        salePrice: finalSalePrice,
        selectedOptions,
        unitPrice: finalUnitPrice,
        quantity: 1,
        availableQuantity: (product.quantity !== null && product.quantity !== undefined) ? product.quantity : null,
        variants: product.variants || []
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
        <button class="slide-cart-back" aria-label="Close Cart" onclick="Cart.closeCart()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 style="margin:0; font-size:1.15rem; font-weight:700">السلة</h3>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
      </div>
      <div class="slide-cart-body" id="slide-cart-body"></div>
      <div class="slide-cart-footer">
        <div class="slide-cart-subtotal">
          <span class="slide-cart-subtotal-label">مجموع جزئي:</span>
          <span id="slide-cart-total" class="slide-cart-subtotal-value">0 ج.م</span>
        </div>
        <a href="/checkout" class="btn btn-primary btn-block slide-cart-checkout-btn">للتأكيد ←</a>
        <a href="/cart" class="btn btn-secondary btn-block slide-cart-view-btn">عرض محتويات السلة</a>
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
  
  function getAvailable(item) {
    if (item.selectedOptions && item.selectedOptions.length > 0 && item.variants && item.variants.length > 0) {
      const v = item.variants.find(v => {
        return item.selectedOptions.every(so => v.combination[so.groupName] === so.label);
      });
      return (v && v.quantity !== null && v.quantity !== undefined) ? v.quantity : Infinity;
    }
    return (item.availableQuantity !== null && item.availableQuantity !== undefined) ? item.availableQuantity : Infinity;
  }


  if (items.length === 0) {
    body.innerHTML = `
      <div style="text-align:center; color:var(--text-muted); margin-top:60px; padding:20px;">
        <div style="margin-bottom:16px; opacity:0.6;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin:0 auto;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        </div>
        <p style="font-weight:600; font-size:1.1rem; color:var(--text-main); margin-bottom:4px;">السلة فارغة</p>
        <p style="font-size:0.9rem;">ابحث عن منتج أعلاه لإضافته</p>
      </div>`;
    return;
  }

  body.innerHTML = items.map(item => {
    const imgSrc = item.imageUrl ? api.optimizeImageUrl(item.imageUrl, 150) : '';
    const opts = item.selectedOptions.map(o => `${o.groupName}: ${o.label}`).join(', ');
    return `
      <div class="sc-item">
        <div class="sc-item-top" style="margin-bottom: 0; align-items: stretch;">
          ${imgSrc ? `<img src="${imgSrc}" class="sc-item-img" alt="${item.name}" onerror="this.style.display='none'">` : '<div class="sc-item-img sc-item-img-placeholder"></div>'}
          
          <div class="sc-item-info" style="display: flex; flex-direction: column; justify-content: space-between;">
            <!-- Top row: Name/Options & Delete button -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div style="flex: 1; min-width: 0; text-align: right;">
                <div class="sc-item-name">${item.name}</div>
                ${opts ? `<div class="sc-item-opts">${opts}</div>` : ''}
              </div>
              <button class="sc-delete-btn" onclick="Cart.removeItem('${item.key}'); Cart.renderSlideCart()" title="حذف" style="margin-top: 0;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <!-- Bottom row: Price & Qty count button -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <div class="sc-item-total" style="font-weight: 700; font-size: 14px; color: #111827;">${formatPrice(item.unitPrice * item.quantity)}</div>
              
              <div class="sc-qty-control">
                <button class="sc-qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity + 1}); Cart.renderSlideCart()">+</button>
                <span class="sc-qty-value">${item.quantity}</span>
                <button class="sc-qty-btn" onclick="Cart.updateQty('${item.key}', ${item.quantity - 1}); Cart.renderSlideCart()" ${item.quantity <= 1 ? 'disabled style="opacity:0.35;cursor:not-allowed"' : ''}>−</button>
              </div>
            </div>

            ${(function() {
              const available = getAvailable(item);
              if (available !== Infinity && item.quantity > available) {
                return `<div style="font-size:0.75rem; color:#ef4444; margin-top:4px; font-weight:600; background:#fee2e2; padding:2px 8px; border-radius:4px; display:inline-block; align-self: flex-start;">عذراً، يتوفر ${available} قطعة فقط</div>`;
              }
              return '';
            })()}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const hasInvalidStock = items.some(item => {
    const available = getAvailable(item);
    return available !== Infinity && item.quantity > available;
  });

  const checkoutBtn = document.querySelector('.slide-cart-checkout-btn');
  if (checkoutBtn) {
    if (hasInvalidStock) {
      checkoutBtn.style.pointerEvents = 'none';
      checkoutBtn.style.opacity = '0.5';
      checkoutBtn.title = 'يرجى تعديل الكميات غير المتوفرة';
    } else {
      checkoutBtn.style.pointerEvents = 'auto';
      checkoutBtn.style.opacity = '1';
      checkoutBtn.title = '';
    }
  }

  // Evaluate promotions asynchronously
  Cart.evaluatePromotions();
};

Cart.evaluatePromotions = async function() {
  const items = this.getItems();
  if (items.length === 0) return;

  const totalEl = document.getElementById('slide-cart-total');
  if (totalEl) {
    // Show a loading state briefly
    totalEl.style.opacity = '0.5';
  }

  try {
    const baseUrl = typeof API_BASE !== 'undefined' ? API_BASE : '';
    const res = await fetch(`${baseUrl}/api/promotions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItems: items })
    });
    
    if (res.ok) {
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        this._renderPromotions(data);
      }
    } else {
      console.error('Promotion evaluation failed with status:', res.status);
    }
  } catch (err) {
    console.error('Failed to evaluate promotions', err);
  } finally {
    if (totalEl) totalEl.style.opacity = '1';
  }
};

Cart._renderPromotions = function(data) {
  const body = document.getElementById('slide-cart-body');
  if (!body) return;

  // Remove existing promo wrapper if any
  let promoWrapper = document.getElementById('slide-cart-promo-wrapper');
  if (!promoWrapper) {
    promoWrapper = document.createElement('div');
    promoWrapper.id = 'slide-cart-promo-wrapper';
    body.insertBefore(promoWrapper, body.firstChild);
  }

  const { appliedPromotion, totalDiscount, freeShipping, unlockedGifts, progress } = data;
  let html = '';

  // 1. Progress Bar
  if (progress) {
    let msg = '';
    if (progress.percentage < 100) {
      msg = `أضف بـ <strong>${progress.remaining} ج.م</strong> للحصول على <strong>${progress.nextRewardName}</strong>`;
    } else {
      msg = `🎉 مبروك! وصلت لأعلى عرض: <strong>${progress.nextRewardName}</strong>`;
    }
    
    html += `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <div style="font-size: 0.9rem; margin-bottom: 8px; color: #334155;">${msg}</div>
        <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; width: 100%;">
          <div style="height: 100%; background: var(--primary); width: ${progress.percentage}%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  } else if (appliedPromotion) {
    html += `
      <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #166534; font-size: 0.9rem; font-weight: bold; text-align: center;">
        🎉 مبروك! تم تفعيل عرض: ${appliedPromotion.name}
      </div>
    `;
  }

  // 2. Manual Gifts
  const manualGifts = unlockedGifts.filter(g => g.type === 'MANUAL');
  if (manualGifts.length > 0) {
    manualGifts.forEach(g => {
      html += `
        <div style="background: #fef3c7; border: 1px dashed #f59e0b; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 0.85rem; color: #b45309; text-align: center;">
          ${g.message}
        </div>
      `;
    });
  }

  // 3. Choice Gifts
  const choiceGifts = unlockedGifts.filter(g => g.type === 'CHOICE');
  // Check if they already added a free gift to cart
  const items = this.getItems();
  const hasFreeGift = items.some(i => i.isFreeGift);
  
  if (choiceGifts.length > 0 && !hasFreeGift) {
    html += `<div style="font-weight: bold; margin-bottom: 8px; font-size: 0.95rem;">🎁 اختر هديتك المجانية:</div>`;
    html += `<div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 8px; scrollbar-width: none;">`;
    
    choiceGifts.forEach(cg => {
      cg.products.forEach(p => {
        html += `
          <div style="min-width: 100px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer;" onclick="Cart.addFreeGift('${p.id}', '${p.name}', '${p.image}')">
            <img src="${window.api?.optimizeImageUrl(p.image, 80) || p.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin: 0 auto 8px auto; display: block;">
            <div style="font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;">${p.name}</div>
            <button class="btn btn-sm btn-primary" style="width: 100%; padding: 4px; font-size: 0.75rem;">اختيار</button>
          </div>
        `;
      });
    });
    
    html += `</div>`;
  }

  promoWrapper.innerHTML = html;

  // Update Footer Totals
  const totalEl = document.getElementById('slide-cart-total');
  if (totalEl) {
    const rawTotal = this.getTotal(); // note: this includes isFreeGift = 0 because we will set its unitPrice to 0
    const finalTotal = Math.max(0, rawTotal - totalDiscount);
    
    let totalHtml = '';
    if (totalDiscount > 0) {
      totalHtml += `<div style="text-decoration: line-through; color: #94a3b8; font-size: 0.85rem;">${formatPrice(rawTotal)}</div>`;
      totalHtml += `<div style="color: #ef4444; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">خصم: -${formatPrice(totalDiscount)}</div>`;
    }
    if (freeShipping) {
      totalHtml += `<div style="color: #10b981; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">شحن مجاني!</div>`;
    }
    totalHtml += `<div>${formatPrice(finalTotal)}</div>`;
    
    totalEl.innerHTML = totalHtml;
    totalEl.style.textAlign = 'left';
    totalEl.style.display = 'flex';
    totalEl.style.flexDirection = 'column';
    totalEl.style.alignItems = 'flex-end';
  }
};

Cart.addFreeGift = function(productId, name, image) {
  const items = this._load();
  items.push({
    key: productId + '_free_gift',
    productId,
    name: name + ' (هدية مجانية)',
    imageUrl: image,
    basePrice: 0,
    salePrice: null,
    selectedOptions: [],
    unitPrice: 0,
    quantity: 1,
    isFreeGift: true
  });
  this._save(items);
  this.renderSlideCart();
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
