/**
 * Простое потокобезопасное хранилище в JSON-файле.
 * Универсальный fallback, если БД ещё не подключена.
 */
const fs = require('fs');
const path = require('path');

class JsonStore {
  constructor(filePath, defaultValue = []) {
    this.filePath = filePath;
    this.defaultValue = defaultValue;
    this._writeQueue = Promise.resolve();
    this._ensure();
  }

  _ensure() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(this.defaultValue, null, 2), 'utf8');
    }
  }

  read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('[jsonStore] read error:', e.message);
      return this.defaultValue;
    }
  }

  write(data) {
    this._writeQueue = this._writeQueue.then(() => new Promise((resolve, reject) => {
      const tmp = this.filePath + '.tmp';
      fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8', (err) => {
        if (err) return reject(err);
        fs.rename(tmp, this.filePath, (err2) => err2 ? reject(err2) : resolve());
      });
    }));
    return this._writeQueue;
  }
}

module.exports = JsonStore;
