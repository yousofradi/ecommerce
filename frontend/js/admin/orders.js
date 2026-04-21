/** Admin orders management */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadOrders();
});

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner"></div></td></tr>';
  try {
    const orders = await api.getOrders();
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No orders yet</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><code style="font-size:0.8rem">${o.orderId.substring(0, 8)}...</code></td>
        <td>${o.customer.name}<br><span class="text-sm text-muted">${o.customer.phone}</span></td>
        <td>${o.items.length} item(s)</td>
        <td>${formatPrice(o.totalPrice)}</td>
        <td><span class="badge ${o.paid ? 'badge-success' : 'badge-warning'}">${o.paid ? 'Paid' : 'Unpaid'}</span></td>
        <td>${formatPrice(o.paidAmount)}</td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-secondary btn-sm" onclick="viewOrder('${o.orderId}')">View</button>
            <button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.orderId}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Failed to load orders</td></tr>';
  }
}

async function viewOrder(orderId) {
  try {
    const o = await api.getOrder(orderId);
    const itemsHTML = o.items.map(i => `
      <div style="padding:8px 0;border-bottom:1px solid var(--border)">
        <strong>${i.name}</strong> × ${i.quantity}<br>
        <span class="text-sm text-muted">${(i.selectedOptions||[]).map(op => `${op.groupName}: ${op.label}`).join(', ')}</span><br>
        <span>${formatPrice(i.finalPrice)}</span>
      </div>
    `).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <h3 class="modal-title">Order ${o.orderId.substring(0, 8)}...</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="grid-2" style="gap:16px;margin-bottom:20px">
          <div class="form-group"><label class="form-label">Name</label>
            <input class="form-control" id="edit-name" value="${o.customer.name}"></div>
          <div class="form-group"><label class="form-label">Phone</label>
            <input class="form-control" id="edit-phone" value="${o.customer.phone}"></div>
          <div class="form-group"><label class="form-label">Second Phone</label>
            <input class="form-control" id="edit-phone2" value="${o.customer.secondPhone || ''}"></div>
          <div class="form-group"><label class="form-label">Government</label>
            <input class="form-control" id="edit-gov" value="${o.customer.government}"></div>
          <div class="form-group" style="grid-column:span 2"><label class="form-label">Address</label>
            <input class="form-control" id="edit-address" value="${o.customer.address}"></div>
        </div>
        <h4 class="mb-16">Items</h4>
        ${itemsHTML}
        <div class="grid-2 mt-24" style="gap:16px">
          <div class="form-group"><label class="form-label">Paid Status</label>
            <select class="form-control" id="edit-paid">
              <option value="false" ${!o.paid?'selected':''}>Unpaid</option>
              <option value="true" ${o.paid?'selected':''}>Paid</option>
            </select></div>
          <div class="form-group"><label class="form-label">Paid Amount</label>
            <input class="form-control" type="number" id="edit-paidamt" value="${o.paidAmount}"></div>
        </div>
        <div class="price-summary mt-16">
          <div class="price-row"><span>Subtotal</span><span>${formatPrice(o.totalPrice - o.shippingFee)}</span></div>
          <div class="price-row"><span>Shipping</span><span>${formatPrice(o.shippingFee)}</span></div>
          <div class="price-row"><span>Payment</span><span class="badge badge-info">${o.paymentMethod}</span></div>
          <div class="price-row total"><span>Total</span><span class="price-value">${formatPrice(o.totalPrice)}</span></div>
        </div>
        <div class="flex gap-12 mt-24" style="justify-content:flex-end">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveOrder('${o.orderId}')">Save Changes</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveOrder(orderId) {
  try {
    await api.updateOrder(orderId, {
      customer: {
        name: document.getElementById('edit-name').value,
        phone: document.getElementById('edit-phone').value,
        secondPhone: document.getElementById('edit-phone2').value,
        address: document.getElementById('edit-address').value,
        government: document.getElementById('edit-gov').value,
        notes: ''
      },
      paid: document.getElementById('edit-paid').value === 'true',
      paidAmount: Number(document.getElementById('edit-paidamt').value)
    });
    document.querySelector('.modal-overlay').remove();
    showToast('Order updated');
    loadOrders();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteOrder(orderId) {
  if (!confirm('Delete this order?')) return;
  try {
    await api.deleteOrder(orderId);
    showToast('Order deleted');
    loadOrders();
  } catch (err) { showToast(err.message, 'error'); }
}
