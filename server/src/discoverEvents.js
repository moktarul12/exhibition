/**
 * Discover trade shows / expos for a city that are not already in the DB.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise a curated AI-style catalog.
 */

const CATALOG = [
  // Bengaluru
  { name: 'IISc DeepTech Expo 2026', tagline: 'Research commercialisation & deep tech startups', industry: 'Technology', venue: 'IISc J. N. Tata Auditorium', city: 'Bengaluru', address: 'CV Raman Rd, Bengaluru', start_date: '2026-09-12', end_date: '2026-09-14', status: 'upcoming', price_from: 48000, b2b: true, why: 'Campus research fair — usually not listed on booking platforms yet' },
  { name: 'Garden City Jewellery Exhibition', tagline: 'Retail jewellery & gemstone bazaar', industry: 'Handicrafts', venue: 'Palace Grounds', city: 'Bengaluru', address: 'Jayamahal Main Road', start_date: '2026-08-20', end_date: '2026-08-24', status: 'upcoming', price_from: 32000, b2b: false, entry_free: true, why: 'Seasonal consumer jewellery show' },
  { name: 'Bengaluru EV Mobility Summit', tagline: 'EVs, charging infra & fleet operators', industry: 'Automotive', venue: 'BIEC', city: 'Bengaluru', address: 'Tumkur Road', start_date: '2026-10-08', end_date: '2026-10-10', status: 'upcoming', price_from: 55000, b2b: true, why: 'Regional EV B2B summit' },
  { name: 'Startup Confluence Whitefield', tagline: 'Founder pitching & investor meetups', industry: 'Technology', venue: 'KTPO Trade Centre', city: 'Bengaluru', address: 'Whitefield', start_date: '2026-11-05', end_date: '2026-11-06', status: 'upcoming', price_from: 25000, b2b: true, why: 'Hyperlocal startup expo' },
  { name: 'South India Interior Design Fair', tagline: 'Furniture, decor & home interiors', industry: 'Building & Construction', venue: 'Manpho Convention Centre', city: 'Bengaluru', address: 'Mekhri Circle', start_date: '2026-12-03', end_date: '2026-12-06', status: 'upcoming', price_from: 40000, b2b: true, why: 'Design trade fair for South India' },

  // Mumbai
  { name: 'Mumbai FinTech Conclave 2026', tagline: 'Banking, payments & digital lending', industry: 'Technology', venue: 'Jio World Convention Centre', city: 'Mumbai', address: 'BKC', start_date: '2026-09-18', end_date: '2026-09-19', status: 'upcoming', price_from: 62000, b2b: true, why: 'Finance-sector expo not yet on ExpoMela' },
  { name: 'Goregaon Wedding Expo', tagline: 'Wedding planners, venues & couture', industry: 'Hospitality', venue: 'Bombay Exhibition Centre (NESCO)', city: 'Mumbai', address: 'Goregaon East', start_date: '2026-08-28', end_date: '2026-08-30', status: 'upcoming', price_from: 35000, b2b: false, entry_free: true, why: 'Consumer wedding exhibition' },
  { name: 'Western India Pharma Pack', tagline: 'Pharma packaging & cold chain', industry: 'Medical Equipment', venue: 'Bombay Exhibition Centre (NESCO)', city: 'Mumbai', address: 'Goregaon East', start_date: '2026-10-15', end_date: '2026-10-17', status: 'upcoming', price_from: 50000, b2b: true, why: 'Niche pharma packaging show' },

  // New Delhi
  { name: 'Delhi Defence & Aerospace Meet', tagline: 'Dual-use tech & MSME suppliers', industry: 'Industrial Automation', venue: 'Yashobhoomi (IICC Dwarka)', city: 'New Delhi', address: 'Dwarka', start_date: '2026-09-25', end_date: '2026-09-27', status: 'upcoming', price_from: 70000, b2b: true, international: true, why: 'Defence supplier conclave' },
  { name: 'India Education Fair North', tagline: 'Universities, edtech & coaching', industry: 'Education', venue: 'Bharat Mandapam, Pragati Maidan', city: 'New Delhi', address: 'Pragati Maidan', start_date: '2026-08-14', end_date: '2026-08-16', status: 'upcoming', price_from: 28000, b2b: false, entry_free: true, why: 'Student/parent education fair' },
  { name: 'Capital Crypto & Web3 Summit', tagline: 'Blockchain builders & exchanges', industry: 'Technology', venue: 'Yashobhoomi (IICC Dwarka)', city: 'New Delhi', address: 'Dwarka', start_date: '2026-11-20', end_date: '2026-11-21', status: 'upcoming', price_from: 45000, b2b: true, why: 'Web3 industry meetup' },

  // Hyderabad
  { name: 'Genome Valley Bio Asia Expo', tagline: 'Biotech, diagnostics & clinical trials', industry: 'Medical Equipment', venue: 'HITEX Exhibition Centre', city: 'Hyderabad', address: 'Kondapur', start_date: '2026-09-08', end_date: '2026-09-10', status: 'upcoming', price_from: 52000, b2b: true, international: true, why: 'Life-sciences expo' },
  { name: 'Hyderabad PropTech Showcase', tagline: 'Real estate tech & smart buildings', industry: 'Real Estate', venue: 'HITEX Exhibition Centre', city: 'Hyderabad', address: 'Kondapur', start_date: '2026-10-22', end_date: '2026-10-24', status: 'upcoming', price_from: 38000, b2b: true, why: 'PropTech trade show' },

  // Chennai
  { name: 'Chennai Auto Components Mart', tagline: 'Tier-1/2 suppliers & EV parts', industry: 'Automotive', venue: 'Chennai Trade Centre', city: 'Chennai', address: 'Nandambakkam', start_date: '2026-09-02', end_date: '2026-09-04', status: 'upcoming', price_from: 48000, b2b: true, why: 'Regional auto-components mart' },
  { name: 'Tamil Nadu Textile Machinery Fair', tagline: 'Spinning, weaving & finishing', industry: 'Textile Machinery', venue: 'Chennai Trade Centre', city: 'Chennai', address: 'Nandambakkam', start_date: '2026-11-12', end_date: '2026-11-15', status: 'upcoming', price_from: 42000, b2b: true, why: 'Textile machinery fair' },

  // Pune
  { name: 'Pune Manufacturing Excellence Show', tagline: 'CNC, tooling & shop-floor automation', industry: 'Industrial Automation', venue: 'Auto Cluster Exhibition Centre', city: 'Pune', address: 'Chinchwad', start_date: '2026-08-26', end_date: '2026-08-28', status: 'upcoming', price_from: 46000, b2b: true, why: 'Pune manufacturing expo' },
  { name: 'Deccan Food Ingredients Expo', tagline: 'Spices, additives & processing aids', industry: 'Food & Beverage', venue: 'Auto Cluster Exhibition Centre', city: 'Pune', address: 'Chinchwad', start_date: '2026-10-01', end_date: '2026-10-03', status: 'upcoming', price_from: 34000, b2b: true, why: 'Ingredients-focused F&B show' },

  // Other
  { name: 'Ahmedabad Solar & Storage Expo', tagline: 'Modules, BESS & EPC', industry: 'Renewable Energy', venue: 'Helipad Exhibition Centre', city: 'Ahmedabad', address: 'SG Highway', start_date: '2026-09-16', end_date: '2026-09-18', status: 'upcoming', price_from: 50000, b2b: true, why: 'Gujarat energy expo' },
  { name: 'Kolkata Print & Pack East', tagline: 'Offset, digital & flexible packaging', industry: 'Printing & Packaging', venue: 'Biswa Bangla Convention Centre', city: 'Kolkata', address: 'New Town', start_date: '2026-10-09', end_date: '2026-10-11', status: 'upcoming', price_from: 36000, b2b: true, why: 'East India print expo' },
  { name: 'Jaipur Heritage Handicraft Mela', tagline: 'Artisan crafts & export buyers', industry: 'Handicrafts', venue: 'JECC Sitapura', city: 'Jaipur', address: 'Sitapura', start_date: '2026-11-01', end_date: '2026-11-05', status: 'upcoming', price_from: 22000, b2b: true, entry_free: true, why: 'Heritage handicraft mela' },
];

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function cityMatch(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // aliases
  const aliases = {
    bangalore: 'bengaluru',
    bengaluru: 'bengaluru',
    delhi: 'new delhi',
    'new delhi': 'new delhi',
    'noida': 'new delhi',
    gurgaon: 'new delhi',
    gurugram: 'new delhi',
  };
  const ax = aliases[x] || x;
  const ay = aliases[y] || y;
  return ax === ay || x.includes(y) || y.includes(x);
}

