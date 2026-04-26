const mysql = require('mysql2/promise');

const TABLE_PREFIX = 'mt_';

let _pool = null;

function buildPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const u = new URL(url);
  return mysql.createPool({
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });
}

function getPool() {
  if (_pool) return _pool;
  _pool = buildPool();
  return _pool;
}

function tableName(name) { return TABLE_PREFIX + name; }

async function migrate() {
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    'CREATE TABLE IF NOT EXISTS `' + tableName('products') + '` (' +
    '  id INT NOT NULL PRIMARY KEY,' +
    '  data JSON NOT NULL,' +
    '  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  );
  await pool.query(
    'CREATE TABLE IF NOT EXISTS `' + tableName('leads') + '` (' +
    '  id BIGINT NOT NULL PRIMARY KEY,' +
    '  data JSON NOT NULL,' +
    '  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  );
}

class MysqlStore {
  constructor(name) {
    this.table = tableName(name);
  }

  async read() {
    const pool = getPool();
    if (!pool) return [];
    const [rows] = await pool.query('SELECT data FROM `' + this.table + '` ORDER BY id');
    return rows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
  }

  async write(items) {
    const pool = getPool();
    if (!pool) throw new Error('MySQL not configured');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM `' + this.table + '`');
      if (items.length) {
        const values = items.map(i => [i.id, JSON.stringify(i)]);
        await conn.query('INSERT INTO `' + this.table + '` (id, data) VALUES ?', [values]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}

module.exports = { MysqlStore, migrate, getPool, tableName };
