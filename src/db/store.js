/**
 * Фабрика хранилищ — возвращает либо MySQL-, либо JSON-store
 * в зависимости от env DATABASE_URL.
 */
const path = require('path');
const JsonStore = require('./jsonStore');
const { MysqlStore, migrate } = require('./mysqlStore');

function makeStore(name) {
  if (process.env.DATABASE_URL) {
    return new MysqlStore(name);
  }
  return new JsonStore(path.join(__dirname, '..', '..', 'data', `${name}.json`), []);
}

module.exports = { makeStore, migrate };
