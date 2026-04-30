/** Admin product form — create/edit */
let optionGroups = [];
let editId = null;
let productImages = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  const params = new URLSearchParams(window.location.search);
  editId = params.get('id');

  try {
    const collections = await api.getCollections();
    const select = document.getElementById('p-collection');
    collections.forEach(c => select.add(new Option(c.name, c._id)));
  } catch(e) {}

  if (editId) {
    document.getElementById('form-title').textContent = 'تعديل المنتج';
    try {
      const p = await api.getProduct(editId);
      document.getElementById('p-name').value = p.name;
      document.getElementById('p-price').value = p.basePrice;
      document.getElementById('p-sale-price').value = p.salePrice || '';
      document.getElementById('p-desc').value = p.description || '';
      document.getElementById('p-status').value = p.status || 'active';
      document.getElementById('p-quantity').value = (p.quantity != null) ? p.quantity : '';
      if(p.collectionId) document.getElementById('p-collection').value = p.collectionId;
      
      // Load images - support both new images array and legacy imageUrl
      if (p.images && p.images.length > 0) {
        productImages = [...p.images];
      } else if (p.imageUrl) {
        productImages = [p.imageUrl];
      }
      renderImages();
      
      optionGroups = (p.options || []).map(g => ({ name: g.name, required: g.required, values: [...g.values] }));
      renderOptionGroups();
    } catch (err) { showToast('فشل تحميل المنتج', 'error'); }
  }

  document.getElementById('product-form').addEventListener('submit', saveProduct);
  document.getElementById('add-option-group').addEventListener('click', addOptionGroup);
  document.getElementById('add-image-btn').addEventListener('click', showImageInput);

  // Enter key adds image from URL input
  const urlInput = document.getElementById('new-image-url');
  if (urlInput) {
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addImageFromInput(); }
    });
  }
});

// ── Image Management ────────────────────────────────────

function showImageInput() {
  const wrapper = document.getElementById('image-url-input-wrapper');
  wrapper.classList.remove('hidden');
  document.getElementById('new-image-url').focus();
}

window.hideImageInput = function() {
  document.getElementById('image-url-input-wrapper').classList.add('hidden');
  document.getElementById('new-image-url').value = '';
};

window.addImageFromInput = function() {
  const input = document.getElementById('new-image-url');
  const url = input.value.trim();
  if (url) {
    productImages.push(url);
    renderImages();
    input.value = '';
    input.focus();
  } else {
    showToast('أدخل رابط صورة صالح', 'error');
  }
};

function removeImage(index) {
  productImages.splice(index, 1);
  renderImages();
}

function renderImages() {
  const container = document.getElementById('images-list');
  const addBtn = document.getElementById('add-image-btn');
  
  // Remove all image items (keep the add button)
  container.querySelectorAll('.image-item').forEach(el => el.remove());
  
  // Render each image before the add button
  productImages.forEach((url, idx) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.innerHTML = `
      <img src="${url}" alt="صورة ${idx + 1}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTEwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTEwIiBoZWlnaHQ9IjExMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk0YTNiOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuKdjCBFcnJvcjwvdGV4dD48L3N2Zz4='">
      <button type="button" class="remove-img" onclick="removeImage(${idx})">×</button>
      ${idx === 0 ? '<span style="position:absolute;bottom:4px;right:4px;background:var(--primary);color:#fff;font-size:0.65rem;padding:2px 6px;border-radius:8px;">رئيسية</span>' : ''}
    `;
    container.insertBefore(item, addBtn);
  });
}

// ── Option Groups ────────────────────────────────────────

function renderOptionGroups() {
  const container = document.getElementById('option-groups');
  container.innerHTML = optionGroups.map((g, gi) => `
    <div class="admin-card" style="margin-bottom:12px">
      <div class="flex-between mb-16">
        <h4>مجموعة خيارات ${gi + 1}</h4>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeGroup(${gi})">حذف</button>
      </div>
      <div class="grid-2" style="gap:12px;margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">اسم المجموعة</label>
          <input class="form-control" value="${g.name}" onchange="optionGroups[${gi}].name=this.value" required placeholder="مثال: الحجم">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">إجباري؟</label>
          <select class="form-control" onchange="optionGroups[${gi}].required=this.value==='true'">
            <option value="true" ${g.required ? 'selected' : ''}>نعم</option>
            <option value="false" ${!g.required ? 'selected' : ''}>لا</option>
          </select>
        </div>
      </div>
      <div class="form-label mb-8">القيم</div>
      ${g.values.map((v, vi) => `
        <div class="flex gap-8 mb-8" style="align-items:center">
          <div style="flex:2"><input class="form-control" placeholder="الاسم (مثال: كبير)" value="${v.label}" onchange="optionGroups[${gi}].values[${vi}].label=this.value" required></div>
          <div style="flex:1"><input class="form-control" type="number" placeholder="السعر ±" value="${v.price}" onchange="optionGroups[${gi}].values[${vi}].price=Number(this.value)"></div>
          <button type="button" class="btn btn-danger btn-sm" onclick="removeValue(${gi},${vi})">×</button>
        </div>
      `).join('')}
      <button type="button" class="btn btn-secondary btn-sm mt-8" onclick="addValue(${gi})">+ إضافة قيمة</button>
    </div>
  `).join('');
}

function addOptionGroup() {
  optionGroups.push({ name: '', required: false, values: [{ label: '', price: 0 }] });
  renderOptionGroups();
}
function removeGroup(gi) { optionGroups.splice(gi, 1); renderOptionGroups(); }
function addValue(gi) { optionGroups[gi].values.push({ label: '', price: 0 }); renderOptionGroups(); }
function removeValue(gi, vi) {
  if (optionGroups[gi].values.length <= 1) return showToast('يجب أن تحتوي المجموعة على قيمة واحدة على الأقل', 'error');
  optionGroups[gi].values.splice(vi, 1); renderOptionGroups();
}

// ── Save ─────────────────────────────────────────────────

async function saveProduct(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  const salePriceVal = document.getElementById('p-sale-price').value;
  const qtyVal = document.getElementById('p-quantity').value;
  const data = {
    name: document.getElementById('p-name').value.trim(),
    basePrice: Number(document.getElementById('p-price').value),
    salePrice: salePriceVal ? Number(salePriceVal) : null,
    images: productImages,
    imageUrl: productImages.length > 0 ? productImages[0] : '',
    description: document.getElementById('p-desc').value.trim(),
    collectionId: document.getElementById('p-collection').value || null,
    status: document.getElementById('p-status').value,
    quantity: qtyVal !== '' ? Number(qtyVal) : null,
    options: optionGroups.filter(g => g.name && g.values.length && g.values[0].label)
  };

  try {
    if (editId) { await api.updateProduct(editId, data); showToast('تم تحديث المنتج ✓'); }
    else { await api.createProduct(data); showToast('تم إضافة المنتج ✓'); }
    setTimeout(() => window.location.href = 'products.html', 800);
  } catch (err) {
    showToast(err.message || 'حدث خطأ', 'error');
    btn.disabled = false;
  }
}
