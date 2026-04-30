/** Product detail page — full product view with gallery, options, add to cart */
let currentProduct = null;
let selectedQty = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const loading = document.getElementById('product-loading');
  const detail = document.getElementById('product-detail');

  if (!productId) {
    loading.innerHTML = '<p style="text-align:center;color:#999">لم يتم تحديد المنتج</p>';
    return;
  }

  try {
    currentProduct = await api.getProduct(productId);
    document.title = `${currentProduct.name} | Sundura Shop`;
    document.getElementById('breadcrumb-name').textContent = currentProduct.name;
    loading.classList.add('hidden');
    detail.classList.remove('hidden');
    renderProduct(currentProduct);
  } catch (err) {
    loading.innerHTML = '<p style="text-align:center;color:#ef4444">فشل تحميل المنتج</p>';
  }
});

function getImages(product) {
  if (product.images && product.images.length > 0) return product.images;
  if (product.imageUrl) return [product.imageUrl];
  return [];
}

function renderProduct(p) {
  const detail = document.getElementById('product-detail');
  const images = getImages(p);
  const salePrice = p.salePrice || p.basePrice;
  const hasDiscount = p.salePrice && p.salePrice < p.basePrice;
  const mainImg = images[0] || '';

  // Check quantity availability
  const isUnlimited = p.quantity === null || p.quantity === undefined;
  const isAvailable = isUnlimited || p.quantity > 0;

  // Options HTML
  const optionsHTML = (p.options || []).map((group, gi) => {
    const valuesHTML = group.values.map((v, vi) => {
      const priceLabel = v.price > 0 ? `+${formatPrice(v.price)}` : '';
      return `<div class="radio-option">
        <input type="radio" name="opt_${gi}" id="opt_${gi}_${vi}" value="${vi}" ${vi === 0 ? 'checked' : ''}>
        <label for="opt_${gi}_${vi}">${v.label} ${priceLabel ? `<span class="option-price">(${priceLabel})</span>` : ''}</label>
      </div>`;
    }).join('');
    return `<div class="option-group" style="margin-bottom:16px">
      <div class="option-group-title" style="margin-bottom:8px;font-weight:600">${group.name}</div>
      <div class="radio-options">${valuesHTML}</div>
    </div>`;
  }).join('');

  // Thumbnails
  const thumbsHTML = images.length > 1 ? `
    <div class="product-gallery-thumbs">
      ${images.map((img, i) => `<img src="${img}" class="product-gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchMainImage(${i})" alt="thumb">`).join('')}
    </div>` : '';

  // Strip HTML from description
  const descText = (p.description || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();

  detail.innerHTML = `
    <div class="product-detail-layout">
      <div>
        <div class="product-gallery-main">
          <img id="main-product-img" src="${mainImg}" alt="${p.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjwvc3ZnPg=='">
        </div>
        ${thumbsHTML}
      </div>
      <div class="product-detail-info">
        <h1>${p.name}</h1>
        <div class="product-detail-prices">
          <span class="detail-price-sale">${formatPrice(salePrice)}</span>
          ${hasDiscount ? `<span class="detail-price-original">${formatPrice(p.basePrice)}</span>` : ''}
        </div>
        ${descText ? `<div class="product-detail-desc">${descText}</div>` : ''}
        ${optionsHTML}
        <div class="qty-selector">
          <label>الكمية:</label>
          <button onclick="changeQty(-1)">-</button>
          <input type="number" id="qty-input" value="1" min="1" onchange="selectedQty=Math.max(1,parseInt(this.value)||1)">
          <button onclick="changeQty(1)">+</button>
        </div>
        <button class="detail-add-btn" onclick="addProductToCart()" ${!isAvailable ? 'disabled style="opacity:0.5"' : ''}>
          ${isAvailable ? 'أضف إلى السلة' : 'غير متوفر'}
        </button>
      </div>
    </div>`;
}

window.switchMainImage = function(index) {
  const images = getImages(currentProduct);
  const mainImg = document.getElementById('main-product-img');
  if (mainImg && images[index]) mainImg.src = images[index];
  // Update active thumb
  document.querySelectorAll('.product-gallery-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });
};

window.changeQty = function(delta) {
  const input = document.getElementById('qty-input');
  selectedQty = Math.max(1, (parseInt(input.value) || 1) + delta);
  input.value = selectedQty;
};

window.addProductToCart = function() {
  if (!currentProduct) return;

  // Collect selected options
  const selectedOptions = [];
  (currentProduct.options || []).forEach((group, gi) => {
    const selected = document.querySelector(`input[name="opt_${gi}"]:checked`);
    if (selected) {
      const vi = parseInt(selected.value);
      const optVal = group.values[vi];
      selectedOptions.push({
        groupName: group.name,
        label: optVal.label,
        price: optVal.price || 0
      });
    }
  });

  // Add to cart multiple times for quantity
  for (let i = 0; i < selectedQty; i++) {
    Cart.addItem(currentProduct, selectedOptions);
  }
  Cart.openCart();
};
