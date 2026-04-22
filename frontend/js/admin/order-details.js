/** Admin — Order Details JS */

let currentOrder = null;
let allProducts = [];
let collectionsMap = {};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  if (!orderId) {
    window.location.href = 'orders.html';
    return;
  }

  try {
    const [order, products] = await Promise.all([
      api.getOrder(orderId),
      api.getProducts().catch(() => [])
    ]);
    currentOrder = order;
    allProducts = products;
    
    renderOrder();
  } catch (err) {
    showToast('فشل تحميل بيانات الطلب', 'error');
  }
});

// ── Rendering ──────────────────────────────────────────
function renderOrder() {
  if (!currentOrder) return;
  
  const o = currentOrder;
  document.getElementById('page-order-id').textContent = `تعديل الطلب #${o.orderId}`;
  
  // Customer Info
  document.getElementById('view-c-name').textContent = o.customer.name;
  document.getElementById('edit-c-name').value = o.customer.name;
  
  document.getElementById('view-c-phone').textContent = o.customer.phone;
  document.getElementById('edit-c-phone').value = o.customer.phone;
  
  document.getElementById('view-c-phone2').textContent = o.customer.secondPhone || '—';
  document.getElementById('edit-c-phone2').value = o.customer.secondPhone || '';
  
  // Shipping Info
  document.getElementById('view-c-address').textContent = o.customer.address;
  document.getElementById('edit-c-address').value = o.customer.address;
  
  document.getElementById('view-c-gov').textContent = o.customer.government;
  document.getElementById('edit-c-gov').value = o.customer.government;
  
  document.getElementById('view-c-notes').textContent = o.customer.notes || 'لا يوجد ملاحظات';
  document.getElementById('edit-c-notes').value = o.customer.notes || '';
  
  // Payment
  document.getElementById('edit-payment-method').value = o.paymentMethod;
  document.getElementById('edit-paid-amount').value = o.paidAmount || 0;
  
  renderItems();
  updateTotals();
}

