/** Checkout page logic */
document.addEventListener('DOMContentLoaded', async () => {
  const items = Cart.getItems();
  if (!items.length) { window.location.href = 'cart'; return; }

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
    if (!gov) { showToast('اختر المحافظة أولاً', 'error'); btn.disabled = false; btn.textContent = 'تأكيد الطلب'; return; }

    const name = document.getElementById('cust-name').value.trim();
    if (name.split(/\s+/).filter(Boolean).length < 2) { showToast('الرجاء إدخال الاسم الثنائي (الاسم الأول والأخير)', 'error'); btn.disabled = false; btn.textContent = 'تأكيد الطلب'; return; }

    const phone = document.getElementById('cust-phone').value.trim();
    if (!/^01[0-9]{9}$/.test(phone)) { showToast('رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 01', 'error'); btn.disabled = false; btn.textContent = 'تأكيد الطلب'; return; }

    const address = document.getElementById('cust-address').value.trim();
    if (address.split(/\s+/).filter(Boolean).length < 2) { showToast('الرجاء إدخال العنوان بالتفصيل (أكثر من كلمة)', 'error'); btn.disabled = false; btn.textContent = 'تأكيد الطلب'; return; }

    const payment = document.querySelector('input[name="payment"]:checked');
    if (!payment) { showToast('اختر طريقة الدفع', 'error'); btn.disabled = false; btn.textContent = 'تأكيد الطلب'; return; }

    const items = Cart.getItems().map(item => {
      const effectiveBase = (item.salePrice && item.salePrice < item.basePrice) ? item.salePrice : item.basePrice;
      return {
        productId: item.productId,
        name: item.name,
        imageUrl: item.imageUrl || '',
        basePrice: effectiveBase,
        selectedOptions: item.selectedOptions,
        finalPrice: item.unitPrice * item.quantity,
        quantity: item.quantity
      };
    });

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
      sessionStorage.setItem('lastOrderData', JSON.stringify(order));
      window.location.href = 'order-success';
    } catch (err) {
      showToast(err.message || 'فشل في إتمام الطلب', 'error');
      btn.disabled = false; btn.textContent = 'تأكيد الطلب';
    }
  });
}
