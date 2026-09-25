const Product = require('../models/Product');
const cache = require('./cache');
const { sendWhatsAppMessage } = require('./whatsapp');

// Cooldown cache to prevent spamming WhatsApp alerts (10 minutes cooldown)
const recentAlerts = new Map();

function shouldSendAlert(key) {
  const now = Date.now();
  const lastTime = recentAlerts.get(key);
  if (lastTime && (now - lastTime) < 10 * 60 * 1000) {
    return false;
  }
  recentAlerts.set(key, now);
  if (recentAlerts.size > 500) {
    for (const [k, t] of recentAlerts.entries()) {
      if (now - t > 10 * 60 * 1000) recentAlerts.delete(k);
    }
  }
  return true;
}

function clearAlertCooldown(keyPrefix) {
  for (const k of recentAlerts.keys()) {
    if (k.startsWith(keyPrefix)) {
      recentAlerts.delete(k);
    }
  }
}

async function clearStorefrontProductCaches() {
  try {
    await cache.clearPrefix('storefront:products:list:');
  } catch (err) {
    console.error('[Inventory] Failed to clear storefront product caches:', err.message);
  }
}

/**
 * Adjusts stock for a product or variant.
 * @param {string} productId - The product ID.
 * @param {Array} selectedOptions - Array of {groupName, label} for variants.
 * @param {number} quantityDiff - The amount to change (negative to decrease, positive to increase).
 */
