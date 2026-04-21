/** Cart — localStorage-backed cart system */
const Cart = {
  KEY: 'ecommerce_cart',

  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  _save(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); this._updateBadge(); },

  getItems() { return this._load(); },

  addItem(product, selectedOptions) {
    const items = this._load();
    const key = product._id + '_' + selectedOptions.map(o => `${o.groupName}:${o.label}`).sort().join('|');
    const existing = items.find(i => i.key === key);
    if (existing) {
      existing.quantity++;
    } else {
      const optionsPrice = selectedOptions.reduce((s, o) => s + (o.price || 0), 0);
      items.push({
        key,
        productId: product._id,
        name: product.name,
        imageUrl: product.imageUrl,
        basePrice: product.basePrice,
        selectedOptions,
        unitPrice: product.basePrice + optionsPrice,
        quantity: 1
      });
    }
    this._save(items);
  },

  updateQty(key, qty) {
    const items = this._load();
    const item = items.find(i => i.key === key);
    if (item) {
      if (qty <= 0) { this.removeItem(key); return; }
      item.quantity = qty;
    }
    this._save(items);
  },

  removeItem(key) {
    const items = this._load().filter(i => i.key !== key);
    this._save(items);
  },

  clear() { localStorage.removeItem(this.KEY); this._updateBadge(); },

  getTotal() {
    return this._load().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  },

  getCount() {
    return this._load().reduce((sum, i) => sum + i.quantity, 0);
  },

  _updateBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  },

  init() { this._updateBadge(); }
};

document.addEventListener('DOMContentLoaded', () => Cart.init());
