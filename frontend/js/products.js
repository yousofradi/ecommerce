/** Homepage — renders collections grid + featured product sections */
document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('home-loading');
  const content = document.getElementById('home-content');

  try {
    const [products, collections] = await Promise.all([
      api.getProducts(null, null, false),
      api.getCollections()
    ]);

    loading.classList.add('hidden');
    content.classList.remove('hidden');

    // Render collections grid
    renderCollections(collections);

    // Render featured sections for specific collections
    renderFeaturedSections(products, collections);

  } catch (err) {
    loading.innerHTML = '<p style="text-align:center;color:#ef4444;padding:40px">فشل تحميل المتجر. يرجى المحاولة لاحقاً.</p>';
  }
});

function renderCollections(collections) {
  const grid = document.getElementById('collections-grid');
  if (!collections || collections.length === 0) {
    document.getElementById('collections-section').classList.add('hidden');
    return;
  }

  grid.innerHTML = collections.map(c => {
    const img = c.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZWZlOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuGYjuGZiDwvdGV4dD48L3N2Zz4=';
    return `
      <a href="collection.html?id=${c._id}" class="collection-card">
        <img src="${img}" alt="${c.name}" class="collection-card-img" onerror="this.style.background='#f5efe9'">
        <div class="collection-card-title">${c.name}</div>
      </a>`;
  }).join('');
}

function renderFeaturedSections(products, collections) {
  if (!products || products.length === 0) return;

  // Find specific featured collections
  const featuredNames = ['الأكثر مبيعًا', 'عروض لفتره محدوده', 'سكوب سندورة'];
  const featuredSection = document.getElementById('featured-section');
  const bestsellersSection = document.getElementById('bestsellers-section');
  let featuredHTML = '';
  let bestsellersHTML = '';

  // Build collection name -> id map
  const colMap = {};
  collections.forEach(c => colMap[c.name] = c._id.toString());

  // Group products by collectionIds
  for (const name of featuredNames) {
    const colId = colMap[name];
    if (!colId) continue;

    const sectionProducts = products.filter(p => {
      const ids = (p.collectionIds || []).map(id => id.toString());
      return ids.includes(colId) || (p.collectionId && p.collectionId.toString() === colId);
    }).slice(0, 6);

    if (sectionProducts.length === 0) continue;

    const sectionHTML = `
      <h2 class="home-section-title">${name}</h2>
      <div class="products-grid" style="margin-bottom:32px">
        ${sectionProducts.map(p => renderStoreCard(p)).join('')}
      </div>`;

    if (name === 'الأكثر مبيعًا') {
      bestsellersHTML = sectionHTML;
    } else {
      featuredHTML += sectionHTML;
    }
  }

  featuredSection.innerHTML = featuredHTML;
  bestsellersSection.innerHTML = bestsellersHTML;
}

function getImg(product) {
  if (product.images && product.images.length > 0) return product.images[0];
  if (product.imageUrl) return product.imageUrl;
  return '';
}

function renderStoreCard(p) {
  const img = getImg(p);
  const salePrice = p.salePrice || p.basePrice;
  const hasDiscount = p.salePrice && p.salePrice < p.basePrice;

  return `
    <a href="product.html?id=${p._id}" class="store-product-card">
      <div class="store-product-img" style="position:relative">
        ${img ? `<img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">` : ''}
        ${hasDiscount ? '<span class="discount-badge">خصم</span>' : ''}
      </div>
      <div class="store-product-info">
        <div class="store-product-name">${p.name}</div>
        <div class="store-product-prices">
          <span class="store-price-sale">${formatPrice(salePrice)}</span>
          ${hasDiscount ? `<span class="store-price-original">${formatPrice(p.basePrice)}</span>` : ''}
        </div>
      </div>
    </a>`;
}
