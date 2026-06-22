const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.env.DATABASE_URL || './alerts.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening alerts database:', err.message);
  } else {
    console.log(`Connected to the Alert database at: ${dbPath}`);
    db.run(`CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incidentId TEXT NOT NULL,
      riskLevel TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating alerts table:', err.message);
      } else {
        console.log('Alerts table created or verified.');
      }
    });
  }
});

const run = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const all = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const get = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

module.exports = { db, run, all, get };
