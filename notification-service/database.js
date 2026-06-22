const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.env.DATABASE_URL || './notifications.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening notifications database:', err.message);
  } else {
    console.log(`Connected to the Notification database at: ${dbPath}`);
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alertId TEXT NOT NULL,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      sentAt TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating notifications table:', err.message);
      } else {
        console.log('Notifications table created or verified.');
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
