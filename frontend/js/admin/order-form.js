let allProducts = [];
let shippingMap = {};
let selectedItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  try {
    const [products, shipping] = await Promise.all([
      api.getProducts(),
      api.getShipping()
    ]);
    allProducts = products;
    shippingMap = shipping;

    const govSelect = document.getElementById('c-gov');
    Object.keys(shippingMap).forEach(gov => {
      govSelect.add(new Option(gov, gov));
    });
  } catch (err) {
    showToast('Failed to load store data', 'error');
  }

  const searchInput = document.getElementById('product-search-input');
  const searchResults = document.getElementById('search-results');

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) {
      searchResults.style.display = 'none';
      return;
    }
    const matches = allProducts.filter(p => p.name.toLowerCase().includes(term));
    if (matches.length > 0) {
      searchResults.innerHTML = matches.map(p => `
        <div class="search-item" onclick="selectProduct('${p._id}')">
          <span>${p.name}</span>
          <span class="text-muted">${formatPrice(p.basePrice)}</span>
        </div>
      `).join('');
      searchResults.style.display = 'block';
    } else {
      searchResults.innerHTML = '<div class="search-item text-muted">No matches</div>';
      searchResults.style.display = 'block';
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.product-search')) {
      searchResults.style.display = 'none';
    }
  });

  document.getElementById('create-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return showToast('Please add at least one product', 'error');

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;

    // Validate options
    let allValid = true;
    const finalItems = selectedItems.map((item, index) => {
      const container = document.getElementById(`item-${index}`);
      const selects = container.querySelectorAll('select');
      const selectedOptions = [];
      let itemOptionsPrice = 0;

      selects.forEach(select => {
        if (select.required && !select.value) allValid = false;
        if (select.value) {
          const optIndex = parseInt(select.value);
          const groupIndex = parseInt(select.dataset.group);
          const group = item.product.options[groupIndex];
          const val = group.values[optIndex];
          selectedOptions.push({
            groupName: group.name,
            label: val.label,
            price: val.price
          });
          itemOptionsPrice += val.price;
        }
      });

      const quantity = parseInt(container.querySelector('.qty-input').value) || 1;
      
      return {
        productId: item.product._id,
        name: item.product.name,
        basePrice: item.product.basePrice,
        selectedOptions,
        quantity,
        finalPrice: (item.product.basePrice + itemOptionsPrice) * quantity
      };
    });

    if (!allValid) {
      btn.disabled = false;
      return showToast('Please select all required product options', 'error');
    }

    const payload = {
      customer: {
        name: document.getElementById('c-name').value.trim(),
        phone: document.getElementById('c-phone').value.trim(),
        secondPhone: document.getElementById('c-second-phone').value.trim(),
        address: document.getElementById('c-address').value.trim(),
        government: document.getElementById('c-gov').value,
        notes: document.getElementById('c-notes').value.trim()
      },
      items: finalItems,
      paymentMethod: 'vodafone_cash' // Default for manual admin orders
    };

    try {
      await api.createOrder(payload);
      showToast('Order created successfully!');
      setTimeout(() => window.location.href = 'orders.html', 1000);
    } catch (err) {
      btn.disabled = false;
      showToast(err.message || 'Error creating order', 'error');
    }
  });
});

window.selectProduct = function(id) {
  const p = allProducts.find(p => p._id === id);
  if (!p) return;
  selectedItems.push({ product: p });
  document.getElementById('product-search-input').value = '';
  document.getElementById('search-results').style.display = 'none';
  renderSelectedItems();
};

window.removeSelectedItem = function(index) {
  selectedItems.splice(index, 1);
  renderSelectedItems();
};

window.updateQty = function() {
  calculateTotal();
};

function renderSelectedItems() {
  const container = document.getElementById('selected-items');
  if (selectedItems.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-style:italic">No products selected yet.</p>';
    calculateTotal();
    return;
  }

  container.innerHTML = selectedItems.map((item, index) => {
    const p = item.product;
    const optionsHtml = (p.options || []).map((group, gi) => `
      <div style="margin-top:8px">
        <label class="form-label" style="font-size:0.8rem;margin-bottom:4px">${group.name} ${group.required ? '*' : ''}</label>
        <select class="form-control" style="padding:4px;font-size:0.9rem" data-group="${gi}" ${group.required ? 'required' : ''} onchange="calculateTotal()">
          ${!group.required ? '<option value="">None</option>' : '<option value="">Select...</option>'}
          ${group.values.map((v, vi) => `<option value="${vi}">${v.label} ${v.price ? `(+${v.price})` : ''}</option>`).join('')}
        </select>
      </div>
    `).join('');

    return `
      <div class="selected-item" id="item-${index}">
        <div style="flex:1">
          <div style="font-weight:600">${p.name}</div>
          <div class="text-muted" style="font-size:0.9rem">${formatPrice(p.basePrice)}</div>
          ${optionsHtml}
        </div>
        <div class="flex gap-16 align-center" style="align-items:center">
          <input type="number" class="form-control qty-input" value="1" min="1" style="width:60px" onchange="updateQty()">
          <button type="button" class="btn btn-sm btn-danger" onclick="removeSelectedItem(${index})">×</button>
        </div>
      </div>
    `;
  }).join('');
  calculateTotal();
}

window.calculateTotal = function() {
  let subtotal = 0;
  
  selectedItems.forEach((item, index) => {
    const container = document.getElementById(`item-${index}`);
    if (!container) return;
    
    let itemPrice = item.product.basePrice;
    const selects = container.querySelectorAll('select');
    selects.forEach(select => {
      if (select.value) {
        const optIndex = parseInt(select.value);
        const groupIndex = parseInt(select.dataset.group);
        itemPrice += item.product.options[groupIndex].values[optIndex].price;
      }
    });

    const qty = parseInt(container.querySelector('.qty-input').value) || 1;
    subtotal += itemPrice * qty;
  });

  const gov = document.getElementById('c-gov').value;
  const shipping = shippingMap[gov] || 0;
  const total = subtotal + shipping;

  document.getElementById('summ-sub').textContent = formatPrice(subtotal);
  document.getElementById('summ-ship').textContent = formatPrice(shipping);
  document.getElementById('summ-total').textContent = formatPrice(total);
};
