import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { initSchema } from './schema.js';
import { signToken, authRequired, requireRole, authOptional } from './auth.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' }));
app.use(express.json());

const rows = (r) => r.rows;
const one = (r) => r.rows[0] || null;
const parseJSON = (v, fallback) => { try { return JSON.parse(v); } catch { return fallback; } };

function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}
function mapExhibition(e) {
  return { ...e, tags: parseJSON(e.tags, []), gallery: parseJSON(e.gallery, []) };
}

// ---------------- Health ----------------
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ExpoHub API' }));

// ---------------- Auth ----------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'visitor', phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    const allowedRoles = ['visitor', 'exhibitor', 'admin'];
    const safeRole = allowedRoles.includes(role) ? role : 'visitor';
    const exists = one(await db.execute({ sql: 'SELECT id FROM users WHERE email=?', args: [email] }));
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 10);
    const r = await db.execute({
      sql: 'INSERT INTO users (name,email,password_hash,role,phone) VALUES (?,?,?,?,?)',
      args: [name, email, hash, safeRole, phone || null],
    });
    const user = one(await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [Number(r.lastInsertRowid)] }));
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = one(await db.execute({ sql: 'SELECT * FROM users WHERE email=?', args: [email] }));
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = one(await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [req.user.id] }));
  const company = one(await db.execute({ sql: 'SELECT * FROM companies WHERE user_id=?', args: [req.user.id] }));
  res.json({ user: publicUser(user), company });
});

