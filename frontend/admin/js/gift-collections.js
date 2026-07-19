let collections = [];
let allProducts = [];
let selectedProducts = [];
let editId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!api._adminKey()) {
    window.location.href = 'login';
    return;
  }
  await Promise.all([loadCollections(), loadProducts()]);
  document.getElementById('page-content-spinner').style.display = 'none';
  document.getElementById('main-content-layout').style.display = 'block';
});

async function loadCollections() {
  try {
    const res = await api._request('/gift-collections', { admin: true });
    collections = res;
    renderCollections();
    document.getElementById('page-content-spinner').style.display = 'none';
    document.getElementById('main-content-layout').style.display = 'block';
    document.body.classList.remove('is-loading');
  } catch (err) {
    console.error(err);
  }
}

async function loadProducts() {
  try {
    const res = await api._request('/products?admin=true', { admin: true });
    allProducts = res.products || res;
  } catch (err) {
    console.error(err);
  }
}

function renderCollections() {
  const tbody = document.getElementById('gift-collections-tbody');
  if (collections.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 24px;">لا توجد مجموعات هدايا</td></tr>';
    return;
  }
  
  tbody.innerHTML = collections.map(c => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 16px;"><strong>${c.name}</strong></td>
      <td style="padding: 16px;">${c.products.length} منتجات</td>
      <td style="padding: 16px;">
        <button class="btn btn-sm btn-secondary" onclick="editGift('${c._id}')">تعديل</button>
        <button class="btn btn-sm btn-danger" onclick="deleteGift('${c._id}')" style="margin-right: 8px;">حذف</button>
      </td>
    </tr>
  `).join('');
}

function openGiftModal() {
  editId = null;
  document.getElementById('gift-modal-title').textContent = 'إضافة مجموعة هدايا';
  document.getElementById('gift-name').value = '';
  document.getElementById('gift-product-search').value = '';
  document.getElementById('gift-search-results').style.display = 'none';
  selectedProducts = [];
  renderSelectedProducts();
  document.getElementById('gift-modal').style.display = 'flex';
}

function editGift(id) {
  const coll = collections.find(c => c._id === id);
  if (!coll) return;
  editId = id;
  document.getElementById('gift-modal-title').textContent = 'تعديل مجموعة هدايا';
  document.getElementById('gift-name').value = coll.name;
  document.getElementById('gift-product-search').value = '';
  document.getElementById('gift-search-results').style.display = 'none';
  
  // map ObjectIds to full product objects if they exist
  selectedProducts = coll.products.map(pid => allProducts.find(p => p._id === pid) || { _id: pid, name: 'منتج غير متوفر' });
  renderSelectedProducts();
  document.getElementById('gift-modal').style.display = 'flex';
}

function closeGiftModal() {
  document.getElementById('gift-modal').style.display = 'none';
}

function searchProducts(query) {
  const resContainer = document.getElementById('gift-search-results');
  if (!query || query.trim().length < 2) {
    resContainer.style.display = 'none';
    return;
  }
  
  const lowerQ = query.trim().toLowerCase();
  const results = allProducts.filter(p => p.name.toLowerCase().includes(lowerQ) && !selectedProducts.some(sp => sp._id === p._id)).slice(0, 5);
  
  if (results.length === 0) {
    resContainer.innerHTML = '<div style="padding: 12px; color: #64748b;">لا توجد نتائج</div>';
  } else {
    resContainer.innerHTML = results.map(p => `
      <div class="product-search-item" onclick="addProductToGift('${p._id}')">
        <img src="${(p.images && p.images[0]) || p.imageUrl || ''}" alt="">
        <span>${p.name}</span>
      </div>
    `).join('');
  }
  resContainer.style.display = 'block';
}

function addProductToGift(id) {
  const p = allProducts.find(x => x._id === id);
  if (p && !selectedProducts.find(x => x._id === id)) {
    selectedProducts.push(p);
    renderSelectedProducts();
  }
  document.getElementById('gift-product-search').value = '';
  document.getElementById('gift-search-results').style.display = 'none';
}

function removeProductFromGift(id) {
  selectedProducts = selectedProducts.filter(p => p._id !== id);
  renderSelectedProducts();
}

function renderSelectedProducts() {
  const container = document.getElementById('selected-products-container');
  if (selectedProducts.length === 0) {
    container.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px;">لم يتم تحديد منتجات</div>';
    return;
  }
  
  container.innerHTML = selectedProducts.map(p => `
    <div class="selected-product-item">
      <div style="display: flex; align-items: center;">
        <img src="${(p.images && p.images[0]) || p.imageUrl || ''}" alt="">
        <span style="font-weight: 500;">${p.name}</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeProductFromGift('${p._id}')">إزالة</button>
    </div>
  `).join('');
}

async function saveGiftCollection() {
  const name = document.getElementById('gift-name').value.trim();
  if (!name) {
    alert('يرجى إدخال اسم المجموعة');
    return;
  }
  
  const payload = {
    name,
    products: selectedProducts.map(p => p._id)
  };
  
  try {
    if (editId) {
      await api._request(`/gift-collections/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        admin: true
      });
    } else {
      await api._request('/gift-collections', {
        method: 'POST',
        body: JSON.stringify(payload),
        admin: true
      });
    }
    
    closeGiftModal();
    await loadCollections();
  } catch (err) {
    console.error(err);
    alert('حدث خطأ في الاتصال');
  }
}

async function deleteGift(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
  
  try {
    await api._request(`/gift-collections/${id}`, { method: 'DELETE', admin: true });
    await loadCollections();
  } catch (err) {
    console.error(err);
  }
}
