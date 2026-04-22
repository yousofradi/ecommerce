/** Admin — Create Order form JS */

let allProducts = [];
let shippingMap = {};
let cartItems = []; // [{ product, quantity, selectedOptions, discount }]

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  try {
    const [products, shipping] = await Promise.all([
      api.getProducts(),
      api.getShipping()
    ]);
    allProducts = products;
    shippingMap = shipping;

    const govSelect = document.getElementById('c-gov');
    Object.keys(shippingMap).forEach(gov => {
      govSelect.add(new Option(gov, gov));
    });
  } catch (err) {
    showToast('فشل تحميل بيانات المتجر', 'error');
  }

  setupSearch();
  updatePaymentUI();
});

// ── Product Search ─────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('product-search-input');
  const dropdown = document.getElementById('search-dropdown');

  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    if (!term) { dropdown.classList.remove('open'); return; }

    const matches = allProducts.filter(p => p.name.toLowerCase().includes(term));
    if (!matches.length) {
      dropdown.innerHTML = '<div style="padding:14px;color:var(--text-muted);text-align:center">لا توجد نتائج</div>';
    } else {
      dropdown.innerHTML = matches.map(p => {
        const img = p.imageUrl || '';
        const imgHtml = img
          ? `<img class="search-result-img" src="${img}" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect width=%2248%22 height=%2248%22 fill=%22%23f1f5f9%22/></svg>'">`
          : `<div class="search-result-img" style="background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:1.4rem">📦</div>`;
        return `
          <div class="search-result-item" onclick="addToCart('${p._id}')">
            ${imgHtml}
            <div class="search-result-info">
              <div class="search-result-name">${p.name}</div>
              <div class="search-result-price">${formatPrice(p.basePrice)}</div>
            </div>
          </div>`;
      }).join('');
    }
    dropdown.classList.add('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.product-search-box')) {
      dropdown.classList.remove('open');
    }
  });
}

// ── Cart Operations ────────────────────────────────────
window.addToCart = function(id) {
  const p = allProducts.find(p => p._id === id);
  if (!p) return;

  // If already in cart, increment qty
  const existing = cartItems.find(c => c.product._id === id);
  if (existing) {
    existing.quantity++;
    renderCart();
    document.getElementById('product-search-input').value = '';
    document.getElementById('search-dropdown').classList.remove('open');
    return;
  }

  cartItems.push({
    product: p,
    quantity: 1,
    selectedOptions: [],
    discount: 0
  });

  document.getElementById('product-search-input').value = '';
  document.getElementById('search-dropdown').classList.remove('open');
  renderCart();
};

window.removeCartItem = function(index) {
  cartItems.splice(index, 1);
  renderCart();
};

window.setQty = function(index, delta) {
  const item = cartItems[index];
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  // Update displayed number
  const qtyEl = document.querySelector(`#cart-item-${index} .qty-num`);
  if (qtyEl) qtyEl.textContent = item.quantity;
  recalcSummary();
};

window.setItemDiscount = function(index, val) {
  const item = cartItems[index];
  if (!item) return;
  item.discount = Math.max(0, parseFloat(val) || 0);
  recalcSummary();
};

window.setOption = function(index, groupIndex, optIndex) {
  const item = cartItems[index];
  if (!item) return;
  const group = item.product.options[groupIndex];
  const val = group.values[optIndex];

  // Replace or add option for this group
  const existing = item.selectedOptions.findIndex(o => o.groupName === group.name);
  const opt = { groupName: group.name, label: val.label, price: val.price };
  if (existing >= 0) item.selectedOptions[existing] = opt;
  else item.selectedOptions.push(opt);

  recalcSummary();
};