// ---------------- Exhibitions ----------------
app.get('/api/exhibitions', async (req, res) => {
  const { status, industry, city, q, lat, lng, radius_km } = req.query;
  let sql = 'SELECT * FROM exhibitions WHERE 1=1';
  const args = [];
  if (status) { sql += ' AND status=?'; args.push(status); }
  if (industry) { sql += ' AND industry=?'; args.push(industry); }
  if (city) { sql += ' AND city=?'; args.push(city); }
  if (q) { sql += ' AND (name LIKE ? OR industry LIKE ? OR venue LIKE ? OR city LIKE ?)'; const like = `%${q}%`; args.push(like, like, like, like); }
  sql += " ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, start_date";
  const list = rows(await db.execute({ sql, args }));
  const userLat = lat != null ? Number(lat) : null;
  const userLng = lng != null ? Number(lng) : null;
  const maxKm = radius_km != null ? Number(radius_km) : null;
  const haversine = (aLat, aLng, bLat, bLng) => {
    const R = 6371;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLng = (bLng - aLng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const withCounts = [];
  for (const e of list) {
    let distance_km = null;
    if (userLat != null && userLng != null && e.lat != null && e.lng != null) {
      distance_km = Math.round(haversine(userLat, userLng, Number(e.lat), Number(e.lng)) * 10) / 10;
      if (maxKm != null && distance_km > maxKm) continue;
    }
    const c = one(await db.execute({
      sql: `SELECT COUNT(*) total, SUM(CASE WHEN s.status='available' THEN 1 ELSE 0 END) available
            FROM stalls s JOIN halls h ON s.hall_id=h.id WHERE h.exhibition_id=?`,
      args: [e.id],
    }));
    const exhibitorCount = one(await db.execute({ sql: 'SELECT COUNT(*) n FROM exhibitors WHERE exhibition_id=?', args: [e.id] }));
    withCounts.push({
      ...mapExhibition(e),
      total_stalls: Number(c.total || 0),
      available_stalls: Number(c.available || 0),
      companies: Number(exhibitorCount.n || 0),
      distance_km,
    });
  }
  if (userLat != null && userLng != null) {
    withCounts.sort((a, b) => (a.distance_km ?? 99999) - (b.distance_km ?? 99999));
  }
  res.json(withCounts);
});

app.get('/api/exhibitions/meta/filters', async (_req, res) => {
  const industries = rows(await db.execute('SELECT DISTINCT industry FROM exhibitions ORDER BY industry')).map((r) => r.industry);
  const cities = rows(await db.execute('SELECT DISTINCT city FROM exhibitions ORDER BY city')).map((r) => r.city);
  res.json({ industries, cities });
});

app.get('/api/exhibitions/:slug', async (req, res) => {
  const e = one(await db.execute({ sql: 'SELECT * FROM exhibitions WHERE slug=?', args: [req.params.slug] }));
  if (!e) return res.status(404).json({ error: 'Exhibition not found' });
  const organizer = one(await db.execute({ sql: 'SELECT * FROM organizers WHERE id=?', args: [e.organizer_id] }));
  const counts = one(await db.execute({
    sql: `SELECT COUNT(*) total,
            SUM(CASE WHEN s.status='available' THEN 1 ELSE 0 END) available,
            SUM(CASE WHEN s.status='booked' THEN 1 ELSE 0 END) booked
          FROM stalls s JOIN halls h ON s.hall_id=h.id WHERE h.exhibition_id=?`,
    args: [e.id],
  }));
  const halls = rows(await db.execute({ sql: 'SELECT * FROM halls WHERE exhibition_id=? ORDER BY id', args: [e.id] }));
  const seminars = rows(await db.execute({ sql: 'SELECT * FROM seminars WHERE exhibition_id=? ORDER BY id', args: [e.id] }));
  const exhibitors = rows(await db.execute({
    sql: `SELECT ex.stall_code, ex.hall_name, c.* FROM exhibitors ex JOIN companies c ON ex.company_id=c.id WHERE ex.exhibition_id=?`,
    args: [e.id],
  }));
  res.json({
    ...mapExhibition(e), organizer, halls, seminars, exhibitors,
    total_stalls: Number(counts.total || 0),
    available_stalls: Number(counts.available || 0),
    booked_stalls: Number(counts.booked || 0),
  });
});

// ---------------- Floor plan ----------------
app.get('/api/halls/:hallId/stalls', async (req, res) => {
  const stalls = rows(await db.execute({
    sql: `SELECT s.*, c.name company_name, c.logo company_logo FROM stalls s
          LEFT JOIN companies c ON s.booked_by_company_id=c.id WHERE s.hall_id=? ORDER BY s.grid_row, s.grid_col`,
    args: [req.params.hallId],
  }));
  res.json(stalls);
});

app.get('/api/stalls/:id', async (req, res) => {
  const s = one(await db.execute({
    sql: `SELECT s.*, h.name hall_name, h.exhibition_id, c.name company_name, c.logo company_logo
          FROM stalls s JOIN halls h ON s.hall_id=h.id
          LEFT JOIN companies c ON s.booked_by_company_id=c.id WHERE s.id=?`,
    args: [req.params.id],
  }));
  if (!s) return res.status(404).json({ error: 'Stall not found' });
  // nearby stalls (same hall)
  const nearby = rows(await db.execute({
    sql: `SELECT code, status FROM stalls WHERE hall_id=? AND id!=? ORDER BY grid_row, grid_col LIMIT 4`,
    args: [s.hall_id, s.id],
  }));
  res.json({
    ...s,
    facilities: parseJSON(s.facilities, []),
    documents: parseJSON(s.documents, []),
    nearby,
  });
});

// ---------------- Bookings ----------------
app.post('/api/bookings', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'exhibitor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only exhibitors can book stalls' });
    }
    const { stall_id, company_name, contact_person, contact_email, contact_phone, payment_mode = 'UPI' } = req.body;
    const stall = one(await db.execute({
      sql: `SELECT s.*, h.exhibition_id FROM stalls s JOIN halls h ON s.hall_id=h.id WHERE s.id=?`,
      args: [stall_id],
    }));
    if (!stall) return res.status(404).json({ error: 'Stall not found' });
    if (stall.status !== 'available') return res.status(409).json({ error: 'Stall is no longer available' });

    let companyId = null;
    const existingCompany = one(await db.execute({ sql: 'SELECT * FROM companies WHERE user_id=?', args: [req.user.id] }));
    if (existingCompany) companyId = existingCompany.id;

    const reference = `EXH-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
    const r = await db.execute({
      sql: `INSERT INTO bookings (reference,user_id,exhibition_id,stall_id,company_id,company_name,contact_person,contact_email,contact_phone,amount,payment_status,payment_mode,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [reference, req.user.id, stall.exhibition_id, stall_id, companyId,
        company_name || existingCompany?.name || req.user.name, contact_person || req.user.name,
        contact_email || req.user.email, contact_phone || null, stall.price, 'paid', payment_mode, 'confirmed'],
    });
    await db.execute({ sql: `UPDATE stalls SET status='booked', booked_by_company_id=? WHERE id=?`, args: [companyId, stall_id] });
    const booking = one(await db.execute({ sql: 'SELECT * FROM bookings WHERE id=?', args: [Number(r.lastInsertRowid)] }));
    res.json(booking);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Booking failed' }); }
});

