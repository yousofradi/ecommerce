/** Products page — renders product grid with option selectors */
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid');
  const loading = document.getElementById('products-loading');

  try {
    const products = await api.getProducts();
    loading.classList.add('hidden');

    if (!products.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🛍️</div><h3 class="empty-title">No products yet</h3><p class="empty-desc">Check back soon!</p></div>';
      return;
    }

    grid.innerHTML = products.map(p => renderProductCard(p)).join('');
  } catch (err) {
    loading.classList.add('hidden');
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3 class="empty-title">Failed to load products</h3><p class="empty-desc">Please try again later.</p></div>';
  }
});

function renderProductCard(product) {
  const optionsHTML = (product.options || []).map((group, gi) => {
    const valuesHTML = group.values.map((v, vi) => {
      const priceLabel = v.price > 0 ? `+${v.price}` : v.price < 0 ? `${v.price}` : '+0';
      return `<div class="radio-option">
        <input type="radio" name="opt_${product._id}_${gi}" id="opt_${product._id}_${gi}_${vi}"
          value="${vi}" data-product="${product._id}" data-group="${gi}" ${vi === 0 && !group.required ? '' : vi === 0 ? 'required' : ''}>
        <label for="opt_${product._id}_${gi}_${vi}">
          ${v.label} <span class="option-price">(${priceLabel})</span>
        </label>
      </div>`;
    }).join('');
    return `<div class="option-group" data-required="${group.required}">
      <div class="option-group-title">${group.name}${group.required ? '<span class="required-star">*</span>' : ''}</div>
      <div class="radio-options">${valuesHTML}</div>
    </div>`;
  }).join('');

  const imgSrc = product.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

  return `<div class="card slide-up" id="product-${product._id}">
    <img class="card-img" src="${imgSrc}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
    <div class="card-body">
      <h3 class="card-title">${product.name}</h3>
      <div class="card-price">${formatPrice(product.basePrice)}</div>
      ${product.description ? `<p class="card-desc">${product.description}</p>` : ''}
      ${optionsHTML}
      <button class="btn btn-primary btn-block mt-16" onclick="addToCart('${product._id}')">
        🛒 Add to Cart
      </button>
    </div>
  </div>`;
}

function addToCart(productId) {
  const card = document.getElementById(`product-${productId}`);
  const optionGroups = card.querySelectorAll('.option-group');
  const selectedOptions = [];
  let valid = true;

  optionGroups.forEach((group, gi) => {
    const required = group.dataset.required === 'true';
    const selected = card.querySelector(`input[name="opt_${productId}_${gi}"]:checked`);
    if (required && !selected) {
      valid = false;
      group.style.border = '1px solid var(--danger)';
      group.style.borderRadius = 'var(--radius)';
      group.style.padding = '10px';
      setTimeout(() => { group.style.border = ''; group.style.padding = ''; }, 2000);
    } else if (selected) {
      const vi = parseInt(selected.value);
      // Get product data from the page
      selectedOptions.push({
        groupName: group.querySelector('.option-group-title').textContent.replace('*', '').trim(),
        label: '',
        price: 0,
        _vi: vi,
        _gi: gi
      });
    }
  });

  if (!valid) {
    showToast('Please select all required options', 'error');
    return;
  }

  // Fetch product to get accurate data
  api.getProduct(productId).then(product => {
    const finalOptions = [];
    optionGroups.forEach((group, gi) => {
      const selected = card.querySelector(`input[name="opt_${productId}_${gi}"]:checked`);
      if (selected) {
        const vi = parseInt(selected.value);
        const optGroup = product.options[gi];
        finalOptions.push({
          groupName: optGroup.name,
          label: optGroup.values[vi].label,
          price: optGroup.values[vi].price
        });
      }
    });
    Cart.addItem(product, finalOptions);
    showToast(`${product.name} added to cart!`);
  }).catch(() => showToast('Error adding to cart', 'error'));
}