// ── Render Cart ────────────────────────────────────────
function renderCart() {
  const container = document.getElementById('cart-items-container');
  const emptyMsg = document.getElementById('empty-cart-msg');

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="empty-cart" id="empty-cart-msg">
        <div class="empty-cart-icon">🛒</div>
        <h3>السلة فارغة</h3>
        <p style="font-size:0.9rem">ابحث عن منتج أعلاه لإضافته</p>
      </div>`;
    recalcSummary();
    return;
  }

  container.innerHTML = cartItems.map((c, i) => {
    const p = c.product;
    const imgSrc = p.imageUrl || '';
    const imgHtml = imgSrc
      ? `<img class="order-cart-img" src="${imgSrc}" alt="${p.name}" onerror="this.style.display='none'">`
      : `<div class="order-cart-img" style="background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:2rem">📦</div>`;

    // Options HTML
    const optionsHtml = (p.options || []).map((group, gi) => {
      const selected = c.selectedOptions.find(o => o.groupName === group.name);
      return `
        <div style="margin-top:8px">
          <span class="option-group-label">${group.name}${group.required ? ' *' : ''}</span>
          <div class="radio-options">
            ${!group.required ? `<label class="radio-option"><input type="radio" name="opt_${i}_${gi}" value="" ${!selected ? 'checked' : ''} onchange="setOption(${i},${gi},-1)"><label style="cursor:pointer">بدون</label></label>` : ''}
            ${group.values.map((v, vi) => `
              <label class="radio-option">
                <input type="radio" name="opt_${i}_${gi}" value="${vi}" ${selected && selected.label === v.label ? 'checked' : ''} onchange="setOption(${i},${gi},${vi})">
                <label>${v.label}${v.price ? ` (+${v.price})` : ''}</label>
              </label>`).join('')}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="order-cart-item" id="cart-item-${i}">
        <div class="order-cart-item-top">
          ${imgHtml}
          <div class="order-cart-meta">
            <div class="order-cart-name">${p.name}</div>
            <div class="order-cart-base-price">${formatPrice(p.basePrice)}</div>
            ${optionsHtml}
          </div>
          <button type="button" class="btn btn-sm btn-danger" onclick="removeCartItem(${i})" title="حذف" style="flex-shrink:0">✕</button>
        </div>

        <div class="order-cart-controls">
          <div class="qty-stepper">
            <button type="button" onclick="setQty(${i},-1)">−</button>
            <span class="qty-num">${c.quantity}</span>
            <button type="button" onclick="setQty(${i},+1)">+</button>
          </div>
          <div class="item-discount-row">
            <label>خصم المنتج:</label>
            <input type="number" class="form-control" min="0" value="${c.discount}"
              oninput="setItemDiscount(${i},this.value)" placeholder="0" style="width:90px">
            <span style="font-size:0.82rem;color:var(--text-muted)">ج.م</span>
          </div>
          <span class="item-price-final" id="item-final-${i}">${formatPrice(itemTotal(c))}</span>
        </div>
      </div>`;
  }).join('');

  recalcSummary();
}

// ── Price helpers ──────────────────────────────────────
function itemTotal(c) {
  const optExtra = c.selectedOptions.reduce((s, o) => s + (o.price || 0), 0);
  return Math.max(0, (c.product.basePrice + optExtra) * c.quantity - c.discount);
}

window.recalcSummary = function() {
  let subtotal = 0;
  cartItems.forEach((c, i) => {
    const t = itemTotal(c);
    subtotal += t;
    const el = document.getElementById(`item-final-${i}`);
    if (el) el.textContent = formatPrice(t);
  });

  const gov = document.getElementById('c-gov').value;
  const shipping = shippingMap[gov] || 0;
  const orderDiscount = Math.max(0, parseFloat(document.getElementById('order-discount').value) || 0);
  const total = Math.max(0, subtotal + shipping - orderDiscount);

  document.getElementById('sum-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('sum-shipping').textContent = formatPrice(shipping);
  document.getElementById('sum-total').textContent = formatPrice(total);

  // Mini items list in summary
  const summList = document.getElementById('summary-items-list');
  if (cartItems.length === 0) {
    summList.innerHTML = '';
  } else {
    summList.innerHTML = cartItems.map(c => `
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:6px;gap:8px">
        <span style="color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.product.name} × ${c.quantity}</span>
        <span style="font-weight:600;white-space:nowrap">${formatPrice(itemTotal(c))}</span>
      </div>`).join('');
    summList.innerHTML += `<div style="border-top:1px solid var(--border-color);margin:10px 0"></div>`;
  }
};

// ── Payment UI ─────────────────────────────────────────
window.updatePaymentUI = function() {
  document.querySelectorAll('.payment-method-card').forEach(card => {
    card.classList.toggle('selected', card.querySelector('input').checked);
  });
};

// ── Submit ─────────────────────────────────────────────
window.submitOrder = async function() {
  if (cartItems.length === 0) return showToast('أضف منتجاً واحداً على الأقل', 'error');

  const name = document.getElementById('c-name').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const address = document.getElementById('c-address').value.trim();
  const gov = document.getElementById('c-gov').value;

  if (!name || !phone || !address || !gov) {
    return showToast('يرجى ملء جميع الحقول المطلوبة للعميل', 'error');
  }

  // Validate required options
  for (let i = 0; i < cartItems.length; i++) {
    const c = cartItems[i];
    const required = (c.product.options || []).filter(g => g.required);
    for (const g of required) {
      if (!c.selectedOptions.find(o => o.groupName === g.name)) {
        return showToast(`اختر ${g.name} للمنتج: ${c.product.name}`, 'error');
      }
    }
  }

  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  const orderDiscount = Math.max(0, parseFloat(document.getElementById('order-discount').value) || 0);

  const finalItems = cartItems.map(c => ({
    productId: c.product._id,
    name: c.product.name,
    imageUrl: c.product.imageUrl || '',
    basePrice: c.product.basePrice,
    selectedOptions: c.selectedOptions,
    quantity: c.quantity,
    discount: c.discount,
    finalPrice: itemTotal(c)
  }));

  const payload = {
    customer: {
      name,
      phone,
      secondPhone: document.getElementById('c-second-phone').value.trim(),
      address,
      government: gov,
      notes: document.getElementById('c-notes').value.trim()
    },
    items: finalItems,
    discount: orderDiscount,
    paymentMethod
  };

  const btns = document.querySelectorAll('#submit-btn, #submit-btn-bottom');
  btns.forEach(b => { b.disabled = true; b.textContent = 'جارٍ الحفظ...'; });

  try {
    await api.createOrder(payload);
    showToast('تم إنشاء الطلب بنجاح! ✓');
    setTimeout(() => window.location.href = 'orders.html', 900);
  } catch (err) {
    btns.forEach(b => { b.disabled = false; b.textContent = '✓ إنشاء الطلب'; });
    showToast(err.message || 'حدث خطأ أثناء إنشاء الطلب', 'error');
  }
};
