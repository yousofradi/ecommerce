const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Collection = require('../models/Collection');
const adminAuth = require('../middleware/adminAuth');

// POST /api/seed — import products from CSV (run on server)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { clean, csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: 'csvData is required (CSV text content)' });
    }

    if (clean) {
      await Product.deleteMany({});
      await Collection.deleteMany({});
    }

    // Parse CSV
    const rows = parseCSV(csvData);
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const idx = {};
    headers.forEach((h, i) => idx[h] = i);

    // Group by Handle
    const productGroups = {};
    const groupOrder = [];
    for (const row of dataRows) {
      const handle = (row[idx['Handle']] || '').trim();
      if (!handle) continue;
      if (!productGroups[handle]) { productGroups[handle] = []; groupOrder.push(handle); }
      productGroups[handle].push(row);
    }

    // Extract collections
    const collectionNames = new Set();
    for (const handle of groupOrder) {
      const mainRow = productGroups[handle][0];
      const colStr = (mainRow[idx['Collections']] || '').trim();
      if (colStr) colStr.split(',').map(c => c.trim()).filter(Boolean).forEach(c => collectionNames.add(c));
    }

    const collectionMap = {};
    let colOrder = 0;
    for (const name of collectionNames) {
      let existing = await Collection.findOne({ name });
      if (!existing) existing = await Collection.create({ name, sortOrder: colOrder });
      collectionMap[name] = existing._id;
      colOrder++;
    }

    // Create products
    let created = 0;
    let sortOrder = 0;
    for (const handle of groupOrder) {
      const rows = productGroups[handle];
      const mainRow = rows[0];
      const name = (mainRow[idx['Title']] || '').trim();
      if (!name) continue;

      const description = (mainRow[idx['Description']] || '').trim();
      const statusRaw = (mainRow[idx['Status']] || 'ACTIVE').trim().toUpperCase();
      const status = statusRaw === 'DRAFT' ? 'draft' : 'active';
      const imagesStr = (mainRow[idx['Images']] || '').trim();
      const images = imagesStr ? imagesStr.split(/\s+/).filter(u => u.startsWith('http')) : [];
      const regularPrice = parseFloat(mainRow[idx['Regular Price']] || '0') || 0;
      const salePrice = parseFloat(mainRow[idx['Sale Price']] || '') || null;
      const basePrice = regularPrice;

      const qtyRaw = (mainRow[idx['Quantity']] || '').trim();
      let quantity = null;
      if (qtyRaw && qtyRaw !== 'Available') {
        const parsed = parseInt(qtyRaw);
        if (!isNaN(parsed)) quantity = parsed;
      }

      const colStr = (mainRow[idx['Collections']] || '').trim();
      const colNames = colStr ? colStr.split(',').map(c => c.trim()).filter(Boolean) : [];
      const colIds = colNames.map(n => collectionMap[n]).filter(Boolean);
      const collectionId = colIds.length > 0 ? colIds[0] : null;

      // Build options
      const options = [];
      for (let optNum = 1; optNum <= 3; optNum++) {
        const optName = (mainRow[idx[`Option${optNum} Name`]] || '').trim();
        if (!optName) continue;
        const valuesMap = new Map();
        for (const row of rows) {
          const val = (row[idx[`Option${optNum} Value`]] || '').trim();
          if (!val) continue;
          const vr = parseFloat(row[idx['Regular Price']] || '') || regularPrice;
          const vs = parseFloat(row[idx['Sale Price']] || '') || null;
          const vp = vs || vr;
          const diff = vp - (salePrice || basePrice);
          if (!valuesMap.has(val)) valuesMap.set(val, { label: val, price: diff > 0 ? Math.round(diff) : 0 });
        }
        if (valuesMap.size > 0) options.push({ name: optName, required: false, values: Array.from(valuesMap.values()) });
      }

      // Variant quantities
      if (rows.length > 1 && quantity === null) {
        let totalQty = 0, hasNumeric = false;
        for (const row of rows) {
          const vq = (row[idx['Quantity']] || '').trim();
          if (vq && vq !== 'Available') {
            const parsed = parseInt(vq);
            if (!isNaN(parsed)) { totalQty += parsed; hasNumeric = true; }
          }
        }
        if (hasNumeric) quantity = totalQty;
      }

      try {
        await Product.create({
          name, handle, basePrice, salePrice,
          imageUrl: images[0] || '', images, description,
          collectionId, collectionIds: colIds, options,
          sortOrder, active: status === 'active', status, quantity
        });
        created++;
        sortOrder++;
      } catch (err) { /* skip invalid */ }
    }

    // Update collection images
    for (const [, colId] of Object.entries(collectionMap)) {
      const fp = await Product.findOne({
        $or: [{ collectionId: colId }, { collectionIds: colId }],
        images: { $exists: true, $ne: [] }
      }).sort({ sortOrder: 1 });
      if (fp && fp.images.length > 0) await Collection.findByIdAndUpdate(colId, { imageUrl: fp.images[0] });
    }

    res.json({ message: `Seed complete: ${created} products, ${Object.keys(collectionMap).length} collections` });
  } catch (err) {
    res.status(500).json({ error: 'Seed failed: ' + err.message });
  }
});

// CSV parser
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  function readField() {
    if (i >= len || text[i] === '\n' || text[i] === '\r') return '';
    if (text[i] === '"') {
      i++;
      let val = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') { val += '"'; i += 2; }
          else { i++; break; }
        } else { val += text[i]; i++; }
      }
      return val;
    } else {
      let val = '';
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') { val += text[i]; i++; }
      return val;
    }
  }
  while (i < len) {
    const row = [];
    while (true) {
      row.push(readField());
      if (i < len && text[i] === ',') { i++; continue; }
      break;
    }
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

module.exports = router;