async function adjustStock(productId, selectedOptions, quantityDiff) {
  if (!quantityDiff) return;

  const product = await Product.findById(productId);
  if (!product) {
    console.error(`[Inventory] Product ${productId} not found for adjustment`);
    return;
  }

  // If stock is increased, clear cooldowns for this product so future out-of-stock events will alert
  if (quantityDiff > 0) {
    clearAlertCooldown(`prod:${productId}`);
    clearAlertCooldown(`var:zero:${productId}`);
    clearAlertCooldown(`var:low:${productId}`);
  }

  const previousQuantity = product.quantity;
  let changed = false;
  let variantAlertData = null;

  // 1. Handle variants if selectedOptions are provided and product has variants
  if (selectedOptions && selectedOptions.length > 0 && product.variants && product.variants.length > 0) {
    const variant = product.variants.find(v => {
      if (!v.combination) return false;
      const combo = v.combination instanceof Map ? Object.fromEntries(v.combination) : (v.combination || {});
      const comboKeys = Object.keys(combo);

      return selectedOptions.every(so => {
        const groupNameClean = (so.groupName || '').trim().toLowerCase();
        const labelClean = (so.label || '').trim().toLowerCase();

        const matchKey = comboKeys.find(k => k.trim().toLowerCase() === groupNameClean);
        if (!matchKey) return false;
        return (combo[matchKey] || '').trim().toLowerCase() === labelClean;
      });
    });

    if (variant && variant.quantity !== null && variant.quantity !== undefined && variant.quantity !== "") {
      const prevVarQty = Number(variant.quantity);
      const nextQuantity = Math.max(0, prevVarQty + quantityDiff);
      variant.quantity = nextQuantity;
      changed = true;

      if (quantityDiff < 0) {
        const comboEntries = variant.combination instanceof Map
          ? Array.from(variant.combination.entries())
          : Object.entries(variant.combination || {});

        const variantDetails = comboEntries.length > 0
          ? comboEntries.map(([groupName, val]) => `${groupName}: ${val}`).join(' - ')
          : (selectedOptions && selectedOptions.length > 0
              ? selectedOptions.map(so => `${so.groupName}: ${so.label}`).join(' - ')
              : 'افتراضي');

        const varPrice = (variant.salePrice && variant.salePrice < variant.price) ? variant.salePrice : (variant.price || (product.salePrice || product.basePrice));

        if (nextQuantity === 0 && prevVarQty > 0) {
          variant.active = false;
          variantAlertData = {
            type: 'zero',
            productName: product.name,
            variantDetails,
            price: varPrice,
            quantity: 0
          };
        } else if (nextQuantity > 0 && nextQuantity < 3 && (prevVarQty >= 3 || prevVarQty > nextQuantity)) {
          variantAlertData = {
            type: 'low',
            productName: product.name,
            variantDetails,
            price: varPrice,
            quantity: nextQuantity
          };
        }
      }
    }
  }

  // 2. Fallback to base product quantity if no variant was matched or product has no variants
  if (!changed && product.quantity !== null && product.quantity !== undefined && product.quantity !== "") {
    const nextQuantity = Math.max(0, Number(product.quantity) + quantityDiff);
    product.quantity = nextQuantity;
    changed = true;
  }

  // 3. Sync product.quantity to the sum of variant quantities if product has variant quantities
  if (product.variants && product.variants.length > 0) {
    const hasVariantQuantities = product.variants.some(v => v.quantity !== null && v.quantity !== undefined && v.quantity !== "");
    if (hasVariantQuantities) {
      product.quantity = product.variants.reduce((sum, v) => {
        const q = parseInt(v.quantity);
        return sum + (isNaN(q) ? 0 : Math.max(0, q));
      }, 0);
      changed = true;
    }
  }

  // 4. Threshold checks and WhatsApp Alerts on stock deduction (quantityDiff < 0)
  if (changed && quantityDiff < 0) {
    const effectivePrice = (product.salePrice && product.salePrice < product.basePrice) ? product.salePrice : product.basePrice;

    // Case 1: Product count reached 0 -> Archive product & send alert
    if (product.quantity !== null && product.quantity <= 0) {
      product.quantity = 0;
      product.status = 'draft';
      product.active = false;
      if (Array.isArray(product.variants)) {
        product.variants.forEach(v => { v.active = false; });
      }

      const alertKey = `prod:zero:${product._id}`;
      if (shouldSendAlert(alertKey)) {
        const zeroMsg = `تنبيه: نفاد المخزون وتمت أرشفة المنتج\n\nاسم المنتج: ${product.name}\nالسعر: ${effectivePrice} ج.م\nالكمية المتبقية: 0\nالحالة: تم نقل المنتج إلى الأرشيف تلقائياً`;
        sendWhatsAppMessage(zeroMsg);
      }
    }
    // Case 2: Specific variant alert if variant reached 0 or low stock (< 3)
    else if (variantAlertData) {
      const alertKey = `var:${variantAlertData.type}:${productId}:${variantAlertData.variantDetails}`;
      if (shouldSendAlert(alertKey)) {
        if (variantAlertData.type === 'zero') {
          const varMsg = `تنبيه: نفاد مخزون المتغير\n\nاسم المنتج: ${variantAlertData.productName}\nالمتغير: ${variantAlertData.variantDetails}\nالسعر: ${variantAlertData.price} ج.م\nالكمية: 0`;
          sendWhatsAppMessage(varMsg);
        } else if (variantAlertData.type === 'low') {
          const varMsg = `تنبيه: اقتراب نفاد مخزون المتغير\n\nاسم المنتج: ${variantAlertData.productName}\nالمتغير: ${variantAlertData.variantDetails}\nالسعر: ${variantAlertData.price} ج.م\nالكمية المتبقية: ${variantAlertData.quantity}`;
          sendWhatsAppMessage(varMsg);
        }
      }
    }
    // Case 3: Product count went below 3 (1 or 2) -> Send low stock alert for product without variants
    else if (product.quantity !== null && product.quantity > 0 && product.quantity < 3) {
      if (previousQuantity === null || previousQuantity >= 3 || previousQuantity > product.quantity) {
        const alertKey = `prod:low:${product._id}`;
        if (shouldSendAlert(alertKey)) {
          const lowMsg = `تنبيه: اقتراب نفاد المخزون\n\nاسم المنتج: ${product.name}\nالسعر: ${effectivePrice} ج.م\nالكمية المتبقية: ${product.quantity}`;
          sendWhatsAppMessage(lowMsg);
        }
      }
    }
  }

  if (changed) {
    await product.save();
    await clearStorefrontProductCaches();
    try {
      await cache.del(`storefront:product:id:${productId}`);
      if (product.handle) {
        await cache.del(`storefront:product:handle:${product.handle}`);
      }
    } catch (cErr) {
      console.error('[Inventory] Cache clear error:', cErr.message);
    }
  }
}

module.exports = { adjustStock };
