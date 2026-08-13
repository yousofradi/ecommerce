const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const VisitorStat = require('../models/VisitorStat');
const adminAuth = require('../middleware/adminAuth');

router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // We only need the fields relevant to the calculation: status, paid, paidAmount, totalPrice, shippingFee, createdAt, items
    const relevantOrders = await Order.find({
      createdAt: {
        $gte: new Date(prevYear, prevMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    }).select('status paid paidAmount totalPrice shippingFee createdAt items').lean();

    const allMonthOrders = relevantOrders.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthOrders = allMonthOrders.filter(o => (o.paid || Number(o.paidAmount) > 0));

    const prevMonthOrders = relevantOrders.filter(o => {
      if (!o.createdAt || !(o.paid || Number(o.paidAmount) > 0)) return false;
      const d = new Date(o.createdAt);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    // ── CALCULATIONS FOR CURRENT MONTH ──
    const curRevenue = monthOrders.reduce((sum, o) => sum + Math.max(0, (o.totalPrice || 0) - (o.shippingFee || 0)), 0);
    const curProductsSold = monthOrders.reduce((sum, o) => {
      if (o.status === 'cancelled') return sum;
      return sum + (o.items || []).reduce((s, item) => s + (Number(item.quantity) || 0), 0);
    }, 0);
    const curOrdersCount = monthOrders.length;
    const curAOV = curOrdersCount > 0 ? (curRevenue / curOrdersCount) : 0;

    // ── CALCULATIONS FOR PREVIOUS MONTH ──
    const prevRevenue = prevMonthOrders.reduce((sum, o) => sum + Math.max(0, (o.totalPrice || 0) - (o.shippingFee || 0)), 0);
    const prevProductsSold = prevMonthOrders.reduce((sum, o) => {
      if (o.status === 'cancelled') return sum;
      return sum + (o.items || []).reduce((s, item) => s + (Number(item.quantity) || 0), 0);
    }, 0);
    const prevOrdersCount = prevMonthOrders.length;
    const prevAOV = prevOrdersCount > 0 ? (prevRevenue / prevOrdersCount) : 0;

    // ── VISITORS ──
    const curMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const curVisitorObj = await VisitorStat.findOne({ month: curMonthStr }).lean();
    const curVisitorCount = curVisitorObj ? curVisitorObj.count : 0;

    // ── ORDER STATUS BREAKDOWN ──
    const confirmedOrders = monthOrders.filter(o => o.status !== 'cancelled');
    const cancelledOrders = allMonthOrders.filter(o => o.status === 'cancelled');

    const confirmedCount = confirmedOrders.length;
    const confirmedValue = confirmedOrders.reduce((sum, o) => sum + Math.max(0, (o.totalPrice || 0) - (o.shippingFee || 0)), 0);

    const cancelledCount = cancelledOrders.length;
    const cancelledValue = cancelledOrders.reduce((sum, o) => sum + Math.max(0, (o.totalPrice || 0) - (o.shippingFee || 0)), 0);

    // ── BEST SELLERS ──
    const productSales = {};
    monthOrders.forEach(o => {
      if (o.status === 'cancelled') return;
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(item => {
          // We can use productId if available, otherwise name
          const pId = item.productId || (item.name || 'منتج غير معروف').trim();
          if (!pId) return;

          const qty = Number(item.quantity) || 0;
          const price = Number(item.unitPrice) || Number(item.price) || Number(item.basePrice) || 0;
          const lineTotal = item.finalPrice !== undefined ? Number(item.finalPrice) : (price * qty);

          if (!productSales[pId]) {
            productSales[pId] = {
              name: item.name || 'منتج غير معروف',
              image: item.image || (item.images && item.images.length > 0 ? item.images[0] : item.imageUrl) || '',
              quantitySold: 0,
              revenue: 0,
            };
          }
          productSales[pId].quantitySold += qty;
          productSales[pId].revenue += lineTotal;
        });
      }
    });

    const bestSellers = Object.values(productSales)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // ── RECENT ORDERS ──
    const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      metrics: {
        current: {
          revenue: curRevenue,
          productsSold: curProductsSold,
          ordersCount: curOrdersCount,
          aov: curAOV
        },
        previous: {
          revenue: prevRevenue,
          productsSold: prevProductsSold,
          ordersCount: prevOrdersCount,
          aov: prevAOV
        }
      },
      visitors: curVisitorCount,
      statusBreakdown: {
        confirmed: { count: confirmedCount, value: confirmedValue },
        cancelled: { count: cancelledCount, value: cancelledValue }
      },
      bestSellers,
      recentOrders
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
