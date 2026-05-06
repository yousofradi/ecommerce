/** Admin — Customers JS */

let allCustomers = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  loadCustomers();
});

async function loadCustomers() {
  try {
    allCustomers = await api.getCustomers();
    renderCustomers(allCustomers);
    document.getElementById('count-all').textContent = allCustomers.length;
  } catch (err) {
    showToast('فشل تحميل قائمة العملاء', 'error');
  }
}

function renderCustomers(customers) {
  const tbody = document.getElementById('customers-tbody');
  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:40px; text-align:center; color:#64748b;">لا يوجد عملاء بعد</td></tr>';
    return;
  }

  tbody.innerHTML = customers.map(c => {
    const lastOrderDate = c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('ar-EG') : '—';
    const totalSpent = formatPrice(c.totalSpent || 0);

    return `
      <tr onclick="location.href='customer-details?phone=${c.phone}'" style="cursor:pointer">
        <td class="hide-mobile" style="text-align: center;" onclick="event.stopPropagation()">
          <input type="checkbox" style="width:16px; height:16px; accent-color:#0f766e;">
        </td>
        <td>
          <div>
            <div style="font-weight:600; color:#1e293b;">${c.name}</div>
            <div style="font-size:0.85rem; color:#64748b;">${c.phone}</div>
          </div>
        </td>
        <td class="hide-mobile">
          <div style="color:#1e293b;">${c.government || '—'}</div>
        </td>
        <td class="hide-mobile">${c.orderCount} طلب</td>
        <td class="hide-mobile" style="color:#64748b;">${lastOrderDate}</td>
      </tr>
    `;
  }).join('');
}

function filterCustomers() {
  const q = document.getElementById('customer-search').value.toLowerCase().trim();
  const filtered = allCustomers.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.phone.includes(q) || 
    (c.government && c.government.toLowerCase().includes(q))
  );
  renderCustomers(filtered);
}
