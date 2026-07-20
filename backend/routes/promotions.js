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
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: error.message || 'Failed to create promotion' });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const updated = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Promotion not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ error: error.message || 'Failed to update promotion' });
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

  // Helper to calculate eligible subtotal for a specific promotion
  const getEligibleSubtotal = (promo) => {
    return cartItems.reduce((sum, item) => {
      if (item.isFreeGift) return sum;
      if (promo.excludedProducts && promo.excludedProducts.some(id => id.toString() === item.productId.toString())) {
        return sum;
      }
      const uPrice = Number(item.unitPrice) || Number(item.price) || Number(item.basePrice) || 0;
      return sum + (uPrice * item.quantity);
    }, 0);
  };

  const getEligibleQty = (promo) => {
    return cartItems.reduce((sum, item) => {
      if (item.isFreeGift) return sum;
      if (promo.excludedProducts && promo.excludedProducts.some(id => id.toString() === item.productId.toString())) {
        return sum;
      }
      return sum + item.quantity;
    }, 0);
  };

  // 2. Evaluate ACTIVE promotion
  // Iterate from highest target to lowest
  let activePromotion = null;
  let eligibleSubtotalForActive = 0;

  for (const promo of promotions) {
    let eligibleSubtotal = getEligibleSubtotal(promo);
    let totalQty = getEligibleQty(promo);

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
  // Sort from smallest target to largest target
  const sortedPromotions = [...promotions].sort((a, b) => (a.minCartSubtotal || 0) - (b.minCartSubtotal || 0));
  
  let nextPromotion = null;
  let nextPromoEligibleSubtotal = 0;
  
  for (const promo of sortedPromotions) {
    if (!promo.minCartSubtotal) continue;
    const eligibleSubtotal = getEligibleSubtotal(promo);
    if (eligibleSubtotal < promo.minCartSubtotal) {
      nextPromotion = promo;
      nextPromoEligibleSubtotal = eligibleSubtotal;
      break;
    }
  }

  const tiers = sortedPromotions.filter(p => p.minCartSubtotal > 0).map(p => {
    let rt = [];
    if (p.discountType === 'PERCENTAGE') rt.push(`خصم ${p.discountValue}%`);
    if (p.discountType === 'FIXED') rt.push(`خصم ${p.discountValue} ج`);
    if (p.isFreeShipping) rt.push('شحن مجاني');
    if (p.isFreeGift) rt.push('هدية مجانية');
    
    const eligibleSubtotal = getEligibleSubtotal(p);
    
    return {
      name: p.name,
      target: p.minCartSubtotal,
      isReached: eligibleSubtotal >= p.minCartSubtotal,
      rewardText: rt.join(' و ') || 'عرض'
    };
  });

  let progress = null;
  if (nextPromotion) {
    progress = {
      target: nextPromotion.minCartSubtotal,
      current: nextPromoEligibleSubtotal,
      remaining: nextPromotion.minCartSubtotal - nextPromoEligibleSubtotal,
      percentage: Math.min(100, (nextPromoEligibleSubtotal / nextPromotion.minCartSubtotal) * 100),
      nextRewardName: nextPromotion.name,
      tiers
    };
  } else if (activePromotion && activePromotion.minCartSubtotal) {
    // They reached the max tier!
    const eligibleSubtotal = getEligibleSubtotal(activePromotion);
    progress = { target: activePromotion.minCartSubtotal, current: eligibleSubtotal, remaining: 0, percentage: 100, nextRewardName: 'MAX', tiers };
  } else if (tiers.length > 0) {
    // In case no nextPromotion and no activePromotion but tiers exist (e.g. cart is empty)
    const eligibleSubtotal = getEligibleSubtotal(sortedPromotions[0]);
    progress = { target: tiers[0].target, current: eligibleSubtotal, remaining: tiers[0].target - eligibleSubtotal, percentage: Math.min(100, (eligibleSubtotal / tiers[0].target) * 100), nextRewardName: tiers[0].name, tiers };
  }

  // 4. Calculate actual rewards for activePromotion
  let totalDiscount = 0;
  let freeShipping = false;
  let unlockedGifts = [];

  let rewardTexts = [];
  if (activePromotion) {
    if (activePromotion.discountType === 'PERCENTAGE') {
      totalDiscount = eligibleSubtotalForActive * (activePromotion.discountValue / 100);
      rewardTexts.push(`خصم ${activePromotion.discountValue}%`);
    } else if (activePromotion.discountType === 'FIXED') {
      totalDiscount = activePromotion.discountValue;
      rewardTexts.push(`خصم ${activePromotion.discountValue} ج`);
    }

    if (activePromotion.isFreeShipping) {
      freeShipping = true;
      rewardTexts.push('شحن مجاني');
    }

    if (activePromotion.isFreeGift) {
      rewardTexts.push('هدية مجانية');
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
    }
  }

  return {
    appliedPromotion: activePromotion,
    totalDiscount: Math.round(totalDiscount), // round to nearest EGP
    freeShipping,
    unlockedGifts,
    progress,
    rewardTexts,
    rewardText: rewardTexts.join(' و ')
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
