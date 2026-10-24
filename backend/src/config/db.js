const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'taxidb',
  user: process.env.DB_USER || 'taxi_user',
  password: process.env.DB_PASSWORD || 'taxi_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

// Initialize database schema if not already present
const initDatabase = async (retries = 10, delay = 3000) => {
  while (retries > 0) {
    try {
      console.log(`[DB] Attempting database connection (${retries} attempts left)...`);
      const client = await pool.connect();
      try {
        console.log('[DB] Connected to PostgreSQL successfully.');
        const sqlPath = path.join(__dirname, '..', 'migrations', 'init.sql');
        if (fs.existsSync(sqlPath)) {
          const initSql = fs.readFileSync(sqlPath, 'utf8');
          await client.query(initSql);
          console.log('[DB] Migration / Seed script executed successfully.');
        }
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`[DB] Connection failed: ${err.message}`);
      retries -= 1;
      if (retries === 0) {
        throw new Error('[DB] Could not connect to PostgreSQL after multiple retries.');
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initDatabase,
};
