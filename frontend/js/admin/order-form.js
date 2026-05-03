/** Admin — Create Order form JS */

let allProducts = [];
let shippingMap = {};
let cartItems = []; // [{ product, quantity, selectedOptions, discount }]

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  try {
    let products = [];
    try {
      const res = await api.getProducts(1, 1000, true);
      products = (res.products || res).filter(p => p.status !== 'draft');
    } catch (e) { }

    let shipping = {};
    try { shipping = await api.getShipping(); } catch (e) { }

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
window.openProductsModal = async function () {
  document.getElementById('products-modal').classList.add('open');
  if (Object.keys(collectionsMap).length === 0) {
    try {
      const cols = await api.getCollections();
      const sel = document.getElementById('modal-col-filter');
      cols.forEach(c => {
        collectionsMap[c._id] = c.name;
        sel.add(new Option(c.name, c._id));
      });
    } catch (e) { }
  }
  document.getElementById('modal-search').value = '';
  document.getElementById('modal-col-filter').value = '';
  renderModalProducts();
};

window.closeProductsModal = function () {
  document.getElementById('products-modal').classList.remove('open');
};

window.toggleProductVariants = function (pid) {
  const el = document.getElementById(`variants-${pid}`);
  const icon = document.getElementById(`icon-${pid}`);
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = 'block';
    icon.style.transform = 'rotate(180deg)';
  } else {
    el.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  }
};

function getProductCombinations(options) {
  if (!options || options.length === 0) return [];
  let results = [[]];
  for (const group of options) {
    const currentResults = [];
    const values = group.required ? group.values : [{ label: 'بدون ' + group.name, price: 0 }, ...group.values];
    for (const res of results) {
      for (const val of values) {
        currentResults.push([...res, { groupName: group.name, label: val.label, price: val.price }]);
      }
    }
    results = currentResults;
  }
  return results;
}

window.renderModalProducts = function () {
  const q = document.getElementById('modal-search').value.toLowerCase().trim();
  const col = document.getElementById('modal-col-filter').value;
  const listEl = document.getElementById('modal-products-list');

  let filtered = allProducts;
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  if (col) filtered = filtered.filter(p => p.collectionId === col || (p.collectionIds && p.collectionIds.includes(col)));

  if (!filtered.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد منتجات</div>';
    return;
  }

  listEl.innerHTML = filtered.map(p => {
    const imgHtml = p.imageUrl ? `<img src="${p.imageUrl}" class="pli-img">` : `<div class="pli-img">📦</div>`;
    const hasOptions = p.options && p.options.length > 0;
    const effectiveBase = (p.salePrice && p.salePrice < p.basePrice) ? p.salePrice : p.basePrice;

    if (!hasOptions) {
      return `
        <div style="width: 100%; display: block;">
          <label class="product-list-item" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid var(--border-color); width: 100%; box-sizing: border-box;">
            <div class="pli-info" style="display:flex; align-items:center; gap:12px;">
              ${imgHtml}
              <div>
                <div style="font-weight:600;font-size:0.95rem">${p.name}</div>
                <div style="font-size:0.85rem;color:var(--primary)">${formatPrice(effectiveBase)}</div>
              </div>
            </div>
            <input type="checkbox" class="pli-checkbox product-select-cb" value="${p._id}" style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;">
          </label>
        </div>
      `;
    }

    const combinations = getProductCombinations(p.options);
    const variantsHtml = combinations.map((combo, idx) => {
      const title = combo.map(c => c.label).join(' / ');
      const extraPrice = combo.reduce((sum, c) => sum + (c.price || 0), 0);
      const finalPrice = effectiveBase + extraPrice;
      const comboStr = encodeURIComponent(JSON.stringify(combo));
      return `
        <label class="product-variant-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid var(--border-color); background:#fafafa; cursor:pointer; padding-right:48px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:0.9rem;font-weight:500;">${title}</div>
            <div style="font-size:0.85rem;color:var(--primary)">${formatPrice(finalPrice)}</div>
          </div>
          <input type="checkbox" class="pli-checkbox product-variant-cb" data-pid="${p._id}" data-combo="${comboStr}" style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;">
        </label>
      `;
    }).join('');

    return `
      <div>
        <div class="product-list-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="toggleProductVariants('${p._id}')">
          <div class="pli-info" style="display:flex; align-items:center; gap:12px;">
            <div id="icon-${p._id}" style="transition:transform 0.2s; color:var(--text-muted);">▼</div>
            ${imgHtml}
            <div style="font-weight:600;font-size:0.95rem">${p.name}</div>
          </div>
        </div>
        <div id="variants-${p._id}" style="display:none;">
          ${variantsHtml}
        </div>
      </div>
    `;
  }).join('');
};

