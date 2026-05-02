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
    const container = document.getElementById('p-collections-container');
    container.innerHTML = collections.map(c => `
      <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.9rem;">
        <input type="checkbox" name="collection_ids" value="${c._id}">
        ${c.name}
      </label>
    `).join('');
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
      
      const colIds = p.collectionIds || [];
      if (p.collectionId && !colIds.includes(p.collectionId)) colIds.push(p.collectionId);
      document.querySelectorAll('input[name="collection_ids"]').forEach(cb => {
        if (colIds.includes(cb.value)) cb.checked = true;
      });
      
      // Load images
      if (p.images && p.images.length > 0) {
        productImages = [...p.images];
      } else if (p.imageUrl) {
        productImages = [p.imageUrl];
      }
      renderImages();
      
      optionGroups = (p.options || []).map(g => ({ 
        name: g.name, 
        required: true, // Force required
        values: g.values.map(v => ({ 
          label: v.label, 
          price: v.price || 0, 
          salePrice: v.salePrice || null 
        })) 
      }));
      renderOptionGroups();
    } catch (err) { showToast('فشل تحميل المنتج', 'error'); }
  }

  document.getElementById('product-form').addEventListener('submit', saveProduct);
  document.getElementById('add-option-group').addEventListener('click', addOptionGroup);

  // File upload drag-and-drop logic
  const fileInput = document.getElementById('image-file-input');
  const dropzone = document.getElementById('add-image-dropzone');

  function handleFiles(files) {
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = progressContainer ? progressContainer.querySelector('.upload-progress-bar-fill') : null;
    const progressText = document.getElementById('upload-progress-text');
    if (progressContainer) progressContainer.style.display = 'flex';
    
    const promises = Array.from(files).map(file => 
      api.uploadFile(file, (percent) => {
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.textContent = `رفع ${percent}%`;
      }).then(res => {
        if (res && res.url) {
          productImages.push(res.url);
        }
      }).catch(err => {
        console.error('Upload failed', err);
        showToast('فشل رفع الصورة', 'error');
      })
    );

    Promise.all(promises).then(() => {
      renderImages();
      if (progressContainer) progressContainer.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      if (progressText) progressText.textContent = '';
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--primary)';
    });
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
      e.target.value = ''; // reset
    });
  }
});

// ── Image Management ────────────────────────────────────

function removeImage(index) {
  productImages.splice(index, 1);
  renderImages();
}

let draggedImageIndex = null;

