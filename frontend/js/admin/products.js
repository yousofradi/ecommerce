/** Admin products list page */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadProducts();
});

async function loadProducts() {
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>';
  try {
    const products = await api.getProducts();
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No products yet</td></tr>';
      return;
    }
    tbody.innerHTML = products.map(p => `
      <tr>
        <td><img src="${p.imageUrl || ''}" alt="" style="width:50px;height:50px;border-radius:8px;object-fit:cover;background:var(--bg-glass)"></td>
        <td><strong>${p.name}</strong></td>
        <td>${formatPrice(p.basePrice)}</td>
        <td>${(p.options||[]).length} group(s)</td>
        <td>
          <div class="flex gap-8">
            <a href="product-form.html?id=${p._id}" class="btn btn-secondary btn-sm">Edit</a>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}','${p.name}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Failed to load products</td></tr>';
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    await api.deleteProduct(id);
    showToast('Product deleted');
    loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
}