window.addSelectedProducts = function () {
  const checkedSimple = document.querySelectorAll('.product-select-cb:checked');
  const checkedVariants = document.querySelectorAll('.product-variant-cb:checked');

  if (checkedSimple.length === 0 && checkedVariants.length === 0) {
    return showToast('اختر منتجاً واحداً على الأقل', 'error');
  }

  checkedSimple.forEach(cb => {
    const p = allProducts.find(x => x._id === cb.value);
    if (p) {
      const existing = cartItems.find(c => c.product._id === p._id && (!c.selectedOptions || c.selectedOptions.length === 0));
      if (existing) {
        existing.quantity++;
      } else {
        cartItems.push({ product: p, quantity: 1, selectedOptions: [], discount: 0 });
      }
    }
  });

  checkedVariants.forEach(cb => {
    const p = allProducts.find(x => x._id === cb.dataset.pid);
    if (p) {
      const combo = JSON.parse(decodeURIComponent(cb.dataset.combo));
      const existing = cartItems.find(c => {
        if (c.product._id !== p._id) return false;
        if (!c.selectedOptions || c.selectedOptions.length !== combo.length) return false;
        return combo.every(cv => c.selectedOptions.some(so => so.groupName === cv.groupName && so.label === cv.label));
      });
      if (existing) {
        existing.quantity++;
      } else {
        cartItems.push({ product: p, quantity: 1, selectedOptions: combo, discount: 0 });
      }
    }
  });

  closeProductsModal();
  renderCart();
};

window.removeCartItem = function (index) {
  cartItems.splice(index, 1);
  renderCart();
};

window.updateItemQty = function (idx, val) {
  const qty = parseInt(val, 10);
  if (qty >= 1) {
    cartItems[idx].quantity = qty;
    recalcSummary();
    renderCart();
  }
};