app.get('/api/bookings/mine', authRequired, async (req, res) => {
  const list = rows(await db.execute({
    sql: `SELECT b.*, e.name exhibition_name, e.banner exhibition_banner, e.venue, e.city, e.start_date, e.end_date, e.slug,
                 s.code stall_code, h.name hall_name
          FROM bookings b
          JOIN exhibitions e ON b.exhibition_id=e.id
          JOIN stalls s ON b.stall_id=s.id
          JOIN halls h ON s.hall_id=h.id
          WHERE b.user_id=? ORDER BY b.created_at DESC`,
    args: [req.user.id],
  }));
  res.json(list);
});

// ---------------- Companies ----------------
app.get('/api/companies', async (req, res) => {
  const { q, city, industry } = req.query;
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const args = [];
  if (q) { sql += ' AND (name LIKE ? OR industry LIKE ? OR city LIKE ?)'; const like = `%${q}%`; args.push(like, like, like); }
  if (city) { sql += ' AND city=?'; args.push(city); }
  if (industry) { sql += ' AND industry=?'; args.push(industry); }
  sql += ' ORDER BY name';
  res.json(rows(await db.execute({ sql, args })));
});

app.get('/api/companies/:id', async (req, res) => {
  const c = one(await db.execute({ sql: 'SELECT * FROM companies WHERE id=?', args: [req.params.id] }));
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const history = rows(await db.execute({
    sql: `SELECT DISTINCT e.name, e.start_date, e.end_date, ex.hall_name, ex.stall_code, e.slug, e.status
          FROM exhibitors ex JOIN exhibitions e ON ex.exhibition_id=e.id WHERE ex.company_id=? ORDER BY e.start_date DESC`,
    args: [req.params.id],
  }));
  res.json({
    ...c,
    documents: (() => { try { return JSON.parse(c.documents || '[]'); } catch { return []; } })(),
    history,
  });
});

