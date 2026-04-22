/** Admin product form — create/edit */
let optionGroups = [];
let editId = null;

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
      document.getElementById('p-image').value = p.imageUrl || '';
      document.getElementById('p-desc').value = p.description || '';
      if(p.collectionId) document.getElementById('p-collection').value = p.collectionId;
      optionGroups = (p.options || []).map(g => ({ name: g.name, required: g.required, values: [...g.values] }));
      renderOptionGroups();
    } catch (err) { showToast('فشل تحميل المنتج', 'error'); }
  }

  document.getElementById('product-form').addEventListener('submit', saveProduct);
  document.getElementById('add-option-group').addEventListener('click', addOptionGroup);
});

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

async function saveProduct(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  const data = {
    name: document.getElementById('p-name').value.trim(),
    basePrice: Number(document.getElementById('p-price').value),
    imageUrl: document.getElementById('p-image').value.trim(),
    description: document.getElementById('p-desc').value.trim(),
    collectionId: document.getElementById('p-collection').value || null,
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