function renderCart() {
  const container = document.getElementById('cart-items-container');
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
      ? `<img src="${imgSrc}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;" alt="${p.name}">`
      : `<div style="width:56px;height:56px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">📦</div>`;

    const optText = (c.selectedOptions || []).map(op => op.label).join(' / ');

    return `
      <div class="product-card-item" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fff;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="text-align: right;">
              <div style="font-weight: 600; font-size: 1rem; color: #1e293b;">${p.name}</div>
              ${optText ? `<div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">${optText}</div>` : ''}
            </div>
            ${imgHtml}
          </div>
          <div style="display: flex; align-items: center; gap: 16px; flex-direction: row-reverse;">
            <div style="font-size: 0.9rem; color: #64748b;" dir="ltr">${c.quantity} x ${formatPrice((p.salePrice && p.salePrice < p.basePrice) ? p.salePrice : p.basePrice)}</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: #1e293b;">${formatPrice(itemTotal(c))}</div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-start; flex-direction: row-reverse; align-items: center;">
          <div style="display:flex; align-items:center; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; background:#fff; height: 32px;">
            <button type="button" onclick="updateItemQty(${i}, ${c.quantity + 1})" style="width:28px;height:32px;background:#fff;border:none;border-left:1px solid #e2e8f0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">+</button>
            <div style="width:32px;text-align:center;font-size:0.95rem;line-height:32px;font-weight:600;">${c.quantity}</div>
            <button type="button" onclick="${c.quantity > 1 ? `updateItemQty(${i}, ${c.quantity - 1})` : ''}" style="width:28px;height:32px;background:${c.quantity > 1 ? '#fff' : '#f8fafc'};border:none;border-right:1px solid #e2e8f0;cursor:${c.quantity > 1 ? 'pointer' : 'not-allowed'};display:flex;align-items:center;justify-content:center;color:${c.quantity > 1 ? 'inherit' : '#cbd5e1'};font-size:1.1rem;" ${c.quantity <= 1 ? 'disabled' : ''}>-</button>
          </div>
          <button type="button" class="btn btn-sm" onclick="removeCartItem(${i})" style="background: #fff; border: 1px solid #fee2e2; color: #ef4444; display: flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; height: 32px;">إزالة</button>
        </div>
      </div>`;
  }).join('');
  recalcSummary();
}

function itemTotal(c) {
  const optExtra = c.selectedOptions.reduce((s, o) => s + (o.price || 0), 0);
  const effectiveBase = (c.product.salePrice && c.product.salePrice < c.product.basePrice) ? c.product.salePrice : c.product.basePrice;
  return Math.max(0, (effectiveBase + optExtra) * c.quantity - (c.discount || 0));
}

window.recalcSummary = function () {
  let subtotal = 0;
  cartItems.forEach(c => subtotal += itemTotal(c));
  const gov = document.getElementById('c-gov').value;
  const shipping = shippingMap[gov] || 0;
  const orderDiscount = parseFloat(document.getElementById('order-discount').value) || 0;
  const total = Math.max(0, subtotal + shipping - orderDiscount);
  document.getElementById('sum-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('sum-shipping').textContent = formatPrice(shipping);
  document.getElementById('sum-total').textContent = formatPrice(total);
};

window.updatePaymentUI = function () {
  document.querySelectorAll('.payment-method-card').forEach(card => {
    card.classList.toggle('selected', card.querySelector('input').checked);
  });
};

window.submitOrder = async function () {
  if (cartItems.length === 0) return showToast('أضف منتجاً واحداً على الأقل', 'error');
  const name = document.getElementById('c-name').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const address = document.getElementById('c-address').value.trim();
  const gov = document.getElementById('c-gov').value;
  if (!name || !phone || !address || !gov) return showToast('يرجى ملء جميع الحقول المطلوبة للعميل', 'error');

  const btn = document.getElementById('submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'جارٍ الحفظ...';
  }

  const finalItems = cartItems.map(c => ({
    productId: c.product._id,
    name: c.product.name,
    imageUrl: c.product.imageUrl || '',
    basePrice: (c.product.salePrice && c.product.salePrice < c.product.basePrice) ? c.product.salePrice : c.product.basePrice,
    selectedOptions: c.selectedOptions,
    quantity: c.quantity,
    discount: c.discount || 0,
    finalPrice: itemTotal(c)
  }));

  const payload = {
    customer: { name, phone, secondPhone: document.getElementById('c-second-phone').value.trim(), address, government: gov, notes: document.getElementById('c-notes').value.trim() },
    items: finalItems,
    discount: parseFloat(document.getElementById('order-discount').value) || 0,
    paymentMethod: document.querySelector('input[name="payment"]:checked').value,
    paidAmount: Math.max(0, parseFloat(document.getElementById('paid-amount').value) || 0)
  };

  try {
    await api.createOrder(payload);
    showToast('تم إنشاء الطلب بنجاح!');
    setTimeout(() => window.location.href = 'orders', 900);
  } catch (err) {
    showToast(err.message || 'حدث خطأ أثناء إنشاء الطلب', 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'حفظ الطلب';
    }
  }
};

window.setupSearch = function () {
  const input = document.getElementById('product-search-input');
  if (!input) return;
  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const results = document.getElementById('search-results');
    if (q.length < 2) { results.innerHTML = ''; return; }
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q));
    results.innerHTML = filtered.map(p => `
      <div class="search-item" onclick="addToCart('${p._id}')">
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:0.85rem;color:var(--text-muted)">${formatPrice(p.salePrice || p.basePrice)}</div>
      </div>
    `).join('');
  });
};

window.addToCart = function (id) {
  const p = allProducts.find(x => x._id === id);
  if (!p) return;
  cartItems.push({ product: p, quantity: 1, selectedOptions: [], discount: 0 });
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('product-search-input').value = '';
  renderCart();
};
