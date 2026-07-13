import { createClient } from '@libsql/client';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

let client;

if (tursoUrl) {
  // Live Turso (or any remote libSQL) connection
  client = createClient({ url: tursoUrl, authToken: tursoToken });
  console.log(`[db] Connected to live Turso: ${tursoUrl}`);
} else {
  // Local libSQL file fallback (same engine as Turso)
  const dataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const localUrl = process.env.LOCAL_DB_FILE || `file:${path.join(dataDir, 'expohub.db')}`;
  client = createClient({ url: localUrl });
  console.log(`[db] Using local libSQL file: ${localUrl}`);
}

export const db = client;

export async function query(sql, args = []) {
  return db.execute({ sql, args });
}
