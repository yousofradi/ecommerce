document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  loadCollections();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.collection-row:not(.header)').forEach(row => {
        const name = row.getAttribute('data-name');
        row.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }
});

async function loadCollections() {
  const list = document.getElementById('collections-list');
  try {
    const [cols, productsRes] = await Promise.all([
      api.getCollections(),
      api.getProducts({ admin: true })
    ]);
    
    // Calculate product counts for each collection
    const products = Array.isArray(productsRes) ? productsRes : productsRes.products || [];
    const counts = {};
    products.forEach(p => {
      if (p.collectionId) {
        counts[p.collectionId] = (counts[p.collectionId] || 0) + 1;
      }
      if (Array.isArray(p.collectionIds)) {
        p.collectionIds.forEach(cid => {
          counts[cid] = (counts[cid] || 0) + 1;
        });
      }
    });

    if (!cols.length) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:#666">لا توجد مجموعات بعد</div>';
      return;
    }

    list.innerHTML = cols.map(c => `
      <div class="collection-row" data-name="${c.name.toLowerCase()}">
        ${c.imageUrl 
          ? `<img src="${c.imageUrl}" class="collection-img" alt="${c.name}">`
          : `<div class="collection-img-placeholder">بدون صورة</div>`
        }
        <div style="font-weight:500">${c.name}</div>
        <div style="text-align:center;color:#666">${counts[c._id] || 0}</div>
        <div style="text-align:center;position:relative">
          <div class="action-menu" onclick="toggleMenu('${c._id}')">...</div>
          <div id="menu-${c._id}" class="action-dropdown hidden" style="position:absolute;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.1);z-index:100;padding:8px;min-width:100px;">
            <a href="collection-form?id=${c._id}" style="display:block;padding:8px;color:#333;text-decoration:none">تعديل</a>
            <div style="cursor:pointer;padding:8px;color:red" onclick="deleteCol('${c._id}')">حذف</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:red">فشل تحميل المجموعات</div>';
  }
}

function toggleMenu(id) {
  document.querySelectorAll('.action-dropdown').forEach(m => m.classList.add('hidden'));
  const menu = document.getElementById(`menu-${id}`);
  if (menu) menu.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.action-menu')) {
    document.querySelectorAll('.action-dropdown').forEach(m => m.classList.add('hidden'));
  }
});

async function deleteCol(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
  try {
    await api.deleteCollection(id);
    showToast('تم الحذف بنجاح');
    loadCollections();
  } catch (e) {
    showToast('فشل الحذف', 'error');
  }
}
