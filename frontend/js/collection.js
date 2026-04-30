/** Collection page — loads products for a specific collection */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const collectionId = params.get('id');
  const loading = document.getElementById('collection-loading');
  const grid = document.getElementById('collection-products');

  if (!collectionId) {
    loading.innerHTML = '<p style="text-align:center;color:#999">لم يتم تحديد تصنيف</p>';
    return;
  }

  try {
    // Fetch collection info + products
    const [collection, products] = await Promise.all([
      api._request(`/collections/${collectionId}`),
      api.getProductsByCollection(collectionId)
    ]);

    // Update page title and breadcrumbs
    document.title = `${collection.name} | Sundura Shop`;
    document.getElementById('collection-title').textContent = collection.name;
    document.getElementById('breadcrumb-name').textContent = collection.name;

    loading.classList.add('hidden');

    if (!products || products.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#999;grid-column:1/-1"><p style="font-size:2rem;margin-bottom:8px">🛍️</p><p>لا توجد منتجات في هذا التصنيف حالياً</p></div>';
      return;
    }

    grid.innerHTML = products.map(p => renderProductCard(p)).join('');
  } catch (err) {
    loading.innerHTML = '<p style="text-align:center;color:#ef4444">فشل تحميل المنتجات. يرجى المحاولة لاحقاً.</p>';
  }
});

function getImg(product) {
  if (product.images && product.images.length > 0) return product.images[0];
  if (product.imageUrl) return product.imageUrl;
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
}

function renderProductCard(p) {
  const img = getImg(p);
  const salePrice = p.salePrice || p.basePrice;
  const hasDiscount = p.salePrice && p.salePrice < p.basePrice;

  return `
    <a href="product.html?id=${p._id}" class="store-product-card">
      <div class="store-product-img" style="position:relative">
        <img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
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
