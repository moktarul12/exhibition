/**
 * Capture real app screenshots for the marketing / presentation page.
 * Run: npm run dev (in another terminal), then node scripts/capture-marketing-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'client/public/marketing');
const BASE = process.env.MARKETING_BASE || 'http://localhost:5173';
const API = process.env.MARKETING_API || 'http://localhost:4000';

fs.mkdirSync(OUT, { recursive: true });

async function apiLogin(email, password) {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login failed for ${email}: ${r.status}`);
  const data = await r.json();
  return data.token;
}

async function injectToken(page, token) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('expohub_token', t), token);
}

async function shot(page, name, url, opts = {}) {
  const { wait = 2500, fullPage = false, before } = opts;
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60000 });
  if (before) await before(page);
  await page.waitForTimeout(wait);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage, type: 'png' });
  console.log('✓', name);
  return file;
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Public pages
  await shot(page, '01-home', '/');
  await shot(page, '02-exhibitions', '/exhibitions');
  await shot(page, '03-exhibition-detail', '/exhibitions/bengaluru-tech-summit-2026', {
    wait: 3500,
    before: async (p) => {
      await p.evaluate(() => window.scrollTo(0, 0));
    },
  });
  await shot(page, '04-floor-plan', '/exhibitions/bengaluru-tech-summit-2026', {
    wait: 4000,
    before: async (p) => {
      const tab = p.locator('button, a').filter({ hasText: /^Floor plan$/i }).first();
      if (await tab.count()) await tab.click({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(800);
      await p.evaluate(() => {
        const el = document.getElementById('floor') || document.querySelector('[id*="floor"]');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
    },
  });

  // Visitor-style (logged out is fine for browse)
  await shot(page, '05-exhibitions-live', '/exhibitions?q=tech', { wait: 2000 });

  // Exhibitor
  const exhibitorToken = await apiLogin('exhibitor@expomela.com', 'demo123');
  await injectToken(page, exhibitorToken);
  await shot(page, '06-company-dashboard', '/company-dashboard', { wait: 3000 });
  await shot(page, '07-my-bookings', '/my-bookings', { wait: 2500 });

  // Admin
  const adminToken = await apiLogin('admin@expomela.com', 'admin123');
  await injectToken(page, adminToken);
  await shot(page, '08-admin-dashboard', '/admin', { wait: 3000 });
  await shot(page, '09-floor-editor', '/admin/floor-plan', { wait: 4000 });
  await shot(page, '10-ai-discover', '/admin/discover', { wait: 2500 });

  await browser.close();
  console.log('\nSaved to client/public/marketing/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
