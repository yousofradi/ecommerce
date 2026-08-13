
async function uploadAdminScreenshot(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const btn = document.getElementById('upload-screenshot-btn');
  const originalText = btn.textContent;
  
  btn.textContent = 'جاري الرفع...';
  btn.disabled = true;
  
  try {
    const formData = new FormData();
    formData.append('image', file);
    if (typeof currentOrder !== 'undefined' && currentOrder && currentOrder.orderId) {
      formData.append('prefix', currentOrder.orderId);
    }
    
    // 1. Upload to public endpoint
    const uploadRes = await fetch(`${API_BASE}/upload/public`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadRes.ok) throw new Error('فشل رفع الصورة');
    const uploadData = await uploadRes.json();
    const screenshotUrl = uploadData.url;
    
    // 2. Save to order using the public transfer-info endpoint
    const updateRes = await fetch(`${API_BASE}/orders/public/${currentOrder.orderId}/transfer-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transferScreenshot: screenshotUrl
      })
    });
    
    if (!updateRes.ok) throw new Error('فشل حفظ الصورة في الطلب');
    
    // Update UI
    currentOrder.transferScreenshot = screenshotUrl;
    document.getElementById('view-transfer-screenshot-row').style.display = 'flex';
    document.getElementById('view-transfer-screenshot').style.display = 'block';
    document.getElementById('view-transfer-screenshot').href = screenshotUrl;
    document.getElementById('view-transfer-screenshot-img').src = api.optimizeImageUrl(screenshotUrl, 300);
    showToast('تم رفع الصورة بنجاح', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
    input.value = '';
  }
}
