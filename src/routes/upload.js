const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const s3 = require('../storage/s3');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error('Only image files (jpg, png, webp, gif) allowed'));
    }
    cb(null, true);
  },
});

router.post('/', requireAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files to upload' });
    }
    const out = [];
    for (const file of req.files) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const filename = id + '.webp';
      let buffer;
      try {
        buffer = await sharp(file.buffer)
          .rotate()
          .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch (e) {
        console.error('[upload] sharp error:', e.message);
        return res.status(400).json({ error: 'Не удалось обработать изображение: ' + e.message });
      }

      let url;
      if (s3.isEnabled()) {
        try {
          url = await s3.putObject('products/' + filename, buffer, 'image/webp');
        } catch (e) {
          console.error('[upload] S3 error:', e.name, e.message, e.$metadata && e.$metadata.httpStatusCode);
          // Запасной вариант — локальный диск (фото потеряется при ребилде, но хотя бы загрузится)
          const target = path.join(UPLOAD_DIR, filename);
          fs.writeFileSync(target, buffer);
          url = '/uploads/' + filename;
          console.warn('[upload] S3 failed, saved to local: ' + url);
        }
      } else {
        const target = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(target, buffer);
        url = '/uploads/' + filename;
      }
      out.push({ url: url, filename: filename, size: buffer.length });
    }
    res.json({ items: out });
  } catch (e) {
    console.error('[upload] fatal:', e);
    res.status(500).json({ error: e.message || 'Upload error' });
  }
});

module.exports = router;
