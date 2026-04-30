/** Products page — renders products grouped by category with image galleries */
let allProducts = [];
let allCollections = [];
let currentCategory = null;

document.addEventListener('DOMContentLoaded', async () => {
  const sectionsEl = document.getElementById('products-sections');
  const loading = document.getElementById('products-loading');
  const catNav = document.getElementById('categories-nav');

  try {
    const [products, collections] = await Promise.all([
      api.getProducts(),
      api.getCollections()
    ]);
    allProducts = products;
    allCollections = collections;
    loading.classList.add('hidden');

    // Render Category Chips
    renderCategoryChips();

    // Render products by category
    renderProductSections();
  } catch (err) {
    loading.classList.add('hidden');
    sectionsEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3 class="empty-title">فشل تحميل المنتجات</h3><p class="empty-desc">يرجى المحاولة لاحقاً.</p></div>';
  }
});

function renderCategoryChips() {
  const catNav = document.getElementById('categories-nav');
  if (allCollections.length === 0) {
    catNav.style.display = 'none';
    return;
  }
  catNav.innerHTML = `
    <a href="#" class="category-chip ${!currentCategory ? 'active' : ''}" onclick="scrollToAll(event)">الكل</a>
    ${allCollections.map(c => `
      <a href="#cat-${c._id}" class="category-chip" onclick="scrollToCategory(event, '${c._id}')">${c.name}</a>
    `).join('')}
  `;
}

window.scrollToAll = function(e) {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.scrollToCategory = function(e, id) {
  e.preventDefault();
  const el = document.getElementById('cat-' + id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

function renderProductSections() {
  const sectionsEl = document.getElementById('products-sections');

  // Build a map: collectionId -> products
  const catMap = {};
  const uncategorized = [];

  allProducts.forEach(p => {
    if (p.collectionId) {
      if (!catMap[p.collectionId]) catMap[p.collectionId] = [];
      catMap[p.collectionId].push(p);
    } else {
      uncategorized.push(p);
    }
  });

  let html = '';

  // Render each collection section (in collection order)
  allCollections.forEach(col => {
    const products = catMap[col._id];
    if (!products || products.length === 0) return;

    html += `
      <section class="category-section" id="cat-${col._id}">
        <div class="section-header">
          <h2>${col.name}</h2>
        </div>
        <div class="grid grid-3">
          ${products.map(p => renderProductCard(p)).join('')}
        </div>
      </section>
    `;
  });

  // Uncategorized products
  if (uncategorized.length > 0) {
    html += `
      <section class="category-section" id="cat-uncategorized">
        <div class="section-header">
          <h2>منتجات أخرى</h2>
        </div>
        <div class="grid grid-3">
          ${uncategorized.map(p => renderProductCard(p)).join('')}
        </div>
      </section>
    `;
  }

  if (!html) {
    html = '<div class="empty-state"><div class="empty-icon">🛍️</div><h3 class="empty-title">لا توجد منتجات حالياً</h3><p class="empty-desc">ترقبوا قريباً!</p></div>';
  }

  sectionsEl.innerHTML = html;
}

function getProductImages(product) {
  if (product.images && product.images.length > 0) return product.images;
  if (product.imageUrl) return [product.imageUrl];
  return [];
}

function renderProductCard(product) {
  const images = getProductImages(product);
  const mainImg = images.length > 0
    ? images[0]
    : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

  // Gallery dots (only if multiple images)
  const dotsHTML = images.length > 1
    ? `<div class="gallery-dots">${images.map((_, i) => `<span class="gallery-dot ${i === 0 ? 'active' : ''}" onclick="switchImage(event, '${product._id}', ${i})"></span>`).join('')}</div>`
    : '';

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

  // Store all image URLs as data attribute for gallery switching
  const imagesData = images.length > 1 ? `data-images='${JSON.stringify(images)}'` : '';

  return `<div class="product-card" id="product-${product._id}" ${imagesData}>
    <div class="product-gallery">
      <img class="product-img" id="img-${product._id}" src="${mainImg}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
      ${dotsHTML}
    </div>
    <div class="product-info">
      <h3 class="product-title">${product.name}</h3>
      <div class="product-price">${formatPrice(product.basePrice)}</div>
      ${product.description ? `<p class="product-desc">${product.description}</p>` : ''}
      <div class="product-options">
        ${optionsHTML}
      </div>
      <button class="btn btn-primary btn-block mt-16" onclick="addToCart('${product._id}')">
        أضف إلى السلة
      </button>
    </div>
  </div>`;
}

// ── Image Gallery Switching ──────────────────────────────
window.switchImage = function(e, productId, index) {
  e.stopPropagation();
  const card = document.getElementById('product-' + productId);
  if (!card) return;
  const imagesStr = card.getAttribute('data-images');
  if (!imagesStr) return;
  const images = JSON.parse(imagesStr);
  const img = document.getElementById('img-' + productId);
  if (img && images[index]) {
    img.src = images[index];
  }
  // Update dots
  card.querySelectorAll('.gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
};

// ── Add to Cart ──────────────────────────────────────────
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
    showToast('يرجى اختيار جميع الخيارات المطلوبة', 'error');
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
  }).catch(() => showToast('خطأ في إضافة المنتج', 'error'));
}
