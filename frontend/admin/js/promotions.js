let promotions = [];
let allProducts = [];
let giftCollections = [];
let excludedProducts = [];
let editId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!api._adminKey()) {
    window.location.href = 'login';
    return;
  }
  await Promise.all([loadPromotions(), loadProducts(), loadGiftCollections()]);
  document.getElementById('page-content-spinner').style.display = 'none';
  document.getElementById('main-content-layout').style.display = 'block';
});

async function loadPromotions() {
  try {
    const res = await api.fetchWithAuth('/api/promotions');
    if (res.ok) promotions = await res.json();
    renderPromotions();
  } catch (err) {
    console.error(err);
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${api.baseURL}/api/products`);
    if (res.ok) {
      const data = await res.json();
      allProducts = data.products || data;
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadGiftCollections() {
  try {
    const res = await api.fetchWithAuth('/api/gift-collections');
    if (res.ok) {
      giftCollections = await res.json();
      const select = document.getElementById('promo-gift-collection');
      select.innerHTML = '<option value="">-- اختر مجموعة --</option>' + 
        giftCollections.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

function renderPromotions() {
  const tbody = document.getElementById('promotions-tbody');
  if (promotions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px;">لا توجد عروض</td></tr>';
    return;
  }
  
  tbody.innerHTML = promotions.map(p => {
    let rewardText = '';
    if (p.rewardType === 'PERCENTAGE') rewardText = `خصم ${p.rewardValue}%`;
    else if (p.rewardType === 'FIXED') rewardText = `خصم ${p.rewardValue} ج.م`;
    else if (p.rewardType === 'FREE_SHIPPING') rewardText = 'شحن مجاني';
    else if (p.rewardType === 'FREE_GIFT') rewardText = 'هدية مجانية';

    return `
    <tr style="border-bottom: 1px solid #f1f5f9; ${!p.isActive ? 'opacity:0.6;' : ''}">
      <td style="padding: 16px;"><strong>${p.name}</strong></td>
      <td style="padding: 16px;">${p.minCartSubtotal || 0} ج.م</td>
      <td style="padding: 16px;">
        <span style="background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">
          ${rewardText}
        </span>
      </td>
      <td style="padding: 16px;">
        ${p.isActive ? '<span style="color:#10b981;font-weight:bold;">نشط</span>' : '<span style="color:#64748b;">غير نشط</span>'}
      </td>
      <td style="padding: 16px;">
        <button class="btn btn-sm btn-secondary" onclick="editPromotion('${p._id}')">تعديل</button>
        <button class="btn btn-sm btn-danger" onclick="deletePromotion('${p._id}')" style="margin-right: 8px;">حذف</button>
      </td>
    </tr>
  `}).join('');
}

function toggleRewardFields() {
  const type = document.getElementById('promo-reward-type').value;
  const valField = document.getElementById('field-reward-value');
  const valLabel = document.getElementById('label-reward-value');
  const giftSettings = document.getElementById('field-gift-settings');

  if (type === 'PERCENTAGE') {
    valField.style.display = 'block';
    valLabel.textContent = 'نسبة الخصم (%)';
    giftSettings.style.display = 'none';
  } else if (type === 'FIXED') {
    valField.style.display = 'block';
    valLabel.textContent = 'مبلغ الخصم (ج.م)';
    giftSettings.style.display = 'none';
  } else if (type === 'FREE_GIFT') {
    valField.style.display = 'none';
    giftSettings.style.display = 'block';
  } else {
    valField.style.display = 'none';
    giftSettings.style.display = 'none';
  }
}

function toggleGiftCollection() {
  const mode = document.getElementById('promo-gift-mode').value;
  document.getElementById('field-gift-collection').style.display = mode === 'CHOICE' ? 'block' : 'none';
}

function openPromoModal() {
  editId = null;
  document.getElementById('promo-modal-title').textContent = 'إضافة عرض جديد';
  
  document.getElementById('promo-name').value = '';
  document.getElementById('promo-active').value = 'true';
  document.getElementById('promo-min-subtotal').value = '0';
  document.getElementById('promo-min-qty').value = '0';
  document.getElementById('promo-reward-type').value = 'PERCENTAGE';
  document.getElementById('promo-reward-value').value = '0';
  document.getElementById('promo-gift-mode').value = 'MANUAL';
  document.getElementById('promo-gift-collection').value = '';
  
  excludedProducts = [];
  renderExcludedProducts();
  
  toggleRewardFields();
  toggleGiftCollection();
  
  document.getElementById('promo-modal').style.display = 'flex';
}

function editPromotion(id) {
  const p = promotions.find(x => x._id === id);
  if (!p) return;
  editId = id;
  
  document.getElementById('promo-modal-title').textContent = 'تعديل عرض';
  document.getElementById('promo-name').value = p.name;
  document.getElementById('promo-active').value = p.isActive ? 'true' : 'false';
  document.getElementById('promo-min-subtotal').value = p.minCartSubtotal || 0;
  document.getElementById('promo-min-qty').value = p.minQuantity || 0;
  
  document.getElementById('promo-reward-type').value = p.rewardType;
  document.getElementById('promo-reward-value').value = p.rewardValue || 0;
  document.getElementById('promo-gift-mode').value = p.giftMode || 'MANUAL';
  document.getElementById('promo-gift-collection').value = p.giftCollectionId || '';
  
  excludedProducts = (p.excludedProducts || []).map(pid => allProducts.find(x => x._id === pid) || { _id: pid, name: 'غير معروف' });
  renderExcludedProducts();
  
  toggleRewardFields();
  toggleGiftCollection();
  
  document.getElementById('promo-modal').style.display = 'flex';
}

function closePromoModal() {
  document.getElementById('promo-modal').style.display = 'none';
}

// -- Excluded Products Search --

function searchProducts(query) {
  const resContainer = document.getElementById('promo-search-results');
  if (!query || query.trim().length < 2) {
    resContainer.style.display = 'none';
    return;
  }
  
  const lowerQ = query.trim().toLowerCase();
  const results = allProducts.filter(p => p.name.toLowerCase().includes(lowerQ) && !excludedProducts.some(ep => ep._id === p._id)).slice(0, 5);
  
  if (results.length === 0) {
    resContainer.innerHTML = '<div style="padding: 12px; color: #64748b;">لا توجد نتائج</div>';
  } else {
    resContainer.innerHTML = results.map(p => `
      <div class="product-search-item" onclick="addExcludedProduct('${p._id}')">
        <img src="${(p.images && p.images[0]) || p.imageUrl || ''}" alt="">
        <span>${p.name}</span>
      </div>
    `).join('');
  }
  resContainer.style.display = 'block';
}

function addExcludedProduct(id) {
  const p = allProducts.find(x => x._id === id);
  if (p && !excludedProducts.find(x => x._id === id)) {
    excludedProducts.push(p);
    renderExcludedProducts();
  }
  document.getElementById('promo-product-search').value = '';
  document.getElementById('promo-search-results').style.display = 'none';
}

function removeExcludedProduct(id) {
  excludedProducts = excludedProducts.filter(p => p._id !== id);
  renderExcludedProducts();
}

function renderExcludedProducts() {
  const container = document.getElementById('selected-products-container');
  if (excludedProducts.length === 0) {
    container.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px;">لا توجد منتجات مستثناة</div>';
    return;
  }
  
  container.innerHTML = excludedProducts.map(p => `
    <div class="selected-product-item">
      <div style="display: flex; align-items: center;">
        <img src="${(p.images && p.images[0]) || p.imageUrl || ''}" alt="">
        <span style="font-weight: 500;">${p.name}</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeExcludedProduct('${p._id}')">إزالة</button>
    </div>
  `).join('');
}

// -- Save --

async function savePromotion() {
  const name = document.getElementById('promo-name').value.trim();
  if (!name) return alert('يرجى إدخال اسم العرض');
  
  const payload = {
    name,
    isActive: document.getElementById('promo-active').value === 'true',
    minCartSubtotal: Number(document.getElementById('promo-min-subtotal').value) || 0,
    minQuantity: Number(document.getElementById('promo-min-qty').value) || 0,
    rewardType: document.getElementById('promo-reward-type').value,
    rewardValue: Number(document.getElementById('promo-reward-value').value) || 0,
    giftMode: document.getElementById('promo-gift-mode').value,
    giftCollectionId: document.getElementById('promo-gift-collection').value || null,
    excludedProducts: excludedProducts.map(p => p._id)
  };
  
  try {
    let res;
    if (editId) {
      res = await api.fetchWithAuth(`/api/promotions/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await api.fetchWithAuth('/api/promotions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    
    if (res.ok) {
      closePromoModal();
      await loadPromotions();
    } else {
      const data = await res.json();
      alert(data.error || 'حدث خطأ أثناء الحفظ');
    }
  } catch (err) {
    console.error(err);
    alert('حدث خطأ في الاتصال');
  }
}

async function deletePromotion(id) {
  if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
  
  try {
    const res = await api.fetchWithAuth(`/api/promotions/${id}`, { method: 'DELETE' });
    if (res.ok) await loadPromotions();
  } catch (err) {
    console.error(err);
  }
}

// -- Simulator --

async function runSimulator() {
  const subtotal = Number(document.getElementById('sim-subtotal').value) || 0;
  if (subtotal <= 0) return;
  
  // Mock a cart item with the given subtotal
  const mockCart = [{
    productId: 'mock_1',
    unitPrice: subtotal,
    quantity: 1,
    isFreeGift: false
  }];
  
  try {
    const res = await fetch(`${api.baseURL}/api/promotions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItems: mockCart })
    });
    
    if (res.ok) {
      const result = await res.json();
      let resText = 'لا توجد عروض مطبقة.';
      if (result.appliedPromotion) {
        resText = `✅ تم تطبيق العرض: ${result.appliedPromotion.name} `;
        if (result.totalDiscount > 0) resText += `(وفرت ${result.totalDiscount} ج.م)`;
        if (result.freeShipping) resText += `(شحن مجاني)`;
        if (result.unlockedGifts.length > 0) resText += ` + هدية مجانية!`;
      }
      document.getElementById('sim-result').textContent = resText;
      
      let progText = '';
      if (result.progress) {
        if (result.progress.percentage < 100) {
          progText = `تحتاج إلى ${result.progress.remaining} ج.م إضافية للحصول على: ${result.progress.nextRewardName} (اكتمل ${result.progress.percentage.toFixed(0)}%)`;
        } else {
          progText = '🎉 وصلت لأعلى عرض متاح!';
        }
      }
      document.getElementById('sim-progress').textContent = progText;
    }
  } catch (err) {
    console.error(err);
  }
}
