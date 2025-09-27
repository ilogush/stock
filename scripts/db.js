/*
  Универсальные утилиты работы с БД Supabase Postgres через пулер.
  Использует DATABASE_URL из .env.local

  Команды:
  - Проверка подключения:
      node scripts/db.js check

  - Выполнение SQL строки:
      node scripts/db.js exec "select now()"

  - Выполнение SQL из файла:
      node scripts/db.js file ./path/to/changes.sql

  Замечание по SSL: локально разрешаем self-signed цепочку,
  так как пулер Supabase может отдавать сертификат, не проходящий strict проверку.
  В продакшене лучше убрать ослабление и держать sslmode=require только в URL.
*/

require('dotenv').config({ path: '.env.local' });
const { readFileSync } = require('fs');
const { Client } = require('pg');

function getConnectionString() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!url) {
    console.error('Не найден DATABASE_URL/DIRECT_URL в .env.local');
    process.exit(2);
  }
  return url;
}

async function withClient(run) {
  const client = new Client({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    return await run(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function cmdCheck() {
  await withClient(async (client) => {
    const res = await client.query('select now() as now, current_database() as db, current_user as usr');
    console.log(`OK: now=${new Date(res.rows[0].now).toISOString()} db=${res.rows[0].db} user=${res.rows[0].usr}`);
  });
}

async function cmdExec(sql) {
  if (!sql) {
    console.error('Укажите SQL строкой');
    process.exit(2);
  }
  await withClient(async (client) => {
    const res = await client.query(sql);
    console.log('Выполнено. rows:', res.rowCount ?? 0);
    if (res.rows && res.rows.length) {
      console.table(res.rows);
    }
  });
}

async function cmdFile(path) {
  if (!path) {
    console.error('Укажите путь к .sql файлу');
    process.exit(2);
  }
  const sql = readFileSync(path, 'utf8');
  await cmdExec(sql);
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  try {
    if (command === 'check') return await cmdCheck();
    if (command === 'exec') return await cmdExec(arg);
    if (command === 'file') return await cmdFile(arg);
    console.log('Использование:');
    console.log('  node scripts/db.js check');
    console.log('  node scripts/db.js exec "select now()"');
    console.log('  node scripts/db.js file ./changes.sql');
  } catch (e) {
    console.error('Ошибка:', e.message);
    process.exit(1);
  }
}

main();


