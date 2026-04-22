/** Products page — renders product grid with option selectors */
let allProducts = [];
let currentCategory = null;

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid');
  const loading = document.getElementById('products-loading');
  const catNav = document.getElementById('categories-nav');

  try {
    const [products, collections] = await Promise.all([
      api.getProducts(),
      api.getCollections()
    ]);
    allProducts = products;
    loading.classList.add('hidden');

    // Render Categories
    if (collections.length > 0) {
      catNav.innerHTML = `
        <button class="btn btn-sm ${!currentCategory ? 'btn-primary' : 'btn-secondary'}" onclick="filterProducts(null)">All</button>
        ${collections.map(c => `
          <button class="btn btn-sm ${currentCategory === c._id ? 'btn-primary' : 'btn-secondary'}" onclick="filterProducts('${c._id}')">${c.name}</button>
        `).join('')}
      `;
    }

    renderProducts();
  } catch (err) {
    loading.classList.add('hidden');
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3 class="empty-title">Failed to load products</h3><p class="empty-desc">Please try again later.</p></div>';
  }
});

window.filterProducts = function(collectionId) {
  currentCategory = collectionId;
  const buttons = document.querySelectorAll('#categories-nav button');
  buttons.forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });
  
  // Quick and dirty toggle for active state
  if(!collectionId) buttons[0].classList.replace('btn-secondary', 'btn-primary');
  else {
    const activeBtn = Array.from(buttons).find(b => b.textContent === (allProducts.find(p => p.collectionId === collectionId)?.collection?.name || b.textContent)); // rough fallback
    // Actually we can just re-render the nav but it's fine, let's just re-render everything
  }
  
  // Re-render everything to update buttons reliably
  api.getCollections().then(collections => {
    const catNav = document.getElementById('categories-nav');
    catNav.innerHTML = `
      <button class="btn btn-sm ${!currentCategory ? 'btn-primary' : 'btn-secondary'}" onclick="filterProducts(null)">All</button>
      ${collections.map(c => `
        <button class="btn btn-sm ${currentCategory === c._id ? 'btn-primary' : 'btn-secondary'}" onclick="filterProducts('${c._id}')">${c.name}</button>
      `).join('')}
    `;
  });

  renderProducts();
};

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const filtered = currentCategory 
    ? allProducts.filter(p => p.collectionId === currentCategory)
    : allProducts;

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🛍️</div><h3 class="empty-title">No products found</h3><p class="empty-desc">Try another category!</p></div>';
    return;
  }
  grid.innerHTML = filtered.map(p => renderProductCard(p)).join('');
}

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

  return `<div class="product-card" id="product-${product._id}">
    <img class="product-img" src="${imgSrc}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
    <div class="product-info">
      <h3 class="product-title">${product.name}</h3>
      <div class="product-price">${formatPrice(product.basePrice)}</div>
      ${product.description ? `<p class="product-desc">${product.description}</p>` : ''}
      <div class="product-options">
        ${optionsHTML}
      </div>
      <button class="btn btn-primary btn-block mt-16" onclick="addToCart('${product._id}')">
        Add to Cart
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
    Cart.openCart();
  }).catch(() => showToast('Error adding to cart', 'error'));
}
