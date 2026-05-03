/** Admin product form — create/edit */
let optionGroups = [];
let variants = []; // New hierarchical variants
let editId = null;
let productImages = [];
let allCollections = [];
let selectedCollectionIds = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  const params = new URLSearchParams(window.location.search);
  editId = params.get('id');



  try {
    allCollections = await api.getCollections();
    initCollectionSelect();
  } catch (e) { }

  function initCollectionSelect() {
    const trigger = document.getElementById('p-collections-trigger');
    const searchInput = document.getElementById('p-collections-search');
    const dropdown = document.getElementById('p-collections-dropdown');
    const tagsContainer = document.getElementById('selected-collections-tags');
    const hiddenInput = document.getElementById('p-collections-hidden');

    function renderTags() {
      tagsContainer.innerHTML = selectedCollectionIds.map(id => {
        const col = allCollections.find(c => c._id === id);
        if (!col) return '';
        return `
          <div class="tag">
            ${col.name}
            <span class="tag-remove" onclick="removeCollectionTag('${id}')">×</span>
          </div>
        `;
      }).join('');
      hiddenInput.value = JSON.stringify(selectedCollectionIds);
    }

    window.removeCollectionTag = (id) => {
      selectedCollectionIds = selectedCollectionIds.filter(cid => cid !== id);
      renderTags();
      renderOptions();
    };

    function renderOptions(filter = '') {
      const filtered = allCollections.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase())
      );

      if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="no-results">لا توجد نتائج</div>';
        return;
      }

      dropdown.innerHTML = filtered.map(c => {
        const isSelected = selectedCollectionIds.includes(c._id);
        const img = c.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjFmNWY5Ii8+PC9zdmc+';
        return `
          <div class="select-option ${isSelected ? 'selected' : ''}" onclick="toggleCollection('${c._id}')">
            <img src="${img}" class="option-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjFmNWY5Ii8+PC9zdmc+'">
            <span class="option-name">${c.name}</span>
            ${isSelected ? '<span style="color:var(--primary-color)">✓</span>' : ''}
          </div>
        `;
      }).join('');
    }

    window.toggleCollection = (id) => {
      if (selectedCollectionIds.includes(id)) {
        selectedCollectionIds = selectedCollectionIds.filter(cid => cid !== id);
      } else {
        selectedCollectionIds.push(id);
      }
      renderTags();
      renderOptions(searchInput.value);
    };

    trigger.addEventListener('click', () => {
      dropdown.style.display = 'block';
      searchInput.focus();
      renderOptions(searchInput.value);
    });

    searchInput.addEventListener('input', (e) => {
      renderOptions(e.target.value);
    });

    document.addEventListener('click', (e) => {
      if (!document.getElementById('p-collections-select').contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Initial render
    renderTags();
  }

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
      selectedCollectionIds = [...colIds];
      if (window.removeCollectionTag) { // ensure init was called
        const tagsContainer = document.getElementById('selected-collections-tags');
        const hiddenInput = document.getElementById('p-collections-hidden');
        if (tagsContainer) {
          tagsContainer.innerHTML = selectedCollectionIds.map(id => {
            const col = allCollections.find(c => c._id === id);
            if (!col) return '';
            return `
              <div class="tag">
                ${col.name}
                <span class="tag-remove" onclick="removeCollectionTag('${id}')">×</span>
              </div>
            `;
          }).join('');
        }
        if (hiddenInput) hiddenInput.value = JSON.stringify(selectedCollectionIds);
      }

      // Load images
      if (p.images && p.images.length > 0) {
        productImages = [...p.images];
      } else if (p.imageUrl) {
        productImages = [p.imageUrl];
      }
      renderImages();

        optionGroups = (p.options || []).map(g => ({
          name: g.name,
          values: g.values.map(v => v.label)
        }));
        variants = (p.variants || []).map(v => ({
          combination: v.combination instanceof Map ? Object.fromEntries(v.combination) : v.combination,
          price: v.price,
          salePrice: v.salePrice,
          quantity: v.quantity,
          imageUrl: v.imageUrl,
          active: v.active !== false
        }));

        if (optionGroups.length > 0) {
          document.getElementById('enable-variants').checked = true;
          document.getElementById('variant-setup-container').style.display = 'block';
        }
        renderOptionSetup();
        renderVariantsTable();
      } catch (err) { showToast('فشل تحميل المنتج', 'error'); }
    }
  
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('add-option-group').addEventListener('click', addOptionGroup);
    document.getElementById('enable-variants').addEventListener('change', (e) => {
      document.getElementById('variant-setup-container').style.display = e.target.checked ? 'block' : 'none';
      if (e.target.checked && optionGroups.length === 0) {
        addOptionGroup();
      }
    });

    // Bulk Edit
    document.getElementById('bulk-edit-btn').addEventListener('click', openBulkEditModal);
    document.getElementById('confirm-bulk-edit').addEventListener('click', applyBulkEdit);



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


