import { db } from './db.js';

// Full schema for ExpoHub. Uses libSQL (Turso) — SQLite dialect.
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'visitor', -- visitor | exhibitor | admin
    phone TEXT,
    avatar TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    logo TEXT,
    industry TEXT,
    about TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    contact_person TEXT,
    established TEXT,
    employees TEXT,
    youtube_url TEXT,
    brochure_url TEXT,
    documents TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS organizers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    about TEXT,
    website TEXT,
    email TEXT,
    phone TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS exhibitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tagline TEXT,
    industry TEXT NOT NULL,
    about TEXT,
    banner TEXT,
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    lat REAL,
    lng REAL,
    organizer_id INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming', -- live | upcoming | past
    price_from INTEGER DEFAULT 0,
    visitors_today INTEGER DEFAULT 0,
    total_visitors INTEGER DEFAULT 0,
    entry_free INTEGER DEFAULT 0,
    international INTEGER DEFAULT 0,
    government INTEGER DEFAULT 0,
    b2b INTEGER DEFAULT 1,
    early_bird INTEGER DEFAULT 0,
    tags TEXT, -- JSON array of chips (Trending, New Launch, etc.)
    gallery TEXT, -- JSON array of image urls
    youtube_url TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (organizer_id) REFERENCES organizers(id)
  )`,

  `CREATE TABLE IF NOT EXISTS halls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exhibition_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    grid_rows INTEGER NOT NULL DEFAULT 6,
    grid_cols INTEGER NOT NULL DEFAULT 8,
    FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id)
  )`,

  `CREATE TABLE IF NOT EXISTS stalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    zone TEXT DEFAULT 'Standard',
    type TEXT DEFAULT 'Standard',
    status TEXT NOT NULL DEFAULT 'available',
    width INTEGER DEFAULT 3,
    depth INTEGER DEFAULT 3,
    area INTEGER DEFAULT 9,
    price INTEGER NOT NULL DEFAULT 45000,
    grid_row INTEGER NOT NULL,
    grid_col INTEGER NOT NULL,
    booked_by_company_id INTEGER,
    description TEXT,
    facilities TEXT,
    youtube_url TEXT,
    brochure_url TEXT,
    documents TEXT,
    FOREIGN KEY (hall_id) REFERENCES halls(id),
    FOREIGN KEY (booked_by_company_id) REFERENCES companies(id)
  )`,

  `CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    exhibition_id INTEGER NOT NULL,
    stall_id INTEGER NOT NULL,
    company_id INTEGER,
    company_name TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    amount INTEGER NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid
    payment_mode TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id),
    FOREIGN KEY (stall_id) REFERENCES stalls(id)
  )`,

  `CREATE TABLE IF NOT EXISTS exhibitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exhibition_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    stall_code TEXT,
    hall_name TEXT,
    FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )`,

  `CREATE TABLE IF NOT EXISTS seminars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exhibition_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    speaker TEXT,
    day TEXT,
    time TEXT,
    hall TEXT,
    FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id)
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    body TEXT,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    exhibition_id INTEGER,
    from_user_id INTEGER,
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_phone TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread', -- unread | read | replied
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id)
  )`,
];

export async function initSchema() {
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.execute(stmt);
  }
}

export async function dropAll() {
  const tables = [
    'messages', 'notifications', 'seminars', 'exhibitors', 'bookings', 'stalls',
    'halls', 'exhibitions', 'organizers', 'companies', 'users',
  ];
  for (const t of tables) {
    await db.execute(`DROP TABLE IF EXISTS ${t}`);
  }
}
