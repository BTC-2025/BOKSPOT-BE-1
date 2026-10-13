const { Client } = require('pg');

async function setup() {
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  await adminClient.connect();
  try {
    await adminClient.query('CREATE DATABASE bokspot_db');
    console.log('Created bokspot_db');
  } catch (err) {
    console.log('Database notice/error:', err.message);
  }
  await adminClient.end();

  const dbClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'bokspot_db'
  });
  await dbClient.connect();
  try {
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('Extensions pgcrypto & uuid-ossp enabled!');
  } catch (err) {
    console.log('Extension notice/error:', err.message);
  }
  await dbClient.end();
}

setup().catch(console.error);
