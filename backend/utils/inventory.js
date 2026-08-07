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

  // Handle variants if selectedOptions are provided
  if (selectedOptions && selectedOptions.length > 0) {
    if (product.variants && product.variants.length > 0) {
      // Option 1: Product has hardcoded variants
      const variant = product.variants.find(v => {
        return selectedOptions.every(so => v.combination.get(so.groupName) === so.label);
      });

      if (variant && variant.quantity !== null && variant.quantity !== undefined) {
        const nextQuantity = variant.quantity + quantityDiff;
        variant.quantity = Math.max(0, nextQuantity);
        
        // Auto-archive variant if out of stock, unarchive if restocked
        if (variant.quantity === 0) {
          variant.active = false;
        } else if (variant.quantity > 0 && quantityDiff > 0) {
          variant.active = true;
        }
        
        await product.save();
        changed = true;
      }
    } else {
      // Option 2: Dynamic options (currently no per-option quantity in schema, 
      // but we can deduct from base product quantity if that's how it's set up)
    }
  }

  // Fallback to base product quantity
  if (!changed && product.quantity !== null && product.quantity !== undefined) {
    const nextQuantity = product.quantity + quantityDiff;
    product.quantity = Math.max(0, nextQuantity);

    // Auto-archive product if out of stock, unarchive if restocked
    if (product.quantity === 0) {
      product.active = false;
      product.status = 'draft';
    } else if (product.quantity > 0 && quantityDiff > 0) {
      product.active = true;
      product.status = 'active';
    }

    await product.save();
    changed = true;
  }

  if (changed) {
    await clearStorefrontProductCaches();
  }
}

module.exports = { adjustStock };
