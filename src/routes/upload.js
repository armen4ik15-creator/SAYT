const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Сохраняем во временной памяти, потом пережимаем sharp'ом
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error('Разрешены только изображения (jpg, png, webp, gif)'));
    }
    cb(null, true);
  },
});

router.post('/', requireAdmin, upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Нет файлов для загрузки' });
    }
    const out = [];
    for (const file of req.files) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const filename = `${id}.webp`;
      const target = path.join(UPLOAD_DIR, filename);
      await sharp(file.buffer)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(target);
      out.push({
        url: `/uploads/${filename}`,
        filename,
        size: fs.statSync(target).size,
      });
    }
    res.json({ items: out });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