function renderImages() {
  const container = document.getElementById('images-list');
  const addBtn = document.getElementById('add-image-dropzone');
  
  if (!container || !addBtn) return;
  
  container.querySelectorAll('.image-item').forEach(el => el.remove());
  productImages.forEach((url, idx) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.draggable = true;
    item.dataset.index = idx;
    item.style.cursor = 'grab';
    
    // Drag-and-drop reordering logic
    item.addEventListener('dragstart', (e) => {
      draggedImageIndex = idx;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => item.style.opacity = '0.5', 0);
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '1';
      draggedImageIndex = null;
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedImageIndex !== null && draggedImageIndex !== idx) {
        const draggedImage = productImages[draggedImageIndex];
        productImages.splice(draggedImageIndex, 1);
        productImages.splice(idx, 0, draggedImage);
        renderImages();
      }
    });

    item.innerHTML = `
      <img src="${url}" alt="صورة ${idx + 1}" style="pointer-events: none;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTEwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTEwIiBoZWlnaHQ9IjExMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk0YTNiOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuKdjCBFcnJvcjwvdGV4dD48L3N2Zz4='">
      <button type="button" class="remove-img" onclick="removeImage(${idx})">×</button>
      ${idx === 0 ? '<span style="position:absolute;bottom:4px;right:4px;background:var(--primary);color:#fff;font-size:0.65rem;padding:2px 6px;border-radius:8px;pointer-events:none;">رئيسية</span>' : ''}
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
        <h4 style="margin:0">مجموعة خيارات ${gi + 1}</h4>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeGroup(${gi})">حذف</button>
      </div>
      
      <div class="form-group" style="margin-bottom:20px">
        <label class="form-label">اسم المجموعة (مثل: الحجم أو اللون)</label>
        <input class="form-control" value="${g.name}" onchange="optionGroups[${gi}].name=this.value" required placeholder="مثال: الحجم">
      </div>

      <div class="table-wrapper" style="border: 1px solid #eee; border-radius: 8px;">
        <table style="margin:0">
          <thead>
            <tr>
              <th style="width:40%">المتغير</th>
              <th style="width:25%">السعر</th>
              <th style="width:25%">السعر بعد الخصم</th>
              <th style="width:10%"></th>
            </tr>
          </thead>
          <tbody>
            ${g.values.map((v, vi) => `
              <tr>
                <td>
                  <input class="form-control" placeholder="أحمر، كبير..." value="${v.label}" onchange="optionGroups[${gi}].values[${vi}].label=this.value" required>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:4px">
                    <input class="form-control" type="number" value="${v.price}" onchange="optionGroups[${gi}].values[${vi}].price=Number(this.value)">
                    <span style="font-size:0.75rem;color:#999">ج.م</span>
                  </div>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:4px">
                    <input class="form-control" type="number" value="${v.salePrice || ''}" placeholder="اختياري" onchange="optionGroups[${gi}].values[${vi}].salePrice=this.value?Number(this.value):null">
                    <span style="font-size:0.75rem;color:#999">ج.م</span>
                  </div>
                </td>
                <td style="text-align:center">
                  <button type="button" class="btn btn-danger btn-sm" onclick="removeValue(${gi},${vi})" style="padding:4px 8px">×</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <button type="button" class="btn btn-secondary btn-sm mt-16" onclick="addValue(${gi})">+ إضافة قيمة</button>
    </div>
  `).join('');
}

function addOptionGroup() {
  const defaultPrice = Number(document.getElementById('p-price').value) || 0;
  const defaultSale = document.getElementById('p-sale-price').value ? Number(document.getElementById('p-sale-price').value) : null;
  
  optionGroups.push({ 
    name: '', 
    required: true, 
    values: [{ label: '', price: defaultPrice, salePrice: defaultSale }] 
  });
  renderOptionGroups();
}

function removeGroup(gi) { optionGroups.splice(gi, 1); renderOptionGroups(); }

function addValue(gi) {
  const defaultPrice = Number(document.getElementById('p-price').value) || 0;
  const defaultSale = document.getElementById('p-sale-price').value ? Number(document.getElementById('p-sale-price').value) : null;
  
  optionGroups[gi].values.push({ 
    label: '', 
    price: defaultPrice, 
    salePrice: defaultSale 
  });
  renderOptionGroups();
}

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
  const selectedCollections = Array.from(document.querySelectorAll('input[name="collection_ids"]:checked')).map(cb => cb.value);
  
  const data = {
    name: document.getElementById('p-name').value.trim(),
    basePrice: Number(document.getElementById('p-price').value),
    salePrice: salePriceVal ? Number(salePriceVal) : null,
    images: productImages,
    imageUrl: productImages.length > 0 ? productImages[0] : '',
    description: document.getElementById('p-desc').value.trim(),
    collectionIds: selectedCollections,
    collectionId: selectedCollections.length > 0 ? selectedCollections[0] : null,
    status: document.getElementById('p-status').value,
    quantity: qtyVal !== '' ? Number(qtyVal) : null,
    options: optionGroups.filter(g => g.name && g.values.length && g.values[0].label).map(g => ({...g, required: true}))
  };

  try {
    if (editId) { await api.updateProduct(editId, data); showToast('تم تحديث المنتج'); }
    else { await api.createProduct(data); showToast('تم إضافة المنتج'); }
    setTimeout(() => window.location.href = 'products', 800);
  } catch (err) {
    showToast(err.message || 'حدث خطأ', 'error');
    btn.disabled = false;
  }
}
