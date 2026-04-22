/** Admin orders management */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadOrders();
});

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner"></div></td></tr>';
  try {
    const orders = await api.getOrders();
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:40px">لا توجد طلبات بعد</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => {
      const date = new Date(o.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
      const payBadge = {
        cash_on_delivery: '<span class="badge badge-info">كاش</span>',
        vodafone_cash: '<span class="badge" style="background:#fce7f3;color:#9d174d">ف.كاش</span>',
        instapay: '<span class="badge badge-success">إنستاباي</span>'
      }[o.paymentMethod] || o.paymentMethod;

      return `
        <tr>
          <td><code style="font-size:0.78rem;background:var(--bg-body);padding:3px 7px;border-radius:4px">${o.orderId.substring(0, 8)}…</code></td>
          <td>
            <div style="font-weight:600">${o.customer.name}</div>
            <div class="text-sm text-muted">${o.customer.phone}</div>
            <div class="text-sm text-muted">${o.customer.government}</div>
          </td>
          <td>${o.items.length} منتج</td>
          <td>
            <div style="font-weight:700;color:var(--primary)">${formatPrice(o.totalPrice)}</div>
            ${o.discount ? `<div class="text-sm" style="color:var(--danger)">خصم: ${formatPrice(o.discount)}</div>` : ''}
          </td>
          <td>${payBadge}</td>
          <td>
            <span class="badge ${o.paid ? 'badge-success' : 'badge-warning'}">
              ${o.paid ? 'مدفوع' : 'غير مدفوع'}
            </span>
          </td>
          <td class="text-sm text-muted">${date}</td>
          <td>
            <div class="flex gap-8">
              <button class="btn btn-secondary btn-sm" onclick="viewOrder('${o.orderId}')">عرض</button>
              <button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.orderId}')">حذف</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">فشل تحميل الطلبات</td></tr>';
  }
}

// ── View / Edit Order Modal ────────────────────────────
async function viewOrder(orderId) {
  try {
    const o = await api.getOrder(orderId);

    // Build items HTML with per-item discount editing
    const itemsHtml = o.items.map((item, idx) => {
      const optText = (item.selectedOptions || []).map(op => `${op.groupName}: ${op.label}`).join(' • ');
      const imgHtml = item.imageUrl
        ? `<img src="${item.imageUrl}" alt="${item.name}" style="width:52px;height:52px;border-radius:6px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0">`
        : `<div style="width:52px;height:52px;border-radius:6px;background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">📦</div>`;

      return `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px;background:var(--bg-body)">
          ${imgHtml}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.95rem">${item.name}</div>
            ${optText ? `<div style="font-size:0.8rem;color:var(--text-muted);margin:2px 0">${optText}</div>` : ''}
            <div style="font-size:0.82rem;color:var(--text-muted)">الكمية: ${item.quantity} | السعر الأساسي: ${formatPrice(item.basePrice)}</div>
          </div>
          <div style="text-align:left;min-width:120px">
            <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">خصم المنتج</div>
            <input type="number" class="form-control item-discount-input" data-idx="${idx}"
              value="${item.discount || 0}" min="0" style="width:100px;padding:5px 8px;font-size:0.88rem"
              oninput="recalcModalTotal()">
            <div style="font-size:0.82rem;font-weight:700;color:var(--primary);margin-top:4px" id="modal-item-price-${idx}">
              ${formatPrice(item.finalPrice)}
            </div>
          </div>
        </div>`;
    }).join('');

    const payOptions = [
      { val: 'cash_on_delivery', label: 'كاش عند الاستلام' },
      { val: 'vodafone_cash', label: 'فودافون كاش' },
      { val: 'instapay', label: 'إنستاباي' }
    ].map(p => `<option value="${p.val}" ${o.paymentMethod === p.val ? 'selected' : ''}>${p.label}</option>`).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'order-modal';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal" style="max-width:780px;padding:28px">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="margin-bottom:2px">الطلب #${o.orderId.substring(0, 8)}…</h3>
            <span class="text-sm text-muted">${new Date(o.createdAt).toLocaleString('ar-EG')}</span>
          </div>
          <button class="modal-close" onclick="document.getElementById('order-modal').remove()">×</button>
        </div>

        <!-- Items with per-item discount -->
        <h4 style="margin-bottom:12px;font-size:0.95rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">المنتجات</h4>
        <div id="modal-items-list">${itemsHtml}</div>

        <!-- Customer Info -->
        <h4 style="margin:20px 0 12px;font-size:0.95rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">بيانات العميل</h4>
        <div class="grid-2" style="gap:12px">
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">الاسم</label>
            <input class="form-control" id="edit-name" value="${o.customer.name}">
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">الهاتف</label>
            <input class="form-control" id="edit-phone" value="${o.customer.phone}">
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">هاتف آخر</label>
            <input class="form-control" id="edit-phone2" value="${o.customer.secondPhone || ''}">
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">المحافظة</label>
            <input class="form-control" id="edit-gov" value="${o.customer.government}">
          </div>
          <div class="form-group" style="margin-bottom:12px;grid-column:span 2">
            <label class="form-label">العنوان</label>
            <input class="form-control" id="edit-address" value="${o.customer.address}">
          </div>
          <div class="form-group" style="margin-bottom:0;grid-column:span 2">
            <label class="form-label">ملاحظات</label>
            <input class="form-control" id="edit-notes" value="${o.customer.notes || ''}">
          </div>
        </div>

        <!-- Payment + Status -->
        <h4 style="margin:20px 0 12px;font-size:0.95rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">الدفع والحالة</h4>
        <div class="grid-2" style="gap:12px">
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">طريقة الدفع</label>
            <select class="form-control" id="edit-payment">${payOptions}</select>
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">حالة الدفع</label>
            <select class="form-control" id="edit-paid">
              <option value="false" ${!o.paid ? 'selected' : ''}>غير مدفوع</option>
              <option value="true" ${o.paid ? 'selected' : ''}>مدفوع</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">المبلغ المدفوع</label>
            <input class="form-control" type="number" id="edit-paidamt" value="${o.paidAmount || 0}" min="0">
          </div>
        </div>

        <!-- Pricing Summary (editable discounts) -->
        <h4 style="margin:20px 0 12px;font-size:0.95rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">الملخص المالي</h4>
        <div style="background:var(--bg-body);border-radius:8px;padding:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem">
            <span style="color:var(--text-muted)">الإجمالي الفرعي</span>
            <span id="modal-subtotal" style="font-weight:600">${formatPrice(o.totalPrice - o.shippingFee + (o.discount || 0))}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem">
            <span style="color:var(--text-muted)">رسوم الشحن</span>
            <span>${formatPrice(o.shippingFee)}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:0.9rem;padding:8px 0;border-top:1px solid var(--border-color)">
            <label style="color:var(--text-muted)">خصم الطلب الكلي (ج.م)</label>
            <input type="number" class="form-control" id="edit-order-discount" value="${o.discount || 0}" min="0"
              style="width:110px;padding:5px 10px;font-size:0.9rem" oninput="recalcModalTotal()">
          </div>
          <div style="display:flex;justify-content:space-between;border-top:2px solid var(--border-color);padding-top:12px;margin-top:8px">
            <span style="font-weight:700;font-size:1.1rem">الإجمالي</span>
            <span id="modal-total" style="font-weight:700;font-size:1.2rem;color:var(--primary)">${formatPrice(o.totalPrice)}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-12 mt-24" style="justify-content:flex-end">
          <button class="btn btn-secondary" onclick="document.getElementById('order-modal').remove()">إلغاء</button>
          <button class="btn btn-primary" onclick="saveOrder('${o.orderId}')">حفظ التغييرات</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Store original order data for recalc
    modal._order = o;
    window._modalOrder = o;

  } catch (err) {
    showToast(err.message || 'فشل تحميل الطلب', 'error');
  }
}

// ── Recalculate Modal Total ────────────────────────────
window.recalcModalTotal = function() {
  const o = window._modalOrder;
  if (!o) return;

  // Recalc each item
  let subtotal = 0;
  o.items.forEach((item, idx) => {
    const discountInput = document.querySelector(`.item-discount-input[data-idx="${idx}"]`);
    const discount = discountInput ? Math.max(0, parseFloat(discountInput.value) || 0) : (item.discount || 0);
    const optExtra = (item.selectedOptions || []).reduce((s, op) => s + (op.price || 0), 0);
    const finalPrice = Math.max(0, (item.basePrice + optExtra) * item.quantity - discount);
    subtotal += finalPrice;

    const priceEl = document.getElementById(`modal-item-price-${idx}`);
    if (priceEl) priceEl.textContent = formatPrice(finalPrice);
  });

  const orderDiscount = Math.max(0, parseFloat(document.getElementById('edit-order-discount').value) || 0);
  const total = Math.max(0, subtotal + o.shippingFee - orderDiscount);

  const subtotalEl = document.getElementById('modal-subtotal');
  const totalEl = document.getElementById('modal-total');
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl) totalEl.textContent = formatPrice(total);
};

// ── Save Order ─────────────────────────────────────────
window.saveOrder = async function(orderId) {
  const o = window._modalOrder;

  // Collect updated per-item discounts
  const updatedItems = o.items.map((item, idx) => {
    const discountInput = document.querySelector(`.item-discount-input[data-idx="${idx}"]`);
    const discount = discountInput ? Math.max(0, parseFloat(discountInput.value) || 0) : (item.discount || 0);
    const optExtra = (item.selectedOptions || []).reduce((s, op) => s + (op.price || 0), 0);
    const finalPrice = Math.max(0, (item.basePrice + optExtra) * item.quantity - discount);
    return { ...item, discount, finalPrice };
  });

  const orderDiscount = Math.max(0, parseFloat(document.getElementById('edit-order-discount').value) || 0);

  try {
    await api.updateOrder(orderId, {
      customer: {
        name: document.getElementById('edit-name').value,
        phone: document.getElementById('edit-phone').value,
        secondPhone: document.getElementById('edit-phone2').value,
        address: document.getElementById('edit-address').value,
        government: document.getElementById('edit-gov').value,
        notes: document.getElementById('edit-notes').value
      },
      items: updatedItems,
      discount: orderDiscount,
      paymentMethod: document.getElementById('edit-payment').value,
      paid: document.getElementById('edit-paid').value === 'true',
      paidAmount: Number(document.getElementById('edit-paidamt').value)
    });

    document.getElementById('order-modal').remove();
    showToast('تم حفظ التغييرات ✓');
    loadOrders();
  } catch (err) {
    showToast(err.message || 'فشل الحفظ', 'error');
  }
};

// ── Delete Order ───────────────────────────────────────
async function deleteOrder(orderId) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
  try {
    await api.deleteOrder(orderId);
    showToast('تم حذف الطلب');
    loadOrders();
  } catch (err) {
    showToast(err.message || 'فشل الحذف', 'error');
  }
}
