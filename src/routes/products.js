const express = require('express');
const { makeStore } = require('../db/store');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const store = makeStore('products');

function slugify(str) {
  const ru = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const en = ['a','b','v','g','d','e','yo','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','c','ch','sh','sch','','y','','e','yu','ya'];
  return String(str || '')
    .toLowerCase()
    .split('')
    .map(ch => {
      const i = ru.indexOf(ch);
      if (i >= 0) return en[i];
      return ch;
    })
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || ('item-' + Date.now());
}

function nextId(items) {
  return items.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
}

function normalizeProduct(input, existing = null) {
  const safeNum = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };
  const arr = (v) => Array.isArray(v) ? v : (v ? [v] : []);

  const prices = input.prices || {};
  const minQty = input.minQty || {};

  return {
    id: existing && existing.id != null ? existing.id : (input.id != null ? input.id : null),
    slug: input.slug || slugify(input.name),
    name: String(input.name || '').trim(),
    brand: String(input.brand || '').trim(),
    category: String(input.category || 'other').trim(),
    categoryName: String(input.categoryName || '').trim(),
    sku: String(input.sku || '').trim(),
    image: String(input.image || (arr(input.images)[0] || '')).trim(),
    images: arr(input.images).map(String),
    prices: {
      retail: safeNum(prices.retail),
      smallWholesale: safeNum(prices.smallWholesale),
      largeWholesale: safeNum(prices.largeWholesale),
    },
    minQty: {
      smallWholesale: safeNum(minQty.smallWholesale, 10),
      largeWholesale: safeNum(minQty.largeWholesale, 50),
    },
    margin: safeNum(input.margin),
    stock: safeNum(input.stock),
    rating: safeNum(input.rating, 5),
    reviews: safeNum(input.reviews),
    isHit: !!input.isHit,
    isNew: !!input.isNew,
    isActive: input.isActive !== false,
    description: String(input.description || ''),
    specs: input.specs && typeof input.specs === 'object' ? input.specs : {},
    createdAt: (existing && existing.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

router.get('/', async (req, res, next) => {
  try {
    const all = await store.read();
    let items = all.filter(p => p.isActive !== false);
    const { category, brand, q, hit, sort, limit, offset } = req.query;
    if (category) items = items.filter(p => p.category === category);
    if (brand) items = items.filter(p => (p.brand || '').toLowerCase() === String(brand).toLowerCase());
    if (q) {
      const needle = String(q).toLowerCase();
      items = items.filter(p =>
        (p.name || '').toLowerCase().includes(needle) ||
        (p.description || '').toLowerCase().includes(needle) ||
        (p.sku || '').toLowerCase().includes(needle) ||
        (p.brand || '').toLowerCase().includes(needle)
      );
    }
    if (hit === 'true') items = items.filter(p => p.isHit);
    switch (sort) {
      case 'price-asc':  items.sort((a, b) => (a.prices && a.prices.smallWholesale || 0) - (b.prices && b.prices.smallWholesale || 0)); break;
      case 'price-desc': items.sort((a, b) => (b.prices && b.prices.smallWholesale || 0) - (a.prices && a.prices.smallWholesale || 0)); break;
      case 'margin':     items.sort((a, b) => (b.margin || 0) - (a.margin || 0)); break;
      case 'rating':     items.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'new':        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      default: break;
    }
    const total = items.length;
    const off = Math.max(0, parseInt(offset || '0', 10));
    const lim = Math.min(500, Math.max(1, parseInt(limit || '500', 10)));
    items = items.slice(off, off + lim);
    res.json({ items, total });
  } catch (e) { next(e); }
});

router.get('/admin', requireAdmin, async (req, res, next) => {
  try { res.json({ items: await store.read() }); }
  catch (e) { next(e); }
});

router.get('/categories', async (req, res, next) => {
  try {
    const all = (await store.read()).filter(p => p.isActive !== false);
    const map = new Map();
    for (const p of all) {
      const key = p.category || 'other';
      if (!map.has(key)) map.set(key, { category: key, name: p.categoryName || key, count: 0 });
      map.get(key).count += 1;
    }
    res.json({ items: Array.from(map.values()).sort((a, b) => b.count - a.count) });
  } catch (e) { next(e); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const all = await store.read();
    const item = all.find(p => p.slug === req.params.slug || String(p.id) === req.params.slug);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  } catch (e) { next(e); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const all = await store.read();
    const product = normalizeProduct(req.body || {});
    if (!product.name) return res.status(400).json({ error: 'Name required' });
    let baseSlug = product.slug;
    let n = 2;
    while (all.some(p => p.slug === product.slug)) {
      product.slug = baseSlug + '-' + (n++);
    }
    product.id = nextId(all);
    all.push(product);
    await store.write(all);
    res.status(201).json({ item: product });
  } catch (e) { next(e); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const all = await store.read();
    const idx = all.findIndex(p => String(p.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const updated = normalizeProduct(Object.assign({}, all[idx], req.body), all[idx]);
    if (updated.slug !== all[idx].slug) {
      let base = updated.slug, n = 2;
      while (all.some(p => p.slug === updated.slug && String(p.id) !== String(req.params.id))) {
        updated.slug = base + '-' + (n++);
      }
    }
    all[idx] = updated;
    await store.write(all);
    res.json({ item: updated });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const all = await store.read();
    const nextItems = all.filter(p => String(p.id) !== String(req.params.id));
    if (nextItems.length === all.length) return res.status(404).json({ error: 'Not found' });
    await store.write(nextItems);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/bulk', requireAdmin, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'Expected { items: [...] }' });
    const normalized = items.map(it => normalizeProduct(it));
    let cursor = nextId(normalized.filter(i => i.id));
    for (const it of normalized) {
      if (!it.id) it.id = ++cursor;
    }
    await store.write(normalized);
    res.json({ ok: true, count: normalized.length });
  } catch (e) { next(e); }
});

module.exports = router;
