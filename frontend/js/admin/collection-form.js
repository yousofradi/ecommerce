let collectionId = new URLSearchParams(window.location.search).get('id');
let collectionProducts = [];
let allProducts = [];
let sortableList = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  
  await loadAllProducts();

  if (collectionId) {
    document.title = 'تعديل المجموعة — Sundura Admin';
    await loadCollection(collectionId);
  } else {
    document.title = 'إضافة مجموعة — Sundura Admin';
    renderProductsList();
  }

  document.getElementById('collection-form').addEventListener('submit', saveCollection);
  document.getElementById('products-search').addEventListener('input', filterCollectionProducts);
  document.getElementById('available-search').addEventListener('input', filterAvailableProducts);
});

async function loadAllProducts() {
  try {
    allProducts = await api.getProducts({ admin: true, limit: 1000 });
    // Normalize if pagination is used
    if (allProducts.products) allProducts = allProducts.products;
  } catch (e) {
    showToast('فشل تحميل المنتجات', 'error');
  }
}

async function loadCollection(id) {
  try {
    const col = await api.getCollection(id);
    document.getElementById('c-name').value = col.name;
    document.getElementById('c-image').value = col.imageUrl || '';
    document.getElementById('c-desc').innerHTML = col.description || '';
    if (col.imageUrl) updateImagePreview(col.imageUrl);

    // Get products for this collection
    collectionProducts = allProducts.filter(p => p.collectionId === id || (p.collectionIds && p.collectionIds.includes(id)));
    // Sort them if needed, here we just use their order
    renderProductsList();
  } catch (e) {
    showToast('فشل تحميل المجموعة', 'error');
  }
}

function updateImagePreview(url) {
  const container = document.getElementById('image-preview-container');
  if (url) {
    container.innerHTML = `<img src="${url}" alt="Collection Image">`;
  } else {
    container.innerHTML = `<span style="color:#aaa">لا توجد صورة</span>`;
  }
}

window.promptImage = function() {
  const url = prompt('أدخل رابط الصورة:');
  if (url !== null) {
    document.getElementById('c-image').value = url;
    updateImagePreview(url);
  }
};

window.removeImage = function() {
  document.getElementById('c-image').value = '';
  updateImagePreview('');
};

function renderProductsList(productsToRender = collectionProducts) {
  document.getElementById('products-count').textContent = collectionProducts.length;
  const list = document.getElementById('collection-products-list');
  
  if (productsToRender.length === 0) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#999">لا توجد منتجات في هذه المجموعة</div>';
    if (sortableList) sortableList.destroy();
    return;
  }

  list.innerHTML = productsToRender.map(p => `
    <div class="product-row" data-id="${p._id}">
      <div class="btn-reorder">☰</div>
      <img src="${p.imageUrl || p.images?.[0] || ''}" onerror="this.style.display='none'">
      <div style="flex:1;font-weight:500">${p.name}</div>
      <div style="color:${p.active ? 'green' : 'red'};font-size:0.8rem">● ${p.active ? 'نشط' : 'غير نشط'}</div>
      <button type="button" class="btn-remove" onclick="removeProductFromCollection('${p._id}')">×</button>
    </div>
  `).join('');

  if (sortableList) sortableList.destroy();
  sortableList = new Sortable(list, {
    handle: '.btn-reorder',
    animation: 150,
    onEnd: function () {
      // Re-sync array based on DOM
      const rows = Array.from(list.children);
      const newOrderIds = rows.map(r => r.getAttribute('data-id'));
      collectionProducts = newOrderIds.map(id => collectionProducts.find(p => p._id === id)).filter(Boolean);
    }
  });
}

function filterCollectionProducts(e) {
  const q = e.target.value.toLowerCase();
  const filtered = collectionProducts.filter(p => p.name.toLowerCase().includes(q));
  renderProductsList(filtered);
}

window.removeProductFromCollection = function(id) {
  collectionProducts = collectionProducts.filter(p => p._id !== id);
  renderProductsList();
};

/* --- Select Products Modal --- */

window.openSelectModal = function() {
  document.getElementById('select-modal').classList.remove('hidden');
  renderSelectModalLists();
};

window.closeSelectModal = function() {
  document.getElementById('select-modal').classList.add('hidden');
};

function renderSelectModalLists(query = '') {
  const selectedBox = document.getElementById('selected-products-box');
  const availableBox = document.getElementById('available-products-box');

  selectedBox.innerHTML = collectionProducts.map(p => `
    <div class="product-item">
      <button type="button" class="btn-remove" onclick="toggleProductSelect('${p._id}', false)">×</button>
      <div style="flex:1;font-size:0.9rem">${p.name}</div>
      <img src="${p.imageUrl || p.images?.[0] || ''}" style="width:30px;height:30px;object-fit:cover;border-radius:4px">
    </div>
  `).join('');

  const available = allProducts.filter(p => !collectionProducts.some(cp => cp._id === p._id));
  const filteredAvailable = query ? available.filter(p => p.name.toLowerCase().includes(query)) : available;

  availableBox.innerHTML = filteredAvailable.map(p => `
    <div class="product-item">
      <button type="button" style="color:green;background:none;border:none;font-size:1.2rem;cursor:pointer" onclick="toggleProductSelect('${p._id}', true)">+</button>
      <div style="flex:1;font-size:0.9rem">${p.name}</div>
      <img src="${p.imageUrl || p.images?.[0] || ''}" style="width:30px;height:30px;object-fit:cover;border-radius:4px">
    </div>
  `).join('');
}

window.toggleProductSelect = function(id, add) {
  if (add) {
    const p = allProducts.find(p => p._id === id);
    if (p) collectionProducts.push(p);
  } else {
    collectionProducts = collectionProducts.filter(p => p._id !== id);
  }
  renderSelectModalLists(document.getElementById('available-search').value.toLowerCase());
};

function filterAvailableProducts(e) {
  renderSelectModalLists(e.target.value.toLowerCase());
}

window.saveSelectedProducts = function() {
  renderProductsList();
  closeSelectModal();
};

window.openReorderModal = function() {
  showToast('يمكنك سحب وإفلات المنتجات في القائمة للترتيب', 'info');
};

/* --- Save --- */

async function saveCollection(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('c-name').value.trim(),
    imageUrl: document.getElementById('c-image').value.trim(),
    description: document.getElementById('c-desc').innerHTML.trim()
  };

  try {
    let savedCol;
    if (collectionId) {
      savedCol = await api.updateCollection(collectionId, data);
      showToast('تم التحديث بنجاح');
    } else {
      savedCol = await api.createCollection(data);
      collectionId = savedCol._id;
      showToast('تم الإنشاء بنجاح');
    }

    // Now update products collection bulk
    const productIds = collectionProducts.map(p => p._id);
    await api.request(`/api/products/collection/batch`, 'PUT', {
      productIds: productIds,
      collectionId: collectionId,
      action: 'set'
    });

    setTimeout(() => window.location.href = 'collections', 1000);
  } catch (err) {
    showToast('حدث خطأ أثناء الحفظ', 'error');
  }
}
