const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const GiftCollection = require('../models/GiftCollection');
const Product = require('../models/Product');
const adminAuth = require('../middleware/adminAuth');

// ── Admin CRUD ──────────────────────────────────────────────

router.get('/', adminAuth, async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ minCartSubtotal: -1, createdAt: -1 });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const newPromo = new Promotion(req.body);
    await newPromo.save();
    res.json(newPromo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const updated = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Promotion not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await Promotion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Promotion not found' });
    res.json({ success: true, message: 'Promotion deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

// ── Engine Evaluation logic ──────────────────────────────────

// Export the evaluation logic so it can be reused in orders.js during checkout
async function evaluateCartPromotions(cartItems) {
  // cartItems should be an array of { productId, unitPrice, quantity }

  // 1. Fetch active promotions, sorted by minCartSubtotal descending (highest tier first)
  const now = new Date();
  const promotions = await Promotion.find({
    isActive: true,
    $or: [{ startDate: null }, { startDate: { $lte: now } }],
    $or: [{ endDate: null }, { endDate: { $gte: now } }]
  }).sort({ minCartSubtotal: -1 }).lean();

  if (!promotions || promotions.length === 0) {
    return { appliedPromotion: null, totalDiscount: 0, freeShipping: false, unlockedGifts: [], progress: null };
  }

  // 2. We need to calculate eligible subtotal for EACH promotion
  // Because each promotion might have different excludedProducts
  let activePromotion = null;
  let eligibleSubtotalForActive = 0;

  for (const promo of promotions) {
    let eligibleSubtotal = 0;
    let totalQty = 0;

    for (const item of cartItems) {
      if (item.isFreeGift) continue; // Free gifts don't count towards unlocking promos
      
      // Excluded products don't count towards subtotal
      if (promo.excludedProducts && promo.excludedProducts.includes(item.productId)) {
        continue;
      }
      // Future expansion: check if promo applies to specific categories or products only

      eligibleSubtotal += (item.unitPrice * item.quantity);
      totalQty += item.quantity;
    }

    let isEligible = true;
    if (promo.minCartSubtotal && eligibleSubtotal < promo.minCartSubtotal) isEligible = false;
    if (promo.maxCartSubtotal && eligibleSubtotal > promo.maxCartSubtotal) isEligible = false;
    if (promo.minQuantity && totalQty < promo.minQuantity) isEligible = false;

    if (isEligible) {
      activePromotion = promo;
      eligibleSubtotalForActive = eligibleSubtotal;
      break; // Since it's sorted descending, the first one we qualify for is the highest tier!
    }
  }

  // 3. Find the NEXT tier for the progress bar
  const rawSubtotal = cartItems.reduce((sum, item) => {
    if (item.isFreeGift) return sum;
    return sum + (item.unitPrice * item.quantity);
  }, 0);
  
  // Find the smallest promotion where minCartSubtotal > rawSubtotal
  // promotions is sorted descending, so we look from the bottom up to find the closest next tier
  let nextPromotion = null;
  for (let i = promotions.length - 1; i >= 0; i--) {
    if (promotions[i].minCartSubtotal > rawSubtotal) {
      nextPromotion = promotions[i];
      break;
    }
  }

  let progress = null;
  if (nextPromotion) {
    progress = {
      target: nextPromotion.minCartSubtotal,
      current: rawSubtotal,
      remaining: nextPromotion.minCartSubtotal - rawSubtotal,
      percentage: Math.min(100, (rawSubtotal / nextPromotion.minCartSubtotal) * 100),
      nextRewardName: nextPromotion.name,
      nextRewardType: nextPromotion.rewardType
    };
  } else if (activePromotion) {
    // They reached the max tier!
    progress = { target: activePromotion.minCartSubtotal, current: rawSubtotal, remaining: 0, percentage: 100, nextRewardName: 'MAX', nextRewardType: 'NONE' };
  }

  // 4. Calculate actual rewards for activePromotion
  let totalDiscount = 0;
  let freeShipping = false;
  let unlockedGifts = [];

  if (activePromotion) {
    if (activePromotion.rewardType === 'PERCENTAGE') {
      totalDiscount = eligibleSubtotalForActive * (activePromotion.rewardValue / 100);
    } else if (activePromotion.rewardType === 'FIXED') {
      totalDiscount = activePromotion.rewardValue;
    } else if (activePromotion.rewardType === 'FREE_SHIPPING') {
      freeShipping = true;
    } else if (activePromotion.rewardType === 'FREE_GIFT') {
      if (activePromotion.giftMode === 'MANUAL') {
        unlockedGifts.push({ type: 'MANUAL', message: '🎁 Congratulations! Your order qualifies for a free gift.' });
      } else if (activePromotion.giftMode === 'CHOICE' && activePromotion.giftCollectionId) {
        // Fetch products in the gift collection
        const coll = await GiftCollection.findById(activePromotion.giftCollectionId);
        if (coll && coll.products && coll.products.length > 0) {
          const giftProducts = await Product.find({ _id: { $in: coll.products } }, 'name images _id').lean();
          if (giftProducts.length > 0) {
            unlockedGifts.push({
              type: 'CHOICE',
              collectionId: coll._id,
              products: giftProducts.map(p => ({
                id: p._id,
                name: p.name,
                image: (p.images && p.images.length > 0) ? p.images[0] : ''
              }))
            });
          }
        }
      }
    } else if (activePromotion.rewardType === 'MULTIPLE') {
       // Optional: implement multiple rewards if needed in future
    }
  }

  return {
    appliedPromotion: activePromotion,
    totalDiscount: Math.round(totalDiscount), // round to nearest EGP
    freeShipping,
    unlockedGifts,
    progress
  };
}

// ── Storefront API ──────────────────────────────────────────

router.post('/evaluate', async (req, res) => {
  try {
    const { cartItems } = req.body;
    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: 'cartItems array is required' });
    }
    const result = await evaluateCartPromotions(cartItems);
    res.json(result);
  } catch (error) {
    console.error('Promotion evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate promotions' });
  }
});

module.exports = { router, evaluateCartPromotions };
