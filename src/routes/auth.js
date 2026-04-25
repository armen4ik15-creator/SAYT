const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { signToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Жёсткий лимит на попытки входа
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Кешируем хеш, чтобы не пересчитывать каждый раз
let _cachedHash = null;
let _cachedSource = null;
function getAdminHash() {
  const plain = process.env.ADMIN_PASSWORD || 'ChangeMe2026!';
  if (_cachedHash && _cachedSource === plain) return _cachedHash;
  _cachedHash = bcrypt.hashSync(plain, 10);
  _cachedSource = plain;
  return _cachedHash;
}

router.post('/login', loginLimiter, async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }
  const expectedLogin = process.env.ADMIN_LOGIN || 'admin';
  const hash = getAdminHash();

  const loginOk = login === expectedLogin;
  const passOk = await bcrypt.compare(String(password), hash);

  if (!loginOk || !passOk) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = signToken({ role: 'admin', login });
  res.json({ token, login, role: 'admin' });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
