/** Admin products list page */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadProducts();
});

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
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">لا توجد منتجات بعد</td></tr>';
      return;
    }
    tbody.innerHTML = products.map(p => `
      <tr>
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
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">فشل تحميل المنتجات</td></tr>';
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
