/**
 * Conexão com MySQL via Knex.
 */
const config = require('../config');

let db = null;

function initDatabase() {
  if (db) return true;

  try {
    // Garante driver disponível no bundle serverless (Vercel)
    require('mysql2');
    const knex = require('knex');

    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const poolMax = isServerless
      ? Math.min(config.db.poolMax, 2)
      : config.db.poolMax;

    db = knex({
      client: 'mysql2',
      connection: {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        charset: 'utf8mb4',
        connectTimeout: 10_000,
      },
      pool: {
        min: isServerless ? 0 : config.db.poolMin,
        max: poolMax,
      },
    });
    console.log(`  ✔ MySQL configurado (${config.db.host}/${config.db.database})`);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ⚠ MySQL sicaf-agent indisponível: ${msg}`);
    db = null;
    return false;
  }
}

function getDb() {
  return db;
}

async function closeDatabase() {
  if (db) {
    await db.destroy();
    db = null;
  }
}

module.exports = { initDatabase, getDb, closeDatabase };
