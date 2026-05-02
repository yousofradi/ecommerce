const fs = require('fs');
const files = ['frontend/product.html', 'frontend/order-success.html', 'frontend/collection.html', 'frontend/checkout.html', 'frontend/cart.html'];
const newBtn = `<a href="index.html" class="header-icon back-btn" onclick="if(history.length > 1) { history.back(); return false; }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; color: var(--text-muted);"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/></svg></a>`;

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/<a href="[^"]*" class="header-icon back-btn" onclick="[^"]*">←<\/a>/g, newBtn);
    fs.writeFileSync(f, content);
  }
});
