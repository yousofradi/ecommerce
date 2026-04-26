/** Admin orders management */
let showingArchived = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadOrders();
});

let allOrdersData = [];
let currentFilter = 'all';

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  const selectAllCb = document.getElementById('select-all-orders');
  if (selectAllCb) selectAllCb.checked = false;
  updateArchiveButton();
  
  tbody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding:32px;"><div class="spinner"></div></td></tr>';
  try {
    allOrdersData = await api.getOrders(showingArchived);
    updateFilterCounts();
    filterOrdersClient();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">فشل تحميل الطلبات</td></tr>';
  }
}

window.setFilter = function(filter) {
  currentFilter = filter;
  document.querySelectorAll('.order-tab').forEach(el => el.classList.remove('active'));
  document.querySelector(`.order-tab[data-filter="${filter}"]`)?.classList.add('active');

  if (filter === 'archived') {
    if (!showingArchived) {
      showingArchived = true;
      loadOrders();
      return;
    }
  } else {
    if (showingArchived) {
      showingArchived = false;
      loadOrders();
      return;
    }
  }
  filterOrdersClient();
};

window.filterOrdersClient = function() {
  const searchInput = document.getElementById('order-search');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  let filtered = allOrdersData;
  
  if (currentFilter === 'pending') {
    filtered = filtered.filter(o => o.status !== 'cancelled'); 
  } else if (currentFilter === 'unpaid') {
    filtered = filtered.filter(o => !o.paid && (o.totalPrice > (o.paidAmount || 0)));
  }
  
  if (query) {
    filtered = filtered.filter(o => 
      o.orderId.toLowerCase().includes(query) || 
      (o.customer && o.customer.name && o.customer.name.toLowerCase().includes(query)) ||
      (o.customer && o.customer.phone && o.customer.phone.includes(query))
    );
  }
  
  renderOrders(filtered);
};

window.updateFilterCounts = function() {
  if (!showingArchived) {
    const elAll = document.getElementById('count-all');
    const elPending = document.getElementById('count-pending');
    const elUnpaid = document.getElementById('count-unpaid');
    
    if (elAll) elAll.textContent = allOrdersData.length;
    if (elPending) elPending.textContent = allOrdersData.filter(o => o.status !== 'cancelled').length;
    if (elUnpaid) elUnpaid.textContent = allOrdersData.filter(o => !o.paid && (o.totalPrice > (o.paidAmount || 0))).length;
  }
};

function renderOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted" style="padding:40px">لا توجد طلبات هنا</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(o => {
    // Relative date
    const dateObj = new Date(o.createdAt);
    const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const isToday = new Date().toDateString() === dateObj.toDateString();
    const dateStr = isToday ? `اليوم في ${timeStr}` : dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) + ` ${timeStr}`;
    
    // Payment badge
    let payBadge = '';
    if (o.paid) {
      payBadge = `<div class="status-badge-pill badge-paid"><div class="dot"></div> مدفوع</div>`;
    } else if (o.paidAmount > 0) {
      payBadge = `<div class="status-badge-pill badge-partial"><div class="dot"></div> مدفوع جزئيا</div>`;
    } else {
      payBadge = `<div class="status-badge-pill badge-unpaid"><div class="dot"></div> غير مدفوع</div>`;
    }

    // Prep status
    let prepStatus = '';
    if (o.status === 'cancelled') {
      prepStatus = `<div class="status-badge-pill badge-unpaid"><div class="dot"></div> ملغي</div>`;
    } else {
      prepStatus = `<div class="status-badge-pill badge-neutral"><div class="dot"></div> بانتظار التجهيز</div>`;
    }
    
    // Shipping status
    const shipStatus = `<div class="status-badge-pill badge-neutral" style="background:#f8fafc;border:1px solid #f1f5f9;">تم شحنه ذاتيا</div>`;
    
    const displayId = o.orderId.replace('Order-', '').replace('Scoop-', '');

    return `
      <tr onclick="viewOrder('${o.orderId}')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
        <td style="text-align: center;" onclick="event.stopPropagation();">
          <input type="checkbox" class="order-checkbox" value="${o.orderId}" onchange="updateArchiveButton()" style="width:16px; height:16px; border-radius:4px; accent-color:#0f766e;">
        </td>
        <td style="color:#0ea5e9; font-weight:600; font-size:0.95rem;" dir="ltr">#${displayId}</td>
        <td style="color:#64748b; font-size:0.85rem;">${dateStr}</td>
        <td style="position:relative;" onmouseleave="this.querySelector('.customer-dropdown').style.display='none'">
          <div style="display:flex; align-items:center; gap:8px;" onmouseenter="this.nextElementSibling.style.display='block'">
            <span style="font-weight:600; color:#1e293b;">${o.customer?.name || 'بدون اسم'}</span>
            <span style="color:#94a3b8; font-size:0.8rem;">▼</span>
          </div>
          <div class="customer-dropdown" onclick="event.stopPropagation()" style="display:none; position:absolute; top:80%; right:0; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); width:250px; z-index:50; padding:12px; text-align:right;">
            <div style="font-size:0.85rem; color:#64748b; margin-bottom:4px;">الهاتف: <span style="color:#1e293b;font-weight:600;">${o.customer?.phone || 'لا يوجد'}</span></div>
            ${o.customer?.secondPhone ? `<div style="font-size:0.85rem; color:#64748b; margin-bottom:4px;">هاتف بديل: <span style="color:#1e293b;font-weight:600;">${o.customer.secondPhone}</span></div>` : ''}
            <div style="font-size:0.85rem; color:#64748b; margin-bottom:4px;">المحافظة: <span style="color:#1e293b;font-weight:600;">${o.customer?.government || 'لا يوجد'}</span></div>
            <div style="font-size:0.85rem; color:#64748b;">العنوان: <span style="color:#1e293b;font-weight:600;">${o.customer?.address || 'لا يوجد'}</span></div>
          </div>
        </td>
        <td>
          <div style="font-weight:600; color:#1e293b;">${formatPrice(o.totalPrice)}</div>
        </td>
        <td>${payBadge}</td>
        <td>${prepStatus}</td>
        <td>${shipStatus}</td>
        <td style="position:relative;" onmouseleave="this.querySelector('.items-dropdown').style.display='none'">
          <div style="display:flex; align-items:center; gap:8px;" onmouseenter="this.nextElementSibling.style.display='block'">
            <span style="font-weight:600; color:#1e293b;">${o.items?.length || 0} عنصر</span>
            <span style="color:#94a3b8; font-size:0.8rem;">▼</span>
          </div>
          <div class="items-dropdown" onclick="event.stopPropagation()" style="display:none; position:absolute; top:80%; right:0; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); width:280px; z-index:50; padding:8px; max-height:300px; overflow-y:auto;">
            ${o.items ? o.items.map(i => `
              <div style="display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid #f1f5f9;">
                <div style="position:relative; width:40px; height:40px; border-radius:6px; background:#f8fafc; border:1px solid #e2e8f0; overflow:visible;">
                  ${i.imageUrl ? `<img src="${i.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:0.7rem;">صورة</div>'}
                  <span style="position:absolute; top:-6px; right:-6px; background:#64748b; color:#fff; border-radius:50%; width:18px; height:18px; font-size:0.65rem; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid #fff;">${i.quantity}</span>
                </div>
                <div style="flex:1; font-size:0.85rem; font-weight:600; color:#1e293b; line-height:1.4; text-align:right;">${i.name}</div>
              </div>
            `).join('') : '<div style="padding:8px; text-align:center; color:#94a3b8; font-size:0.8rem;">لا توجد عناصر</div>'}
          </div>
        </td>
        <td style="color:#94a3b8;">-</td>
      </tr>
    `;
  }).join('');
}

// ── Selection & Archiving ────────────────────────────────
window.toggleSelectAll = function() {
  const selectAll = document.getElementById('select-all-orders');
  const checkboxes = document.querySelectorAll('.order-checkbox');
  checkboxes.forEach(cb => cb.checked = selectAll.checked);
  updateArchiveButton();
};

window.updateArchiveButton = function() {
  const checkboxes = document.querySelectorAll('.order-checkbox:checked');
  const archiveBtn = document.getElementById('archive-selected-btn');
  const unarchiveBtn = document.getElementById('unarchive-selected-btn');
  
  if (archiveBtn) {
    archiveBtn.style.display = checkboxes.length > 0 && !showingArchived ? 'inline-flex' : 'none';
    archiveBtn.innerHTML = `📦 أرشفة المحدد (${checkboxes.length})`;
  }
  if (unarchiveBtn) {
    unarchiveBtn.style.display = checkboxes.length > 0 && showingArchived ? 'inline-flex' : 'none';
    unarchiveBtn.innerHTML = `🔙 إلغاء أرشفة المحدد (${checkboxes.length})`;
  }
};

window.archiveSelected = async function() {
  const checkboxes = document.querySelectorAll('.order-checkbox:checked');
  const orderIds = Array.from(checkboxes).map(cb => cb.value);
  if (!orderIds.length) return;

  const confirmed = await window.showConfirmModal('تأكيد الأرشفة', `هل أنت متأكد من أرشفة ${orderIds.length} طلبات؟`);
  if (!confirmed) return;

  try {
    await api.archiveOrders(orderIds);
    showToast('تم أرشفة الطلبات بنجاح');
    loadOrders();
  } catch (err) {
    showToast(err.message || 'فشل أرشفة الطلبات', 'error');
  }
};

window.unarchiveSelected = async function() {
  const checkboxes = document.querySelectorAll('.order-checkbox:checked');
  const orderIds = Array.from(checkboxes).map(cb => cb.value);
  if (!orderIds.length) return;

  const confirmed = await window.showConfirmModal('تأكيد إلغاء الأرشفة', `هل أنت متأكد من إلغاء أرشفة ${orderIds.length} طلبات؟`);
  if (!confirmed) return;

  try {
    await api.unarchiveOrders(orderIds);
    showToast('تم إلغاء أرشفة الطلبات بنجاح');
    loadOrders();
  } catch (err) {
    showToast(err.message || 'فشل إلغاء أرشفة الطلبات', 'error');
  }
};

// Removed toggleArchivedView as it's replaced by setFilter('archived')

// ── View Order ───────────────────────────────────────────
window.viewOrder = function(orderId) {
  window.location.href = `order-details.html?id=${orderId}`;
};

// ── Delete Order ───────────────────────────────────────
window.deleteOrder = async function(orderId) {
  const confirmed = await window.showConfirmModal('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الطلب؟');
  if (!confirmed) return;
  try {
    await api.deleteOrder(orderId);
    showToast('تم حذف الطلب');
    loadOrders();
  } catch (err) {
    showToast(err.message || 'فشل الحذف', 'error');
  }
};

// ── Print Invoices (Webhook) ───────────────────────────
window.printInvoices = async function() {
  const btn = document.getElementById('print-invoices-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><div class="spinner" style="width:16px;height:16px;border-width:2px;border-color:#fff;border-top-color:transparent;margin:0"></div> جاري التجهيز...</div>';
  btn.disabled = true;

  try {
    const response = await fetch('https://usefradi-n8n.hf.space/webhook/inovince', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: "print_invoices", timestamp: new Date().toISOString() })
    });

    if (!response.ok) throw new Error('فشل الاتصال بالويب هوك');

    const blob = await response.blob();
    const fileName = `invoices-${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Check if device is mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Mobile browsers handle base64 Data URIs better for forced downloads
      const reader = new FileReader();
      reader.onloadend = function() {
        const a = document.createElement('a');
        a.href = reader.result;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      reader.readAsDataURL(blob);
    } else {
      // Download the PDF directly on desktop using Object URL
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    }
    
    showToast('تم تجهيز الفواتير بنجاح');
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء طباعة الفواتير', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};
