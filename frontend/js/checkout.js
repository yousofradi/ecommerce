/** Checkout page logic */
document.addEventListener('DOMContentLoaded', async () => {
  const items = Cart.getItems();
  if (!items.length) { window.location.href = 'cart.html'; return; }

  renderOrderSummary(items);
  await loadGovernorates();
  setupForm();
});

function renderOrderSummary(items) {
  const el = document.getElementById('order-items');
  el.innerHTML = items.map(item => `
    <div class="cart-item" style="padding:12px">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name} × ${item.quantity}</div>
        <div class="cart-item-options">${item.selectedOptions.map(o => `${o.groupName}: ${o.label}`).join(', ')}</div>
      </div>
      <div class="cart-item-price">${formatPrice(item.unitPrice * item.quantity)}</div>
    </div>
  `).join('');
  updatePriceSummary();
}

async function loadGovernorates() {
  try {
    const fees = await api.getShipping();
    window._shippingFees = fees;
    const select = document.getElementById('government');
    Object.keys(fees).forEach(gov => {
      const opt = document.createElement('option');
      opt.value = gov;
      opt.textContent = `${gov} (${formatPrice(fees[gov])})`;
      select.appendChild(opt);
    });
    select.addEventListener('change', updatePriceSummary);
  } catch (err) {
    showToast('Failed to load shipping fees', 'error');
  }
}

function updatePriceSummary() {
  const subtotal = Cart.getTotal();
  const gov = document.getElementById('government').value;
  const shippingFee = gov && window._shippingFees ? (window._shippingFees[gov] || 0) : 0;
  const total = subtotal + shippingFee;

  document.getElementById('subtotal').textContent = formatPrice(subtotal);
  document.getElementById('shipping-fee').textContent = gov ? formatPrice(shippingFee) : '—';
  document.getElementById('total-price').textContent = formatPrice(total);
}

function setupForm() {
  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Placing Order...';

    const gov = document.getElementById('government').value;
    if (!gov) { showToast('Please select your governorate', 'error'); btn.disabled = false; btn.textContent = 'Place Order'; return; }

    const payment = document.querySelector('input[name="payment"]:checked');
    if (!payment) { showToast('Please select a payment method', 'error'); btn.disabled = false; btn.textContent = 'Place Order'; return; }

    const items = Cart.getItems().map(item => ({
      productId: item.productId,
      name: item.name,
      basePrice: item.basePrice,
      selectedOptions: item.selectedOptions,
      finalPrice: item.unitPrice * item.quantity,
      quantity: item.quantity
    }));

    const orderData = {
      customer: {
        name: document.getElementById('cust-name').value.trim(),
        phone: document.getElementById('cust-phone').value.trim(),
        secondPhone: document.getElementById('cust-phone2').value.trim(),
        address: document.getElementById('cust-address').value.trim(),
        government: gov,
        notes: document.getElementById('cust-notes').value.trim()
      },
      items,
      paymentMethod: payment.value
    };

    try {
      const order = await api.createOrder(orderData);
      Cart.clear();
      sessionStorage.setItem('lastOrderId', order.orderId);
      window.location.href = 'order-success.html';
    } catch (err) {
      showToast(err.message || 'Failed to place order', 'error');
      btn.disabled = false; btn.textContent = 'Place Order';
    }
  });
}
