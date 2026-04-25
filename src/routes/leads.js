const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const JsonStore = require('../db/jsonStore');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const store = new JsonStore(path.join(__dirname, '..', '..', 'data', 'leads.json'), []);

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Слишком много заявок. Попробуйте позже.' },
});

// ── POST /api/leads — приём заявки от клиента ──
router.post('/', submitLimiter, async (req, res) => {
  const { name, phone, company, email, message, source, items } = req.body || {};
  if (!phone && !email) {
    return res.status(400).json({ error: 'Укажите телефон или email' });
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
  const all = store.read();
  all.push(lead);
  await store.write(all);

  // Тихо пробуем уведомить в Telegram (если настроен)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    notifyTelegram(lead).catch(err => console.error('[telegram]', err.message));
  }

  res.status(201).json({ ok: true, id: lead.id });
});

// ── GET /api/leads — список для админа ──
router.get('/', requireAdmin, (req, res) => {
  res.json({ items: store.read().sort((a, b) => b.id - a.id) });
});

// ── PATCH /api/leads/:id — изменить статус ──
router.patch('/:id', requireAdmin, async (req, res) => {
  const all = store.read();
  const idx = all.findIndex(l => String(l.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'Заявка не найдена' });
  if (req.body.status) all[idx].status = String(req.body.status);
  if (req.body.note !== undefined) all[idx].note = String(req.body.note).slice(0, 2000);
  await store.write(all);
  res.json({ item: all[idx] });
});

// ── DELETE /api/leads/:id ──
router.delete('/:id', requireAdmin, async (req, res) => {
  const all = store.read();
  const next = all.filter(l => String(l.id) !== String(req.params.id));
  await store.write(next);
  res.json({ ok: true });
});

async function notifyTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const lines = [
    '🔔 *Новая заявка с Mobitrend*',
    lead.name && `👤 ${lead.name}`,
    lead.phone && `📱 ${lead.phone}`,
    lead.email && `✉️ ${lead.email}`,
    lead.company && `🏢 ${lead.company}`,
    lead.message && `💬 ${lead.message}`,
    lead.items?.length ? `🛒 Товары: ${lead.items.length}` : null,
    `🔗 Источник: ${lead.source}`,
  ].filter(Boolean);
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join('\n'),
      parse_mode: 'Markdown',
    }),
  });
}

module.exports = router;
