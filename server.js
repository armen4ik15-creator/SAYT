require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const productsRouter = require('./src/routes/products');
const authRouter = require('./src/routes/auth');
const uploadRouter = require('./src/routes/upload');
const leadsRouter = require('./src/routes/leads');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/', rateLimit({ windowMs: 60000, max: 120, standardHeaders: true, legacyHeaders: false }));

fs.mkdirSync(path.join(__dirname, 'public', 'uploads'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/leads', leadsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css|json|xml|txt)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (/\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  },
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

(async () => {
  try {
    const { migrate } = require('./src/db/store');
    await migrate();
    if (process.env.DATABASE_URL) {
      console.log('MySQL connected, schema ready');
      const { getPool, tableName } = require('./src/db/mysqlStore');
      const pool = getPool();
      for (const name of ['products', 'leads']) {
        const table = tableName(name);
        const [rows] = await pool.query('SELECT COUNT(*) AS c FROM `' + table + '`');
        if (rows[0].c === 0) {
          const file = path.join(__dirname, 'data', name + '.json');
          if (fs.existsSync(file)) {
            try {
              const items = JSON.parse(fs.readFileSync(file, 'utf8'));
              if (Array.isArray(items) && items.length) {
                const values = items.map(i => [i.id || Math.floor(Date.now() + Math.random() * 1000), JSON.stringify(i)]);
                await pool.query('INSERT INTO `' + table + '` (id, data) VALUES ?', [values]);
                console.log('  imported ' + items.length + ' ' + name + ' from JSON to ' + table);
              }
            } catch (e) { console.warn('migrate ' + name + ':', e.message); }
          }
        }
      }
    } else {
      console.log('Using JSON storage (DATABASE_URL not set)');
    }
  } catch (e) {
    console.error('[db] init error:', e.message);
  }
})();

app.listen(PORT, () => {
  console.log('Mobitrend server running on http://localhost:' + PORT);
});
