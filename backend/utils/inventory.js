const Product = require('../models/Product');
const cache = require('./cache');

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

  let changed = false;

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
      const nextQuantity = Math.max(0, Number(variant.quantity) + quantityDiff);
      variant.quantity = nextQuantity;
      changed = true;
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
