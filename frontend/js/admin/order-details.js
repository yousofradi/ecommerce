/** Admin — Order Details JS */

let currentOrder = null;
let allProducts = [];
let collectionsMap = {};
let shippingMap = {};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  if (!orderId) {
    window.location.href = 'orders';
    return;
  }

  document.body.classList.add('is-loading');

  try {
    const [order, shipping] = await Promise.all([
      api.getOrder(orderId),
      api.getShipping().catch(() => ({}))
    ]);
    currentOrder = order;
    shippingMap = shipping;

    // Fallback if DB is empty
    if (Object.keys(shippingMap).length === 0) {
      shippingMap = {
        'القاهرة': 85, 'الجيزة': 85, 'الإسكندرية': 85, 'البحيرة': 85, 'القليوبية': 85, 'الغربية': 85, 'المنوفية': 85, 'دمياط': 85, 'الدقهلية': 85, 'كفر الشيخ': 85, 'الشرقية': 85, 'الاسماعيلية': 95, 'السويس': 95, 'بورسعيد': 95, 'الفيوم': 110, 'بني سويف': 110, 'المنيا': 110, 'اسيوط': 110, 'سوهاج': 130, 'قنا': 130, 'أسوان': 130, 'الأقصر': 130, 'البحر الأحمر': 130, 'مرسي مطروح': 135, 'الوادي الجديد': 135, 'شمال سيناء': 135, 'جنوب سيناء': 135
      };
    }

    // Populate government dropdown
    const govSelect = document.getElementById('modal-c-gov');
    if (govSelect) {
      Object.keys(shippingMap).forEach(gov => {
        govSelect.add(new Option(gov, gov));
      });
    }

    renderOrder();
    document.body.classList.remove('is-loading');
  } catch (err) {
    showToast('فشل تحميل بيانات الطلب', 'error');
    document.body.classList.remove('is-loading');
  }

  // Global Save Handler
  window.handleGlobalSave = async () => {
    await saveOrderChanges();
    return true;
  };
});


