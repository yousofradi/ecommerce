/** Admin — Create Order form JS */

let allProducts = [];
let shippingMap = {};
let cartItems = []; // [{ product, quantity, selectedOptions, discount }]

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  try {
    let products = [];
    try { products = await api.getProducts(); } catch (e) {}
    
    let shipping = {};
    try { shipping = await api.getShipping(); } catch (e) {}

    // Fallback if DB is empty
    if (Object.keys(shipping).length === 0) {
      shipping = {
        'القاهرة': 85, 'الجيزة': 85, 'الإسكندرية': 85, 'البحيرة': 85, 'القليوبية': 85, 'الغربية': 85, 'المنوفية': 85, 'دمياط': 85, 'الدقهلية': 85, 'كفر الشيخ': 85, 'الشرقية': 85, 'الاسماعيلية': 95, 'السويس': 95, 'بورسعيد': 95, 'الفيوم': 110, 'بني سويف': 110, 'المنيا': 110, 'اسيوط': 110, 'سوهاج': 130, 'قنا': 130, 'أسوان': 130, 'الأقصر': 130, 'البحر الأحمر': 130, 'مرسي مطروح': 135, 'الوادي الجديد': 135, 'شمال سيناء': 135, 'جنوب سيناء': 135
      };
    }
    
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

// ── Products Modal ─────────────────────────────────────
let collectionsMap = {};
window.openProductsModal = async function() {
  document.getElementById('products-modal').classList.add('open');
  // Load collections if not loaded
  if (Object.keys(collectionsMap).length === 0) {
    try {
      const cols = await api.getCollections();
      const sel = document.getElementById('modal-col-filter');
      cols.forEach(c => {
        collectionsMap[c._id] = c.name;
        sel.add(new Option(c.name, c._id));
      });
    } catch (e) {}
  }
  document.getElementById('modal-search').value = '';
  document.getElementById('modal-col-filter').value = '';
  renderModalProducts();
};

window.closeProductsModal = function() {
  document.getElementById('products-modal').classList.remove('open');
};

window.renderModalProducts = function() {
  const q = document.getElementById('modal-search').value.toLowerCase().trim();
  const col = document.getElementById('modal-col-filter').value;
  const listEl = document.getElementById('modal-products-list');

  let filtered = allProducts;
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  if (col) filtered = filtered.filter(p => p.collectionId === col);

  if (!filtered.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد منتجات</div>';
    return;
  }

  listEl.innerHTML = filtered.map(p => {
    const img = p.imageUrl || '';
    const imgHtml = img
      ? `<img src="${img}" class="pli-img" alt="${p.name}">`
      : `<div class="pli-img" style="background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:1.2rem">📦</div>`;
    return `
      <label class="product-list-item" style="cursor:pointer">
        <div class="pli-info">
          ${imgHtml}
          <div>
            <div style="font-weight:600;font-size:0.95rem;color:var(--text-main)">${p.name}</div>
            <div style="font-size:0.85rem;color:var(--primary);font-weight:600">${formatPrice(p.basePrice)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:0.75rem;background:var(--bg-body);padding:2px 8px;border-radius:12px;color:var(--text-muted)">في المخزون</span>
          <input type="checkbox" class="pli-checkbox product-select-cb" value="${p._id}">
        </div>
      </label>
    `;
  }).join('');
};

window.addSelectedProducts = function() {
  const checked = document.querySelectorAll('.product-select-cb:checked');
  if (!checked.length) return showToast('اختر منتجاً واحداً على الأقل', 'error');

  checked.forEach(cb => {
    const id = cb.value;
    const p = allProducts.find(x => x._id === id);
    if (p) {
      const existing = cartItems.find(c => c.product._id === id);
      if (existing) existing.quantity++;
      else cartItems.push({ product: p, quantity: 1, selectedOptions: [], discount: 0 });
    }
  });

  closeProductsModal();
  renderCart();
};

// ── Cart Operations ────────────────────────────────────
window.addToCart = function(id) {
  const p = allProducts.find(p => p._id === id);
  if (!p) return;

  const existing = cartItems.find(c => c.product._id === id);
  if (existing) {
    existing.quantity++;
  } else {
    cartItems.push({
      product: p,
      quantity: 1,
      selectedOptions: [],
      discount: 0
    });
  }
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

    // Options HTML (Pills)
    const optionsHtml = (p.options || []).map((group, gi) => {
      const selected = c.selectedOptions.find(o => o.groupName === group.name);
      return `
        <div class="order-item-options">
          <span class="option-group-label">${group.name}${group.required ? ' *' : ''}</span>
          <div class="radio-options">
            ${!group.required ? `<div class="radio-option"><input type="radio" id="opt_${i}_${gi}_none" name="opt_${i}_${gi}" value="" ${!selected ? 'checked' : ''} onchange="setOption(${i},${gi},-1)"><label for="opt_${i}_${gi}_none">بدون</label></div>` : ''}
            ${group.values.map((v, vi) => `
              <div class="radio-option">
                <input type="radio" id="opt_${i}_${gi}_${vi}" name="opt_${i}_${gi}" value="${vi}" ${selected && selected.label === v.label ? 'checked' : ''} onchange="setOption(${i},${gi},${vi})">
                <label for="opt_${i}_${gi}_${vi}">${v.label}${v.price ? ` (+${v.price})` : ''}</label>
              </div>`).join('')}
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
