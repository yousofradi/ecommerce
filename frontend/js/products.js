/** Homepage — renders sections from homepage builder config */
const STORAGE_KEY = 'sundura_homepage_sections';

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

    // Try to load homepage config
    let sections = [];
    try {
      const saved = await api.getSetting(STORAGE_KEY);
      if (saved) sections = saved;
    } catch(e) {
      console.error('Failed to load homepage sections from API', e);
      // Fallback to localStorage for smooth transition
      const savedLocal = localStorage.getItem(STORAGE_KEY);
      if (savedLocal) sections = JSON.parse(savedLocal);
    }

    if (sections && sections.length > 0) {
      renderFromConfig(sections, products, collections);
    } else {
      // Fallback: default rendering
      renderCollections(collections);
      renderFeaturedSections(products, collections);
    }

  } catch (err) {
    loading.innerHTML = '<p style="text-align:center;color:#ef4444;padding:40px">فشل تحميل المتجر. يرجى المحاولة لاحقاً.</p>';
  }
});

function renderFromConfig(sections, products, collections) {
  const container = document.getElementById('home-content');
  let html = '';
  
  for (const s of sections) {
    if (s.type === 'products') {
      html += renderProductSection(s, products, collections);
    } else if (s.type === 'collections') {
      html += renderCollectionSection(s, collections);
    } else if (s.type === 'banner') {
      html += renderBannerSection(s);
    } else if (s.type === 'text') {
      html += renderTextSection(s);
    }
  }
  
  container.innerHTML = html;
}

function renderProductSection(s, products, collections) {
  let sectionProducts = products;
  
  if (s.collectionId) {
    sectionProducts = products.filter(p => {
      const ids = (p.collectionIds || []).map(id => id.toString());
      return ids.includes(s.collectionId) || (p.collectionId && p.collectionId.toString() === s.collectionId);
    });
  }
  
  sectionProducts = sectionProducts.slice(0, s.maxItems || 4);
  if (sectionProducts.length === 0) return '';
  
  const cols = s.itemsPerRow || 4;
  return `
    <section class="home-section">
      ${s.showTitle !== false && s.title ? `<h2 class="home-section-title">${s.title}</h2>` : ''}
      <div class="products-grid" style="margin-bottom:32px; --cols:${cols}">
        ${sectionProducts.map(p => renderStoreCard(p)).join('')}
      </div>
    </section>`;
}

function renderCollectionSection(s, collections) {
  let displayCols = collections;
  
  if (s.selectedCollections && s.selectedCollections.length > 0) {
    displayCols = s.selectedCollections
      .map(id => collections.find(c => c._id === id))
      .filter(Boolean);
  }
  
  if (displayCols.length === 0) return '';
  
  return `
    <section class="home-section" id="collections-section">
      ${s.showTitle !== false && s.title ? `<h2 class="home-section-title">${s.title}</h2>` : ''}
      <div class="collections-grid" id="collections-grid">
        ${displayCols.map(c => {
          const img = c.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZWZlOSIvPjwvc3ZnPg==';
          return `
            <a href="collection?id=${c._id}" class="collection-card">
              <img src="${img}" alt="${c.name}" class="collection-card-img" onerror="this.style.background='#f5efe9'">
              ${s.showNames !== false ? `<div class="collection-card-title">${c.name}</div>` : ''}
            </a>`;
        }).join('')}
      </div>
    </section>`;
}

function renderBannerSection(s) {
  if (!s.imageUrl) return '';
  const wrapper = s.linkUrl ? `<a href="${s.linkUrl}" style="display:block">` : '<div>';
  const wrapperEnd = s.linkUrl ? '</a>' : '</div>';
  
  return `
    <section class="home-section">
      ${s.showTitle !== false && s.title ? `<h2 class="home-section-title">${s.title}</h2>` : ''}
      ${wrapper}
        <img src="${s.imageUrl}" alt="${s.title || 'Banner'}" style="width:100%;border-radius:12px;max-height:400px;object-fit:cover">
      ${wrapperEnd}
    </section>`;
}

function renderTextSection(s) {
  if (!s.content) return '';
  return `
    <section class="home-section">
      ${s.showTitle !== false && s.title ? `<h2 class="home-section-title">${s.title}</h2>` : ''}
      <div style="color:#475569;line-height:1.8;font-size:1rem">${s.content}</div>
    </section>`;
}

// Fallback functions
function renderCollections(collections) {
  const grid = document.getElementById('collections-grid');
  if (!collections || collections.length === 0) {
    const section = document.getElementById('collections-section');
    if (section) section.classList.add('hidden');
    return;
  }
  if (!grid) return;

  grid.innerHTML = collections.map(c => {
    const img = c.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZWZlOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuGYjuGZiDwvdGV4dD48L3N2Zz4=';
    return `
      <a href="collection?id=${c._id}" class="collection-card">
        <img src="${img}" alt="${c.name}" class="collection-card-img" onerror="this.style.background='#f5efe9'">
        <div class="collection-card-title">${c.name}</div>
      </a>`;
  }).join('');
}

function renderFeaturedSections(products, collections) {
  if (!products || products.length === 0) return;

  const featuredNames = ['الأكثر مبيعًا', 'عروض لفتره محدوده', 'سكوب سندورة'];
  const featuredSection = document.getElementById('featured-section');
  const bestsellersSection = document.getElementById('bestsellers-section');
  if (!featuredSection || !bestsellersSection) return;
  let featuredHTML = '';
  let bestsellersHTML = '';

  const colMap = {};
  collections.forEach(c => colMap[c.name] = c._id.toString());

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
  const productLink = p.handle ? `product?name=${encodeURIComponent(p.handle)}` : `product?id=${p._id}`;
  const hasOptions = p.options && p.options.length > 0;
  
  const pJson = JSON.stringify({
    _id: p._id, name: p.name, basePrice: p.basePrice, salePrice: p.salePrice,
    images: p.images, imageUrl: p.imageUrl, options: p.options, quantity: p.quantity
  }).replace(/"/g, '&quot;');

  const btnHtml = hasOptions 
    ? `<a href="${productLink}" class="btn btn-secondary btn-block" style="margin-top:8px;text-align:center;padding:6px;font-size:0.9rem">حدد اختيارك</a>`
    : `<button class="btn btn-primary btn-block" style="margin-top:8px;padding:6px;font-size:0.9rem" onclick="quickAddToCart(event, ${pJson})">أضف للسلة</button>`;

  return `
    <div class="store-product-card" style="display:flex;flex-direction:column;">
      <a href="${productLink}" style="display:block; text-decoration:none; color:inherit; flex:1;">
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
      </a>
      <div style="padding: 0 12px 12px; margin-top:auto;">
        ${btnHtml}
      </div>
    </div>`;
}

window.quickAddToCart = function(event, p) {
  event.preventDefault();
  event.stopPropagation();
  const isUnlimited = p.quantity === null || p.quantity === undefined;
  if (!isUnlimited && p.quantity <= 0) {
    if(window.showToast) window.showToast('عذراً، المنتج غير متوفر حالياً', 'error');
    else alert('عذراً، المنتج غير متوفر حالياً');
    return;
  }
  if(window.Cart) {
    window.Cart.addItem(p);
    window.Cart.openCart();
  }
}
