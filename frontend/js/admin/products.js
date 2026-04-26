/** Admin products list page */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadProducts();
});

let allProducts = [];
let dragIdx = null;
let currentPage = 1;
let totalPages = 1;

async function loadProducts() {
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner"></div></td></tr>';
  try {
    const [res, collections] = await Promise.all([
      api.getProducts(currentPage, 20, true),
      api.getCollections().catch(() => [])
    ]);
    const colMap = {};
    collections.forEach(c => colMap[c._id] = c.name);

    // handle either new paginated object or old array
    let products = res.products || res;
    totalPages = res.totalPages || 1;
    
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:40px">لا توجد منتجات بعد</td></tr>';
      updatePaginationInfo(0);
      return;
    }
    
    allProducts = products;
    renderProducts(collections);
    updatePaginationInfo(res.total || products.length);
    updateBulkActions();
    
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">فشل تحميل المنتجات</td></tr>';
  }
}

function updatePaginationInfo(total) {
  document.getElementById('pagination-info').textContent = `إجمالي: ${total} - صفحة ${currentPage} من ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= totalPages;
}

window.changePage = function(delta) {
  const newPage = currentPage + delta;
  if (newPage < 1 || newPage > totalPages) return;
  currentPage = newPage;
  loadProducts();
};

function renderProducts(collections) {
  const tbody = document.getElementById('products-tbody');
  const colMap = {};
  if (collections) collections.forEach(c => colMap[c._id] = c.name);

  tbody.innerHTML = allProducts.map((p, idx) => `
      <tr draggable="true" data-idx="${idx}" ondragstart="onProductDragStart(event)" ondragover="onProductDragOver(event)" ondrop="onProductDrop(event)" ondragend="onProductDragEnd(event)" style="cursor: grab; transition: background 0.2s;">
        <td style="width: 40px; text-align: center;"><input type="checkbox" class="product-checkbox" value="${p._id}" onchange="updateBulkActions()"></td>
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
        <td>
          <label class="switch">
            <input type="checkbox" ${p.active !== false ? 'checked' : ''} onchange="toggleProductActive('${p._id}', this.checked)">
            <span class="slider round"></span>
          </label>
        </td>
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
    
  // Reset select all checkbox
  const selectAll = document.getElementById('select-all');
  if(selectAll) selectAll.checked = false;
}

window.toggleProductActive = async function(id, active) {
  try {
    await api.updateProduct(id, { active });
    showToast('تم تحديث حالة المنتج');
  } catch (err) {
    showToast(err.message, 'error');
    loadProducts(); // revert
  }
};

window.toggleSelectAll = function() {
  const selectAll = document.getElementById('select-all');
  const checkboxes = document.querySelectorAll('.product-checkbox');
  checkboxes.forEach(cb => cb.checked = selectAll.checked);
  updateBulkActions();
};

window.updateBulkActions = function() {
  const checkboxes = document.querySelectorAll('.product-checkbox:checked');
  const bulkActions = document.getElementById('bulk-actions');
  if (bulkActions) {
    bulkActions.style.display = checkboxes.length > 0 ? 'flex' : 'none';
  }
};

window.deleteSelected = async function() {
  const checkboxes = document.querySelectorAll('.product-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.value);
  if (!ids.length) return;
  
  const confirmed = await window.showConfirmModal('تأكيد الحذف', `هل أنت متأكد من حذف ${ids.length} منتج؟`);
  if (!confirmed) return;
  
  try {
    await api.deleteProductsBatch(ids);
    showToast('تم حذف المنتجات المحددة');
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deactivateSelected = async function() {
  const checkboxes = document.querySelectorAll('.product-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.value);
  if (!ids.length) return;
  
  const confirmed = await window.showConfirmModal('تأكيد التعطيل', `هل أنت متأكد من تعطيل ${ids.length} منتج؟`);
  if (!confirmed) return;
  
  try {
    await api.deactivateProductsBatch(ids);
    showToast('تم تعطيل المنتجات المحددة');
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

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