// ── Rendering ──────────────────────────────────────────
function renderOrder() {
  if (!currentOrder) return;

  const o = currentOrder;
  document.getElementById('page-order-id').textContent = `تعديل الطلب #${o.orderId}`;

  if (o.status === 'cancelled') {
    document.getElementById('cancel-order-btn').style.display = 'none';
    document.getElementById('page-order-id').innerHTML += ' <span class="badge badge-danger">ملغي</span>';
  }

  // Customer Info Consolidated
  document.getElementById('view-c-name').textContent = o.customer.name || '—';
  document.getElementById('view-c-phone').textContent = o.customer.phone || '—';
  
  const phone2El = document.getElementById('view-c-phone2');
  if (o.customer.secondPhone) {
    phone2El.textContent = o.customer.secondPhone;
    phone2El.style.display = 'block';
  } else {
    phone2El.style.display = 'none';
  }

  // Shipping Info
  document.getElementById('view-c-address').textContent = o.customer.address || 'لا يوجد عنوان';
  document.getElementById('view-c-gov').textContent = o.customer.government || 'لا يوجد محافظة';
  
  const notesEl = document.getElementById('view-c-notes');
  const notesContainer = document.getElementById('view-c-notes-container');
  if (o.customer.notes) {
    notesEl.textContent = o.customer.notes;
    notesContainer.style.display = 'block';
  } else {
    notesContainer.style.display = 'none';
  }

  // Payment
  const paymentLabels = {
    'vodafone_cash': 'فودافون كاش',
    'instapay': 'إنستاباي'
  };
  document.getElementById('view-payment-method').textContent = paymentLabels[o.paymentMethod] || o.paymentMethod;
  
  const paidInput = document.getElementById('inline-paid-amount');
  if (paidInput) paidInput.value = o.paidAmount || 0;
  
  const discInput = document.getElementById('inline-order-discount');
  if (discInput) discInput.value = o.discount || 0;
  
  const methodSelect = document.getElementById('inline-payment-method');
  if (methodSelect) methodSelect.value = o.paymentMethod || 'vodafone_cash';

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
      : `<div class="item-img" style="background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:1.5rem"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>`;

    const optText = (item.selectedOptions || []).map(op => op.label).join(' / ');

    return `
      <div class="product-card-item" draggable="true" data-idx="${idx}" ondragstart="onDragStart(event)" ondragover="onDragOver(event)" ondrop="onDrop(event)" ondragend="onDragEnd(event)" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fff; transition: opacity 0.2s, transform 0.2s; cursor: grab;">
        <!-- Top Row: Info & Pricing -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <!-- Right side: Name + Drag Handle, then Image -->
          <div style="display: flex; align-items: center; gap: 12px; flex-direction: row-reverse;">
            <div style="cursor:grab; color:#94a3b8; display:flex; align-items:center; padding:4px;" title="اسحب لتغيير الترتيب">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600; font-size: 1rem; color: #1e293b;">${item.name}</div>
              ${optText ? `<div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">${optText}</div>` : ''}
              ${item.discount ? `<div style="font-size:0.8rem;color:${item.discount > 0 ? 'var(--danger)' : 'var(--primary)'};margin-top:4px">${item.discount > 0 ? 'خصم:' : 'إضافة:'} ${formatPrice(Math.abs(item.discount))}</div>` : ''}
            </div>
            ${imgHtml}
          </div>
          <!-- Left side: Pricing -->
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="font-weight: 700; font-size: 1.1rem; color: #1e293b;">${formatPrice(item.finalPrice)}</div>
            <div style="font-size: 0.9rem; color: #64748b;" dir="ltr">${item.quantity} x ${formatPrice(item.basePrice)}</div>
          </div>
        </div>

        <!-- Bottom Row: Actions -->
        <div style="display: flex; gap: 8px; justify-content: flex-start; flex-direction: row-reverse; align-items: center;">
          <!-- Reorder arrows -->
          <div style="display:flex; gap:2px;">
            <button class="btn btn-sm" onclick="moveItem(${idx}, -1)" style="background:#fff; border:1px solid #e2e8f0; color:#475569; padding:4px 8px; border-radius:6px; height:32px; ${idx === 0 ? 'opacity:0.3;cursor:not-allowed;' : ''}" ${idx === 0 ? 'disabled' : ''} title="تحريك لأعلى">▲</button>
            <button class="btn btn-sm" onclick="moveItem(${idx}, 1)" style="background:#fff; border:1px solid #e2e8f0; color:#475569; padding:4px 8px; border-radius:6px; height:32px; ${idx === currentOrder.items.length - 1 ? 'opacity:0.3;cursor:not-allowed;' : ''}" ${idx === currentOrder.items.length - 1 ? 'disabled' : ''} title="تحريك لأسفل"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-top: -2px;"><path d="M6 9l6 6 6-6"/></svg></button>
          </div>

          <!-- Inline Discount -->
          <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="font-size: 0.75rem; color: #64748b;">خصم:</span>
            <input type="number" value="${item.discount || 0}" style="width: 60px; border: none; background: transparent; text-align: center; font-size: 0.85rem; font-weight: 600; outline: none;" onchange="updateInlineItemDiscount(${idx}, this.value)">
            <span style="font-size: 0.75rem; color: #64748b;">ج.م.</span>
          </div>
          
          <!-- Quantity Stepper -->
          <div class="qty-stepper" style="display:flex; align-items:center; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; background:#fff; height: 32px;">
            <button type="button" onclick="updateItemQty(${idx}, ${item.quantity + 1})" style="width:28px;height:32px;background:#fff;border:none;border-left:1px solid #e2e8f0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">+</button>
            <div style="width:32px;text-align:center;font-size:0.95rem;line-height:32px;font-weight:600;">${item.quantity}</div>
            <button type="button" onclick="${item.quantity > 1 ? `updateItemQty(${idx}, ${item.quantity - 1})` : ''}" style="width:28px;height:32px;background:${item.quantity > 1 ? '#fff' : '#f8fafc'};border:none;border-right:1px solid #e2e8f0;cursor:${item.quantity > 1 ? 'pointer' : 'not-allowed'};display:flex;align-items:center;justify-content:center;color:${item.quantity > 1 ? 'inherit' : '#cbd5e1'};font-size:1.1rem;" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
          </div>

          <button class="btn btn-sm" onclick="removeItem(${idx})" style="background: #fff; border: 1px solid #fee2e2; color: #ef4444; display: flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; height: 32px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            إزالة
          </button>
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
  if (o.discount !== 0 && o.discount !== undefined && o.discount !== null) {
    discRow.style.display = 'flex';
    document.getElementById('sum-discount').textContent = formatPrice(Math.abs(o.discount));
    const label = document.getElementById('sum-discount-label');
    if (label) {
      label.textContent = o.discount > 0 ? 'خصم الطلب' : 'إضافة للطلب';
      label.style.color = o.discount > 0 ? 'var(--danger)' : 'var(--primary)';
    }
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

window.openModal = function (modalId) {
  document.getElementById(modalId).style.display = 'flex';
};

window.closeModal = function (modalId) {
  document.getElementById(modalId).style.display = 'none';
};

window.openCustomerModal = function () {
  document.getElementById('modal-c-name').value = currentOrder.customer.name || '';
  document.getElementById('modal-c-phone').value = currentOrder.customer.phone || '';
  document.getElementById('modal-c-phone2').value = currentOrder.customer.secondPhone || '';
  document.getElementById('modal-c-gov').value = currentOrder.customer.government || '';
  document.getElementById('modal-c-address').value = currentOrder.customer.address || '';
  document.getElementById('modal-c-notes').value = currentOrder.customer.notes || '';
  document.getElementById('customer-modal').style.display = 'flex';
};

window.applyCustomerChanges = async function () {
  const name = document.getElementById('modal-c-name').value.trim();
  const phone = document.getElementById('modal-c-phone').value.trim();
  
  if (!name || !phone) {
    showToast('الاسم ورقم الهاتف مطلوبان', 'error');
    return;
  }

  currentOrder.customer.name = name;
  currentOrder.customer.phone = phone;
  currentOrder.customer.secondPhone = document.getElementById('modal-c-phone2').value.trim();
  currentOrder.customer.government = document.getElementById('modal-c-gov').value;
  currentOrder.customer.address = document.getElementById('modal-c-address').value.trim();
  currentOrder.customer.notes = document.getElementById('modal-c-notes').value.trim();
  
  renderOrder();
  closeModal('customer-modal');
  
  // Save immediately
  await saveOrderChanges(true);
  
  // Hide the unsaved changes bar
  const bar = document.getElementById('unsaved-changes-bar');
  if (bar) bar.classList.remove('visible');
};

window.openPaymentModal = function () {
  document.getElementById('modal-payment-method').value = currentOrder.paymentMethod || 'vodafone_cash';
  document.getElementById('modal-paid-amount').value = currentOrder.paidAmount || 0;
  document.getElementById('payment-modal').style.display = 'flex';
};

window.applyPaymentChanges = async function () {
  currentOrder.paymentMethod = document.getElementById('modal-payment-method').value;
  currentOrder.paidAmount = parseFloat(document.getElementById('modal-paid-amount').value) || 0;
  currentOrder.forcePaymentWebhook = true; // Flag to force trigger webhook
  renderOrder();
  closeModal('payment-modal');
  
  // Save immediately
  await saveOrderChanges(true);
  
  // Hide the unsaved changes bar
  const bar = document.getElementById('unsaved-changes-bar');
  if (bar) bar.classList.remove('visible');
};

// ── Actions ────────────────────────────────────────────

// ── Drag-and-Drop Reorder ──────────────────────────────
let dragIdx = null;

window.onDragStart = function (e) {
  dragIdx = parseInt(e.currentTarget.dataset.idx);
  e.currentTarget.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
};

window.onDragOver = function (e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const card = e.currentTarget;
  card.style.borderTop = '3px solid var(--primary)';
};

window.onDrop = function (e) {
  e.preventDefault();
  const dropIdx = parseInt(e.currentTarget.dataset.idx);
  e.currentTarget.style.borderTop = '';
  if (dragIdx !== null && dragIdx !== dropIdx) {
    const items = currentOrder.items;
    const [moved] = items.splice(dragIdx, 1);
    items.splice(dropIdx, 0, moved);
    renderItems();
    updateTotals();
    if (window.markAsModified) window.markAsModified();
  }
};

window.onDragEnd = function (e) {
  e.currentTarget.style.opacity = '1';
  // Clean up all border highlights
  document.querySelectorAll('.product-card-item').forEach(el => {
    el.style.borderTop = '';
  });
  dragIdx = null;
};

window.moveItem = function (idx, direction) {
  const items = currentOrder.items;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= items.length) return;
  [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
  renderItems();
  updateTotals();
  if (window.markAsModified) window.markAsModified();
};

window.updateItemQty = function (idx, val) {
  const qty = parseInt(val, 10);
  if (qty >= 1) {
    currentOrder.items[idx].quantity = qty;
    updateTotals();
    renderItems();
    if (window.markAsModified) window.markAsModified();
  }
};

window.promptItemQty = function (idx) {
  const item = currentOrder.items[idx];
  document.getElementById('modal-qty-idx').value = idx;
  document.getElementById('modal-item-qty').value = item.quantity;
  openModal('item-qty-modal');
};

window.applyItemQty = function () {
  const idx = parseInt(document.getElementById('modal-qty-idx').value, 10);
  const qty = parseInt(document.getElementById('modal-item-qty').value, 10);
  if (qty >= 1 && currentOrder.items[idx]) {
    currentOrder.items[idx].quantity = qty;
    updateTotals();
    renderItems();
    if (window.markAsModified) window.markAsModified();
  }
  closeModal('item-qty-modal');
};

window.openItemDiscountModal = function (idx) {
  const item = currentOrder.items[idx];
  document.getElementById('modal-item-idx').value = idx;
  document.getElementById('modal-item-discount').value = item.discount || 0;
  openModal('item-discount-modal');
};

window.removeItem = function (idx) {
  const item = currentOrder.items[idx];
  if (!item) return;

  document.getElementById('modal-delete-idx').value = idx;
  const previewEl = document.getElementById('delete-item-preview');
  const imgHtml = item.imageUrl
    ? `<div style="position:relative"><img src="${item.imageUrl}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;"><span style="position:absolute;bottom:-5px;left:-5px;background:#64748b;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;border:2px solid #fff;">${item.quantity}</span></div>`
    : `<div style="width:80px;height:80px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.5rem"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>`;

  previewEl.innerHTML = `
    <div style="font-weight:600; color:#1e293b; font-size:1rem; text-align:right; flex:1; margin-right:16px;">${item.name}</div>
    ${imgHtml}
  `;

  openModal('delete-confirm-modal');
};

window.confirmRemoveItem = function () {
  const idx = parseInt(document.getElementById('modal-delete-idx').value);
  if (!isNaN(idx)) {
    currentOrder.items.splice(idx, 1);
    closeModal('delete-confirm-modal');
    updateTotals();
    renderItems();
    if (window.markAsModified) window.markAsModified();
  }
};

window.promptOrderDiscount = function () {
  openModal('order-discount-modal');
  document.getElementById('modal-order-discount').value = currentOrder.discount || 0;
};

window.updateInlinePaidAmount = async function(val) {
  currentOrder.paidAmount = parseFloat(val) || 0;
  updateTotals();
  await saveOrderChanges(true);
};

window.updateInlineOrderDiscount = async function(val) {
  currentOrder.discount = parseFloat(val) || 0;
  updateTotals();
  await saveOrderChanges(true);
};

window.updateInlinePaymentMethod = async function(val) {
  currentOrder.paymentMethod = val;
  updateTotals();
  await saveOrderChanges(true);
};

window.updateInlineItemDiscount = async function(idx, val) {
  const item = currentOrder.items[idx];
  if (item) {
    item.discount = parseFloat(val) || 0;
    updateTotals();
    renderItems();
    await saveOrderChanges(true);
  }
};

window.markFullyPaid = async function () {
  currentOrder.paidAmount = currentOrder.totalPrice;
  currentOrder.forcePaymentWebhook = true;
  renderOrder();
  await saveOrderChanges(true);
};

// ── Save ───────────────────────────────────────────────

window.saveOrderChanges = async function (silent = false) {
  const btn = document.getElementById('save-all-btn');
  if (!silent) {
    btn.disabled = true;
    btn.textContent = 'جارٍ الحفظ...';
  }

  try {
    const updates = {
      items: currentOrder.items,
      discount: currentOrder.discount,
      paymentMethod: currentOrder.paymentMethod,
      paidAmount: currentOrder.paidAmount,
      paid: currentOrder.paidAmount >= currentOrder.totalPrice,
      customer: currentOrder.customer,
      forcePaymentWebhook: currentOrder.forcePaymentWebhook
    };

    await api.updateOrder(currentOrder.orderId, updates);
    currentOrder.forcePaymentWebhook = false; // Reset the flag

    if (!silent) {
      showToast('تم حفظ التغييرات <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><polyline points="20 6 9 17 4 12"/></svg>');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showToast('تم تحديث البيانات بنجاح', 'success');
    }
  } catch (err) {
    if (!silent) {
      btn.disabled = false;
      btn.textContent = 'احفظ التغييرات';
    }
    showToast(err.message || 'فشل الحفظ', 'error');
  }
};

window.cancelOrder = async function () {
  const confirmed = await window.showConfirmModal('تأكيد الإلغاء', 'هل أنت متأكد من إلغاء هذا الطلب؟ سيتم إرسال إشعار بذلك وتصفير القيم.');
  if (!confirmed) return;

  try {
    const btn = document.getElementById('cancel-order-btn');
    btn.disabled = true;
    btn.textContent = 'جارٍ الإلغاء...';

    await api.cancelOrder(currentOrder.orderId);
    showToast('تم إلغاء الطلب بنجاح');
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    showToast(err.message || 'فشل الإلغاء', 'error');
    document.getElementById('cancel-order-btn').disabled = false;
    document.getElementById('cancel-order-btn').textContent = 'إلغاء الطلب';
  }
};

// ── Modal Products ─────────────────────────────────────
window.openProductsModal = async function () {
  document.getElementById('products-modal').style.display = 'flex';
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
  renderModalProducts();
};

window.closeProductsModal = function () {
  document.getElementById('products-modal').style.display = 'none';
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
  if (col) filtered = filtered.filter(p => p.collectionId === col);

  listEl.innerHTML = filtered.map(p => {
    const imgHtml = p.imageUrl ? `<img src="${p.imageUrl}" class="pli-img">` : `<div class="pli-img"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>`;
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
      // We store combo data in a data attribute
      const comboStr = encodeURIComponent(JSON.stringify(combo));
      return `
        <label class="product-variant-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid var(--border-color); background:#fafafa; cursor:pointer; padding-right:48px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:0.9rem;font-weight:500;">${title}</div>
            <div style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px; font-size:0.75rem;">في المخزون</div>
            <div style="font-size:0.85rem;color:var(--primary)">${formatPrice(finalPrice)}</div>
          </div>
          <input type="checkbox" class="pli-checkbox product-variant-cb" data-pid="${p._id}" data-combo="${comboStr}">
        </label>
      `;
    }).join('');

    return `
      <div>
        <div class="product-list-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="toggleProductVariants('${p._id}')">
          <div class="pli-info" style="display:flex; align-items:center; gap:12px;">
            <div id="icon-${p._id}" style="transition:transform 0.2s; color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-top: -2px;"><path d="M6 9l6 6 6-6"/></svg></div>
            ${imgHtml}
            <div style="font-weight:600;font-size:0.95rem">${p.name}</div>
          </div>
          <!-- Parent does not have a checkbox if it has variants -->
        </div>
        <div id="variants-${p._id}" style="display:none;">
          ${variantsHtml}
        </div>
      </div>
    `;
  }).join('');
};