// ── Variant Setup (Option Groups) ───────────────────────

function renderOptionSetup() {
  const container = document.getElementById('option-groups-setup');
  container.innerHTML = optionGroups.map((g, gi) => `
    <div class="variant-group-card">
      <div class="variant-group-header">
        <span style="font-weight:700">مجموعة خيارات ${gi + 1}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeOptionGroup(${gi})">إزالة</button>
      </div>
      <div class="variant-group-body">
        <div class="form-group">
          <label class="form-label">اسم الخيار</label>
          <input type="text" class="form-control" value="${g.name}" placeholder="مثال: اللون" onchange="updateGroupName(${gi}, this.value)">
        </div>
        <div id="option-values-${gi}">
          ${g.values.map((v, vi) => `
            <div class="variant-value-row">
              <input type="text" class="form-control" value="${v}" onchange="updateValueName(${gi}, ${vi}, this.value)">
              <button type="button" class="btn btn-secondary btn-sm" onclick="removeOptionValue(${gi}, ${vi})">×</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn btn-secondary btn-sm mt-8" onclick="addOptionValue(${gi})">+ إضافة قيمة أخرى</button>
      </div>
    </div>
  `).join('');
}

function addOptionGroup() {
  optionGroups.push({ name: '', values: [''] });
  renderOptionSetup();
  syncVariants();
}

function removeOptionGroup(gi) {
  optionGroups.splice(gi, 1);
  renderOptionSetup();
  syncVariants();
}

function addOptionValue(gi) {
  optionGroups[gi].values.push('');
  renderOptionSetup();
  syncVariants();
}

function removeOptionValue(gi, vi) {
  if (optionGroups[gi].values.length <= 1) return;
  optionGroups[gi].values.splice(vi, 1);
  renderOptionSetup();
  syncVariants();
}

function updateGroupName(gi, val) {
  optionGroups[gi].name = val;
  syncVariants();
}

function updateValueName(gi, vi, val) {
  optionGroups[gi].values[vi] = val;
  syncVariants();
}

// ── Variant Generation ──────────────────────────────────

function syncVariants() {
  const oldVariants = [...variants];
  const validGroups = optionGroups.filter(g => g.name && g.values.some(v => v));
  
  if (validGroups.length === 0) {
    variants = [];
    renderVariantsTable();
    return;
  }

  // Generate all combinations
  let combinations = [{}];
  validGroups.forEach(group => {
    let newCombos = [];
    group.values.filter(v => v).forEach(value => {
      combinations.forEach(combo => {
        newCombos.push({ ...combo, [group.name]: value });
      });
    });
    combinations = newCombos;
  });

  const defaultPrice = Number(document.getElementById('p-price').value) || 0;
  const defaultSalePrice = document.getElementById('p-sale-price').value ? Number(document.getElementById('p-sale-price').value) : null;

  variants = combinations.map(combo => {
    // Check if we already have data for this combination
    const existing = oldVariants.find(v => 
      Object.entries(combo).every(([key, val]) => v.combination[key] === val)
    );
    if (existing) return existing;

    return {
      combination: combo,
      price: defaultPrice,
      salePrice: defaultSalePrice,
      quantity: null,
      imageUrl: '',
      active: true
    };
  });

  renderVariantsTable();
}

// ── Variant Table Rendering (Hierarchical) ──────────────

function renderVariantsTable() {
  const tbody = document.getElementById('variants-list-body');
  if (!tbody) return;

  if (variants.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8">أضف خيارات للمنتج للبدء في إدارة المتغيرات</td></tr>';
    return;
  }

  const firstGroupName = optionGroups[0]?.name;
  if (!firstGroupName) return;

  // Group by first option
  const groups = {};
  variants.forEach((v, idx) => {
    const parentVal = v.combination[firstGroupName];
    if (!groups[parentVal]) groups[parentVal] = [];
    groups[parentVal].push({ ...v, originalIndex: idx });
  });

  let html = '';
  Object.entries(groups).forEach(([parentVal, children]) => {
    const isSingle = children.length === 1 && Object.keys(children[0].combination).length === 1;
    
    // Calculate price range for parent
    const prices = children.map(c => c.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceDisplay = minPrice === maxPrice ? minPrice : `${minPrice} - ${maxPrice}`;

    const salePrices = children.map(c => c.salePrice || c.price);
    const minSale = Math.min(...salePrices);
    const maxSale = Math.max(...salePrices);
    const saleDisplay = minSale === maxSale ? minSale : `${minSale} - ${maxSale}`;

    // Parent Row
    html += `
      <tr class="variant-row parent">
        <td>
          <div style="display:flex; align-items:center; gap:8px">
            <span style="cursor:pointer" onclick="toggleVariantChildren('${parentVal}')">
              ${parentVal}
              <span style="font-size:0.75rem; color:#94a3b8; font-weight:400; margin-right:4px">(${children.length} متغير)</span>
            </span>
          </div>
        </td>
        <td>${priceDisplay} ج.م</td>
        <td>${saleDisplay} ج.م</td>
        <td>${children.every(c => c.quantity === null) ? 'غير محدود' : children.reduce((sum, c) => sum + (c.quantity || 0), 0)}</td>
        <td style="text-align:center">
          <input type="checkbox" onchange="toggleVariantGroup('${parentVal}', this.checked)" checked>
        </td>
      </tr>
    `;

    // Children Rows
    children.forEach(c => {
      const otherOptions = Object.entries(c.combination)
        .filter(([key]) => key !== firstGroupName)
        .map(([key, val]) => val)
        .join(' / ');

      html += `
        <tr class="variant-row child parent-${parentVal.replace(/\s+/g, '-')}" style="display:table-row">
          <td>
            <div style="display:flex; align-items:center; gap:12px">
              <div class="variant-img-picker" onclick="openGalleryModal(${c.originalIndex})">
                ${c.imageUrl ? `<img src="${c.imageUrl}">` : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'}
              </div>
              <span>${otherOptions || parentVal}</span>
            </div>
          </td>
          <td><input type="number" class="form-control" value="${c.price}" onchange="updateVariantField(${c.originalIndex}, 'price', this.value)"></td>
          <td><input type="number" class="form-control" value="${c.salePrice || ''}" placeholder="اختياري" onchange="updateVariantField(${c.originalIndex}, 'salePrice', this.value)"></td>
          <td><input type="number" class="form-control" value="${c.quantity === null ? '' : c.quantity}" placeholder="غير محدود" onchange="updateVariantField(${c.originalIndex}, 'quantity', this.value)"></td>
          <td style="text-align:center">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeVariant(${c.originalIndex})" title="حذف هذا المزيج">×</button>
          </td>
        </tr>
      `;
    });
  });

  tbody.innerHTML = html;
}

window.toggleVariantChildren = function(parentVal) {
  const rows = document.querySelectorAll(`.parent-${parentVal.replace(/\s+/g, '-')}`);
  rows.forEach(r => r.style.display = r.style.display === 'none' ? 'table-row' : 'none');
}

window.updateVariantField = function(idx, field, val) {
  if (field === 'price' || field === 'salePrice' || field === 'quantity') {
    variants[idx][field] = val === '' ? (field === 'quantity' ? null : 0) : Number(val);
  } else {
    variants[idx][field] = val;
  }
}

window.removeVariant = function(idx) {
  variants.splice(idx, 1);
  renderVariantsTable();
}

window.toggleVariantGroup = function(parentVal, active) {
  const firstGroupName = optionGroups[0].name;
  variants.forEach(v => {
    if (v.combination[firstGroupName] === parentVal) {
      v.active = active;
    }
  });
}

// ── Internal Gallery Modal ──────────────────────────────

let currentPickingVariantIndex = null;

window.openGalleryModal = function(idx) {
  currentPickingVariantIndex = idx;
  const grid = document.getElementById('gallery-modal-grid');
  grid.innerHTML = productImages.map((img, i) => `
    <div class="gallery-item ${variants[idx].imageUrl === img ? 'selected' : ''}" onclick="selectGalleryImage('${img}')">
      <img src="${img}">
    </div>
  `).join('');
  document.getElementById('gallery-modal').style.display = 'flex';
}

window.selectGalleryImage = function(url) {
  document.querySelectorAll('.gallery-item').forEach(el => {
    el.classList.toggle('selected', el.querySelector('img').src === url);
  });
  variants[currentPickingVariantIndex].imageUrl = url;
}

window.closeGalleryModal = function() {
  document.getElementById('gallery-modal').style.display = 'none';
  renderVariantsTable();
}

document.getElementById('confirm-gallery-selection').addEventListener('click', closeGalleryModal);

// ── Bulk Edit Logic ─────────────────────────────────────

function openBulkEditModal() {
  document.getElementById('bulk-edit-modal').style.display = 'flex';
}

function closeBulkEditModal() {
  document.getElementById('bulk-edit-modal').style.display = 'none';
}

function applyBulkEdit() {
  const price = document.getElementById('bulk-price').value;
  const salePrice = document.getElementById('bulk-sale-price').value;
  const qty = document.getElementById('bulk-quantity').value;

  variants.forEach(v => {
    if (price !== '') v.price = Number(price);
    if (salePrice !== '') v.salePrice = Number(salePrice);
    if (qty !== '') v.quantity = Number(qty);
  });

  renderVariantsTable();
  closeBulkEditModal();
}


// ── Save ─────────────────────────────────────────────────

async function saveProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('header-save-btn') || e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'جارٍ الحفظ...';
  }

  const salePriceVal = document.getElementById('p-sale-price').value;
  const qtyVal = document.getElementById('p-quantity').value;

  const data = {
    name: document.getElementById('p-name').value.trim(),
    basePrice: Number(document.getElementById('p-price').value),
    salePrice: salePriceVal ? Number(salePriceVal) : null,
    images: productImages,
    imageUrl: productImages.length > 0 ? productImages[0] : '',
    description: document.getElementById('p-desc').value.trim(),
    collectionIds: selectedCollectionIds,
    collectionId: selectedCollectionIds.length > 0 ? selectedCollectionIds[0] : null,
    status: document.getElementById('p-status').value,
    quantity: qtyVal !== '' ? Number(qtyVal) : null,
    options: optionGroups.filter(g => g.name && g.values.some(v => v)).map(g => ({
      name: g.name,
      required: true,
      values: g.values.filter(v => v).map(v => ({ label: v, price: 0 })) // Prices are in variants now
    })),
    variants: document.getElementById('enable-variants').checked ? variants.map(v => ({
      ...v,
      combination: v.combination // Already in correct object format for Map
    })) : []
  };

  try {
    if (editId) { await api.updateProduct(editId, data); showToast('تم تحديث المنتج'); }
    else { await api.createProduct(data); showToast('تم إضافة المنتج'); }
    setTimeout(() => window.location.href = 'products', 800);
  } catch (err) {
    showToast(err.message || 'حدث خطأ', 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'حفظ المنتج';
    }
  }
}