function alreadyListed(name, existingNames) {
  const n = norm(name);
  return existingNames.some((e) => {
    const m = norm(e);
    return m === n || m.includes(n) || n.includes(m);
  });
}

async function discoverWithOpenAI(city, existingNames) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const prompt = `You are an exhibition discovery agent for India. List upcoming or live trade shows, expos, and fairs in "${city}" (and metro area) in 2026–2027.
Exclude any event already in this list: ${existingNames.slice(0, 40).join('; ') || '(none)'}.
Return ONLY a JSON array of objects with keys:
name, tagline, industry, venue, city, address, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), status ("live"|"upcoming"), price_from (number INR stall estimate), b2b (boolean), entry_free (boolean), why (one sentence why it's relevant).
Max 8 events. Use realistic venue names for that city.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return JSON as {"events":[...]} only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  const events = Array.isArray(parsed) ? parsed : (parsed.events || []);
  return events.map((e) => ({
    name: e.name,
    tagline: e.tagline || '',
    industry: e.industry || 'Technology',
    venue: e.venue || '',
    city: e.city || city,
    address: e.address || '',
    start_date: e.start_date,
    end_date: e.end_date,
    status: ['live', 'upcoming', 'past'].includes(e.status) ? e.status : 'upcoming',
    price_from: Number(e.price_from) || 45000,
    b2b: e.b2b !== false,
    entry_free: !!e.entry_free,
    international: !!e.international,
    why: e.why || 'Discovered by AI agent',
    source: 'openai',
  })).filter((e) => e.name && e.venue && e.start_date && e.end_date);
}

function discoverFromCatalog(city, existingNames) {
  return CATALOG
    .filter((e) => cityMatch(e.city, city))
    .filter((e) => !alreadyListed(e.name, existingNames))
    .map((e) => ({ ...e, source: 'catalog' }));
}

export async function discoverEvents(city, existingNames = []) {
  const cleanCity = String(city || '').trim();
  if (!cleanCity) throw new Error('City is required');

  let events = [];
  let mode = 'catalog';
  try {
    const ai = await discoverWithOpenAI(cleanCity, existingNames);
    if (ai?.length) {
      events = ai.filter((e) => !alreadyListed(e.name, existingNames));
      mode = 'openai';
    }
  } catch (err) {
    console.warn('AI discover fallback:', err.message);
  }

  if (!events.length) {
    events = discoverFromCatalog(cleanCity, existingNames);
    mode = 'catalog';
  }

  // If city has no catalog hits, invent a few city-tagged suggestions from generic templates
  if (!events.length) {
    events = [
      {
        name: `${cleanCity} Industry Expo 2026`,
        tagline: `Multi-industry B2B trade show in ${cleanCity}`,
        industry: 'Industrial Automation',
        venue: `${cleanCity} Convention Centre`,
        city: cleanCity,
        address: cleanCity,
        start_date: '2026-10-10',
        end_date: '2026-10-12',
        status: 'upcoming',
        price_from: 40000,
        b2b: true,
        why: `Generated suggestion for ${cleanCity} — verify before publishing`,
        source: 'generated',
      },
      {
        name: `${cleanCity} Lifestyle & Retail Fair`,
        tagline: 'Consumer retail, craft and lifestyle brands',
        industry: 'Handicrafts',
        venue: `${cleanCity} Exhibition Grounds`,
        city: cleanCity,
        address: cleanCity,
        start_date: '2026-11-14',
        end_date: '2026-11-16',
        status: 'upcoming',
        price_from: 28000,
        b2b: false,
        entry_free: true,
        why: `Consumer fair suggestion for ${cleanCity}`,
        source: 'generated',
      },
    ].filter((e) => !alreadyListed(e.name, existingNames));
  }

  return { city: cleanCity, mode, openai_configured: !!process.env.OPENAI_API_KEY, events };
}