window.openProductsModal = async function () {
  openModal('products-modal');
  
  if (allProducts.length === 0) {
    const listEl = document.getElementById('modal-products-list');
    listEl.innerHTML = '<div style="padding:20px; text-align:center;">جاري تحميل المنتجات...</div>';
    try {
      const [products, collections] = await Promise.all([
        api.getProducts(),
        api.getCollections()
      ]);
      allProducts = products;
      const colFilter = document.getElementById('modal-col-filter');
      colFilter.innerHTML = '<option value="">جميع المنتجات</option>';
      collections.forEach(c => {
        colFilter.add(new Option(c.name, c._id));
      });
    } catch (err) {
      console.error('Failed to load products for modal', err);
    }
  }
  renderModalProducts();
};

window.addSelectedProducts = function () {
  // 1. Add simple products
  const checkedSimple = document.querySelectorAll('.product-select-cb:checked');
  checkedSimple.forEach(cb => {
    const p = allProducts.find(x => x._id === cb.value);
    if (p) {
      const effectiveBase = (p.salePrice && p.salePrice < p.basePrice) ? p.salePrice : p.basePrice;
      const existing = currentOrder.items.find(i => i.productId === p._id && (!i.selectedOptions || i.selectedOptions.length === 0));
      if (existing) {
        existing.quantity++;
      } else {
        currentOrder.items.push({
          productId: p._id,
          name: p.name,
          imageUrl: p.imageUrl || '',
          basePrice: effectiveBase,
          selectedOptions: [],
          quantity: 1,
          discount: 0,
          finalPrice: effectiveBase
        });
      }
    }
  });

  // 2. Add variants
  const checkedVariants = document.querySelectorAll('.product-variant-cb:checked');
  checkedVariants.forEach(cb => {
    const p = allProducts.find(x => x._id === cb.dataset.pid);
    if (p) {
      const effectiveBase = (p.salePrice && p.salePrice < p.basePrice) ? p.salePrice : p.basePrice;
      const combo = JSON.parse(decodeURIComponent(cb.dataset.combo));
      // Check if this exact variant is already in cart
      const existing = currentOrder.items.find(i => {
        if (i.productId !== p._id) return false;
        if (!i.selectedOptions || i.selectedOptions.length !== combo.length) return false;
        return combo.every(c => i.selectedOptions.some(so => so.groupName === c.groupName && so.label === c.label));
      });

      if (existing) {
        existing.quantity++;
      } else {
        const extraPrice = combo.reduce((sum, c) => sum + (c.price || 0), 0);
        currentOrder.items.push({
          productId: p._id,
          name: p.name,
          imageUrl: p.imageUrl || '',
          basePrice: effectiveBase,
          selectedOptions: combo,
          quantity: 1,
          discount: 0,
          finalPrice: effectiveBase + extraPrice
        });
      }
    }
  });

  closeProductsModal();
  updateTotals();
  renderItems();
  if (window.markAsModified) window.markAsModified();
};
