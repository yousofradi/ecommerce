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
        vodafone_cash: '<span class="badge" style="background:#fce7f3;color:#9d174d">ف.كاش</span>',
        instapay: '<span class="badge badge-success">إنستاباي</span>'
      }[o.paymentMethod] || o.paymentMethod;

      return `
        <tr onclick="viewOrder('${o.orderId}')" style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
          <td><code style="font-size:0.78rem;background:var(--bg-body);padding:3px 7px;border-radius:4px">${o.orderId.substring(0, 8)}…</code></td>
          <td>
            <div style="font-weight:600">${o.customer?.name || 'بدون اسم'}</div>
            <div class="text-sm text-muted">${o.customer?.phone || ''}</div>
            <div class="text-sm text-muted">${o.customer?.government || ''}</div>
          </td>
          <td>${o.items?.length || 0} منتج</td>
          <td>
            <div style="font-weight:700;color:var(--primary)">${formatPrice(o.totalPrice)}</div>
            ${o.discount ? `<div class="text-sm" style="color:var(--danger)">خصم: ${formatPrice(o.discount)}</div>` : ''}
          </td>
          <td>${payBadge}</td>
          <td>
            ${o.paid 
              ? '<span class="badge badge-success">مدفوع ✓</span>'
              : o.paidAmount > 0 
                ? `<span class="badge" style="background:#fef3c7;color:#92400e">مدفوع جزئياً<br><small>${formatPrice(o.paidAmount)} / ${formatPrice(o.totalPrice)}</small></span>`
                : '<span class="badge badge-warning">غير مدفوع</span>'
            }
          </td>
          <td class="text-sm text-muted">${date}</td>
          <td>
            <div class="flex gap-8">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); viewOrder('${o.orderId}')">عرض</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteOrder('${o.orderId}')">حذف</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">فشل تحميل الطلبات</td></tr>';
  }
}

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
