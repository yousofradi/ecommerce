/** Admin products list page */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadProducts();
});

let allProducts = [];
let dragIdx = null;

async function loadProducts() {
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner"></div></td></tr>';
  try {
    const [products, collections] = await Promise.all([
      api.getProducts(),
      api.getCollections().catch(() => [])
    ]);
    const colMap = {};
    collections.forEach(c => colMap[c._id] = c.name);

    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:40px">لا توجد منتجات بعد</td></tr>';
      return;
    }
    
    allProducts = products;
    renderProducts(collections);
    
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">فشل تحميل المنتجات</td></tr>';
  }
}

function renderProducts(collections) {
  const tbody = document.getElementById('products-tbody');
  const colMap = {};
  if (collections) collections.forEach(c => colMap[c._id] = c.name);

  tbody.innerHTML = allProducts.map((p, idx) => `
      <tr draggable="true" data-idx="${idx}" ondragstart="onProductDragStart(event)" ondragover="onProductDragOver(event)" ondrop="onProductDrop(event)" ondragend="onProductDragEnd(event)" style="cursor: grab; transition: background 0.2s;">
        <td style="width: 40px; text-align: center; color: #94a3b8; cursor: grab;" title="اسحب لتغيير الترتيب">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>
        </td>
        <td>
          ${p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:54px;height:54px;border-radius:8px;object-fit:cover;border:1px solid var(--border-color)">`
            : `<div style="width:54px;height:54px;border-radius:8px;background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:1.4rem">📦</div>`}
        </td>
        <td><strong>${p.name}</strong>${p.description ? `<div class="text-sm text-muted" style="margin-top:2px">${p.description.substring(0,50)}${p.description.length>50?'…':''}</div>` : ''}</td>
        <td style="font-weight:700;color:var(--primary)">${formatPrice(p.basePrice)}</td>
        <td>${colMap[p.collectionId] ? `<span class="badge badge-info">${colMap[p.collectionId]}</span>` : '<span class="text-muted text-sm">—</span>'}</td>
        <td>${(p.options||[]).length > 0 ? `<span class="badge badge-success">${(p.options||[]).length} خيار</span>` : '<span class="text-muted text-sm">—</span>'}</td>
        <td>
          <div class="flex gap-8">
            <a href="product-form.html?id=${p._id}" class="btn btn-secondary btn-sm">تعديل</a>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}','${p.name}')">حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
}

// ── Drag and Drop Reorder ──────────────────────────────

window.onProductDragStart = function(e) {
  dragIdx = parseInt(e.currentTarget.dataset.idx);
  e.currentTarget.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
};

window.onProductDragOver = function(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const tr = e.currentTarget;
  tr.style.borderTop = '3px solid var(--primary)';
};

window.onProductDrop = function(e) {
  e.preventDefault();
  const dropIdx = parseInt(e.currentTarget.dataset.idx);
  e.currentTarget.style.borderTop = '';
  
  if (dragIdx !== null && dragIdx !== dropIdx) {
    // Reorder the array
    const [moved] = allProducts.splice(dragIdx, 1);
    allProducts.splice(dropIdx, 0, moved);
    
    // Re-render
    renderProducts();
    
    // Save to backend
    saveReorder();
  }
};

window.onProductDragEnd = function(e) {
  e.currentTarget.style.opacity = '1';
  document.querySelectorAll('#products-tbody tr').forEach(el => {
    el.style.borderTop = '';
  });
  dragIdx = null;
};

async function saveReorder() {
  try {
    const order = allProducts.map((p, idx) => ({ id: p._id, sortOrder: idx }));
    await api.reorderProducts(order);
    showToast('تم حفظ ترتيب المنتجات');
  } catch (err) {
    showToast('حدث خطأ أثناء حفظ الترتيب', 'error');
  }
}

async function deleteProduct(id, name) {
  const confirmed = await window.showConfirmModal('تأكيد الحذف', `هل أنت متأكد من حذف المنتج "${name}"؟`);
  if (!confirmed) return;
  try {
    await api.deleteProduct(id);
    showToast('تم حذف المنتج');
    loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
}
