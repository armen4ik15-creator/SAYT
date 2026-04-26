const express = require('express');
const rateLimit = require('express-rate-limit');
const { makeStore } = require('../db/store');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const store = makeStore('leads');

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests' },
});

router.post('/', submitLimiter, async (req, res, next) => {
  try {
    const { name, phone, company, email, message, source, items } = req.body || {};
    if (!phone && !email) {
      return res.status(400).json({ error: 'Phone or email required' });
    }
    const lead = {
      id: Date.now(),
      name: String(name || '').slice(0, 200),
      phone: String(phone || '').slice(0, 50),
      email: String(email || '').slice(0, 200),
      company: String(company || '').slice(0, 200),
      message: String(message || '').slice(0, 2000),
      source: String(source || 'site').slice(0, 100),
      items: Array.isArray(items) ? items.slice(0, 50) : [],
      createdAt: new Date().toISOString(),
      ip: req.ip,
      status: 'new',
    };
    const all = await store.read();
    all.push(lead);
    await store.write(all);

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      notifyTelegram(lead).catch(err => console.error('[telegram]', err.message));
    }

    res.status(201).json({ ok: true, id: lead.id });
  } catch (e) { next(e); }
});

router.get('/', requireAdmin, async (req, res, next) => {
  try { res.json({ items: (await store.read()).sort((a, b) => b.id - a.id) }); }
  catch (e) { next(e); }
});

router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const all = await store.read();
    const idx = all.findIndex(l => String(l.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    if (req.body.status) all[idx].status = String(req.body.status);
    if (req.body.note !== undefined) all[idx].note = String(req.body.note).slice(0, 2000);
    await store.write(all);
    res.json({ item: all[idx] });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const all = await store.read();
    const nextItems = all.filter(l => String(l.id) !== String(req.params.id));
    await store.write(nextItems);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

async function notifyTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const lines = [
    'Новая заявка с Mobitrend',
    lead.name && ('Имя: ' + lead.name),
    lead.phone && ('Тел: ' + lead.phone),
    lead.email && ('Email: ' + lead.email),
    lead.company && ('Компания: ' + lead.company),
    lead.message && ('Сообщение: ' + lead.message),
    lead.items && lead.items.length ? ('Товаров: ' + lead.items.length) : null,
    'Источник: ' + lead.source,
  ].filter(Boolean);
  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
  });
}

module.exports = router;
