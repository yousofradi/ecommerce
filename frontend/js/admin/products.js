/** Admin products list page */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadProducts();
});

let allProducts = [];
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

  const getMainImage = (p) => {
    if (p.images && p.images.length > 0) return p.images[0];
    return p.imageUrl || '';
  };

  tbody.innerHTML = allProducts.map((p, idx) => {
    const mainImg = getMainImage(p);
    const statusLabel = p.status === 'draft' ? 'مسودة' : 'نشط';
    const statusClass = p.status === 'draft' ? 'badge-warning' : 'badge-success';
    const qty = (p.quantity != null && p.quantity !== 0) ? p.quantity : '∞';
    const hasDiscount = p.salePrice && p.salePrice < p.basePrice;
    const priceDisplay = hasDiscount
      ? `<span style="font-weight:700">${formatPrice(p.salePrice)}</span> <span style="text-decoration:line-through;color:#999;font-size:0.8rem">${formatPrice(p.basePrice)}</span>`
      : `<span style="font-weight:700">${formatPrice(p.basePrice)}</span>`;

    // Find collection names
    const colNames = [];
    if (p.collectionId && colMap[p.collectionId]) colNames.push(colMap[p.collectionId]);
    if (p.collectionIds) p.collectionIds.forEach(id => { if (colMap[id] && !colNames.includes(colMap[id])) colNames.push(colMap[id]); });
    const colDisplay = colNames.length > 0 
      ? colNames.map(n => `<span class="badge badge-info" style="margin:1px">${n}</span>`).join(' ')
      : '<span class="text-muted text-sm">—</span>';

    return `
      <tr style="cursor:pointer" onclick="onRowClick(event, '${p._id}')">
        <td style="width:40px;text-align:center" onclick="event.stopPropagation()"><input type="checkbox" class="product-checkbox" value="${p._id}" onchange="updateBulkActions()"></td>
        <td>
          ${mainImg
            ? `<img src="${mainImg}" alt="${p.name}" style="width:54px;height:54px;border-radius:8px;object-fit:cover;border:1px solid var(--border-color)">`
            : `<div style="width:54px;height:54px;border-radius:8px;background:var(--bg-body);display:flex;align-items:center;justify-content:center;font-size:1.4rem">📦</div>`}
        </td>
        <td><strong>${p.name}</strong></td>
        <td>${priceDisplay}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td style="text-align:center;font-weight:600">${qty}</td>
        <td>${colDisplay}</td>
        <td onclick="event.stopPropagation()">
          <div class="flex gap-8">
            <a href="product-form.html?id=${p._id}" class="btn btn-secondary btn-sm">تعديل</a>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}','${p.name}')">حذف</button>
          </div>
        </td>
      </tr>
    `}).join('');
    
  const selectAll = document.getElementById('select-all');
  if(selectAll) selectAll.checked = false;
}

// Click row to edit
window.onRowClick = function(event, productId) {
  window.location.href = `product-form.html?id=${productId}`;
};

window.toggleProductActive = async function(id, active) {
  try {
    const status = active ? 'active' : 'draft';
    await api.updateProduct(id, { active, status });
    showToast('تم تحديث حالة المنتج');
  } catch (err) {
    showToast(err.message, 'error');
    loadProducts();
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
  if (bulkActions) bulkActions.style.display = checkboxes.length > 0 ? 'flex' : 'none';
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
  } catch (err) { showToast(err.message, 'error'); }
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
  } catch (err) { showToast(err.message, 'error'); }
};

async function deleteProduct(id, name) {
  const confirmed = await window.showConfirmModal('تأكيد الحذف', `هل أنت متأكد من حذف المنتج "${name}"؟`);
  if (!confirmed) return;
  try {
    await api.deleteProduct(id);
    showToast('تم حذف المنتج');
    loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Bulk Import Modal ──────────────────────────────────
window.openBulkImportModal = function() {
  document.getElementById('bulk-import-modal').style.display = 'flex';
};

window.closeBulkImportModal = function() {
  document.getElementById('bulk-import-modal').style.display = 'none';
};

window.addBulkUrlField = function() {
  const container = document.getElementById('bulk-urls-container');
  const div = document.createElement('div');
  div.className = 'form-group flex gap-8';
  div.style.alignItems = 'center';
  div.innerHTML = `
    <input type="url" class="form-control bulk-url-input" placeholder="رابط المنتج">
    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="flex-shrink:0">×</button>`;
  container.appendChild(div);
};

window.submitBulkImport = async function() {
  const inputs = document.querySelectorAll('.bulk-url-input');
  const urls = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
  if (!urls.length) {
    showToast('أدخل رابط واحد على الأقل', 'error');
    return;
  }

  // For now, create products with the URLs as image URLs
  let created = 0;
  for (const url of urls) {
    try {
      await api.createProduct({
        name: 'منتج جديد',
        basePrice: 0,
        images: [url],
        imageUrl: url,
        status: 'draft'
      });
      created++;
    } catch (err) { /* skip */ }
  }
  
  showToast(`تم إنشاء ${created} منتج (مسودة)`);
  closeBulkImportModal();
  loadProducts();
};
