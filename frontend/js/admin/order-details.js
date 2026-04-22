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
  document.getElementById('view-c-name').textContent = o.customer.name || '—';
  document.getElementById('view-c-phone').textContent = o.customer.phone || '—';
  document.getElementById('view-c-phone2').textContent = o.customer.secondPhone || '—';
  
  // Shipping Info
  document.getElementById('view-c-address').textContent = o.customer.address || '—';
  document.getElementById('view-c-gov').textContent = o.customer.government || '—';
  document.getElementById('view-c-notes').textContent = o.customer.notes || 'لا يوجد ملاحظات';
  
  // Payment
  const paymentLabels = {
    'cash_on_delivery': 'الدفع عند الاستلام',
    'vodafone_cash': 'فودافون كاش',
    'instapay': 'إنستاباي'
  };
  document.getElementById('view-payment-method').textContent = paymentLabels[o.paymentMethod] || o.paymentMethod;
  document.getElementById('view-paid-amount').textContent = formatPrice(o.paidAmount || 0);
  
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
      <div class="item-row" style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
        
        <!-- Right side: Image and Info -->
        <div class="item-details" style="display:flex; align-items:center; gap:16px; flex:1;">
          ${imgHtml}
          <div>
            <div style="font-weight:600;font-size:0.95rem;color:var(--text-main)">${item.name}</div>
            ${optText ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">${optText}</div>` : ''}
            ${item.discount ? `<div style="font-size:0.8rem;color:var(--danger);margin-top:4px">خصم: ${formatPrice(item.discount)}</div>` : ''}
          </div>
        </div>

        <!-- Left side: Actions & Pricing -->
        <div class="item-actions" style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; justify-content:flex-end;">
          
          <!-- Action Buttons -->
          <button class="btn btn-sm" style="background:#fff;border:1px solid var(--border-color);color:#333;font-size:0.75rem;padding:4px 8px" onclick="promptItemDiscount(${idx})">تطبيق خصم</button>
          
          <!-- Price & Math -->
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-size:0.9rem;color:var(--text-muted)">
              ${formatPrice(item.basePrice)} ×
            </div>
            
            <!-- Quantity Stepper -->
            <div class="qty-stepper" style="display:flex; align-items:center; border:1px solid var(--border-color); border-radius:6px; overflow:hidden;">
              <button type="button" onclick="updateItemQty(${idx}, ${item.quantity + 1})" style="width:28px;height:28px;background:#f9f9f9;border:none;border-left:1px solid var(--border-color);cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
              <div style="width:32px;text-align:center;font-size:0.95rem;line-height:28px;font-weight:600;">${item.quantity}</div>
              <button type="button" onclick="${item.quantity > 1 ? `updateItemQty(${idx}, ${item.quantity - 1})` : ''}" style="width:28px;height:28px;background:${item.quantity > 1 ? '#f9f9f9' : '#eee'};border:none;border-right:1px solid var(--border-color);cursor:${item.quantity > 1 ? 'pointer' : 'not-allowed'};display:flex;align-items:center;justify-content:center;color:${item.quantity > 1 ? 'inherit' : '#aaa'};" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
            </div>
          </div>
          
          <!-- Final Price -->
          <div style="font-weight:700;font-size:1.1rem;color:var(--primary);min-width:70px;text-align:left;">${formatPrice(item.finalPrice)}</div>
          
          <button class="btn btn-sm" style="background:none;border:none;color:var(--danger);font-size:1.4rem;cursor:pointer;padding:0;line-height:1;margin-right:8px;" onclick="removeItem(${idx})">×</button>
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
  const remaining = Math.max(0, o.totalPrice - (o.paidAmount || 0));
  document.getElementById('sum-remaining').textContent = formatPrice(remaining);
  
  const btn = document.getElementById('btn-mark-paid');
  const badge = document.getElementById('view-payment-status');
  
  if (remaining === 0 && o.totalPrice > 0) {
    btn.style.display = 'none';
    badge.textContent = 'مدفوع';
    badge.style.background = '#dcfce7';
    badge.style.color = '#166534';
  } else if (o.paidAmount > 0) {
    btn.style.display = 'inline-block';
    badge.textContent = 'مدفوع جزئياً';
    badge.style.background = '#fef3c7';
    badge.style.color = '#92400e';
  } else {
    btn.style.display = 'inline-block';
    badge.textContent = 'غير مدفوع';
    badge.style.background = '#fee2e2';
    badge.style.color = '#991b1b';
  }
}

// ── Modals & Editing ───────────────────────────────────

window.closeModal = function(modalId) {
  document.getElementById(modalId).style.display = 'none';
};

window.openCustomerModal = function() {
  document.getElementById('modal-c-name').value = currentOrder.customer.name || '';
  document.getElementById('modal-c-phone').value = currentOrder.customer.phone || '';
  document.getElementById('modal-c-phone2').value = currentOrder.customer.secondPhone || '';
  document.getElementById('customer-modal').style.display = 'flex';
};

window.applyCustomerChanges = function() {
  currentOrder.customer.name = document.getElementById('modal-c-name').value.trim();
  currentOrder.customer.phone = document.getElementById('modal-c-phone').value.trim();
  currentOrder.customer.secondPhone = document.getElementById('modal-c-phone2').value.trim();
  renderOrder();
  closeModal('customer-modal');
};

window.openShippingModal = function() {
  document.getElementById('modal-c-address').value = currentOrder.customer.address || '';
  document.getElementById('modal-c-gov').value = currentOrder.customer.government || '';
  document.getElementById('modal-c-notes').value = currentOrder.customer.notes || '';
  document.getElementById('shipping-modal').style.display = 'flex';
};

window.applyShippingChanges = function() {
  currentOrder.customer.address = document.getElementById('modal-c-address').value.trim();
  currentOrder.customer.government = document.getElementById('modal-c-gov').value.trim();
  currentOrder.customer.notes = document.getElementById('modal-c-notes').value.trim();
  renderOrder();
  closeModal('shipping-modal');
};

window.openPaymentModal = function() {
  document.getElementById('modal-payment-method').value = currentOrder.paymentMethod || 'cash_on_delivery';
  document.getElementById('modal-paid-amount').value = currentOrder.paidAmount || 0;
  document.getElementById('payment-modal').style.display = 'flex';
};

window.applyPaymentChanges = function() {
  currentOrder.paymentMethod = document.getElementById('modal-payment-method').value;
  currentOrder.paidAmount = parseFloat(document.getElementById('modal-paid-amount').value) || 0;
  renderOrder();
  closeModal('payment-modal');
};

// ── Actions ────────────────────────────────────────────

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
  currentOrder.paidAmount = currentOrder.totalPrice;
  renderOrder();
};

// ── Save ───────────────────────────────────────────────

window.saveOrderChanges = async function() {
  const btn = document.getElementById('save-all-btn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';
  
  try {
    const updates = {
      items: currentOrder.items,
      discount: currentOrder.discount,
      paymentMethod: currentOrder.paymentMethod,
      paidAmount: currentOrder.paidAmount,
      paid: currentOrder.paidAmount >= currentOrder.totalPrice,
      customer: currentOrder.customer
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
  document.getElementById('products-modal').style.display = 'flex';
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
  document.getElementById('products-modal').style.display = 'none';
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