// ---------------- Messages (visitor → company) ----------------
app.post('/api/messages', authOptional, async (req, res) => {
  try {
    const { company_id, exhibition_id, from_name, from_email, from_phone, subject, body } = req.body;
    if (!company_id || !from_name || !from_email || !subject || !body) {
      return res.status(400).json({ error: 'company_id, from_name, from_email, subject and body are required' });
    }
    const company = one(await db.execute({ sql: 'SELECT * FROM companies WHERE id=?', args: [company_id] }));
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const r = await db.execute({
      sql: `INSERT INTO messages (company_id,exhibition_id,from_user_id,from_name,from_email,from_phone,subject,body,status)
            VALUES (?,?,?,?,?,?,?,?,?)`,
      args: [company_id, exhibition_id || null, req.user?.id || null, from_name, from_email, from_phone || null, subject, body, 'unread'],
    });
    // notify company owner if linked
    if (company.user_id) {
      await db.execute({
        sql: `INSERT INTO notifications (user_id,title,body,type) VALUES (?,?,?,?)`,
        args: [company.user_id, 'New enquiry received', `${from_name}: ${subject}`, 'info'],
      });
    }
    const msg = one(await db.execute({ sql: 'SELECT * FROM messages WHERE id=?', args: [Number(r.lastInsertRowid)] }));
    res.json(msg);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to send message' }); }
});

app.get('/api/messages/inbox', authRequired, async (req, res) => {
  const company = one(await db.execute({ sql: 'SELECT * FROM companies WHERE user_id=?', args: [req.user.id] }));
  if (!company && req.user.role !== 'admin') return res.status(403).json({ error: 'No company linked to this account' });
  const list = rows(await db.execute({
    sql: `SELECT m.*, c.name company_name, e.name exhibition_name, e.slug exhibition_slug
          FROM messages m
          JOIN companies c ON m.company_id=c.id
          LEFT JOIN exhibitions e ON m.exhibition_id=e.id
          WHERE ${req.user.role === 'admin' ? '1=1' : 'm.company_id=?'}
          ORDER BY m.created_at DESC LIMIT 50`,
    args: req.user.role === 'admin' ? [] : [company.id],
  }));
  res.json(list);
});

app.patch('/api/messages/:id/read', authRequired, async (req, res) => {
  await db.execute({ sql: `UPDATE messages SET status='read' WHERE id=?`, args: [req.params.id] });
  res.json({ ok: true });
});

// ---------------- Notifications ----------------
app.get('/api/notifications', authRequired, async (req, res) => {
  const list = rows(await db.execute({
    sql: `SELECT * FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY created_at DESC LIMIT 20`,
    args: [req.user.id],
  }));
  res.json(list);
});

// ---------------- Stats (Home + Dashboard) ----------------
app.get('/api/stats', async (_req, res) => {
  const q = async (sql) => Number(one(await db.execute(sql))?.n || 0);
  res.json({
    live: await q("SELECT COUNT(*) n FROM exhibitions WHERE status='live'"),
    upcoming: await q("SELECT COUNT(*) n FROM exhibitions WHERE status='upcoming'"),
    companies: await q('SELECT COUNT(*) n FROM companies'),
    organizers: await q('SELECT COUNT(*) n FROM organizers'),
    visitors: Number(one(await db.execute('SELECT SUM(total_visitors) n FROM exhibitions'))?.n || 0),
    bookings: await q('SELECT COUNT(*) n FROM bookings'),
  });
});

// ---------------- Admin dashboard ----------------
app.get('/api/admin/dashboard', authRequired, requireRole('admin'), async (_req, res) => {
  const q = async (sql) => Number(one(await db.execute(sql))?.n || 0);
  const revenue = Number(one(await db.execute("SELECT SUM(amount) n FROM bookings WHERE payment_status='paid'"))?.n || 0);
  const topExhibitions = rows(await db.execute(`
    SELECT e.name, COUNT(b.id) bookings, SUM(b.amount) revenue
    FROM exhibitions e LEFT JOIN bookings b ON b.exhibition_id=e.id
    GROUP BY e.id ORDER BY bookings DESC LIMIT 5`));
  const recentBookings = rows(await db.execute(`
    SELECT b.reference, b.company_name, b.amount, b.payment_status, b.created_at, e.name exhibition_name, s.code stall_code
    FROM bookings b JOIN exhibitions e ON b.exhibition_id=e.id JOIN stalls s ON b.stall_id=s.id
    ORDER BY b.created_at DESC LIMIT 8`));
  const bookingsByStatus = rows(await db.execute(`
    SELECT s.status, COUNT(*) n FROM stalls s GROUP BY s.status`));
  res.json({
    totals: {
      exhibitions: await q('SELECT COUNT(*) n FROM exhibitions'),
      live: await q("SELECT COUNT(*) n FROM exhibitions WHERE status='live'"),
      upcoming: await q("SELECT COUNT(*) n FROM exhibitions WHERE status='upcoming'"),
      past: await q("SELECT COUNT(*) n FROM exhibitions WHERE status='past'"),
      bookings: await q('SELECT COUNT(*) n FROM bookings'),
      companies: await q('SELECT COUNT(*) n FROM companies'),
      availableStalls: await q("SELECT COUNT(*) n FROM stalls WHERE status='available'"),
      revenue,
    },
    topExhibitions, recentBookings, bookingsByStatus,
  });
});

app.get('/api/admin/exhibitions', authRequired, requireRole('admin'), async (_req, res) => {
  const list = rows(await db.execute(`
    SELECT e.*, COUNT(DISTINCT b.id) bookings,
      (SELECT COUNT(*) FROM stalls s JOIN halls h ON s.hall_id=h.id WHERE h.exhibition_id=e.id) total_stalls,
      (SELECT COUNT(*) FROM stalls s JOIN halls h ON s.hall_id=h.id WHERE h.exhibition_id=e.id AND s.status='available') available_stalls
    FROM exhibitions e LEFT JOIN bookings b ON b.exhibition_id=e.id GROUP BY e.id
    ORDER BY e.start_date DESC`));
  res.json(list.map(mapExhibition));
});

// Update stall status from admin floor-plan editor
app.patch('/api/admin/stalls/:id', authRequired, requireRole('admin'), async (req, res) => {
  const { status, price } = req.body;
  const allowed = ['available', 'reserved', 'booked', 'sponsor', 'blocked'];
  const s = one(await db.execute({ sql: 'SELECT * FROM stalls WHERE id=?', args: [req.params.id] }));
  if (!s) return res.status(404).json({ error: 'Stall not found' });
  const newStatus = allowed.includes(status) ? status : s.status;
  const newPrice = price != null ? price : s.price;
  await db.execute({ sql: 'UPDATE stalls SET status=?, price=? WHERE id=?', args: [newStatus, newPrice, req.params.id] });
  res.json({ ...s, status: newStatus, price: newPrice });
});

const PORT = process.env.PORT || 4000;
initSchema()
  .then(() => app.listen(PORT, () => console.log(`[api] ExpoHub API running on http://localhost:${PORT}`)))
  .catch((e) => { console.error('Failed to init schema', e); process.exit(1); });