function renderItems() {
  const container = document.getElementById('order-items-container');
  if (!currentOrder.items || currentOrder.items.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">لا توجد منتجات</div>';
    return;
  }
  
  container.innerHTML = currentOrder.items.map((item, idx) => {
    const imgHtml = item.imageUrl 
      ? `<img src="${item.imageUrl}" class="item-img" alt="${item.name}">`
      : `<div class="item-img" style="background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:1.5rem">📦</div>`;
      
    const optText = (item.selectedOptions || []).map(op => `${op.groupName}: ${op.label}`).join(' • ');
    
    return `
      <div class="item-row">
        <div class="item-actions">
          <div style="font-weight:700;font-size:1rem">${formatPrice(item.finalPrice)}</div>
          <div style="font-size:0.85rem;color:var(--text-muted)">
            ${formatPrice(item.basePrice)} × <input type="number" value="${item.quantity}" min="1" onchange="updateItemQty(${idx}, this.value)" style="width:40px;text-align:center;border:1px solid #ddd;border-radius:4px;padding:2px">
          </div>
          <div class="item-actions-row mt-8">
            <button class="btn btn-sm" style="background:#fff;border:1px solid #ddd;color:#333;font-size:0.75rem;padding:4px 8px" onclick="promptItemDiscount(${idx})">تطبيق خصم</button>
            <button class="btn btn-sm" style="background:#fff;border:1px solid #ddd;color:var(--danger);font-size:0.75rem;padding:4px 8px" onclick="removeItem(${idx})">إزالة</button>
          </div>
        </div>
        
        <div class="item-details" style="text-align:right">
          <div>
            <div style="font-weight:600;font-size:0.95rem;color:var(--text-main)">${item.name}</div>
            ${optText ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">${optText}</div>` : ''}
            ${item.discount ? `<div style="font-size:0.8rem;color:var(--danger);margin-top:4px">خصم: ${formatPrice(item.discount)}</div>` : ''}
          </div>
          ${imgHtml}
        </div>
      </div>
    `;
  }).join('');
}

function updateTotals() {
  const o = currentOrder;
  let subtotal = 0;
  
  o.items.forEach(item => {
    const optExtra = (item.selectedOptions || []).reduce((s, op) => s + (op.price || 0), 0);
    item.finalPrice = Math.max(0, (item.basePrice + optExtra) * item.quantity - (item.discount || 0));
    subtotal += item.finalPrice;
  });
  
  o.totalPrice = Math.max(0, subtotal + o.shippingFee - (o.discount || 0));
  
  document.getElementById('sum-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('sum-items-count').textContent = o.items.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('sum-shipping').textContent = formatPrice(o.shippingFee);
  
  const discRow = document.getElementById('sum-discount-row');
  if (o.discount > 0) {
    discRow.style.display = 'flex';
    document.getElementById('sum-discount').textContent = formatPrice(o.discount);
  } else {
    discRow.style.display = 'none';
  }
  
  document.getElementById('sum-total').textContent = formatPrice(o.totalPrice);
  updatePaymentStatusUI();
}

function updatePaymentStatusUI() {
  const o = currentOrder;
  o.paidAmount = parseFloat(document.getElementById('edit-paid-amount').value) || 0;
  
  const remaining = Math.max(0, o.totalPrice - o.paidAmount);
  document.getElementById('sum-remaining').textContent = formatPrice(remaining);
  
  const btn = document.getElementById('btn-mark-paid');
  if (remaining === 0 && o.totalPrice > 0) {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'inline-block';
  }
}

// ── Actions ────────────────────────────────────────────

window.toggleEdit = function(cardId) {
  const card = document.getElementById('card-' + cardId);
  card.classList.toggle('editing');
};

window.updateItemQty = function(idx, val) {
  const qty = parseInt(val, 10);
  if (qty >= 1) {
    currentOrder.items[idx].quantity = qty;
    updateTotals();
    renderItems();
  }
};

window.promptItemDiscount = function(idx) {
  const item = currentOrder.items[idx];
  const val = prompt('أدخل قيمة الخصم لهذا المنتج (ج.م):', item.discount || 0);
  if (val !== null) {
    item.discount = Math.max(0, parseFloat(val) || 0);
    updateTotals();
    renderItems();
  }
};

window.removeItem = function(idx) {
  if (confirm('هل أنت متأكد من إزالة هذا المنتج؟')) {
    currentOrder.items.splice(idx, 1);
    updateTotals();
    renderItems();
  }
};

window.promptOrderDiscount = function() {
  const val = prompt('أدخل قيمة الخصم الكلي للطلب (ج.م):', currentOrder.discount || 0);
  if (val !== null) {
    currentOrder.discount = Math.max(0, parseFloat(val) || 0);
    updateTotals();
  }
};

window.markFullyPaid = function() {
  document.getElementById('edit-paid-amount').value = currentOrder.totalPrice;
  updatePaymentStatusUI();
};

// ── Save ───────────────────────────────────────────────

window.saveOrderChanges = async function() {
  const btn = document.getElementById('save-all-btn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';
  
  try {
    const isCustomerEditing = document.getElementById('card-customer').classList.contains('editing');
    const isShippingEditing = document.getElementById('card-shipping').classList.contains('editing');
    
    const updates = {
      items: currentOrder.items,
      discount: currentOrder.discount,
      paymentMethod: document.getElementById('edit-payment-method').value,
      paidAmount: currentOrder.paidAmount,
      paid: currentOrder.paidAmount >= currentOrder.totalPrice
    };
    
    // Include customer updates if edited or always (safer to always grab current input values)
    updates.customer = {
      name: document.getElementById('edit-c-name').value.trim(),
      phone: document.getElementById('edit-c-phone').value.trim(),
      secondPhone: document.getElementById('edit-c-phone2').value.trim(),
      address: document.getElementById('edit-c-address').value.trim(),
      government: document.getElementById('edit-c-gov').value.trim(),
      notes: document.getElementById('edit-c-notes').value.trim()
    };

    await api.updateOrder(currentOrder.orderId, updates);
    showToast('تم حفظ التغييرات ✓');
    
    // Refresh
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'احفظ التغييرات';
    showToast(err.message || 'فشل الحفظ', 'error');
  }
};

// ── Modal Products ─────────────────────────────────────
window.openProductsModal = async function() {
  document.getElementById('products-modal').classList.add('open');
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

  listEl.innerHTML = filtered.map(p => {
    const imgHtml = p.imageUrl ? `<img src="${p.imageUrl}" class="pli-img">` : `<div class="pli-img">📦</div>`;
    return `
      <label class="product-list-item" style="cursor:pointer">
        <div class="pli-info">
          ${imgHtml}
          <div>
            <div style="font-weight:600;font-size:0.95rem">${p.name}</div>
            <div style="font-size:0.85rem;color:var(--primary)">${formatPrice(p.basePrice)}</div>
          </div>
        </div>
        <input type="checkbox" class="pli-checkbox product-select-cb" value="${p._id}">
      </label>
    `;
  }).join('');
};

window.addSelectedProducts = function() {
  const checked = document.querySelectorAll('.product-select-cb:checked');
  checked.forEach(cb => {
    const p = allProducts.find(x => x._id === cb.value);
    if (p) {
      const existing = currentOrder.items.find(i => i.productId === p._id);
      if (existing) {
        existing.quantity++;
      } else {
        currentOrder.items.push({
          productId: p._id,
          name: p.name,
          imageUrl: p.imageUrl || '',
          basePrice: p.basePrice,
          selectedOptions: [], // Default empty options, can enhance later
          quantity: 1,
          discount: 0,
          finalPrice: p.basePrice
        });
      }
    }
  });
  closeProductsModal();
  updateTotals();
  renderItems();
};
