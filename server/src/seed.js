import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { initSchema, dropAll } from './schema.js';

const img = (id, w = 800, h = 500) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
const logo = (name, color = '2563eb') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=256&bold=true&format=png`;

// Exhibition banner photos (Unsplash IDs)
  const banners = {
    plast: 'photo-1581091226825-a6a2a5aee158',
    food: 'photo-1504674900247-0877df9cc836',
    auto: 'photo-1565043666747-69f6646db940',
    textile: 'photo-1558769132-cb1aea458c5e',
    energy: 'photo-1509391366360-2e959784a276',
    print: 'photo-1503694978374-8a2fa686963a',
    medical: 'photo-1576091160399-112ba8d25d1d',
    tech: 'photo-1518770660439-4636190af475',
    craft: 'photo-1452860606245-08befc0ff44b',
    hotel: 'photo-1566073771259-6a8506099945',
    logistics: 'photo-1586528116311-ad8dd3c8310d',
    home: 'photo-1558002038-1055907df827',
  };
const galleryPhotos = [
  'photo-1540575467063-178a50c2df87',
  'photo-1511578314322-379afb476865',
  'photo-1505373877841-8d25f7d46678',
  'photo-1492684223066-81342ee5ff30',
  'photo-1560523159-4a9692d222f9',
  'photo-1591115765373-5207764f72e7',
];

async function run() {
  console.log('[seed] Resetting database...');
  await dropAll();
  await initSchema();

  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

  // ---------------- Users ----------------
  const pass = (p) => bcrypt.hashSync(p, 10);
  const users = [
    { name: 'Admin Organizer', email: 'admin@expohub.com', password: pass('admin123'), role: 'admin', phone: '+91 98765 00001', avatar: logo('Admin', '7c3aed') },
    { name: 'Rajesh Verma', email: 'exhibitor@expohub.com', password: pass('demo123'), role: 'exhibitor', phone: '+91 98765 00002', avatar: logo('Rajesh Verma', '2563eb') },
    { name: 'Rohit Sharma', email: 'visitor@expohub.com', password: pass('demo123'), role: 'visitor', phone: '+91 98765 00003', avatar: logo('Rohit Sharma', '059669') },
    { name: 'Priya Nair', email: 'priya@abcmachinery.com', password: pass('demo123'), role: 'exhibitor', phone: '+91 98765 00004', avatar: logo('Priya Nair', 'db2777') },
  ];
  const userIds = {};
  for (const u of users) {
    const r = await db.execute({
      sql: `INSERT INTO users (name,email,password_hash,role,phone,avatar) VALUES (?,?,?,?,?,?)`,
      args: [u.name, u.email, u.password, u.role, u.phone, u.avatar],
    });
    userIds[u.email] = Number(r.lastInsertRowid);
  }

  // ---------------- Companies ----------------
  const companies = [
    { user: 'exhibitor@expohub.com', name: 'ABC Machinery Pvt. Ltd.', color: '1e3a8a', industry: 'Manufacturing & Packaging', about: 'ABC Machinery Pvt. Ltd. is a leading manufacturer of high quality plastic processing machinery with 20+ years of experience serving global markets.', website: 'www.abcmachinery.com', email: 'info@abcmachinery.com', phone: '+91 20 2456 5678', address: '12, Industrial Area, Phase 2, Pune', city: 'Pune', contact: 'Rajesh Verma', established: '2004', employees: '100-250' },
    { user: 'priya@abcmachinery.com', name: 'GreenLeaf Foods', color: '059669', industry: 'Food & Beverage', about: 'Organic and processed food solutions for retail and HORECA. Trusted by 500+ brands across India.', website: 'www.greenleaffoods.in', email: 'hello@greenleaffoods.in', phone: '+91 22 4001 2233', address: '88, MIDC, Andheri East, Mumbai', city: 'Mumbai', contact: 'Priya Nair', established: '2011', employees: '50-100' },
    { user: null, name: 'RoboTech Automation', color: 'ea580c', industry: 'Industrial Automation', about: 'Robotic arms, PLC systems and smart factory integration.', website: 'www.robotech.io', email: 'sales@robotech.io', phone: '+91 80 5566 7788', address: 'Whitefield, Bengaluru', city: 'Bengaluru', contact: 'Arun Kumar', established: '2016', employees: '25-50' },
    { user: null, name: 'SolarNova Energy', color: 'f59e0b', industry: 'Renewable Energy', about: 'Solar EPC and rooftop solutions for industrial clients.', website: 'www.solarnova.co', email: 'info@solarnova.co', phone: '+91 79 3344 5566', address: 'GIDC, Ahmedabad', city: 'Ahmedabad', contact: 'Meera Shah', established: '2013', employees: '100-250' },
    { user: null, name: 'PrintPro Graphics', color: '7c3aed', industry: 'Printing & Packaging', about: 'Digital and offset printing machinery distributor.', website: 'www.printpro.in', email: 'contact@printpro.in', phone: '+91 44 2233 1100', address: 'Guindy, Chennai', city: 'Chennai', contact: 'Karthik R', established: '2009', employees: '25-50' },
    { user: null, name: 'MediCare Devices', color: 'dc2626', industry: 'Medical Equipment', about: 'Diagnostic and surgical equipment manufacturer.', website: 'www.medicaredev.com', email: 'info@medicaredev.com', phone: '+91 40 6677 8899', address: 'HITEC City, Hyderabad', city: 'Hyderabad', contact: 'Dr. Sunita Rao', established: '2007', employees: '250-500' },
    { user: null, name: 'TextileWeave Industries', color: '0891b2', industry: 'Textile Machinery', about: 'Weaving and spinning machinery solutions.', website: 'www.textileweave.in', email: 'sales@textileweave.in', phone: '+91 261 445 5667', address: 'Pandesara, Surat', city: 'Surat', contact: 'Nilesh Patel', established: '2002', employees: '100-250' },
    { user: null, name: 'CloudNine Software', color: '2563eb', industry: 'Technology', about: 'ERP and IoT platforms for manufacturing.', website: 'www.cloudnine.tech', email: 'hi@cloudnine.tech', phone: '+91 20 7788 9900', address: 'Hinjewadi, Pune', city: 'Pune', contact: 'Sneha Joshi', established: '2018', employees: '50-100' },
    { user: null, name: 'Bharat Polymers', color: 'be123c', industry: 'Plastics', about: 'Injection moulding and polymer compounds for automotive and consumer goods.', website: 'www.bharatpolymers.in', email: 'sales@bharatpolymers.in', phone: '+91 11 4455 6677', address: 'Okhla Industrial Area', city: 'New Delhi', contact: 'Vikram Malhotra', established: '1998', employees: '250-500' },
    { user: null, name: 'SpiceRoute Foods', color: 'c2410c', industry: 'Food & Beverage', about: 'Ready-to-cook and packaged spices for modern retail.', website: 'www.spiceroute.in', email: 'orders@spiceroute.in', phone: '+91 22 5566 7788', address: 'Vashi, Navi Mumbai', city: 'Mumbai', contact: 'Ananya Desai', established: '2014', employees: '50-100' },
    { user: null, name: 'AeroLift Logistics', color: '0369a1', industry: 'Logistics', about: 'Exhibition logistics, stall freight and last-mile booth setup services.', website: 'www.aerolift.in', email: 'ops@aerolift.in', phone: '+91 80 2233 4455', address: 'Electronic City', city: 'Bengaluru', contact: 'Kiran Shetty', established: '2010', employees: '100-250' },
    { user: null, name: 'NeoVision Displays', color: '4c1d95', industry: 'AV & Displays', about: 'LED walls, interactive kiosks and AV rental for exhibitions.', website: 'www.neovision.tv', email: 'book@neovision.tv', phone: '+91 44 7788 9900', address: 'OMR', city: 'Chennai', contact: 'Lakshmi V', established: '2015', employees: '25-50' },
    { user: null, name: 'Gujarat Solar Works', color: 'ca8a04', industry: 'Renewable Energy', about: 'Module manufacturing and industrial solar parks.', website: 'www.gujaratsolar.co', email: 'info@gujaratsolar.co', phone: '+91 79 2200 1100', address: 'Sanand', city: 'Ahmedabad', contact: 'Hardik Patel', established: '2012', employees: '500+' },
    { user: null, name: 'Hyderabad MedSys', color: 'b91c1c', industry: 'Medical Equipment', about: 'Hospital furniture and diagnostic kits for B2B buyers.', website: 'www.hydmedsys.com', email: 'sales@hydmedsys.com', phone: '+91 40 3344 5566', address: 'Genome Valley', city: 'Hyderabad', contact: 'Dr. Anil Reddy', established: '2008', employees: '100-250' },
    { user: null, name: 'Jaipur Craft Collective', color: '9a3412', industry: 'Handicrafts', about: 'Handcrafted décor and giftware exporters from Rajasthan.', website: 'www.jaipurcraft.in', email: 'hello@jaipurcraft.in', phone: '+91 141 5566 7788', address: 'Sitapura', city: 'Jaipur', contact: 'Pooja Agarwal', established: '2005', employees: '50-100' },
    { user: null, name: 'Kolkata Print House', color: '1d4ed8', industry: 'Printing & Packaging', about: 'Commercial printing, labels and flexible packaging.', website: 'www.kolkataprint.in', email: 'press@kolkataprint.in', phone: '+91 33 4455 8899', address: 'Salt Lake', city: 'Kolkata', contact: 'Subir Banerjee', established: '1995', employees: '100-250' },
    { user: null, name: 'Indore Auto Components', color: '374151', industry: 'Automotive', about: 'OEM auto parts and casting solutions for EV and ICE.', website: 'www.indoreauto.com', email: 'sales@indoreauto.com', phone: '+91 731 6677 8899', address: 'Pithampur', city: 'Indore', contact: 'Amit Jain', established: '2001', employees: '250-500' },
    { user: null, name: 'Goa Hospitality Supplies', color: '0f766e', industry: 'Hospitality', about: 'Kitchen equipment and banquet solutions for hotels.', website: 'www.goahospitality.in', email: 'sales@goahospitality.in', phone: '+91 832 7788 9900', address: 'Verna', city: 'Goa', contact: 'Maria Fernandes', established: '2013', employees: '25-50' },
    { user: null, name: 'Lucknow Silk Looms', color: '9f1239', industry: 'Textile Machinery', about: 'Handloom and powerloom machinery for silk & cotton.', website: 'www.lucknowsilk.in', email: 'loom@lucknowsilk.in', phone: '+91 522 3344 5566', address: 'Chowk', city: 'Lucknow', contact: 'Farhan Siddiqui', established: '1990', employees: '100-250' },
    { user: null, name: 'Chandigarh Smart Homes', color: '4338ca', industry: 'Home Automation', about: 'Smart switches, security and IoT home solutions.', website: 'www.chsmarthomes.in', email: 'hello@chsmarthomes.in', phone: '+91 172 5566 7788', address: 'Industrial Area Phase 1', city: 'Chandigarh', contact: 'Gurpreet Singh', established: '2017', employees: '25-50' },
  ];
  const companyIds = {};
  for (const c of companies) {
    const r = await db.execute({
      sql: `INSERT INTO companies (user_id,name,logo,industry,about,website,email,phone,address,city,contact_person,established,employees,youtube_url,brochure_url,documents)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        c.user ? userIds[c.user] : null, c.name, logo(c.name, c.color), c.industry, c.about, c.website, c.email, c.phone, c.address, c.city, c.contact, c.established, c.employees,
        'https://www.youtube.com/embed/aqz-KE-bpKQ',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        JSON.stringify([
          { name: 'Company Profile.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'pdf' },
          { name: 'Product Catalogue.pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', type: 'pdf' },
          { name: 'Exhibitor Guidelines.docx', url: 'https://file-examples.com/storage/fe86c96f0364c0d9d9d5e5a/2017/02/file-sample_100kB.docx', type: 'doc' },
        ]),
      ],
    });
    companyIds[c.name] = Number(r.lastInsertRowid);
  }
  const allCompanyNames = companies.map((c) => c.name);

  // ---------------- Organizers ----------------
  const organizers = [
    { name: 'Global Expo Group', about: 'India\'s leading exhibition organizer with 50+ events annually.', website: 'www.globalexpo.in', email: 'info@globalexpo.in', phone: '+91 22 6789 0000' },
    { name: 'TechFair Events', about: 'Specialists in technology and industrial exhibitions.', website: 'www.techfair.in', email: 'hello@techfair.in', phone: '+91 80 6789 1111' },
    { name: 'IndiaTrade Promotions', about: 'Government-backed trade fair promotions.', website: 'www.indiatrade.gov.in', email: 'contact@indiatrade.gov.in', phone: '+91 11 6789 2222' },
  ];
  const organizerIds = [];
  for (const o of organizers) {
    const r = await db.execute({
      sql: `INSERT INTO organizers (name,logo,about,website,email,phone) VALUES (?,?,?,?,?,?)`,
      args: [o.name, logo(o.name, '111827'), o.about, o.website, o.email, o.phone],
    });
    organizerIds.push(Number(r.lastInsertRowid));
  }

  // ---------------- Exhibitions ----------------
  const gallery = JSON.stringify(galleryPhotos.map((g) => img(g, 600, 400)));
  const exhibitionDefs = [
    { slug: 'india-plast-2026', name: 'India Plast 2026', tagline: 'The Largest Plastics & Polymer Show', industry: 'Plastics', banner: banners.plast, venue: 'Pragati Maidan', city: 'New Delhi', lat: 28.6129, lng: 77.2500, org: 0, startOffset: -1, days: 4, status: 'live', price: 45000, visitorsToday: 4582, totalVisitors: 250000, tags: ['Trending', 'Most Booked', 'B2B'], b2b: 1, intl: 1 },
    { slug: 'foodtech-india-2026', name: 'FoodTech India 2026', tagline: 'Food Processing & Packaging Expo', industry: 'Food & Beverage', banner: banners.food, venue: 'BIEC', city: 'Bengaluru', lat: 13.0716, lng: 77.4784, org: 1, startOffset: -1, days: 4, status: 'live', price: 38000, visitorsToday: 3245, totalVisitors: 120000, tags: ['Live', 'Recommended'], b2b: 1, intl: 0 },
    { slug: 'automation-expo-2026', name: 'Automation Expo 2026', tagline: 'Smart Factory & Robotics', industry: 'Industrial Automation', banner: banners.auto, venue: 'Bombay Exhibition Centre', city: 'Mumbai', lat: 19.1360, lng: 72.8697, org: 1, startOffset: 0, days: 3, status: 'live', price: 52000, visitorsToday: 3393, totalVisitors: 95000, tags: ['New Launch', 'B2B'], b2b: 1, intl: 1 },
    { slug: 'delhi-craft-fair-2026', name: 'Delhi Craft Fair 2026', tagline: 'Handicrafts & Lifestyle Bazaar', industry: 'Handicrafts', banner: banners.craft, venue: 'Pragati Maidan', city: 'New Delhi', lat: 28.6129, lng: 77.2500, org: 2, startOffset: -2, days: 5, status: 'live', price: 28000, visitorsToday: 6120, totalVisitors: 80000, tags: ['Live', 'Free Entry', 'B2C'], b2b: 0, entryFree: 1 },
    { slug: 'hospitality-india-2026', name: 'Hospitality India 2026', tagline: 'Hotels, F&B & Banquet Solutions', industry: 'Hospitality', banner: banners.hotel, venue: 'Bombay Exhibition Centre', city: 'Mumbai', lat: 19.1360, lng: 72.8697, org: 0, startOffset: -1, days: 3, status: 'live', price: 48000, visitorsToday: 2100, totalVisitors: 45000, tags: ['Live', 'B2B'], b2b: 1 },
    { slug: 'renewable-energy-2026', name: 'Renewable Energy India 2026', tagline: 'Solar, Wind & Storage', industry: 'Renewable Energy', banner: banners.energy, venue: 'Helipad Exhibition Centre', city: 'Ahmedabad', lat: 23.0225, lng: 72.5714, org: 2, startOffset: 15, days: 4, status: 'upcoming', price: 41000, visitorsToday: 0, totalVisitors: 0, tags: ['Upcoming', 'Government'], early: 1, gov: 1 },
    { slug: 'print-pack-2026', name: 'Print & Pack 2026', tagline: 'Printing & Packaging Technology', industry: 'Printing & Packaging', banner: banners.print, venue: 'Chennai Trade Centre', city: 'Chennai', lat: 13.0117, lng: 80.2426, org: 0, startOffset: 32, days: 3, status: 'upcoming', price: 36000, visitorsToday: 0, totalVisitors: 0, tags: ['Upcoming', 'Early Bird'], early: 1 },
    { slug: 'medtech-2026', name: 'MedTech India 2026', tagline: 'Medical Devices & Healthcare', industry: 'Medical Equipment', banner: banners.medical, venue: 'HITEX', city: 'Hyderabad', lat: 17.3850, lng: 78.4867, org: 1, startOffset: 48, days: 3, status: 'upcoming', price: 60000, visitorsToday: 0, totalVisitors: 0, tags: ['Upcoming', 'International'], intl: 1, entryFree: 1 },
    { slug: 'smart-home-expo-2026', name: 'Smart Home Expo 2026', tagline: 'IoT Living & Home Automation', industry: 'Home Automation', banner: banners.home, venue: 'Parade Ground', city: 'Chandigarh', lat: 30.7333, lng: 76.7794, org: 1, startOffset: 60, days: 3, status: 'upcoming', price: 35000, visitorsToday: 0, totalVisitors: 0, tags: ['Upcoming', 'New Launch'], early: 1 },
    { slug: 'logistics-india-2026', name: 'Logistics India 2026', tagline: 'Warehousing, Freight & Expo Logistics', industry: 'Logistics', banner: banners.logistics, venue: 'Yashobhoomi', city: 'New Delhi', lat: 28.5562, lng: 77.1000, org: 0, startOffset: 75, days: 3, status: 'upcoming', price: 40000, visitorsToday: 0, totalVisitors: 0, tags: ['Upcoming', 'B2B'], b2b: 1 },
    { slug: 'jaipur-lifestyle-2026', name: 'Jaipur Lifestyle Expo 2026', tagline: 'Crafts, Décor & Fashion', industry: 'Handicrafts', banner: banners.craft, venue: 'JECC', city: 'Jaipur', lat: 26.9124, lng: 75.7873, org: 2, startOffset: 90, days: 4, status: 'upcoming', price: 22000, visitorsToday: 0, totalVisitors: 0, tags: ['Upcoming', 'Free Entry'], entryFree: 1 },
    { slug: 'india-plast-2025', name: 'India Plast 2025', tagline: 'Plastics & Polymer Show', industry: 'Plastics', banner: banners.plast, venue: 'Pragati Maidan', city: 'New Delhi', lat: 28.6129, lng: 77.2500, org: 0, startOffset: -365, days: 4, status: 'past', price: 42000, visitorsToday: 0, totalVisitors: 235000, tags: ['Past'] },
    { slug: 'textile-expo-2025', name: 'Textile Expo 2025', tagline: 'Weaving & Spinning Machinery', industry: 'Textile Machinery', banner: banners.textile, venue: 'Surat International Exhibition Centre', city: 'Surat', lat: 21.1702, lng: 72.8311, org: 2, startOffset: -200, days: 3, status: 'past', price: 33000, visitorsToday: 0, totalVisitors: 88000, tags: ['Past'] },
    { slug: 'auto-components-2025', name: 'Auto Components Expo 2025', tagline: 'OEM Parts & EV Supply Chain', industry: 'Automotive', banner: banners.auto, venue: 'Brilliant Convention Centre', city: 'Indore', lat: 22.7196, lng: 75.8577, org: 1, startOffset: -120, days: 3, status: 'past', price: 39000, visitorsToday: 0, totalVisitors: 52000, tags: ['Past'] },
    { slug: 'kolkata-print-2025', name: 'Kolkata Print Fair 2025', tagline: 'Print Media & Packaging', industry: 'Printing & Packaging', banner: banners.print, venue: 'Biswa Bangla Mela Prangan', city: 'Kolkata', lat: 22.5726, lng: 88.3639, org: 0, startOffset: -90, days: 4, status: 'past', price: 30000, visitorsToday: 0, totalVisitors: 41000, tags: ['Past'] },
  ];

  const exhibitionIds = {};
  for (const e of exhibitionDefs) {
    const start = addDays(now, e.startOffset);
    const end = addDays(start, e.days - 1);
    const r = await db.execute({
      sql: `INSERT INTO exhibitions
        (slug,name,tagline,industry,about,banner,venue,city,lat,lng,organizer_id,start_date,end_date,status,price_from,visitors_today,total_visitors,entry_free,international,government,b2b,early_bird,tags,gallery)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        e.slug, e.name, e.tagline, e.industry,
        `${e.name} brings together the entire ${e.industry.toLowerCase()} ecosystem under one roof, featuring live demonstrations, product launches, knowledge sessions and B2B networking. Meet manufacturers, suppliers and buyers from across India and abroad.`,
        img(e.banner, 1200, 500), e.venue, e.city, e.lat, e.lng, organizerIds[e.org],
        iso(start), iso(end), e.status, e.price, e.visitorsToday, e.totalVisitors,
        e.entryFree ? 1 : 0, e.intl ? 1 : 0, e.gov ? 1 : 0, e.b2b ? 1 : 0, e.early ? 1 : 0,
        JSON.stringify(e.tags), gallery,
      ],
    });
    exhibitionIds[e.slug] = Number(r.lastInsertRowid);
  }

  // ---------------- Halls + Stalls (floor plan) ----------------
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const statusesForPast = ['booked', 'booked', 'booked', 'available'];
  let totalStalls = 0;

  for (const e of exhibitionDefs) {
    const exId = exhibitionIds[e.slug];
    const hallCount = e.status === 'past' ? 2 : 3;
    for (let h = 0; h < hallCount; h++) {
      const hallName = `Hall ${String.fromCharCode(65 + h)}`;
      const rows = 6, cols = 8;
      const hr = await db.execute({
        sql: `INSERT INTO halls (exhibition_id,name,grid_rows,grid_cols) VALUES (?,?,?,?)`,
        args: [exId, hallName, rows, cols],
      });
      const hallId = Number(hr.lastInsertRowid);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // leave a central lounge gap
          if ((row === 2 || row === 3) && (col === 3 || col === 4)) continue;
          const code = `${String.fromCharCode(65 + h)}-${String(row * cols + col + 1).padStart(2, '0')}`;
          const isCorner = col === 0 || col === cols - 1 || row === 0 || row === rows - 1;
          const isPremium = row < 2;
          let status = 'available';
          const rnd = Math.random();
          if (e.status === 'past') {
            status = statusesForPast[Math.floor(Math.random() * statusesForPast.length)];
          } else if (e.status === 'live') {
            if (rnd < 0.45) status = 'booked';
            else if (rnd < 0.55) status = 'reserved';
            else if (rnd < 0.60) status = 'sponsor';
            else if (rnd < 0.63) status = 'blocked';
          } else {
            if (rnd < 0.18) status = 'booked';
            else if (rnd < 0.26) status = 'reserved';
            else if (rnd < 0.29) status = 'sponsor';
          }
          const base = isPremium ? 65000 : 42000;
          const price = base + (isCorner ? 8000 : 0);
          const bookedBy = (status === 'booked' || status === 'sponsor')
            ? companyIds[allCompanyNames[Math.floor(Math.random() * allCompanyNames.length)]]
            : null;
          const facilities = JSON.stringify(['Electricity 15A', 'Wi‑Fi', 'Spotlights', 'Carpet', 'Fascia board', isPremium ? 'LED TV' : 'Table + 2 chairs']);
          const description = `${isPremium ? 'Premium' : 'Standard'} ${isCorner ? 'corner' : 'inline'} stall in ${hallName}. Ideal for product demos and B2B meetings. Includes basic booth package.`;
          await db.execute({
            sql: `INSERT INTO stalls (hall_id,code,zone,type,status,width,depth,area,price,grid_row,grid_col,booked_by_company_id,description,facilities,youtube_url,brochure_url,documents)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            args: [
              hallId, code, isPremium ? 'Premium' : 'Standard', isCorner ? 'Corner' : 'Standard', status, 3, 3, 9, price, row, col, bookedBy,
              description, facilities,
              'https://www.youtube.com/embed/ScMzIvxBSi4',
              'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              JSON.stringify([
                { name: 'Stall Layout.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'pdf' },
                { name: 'Booth Specs.pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', type: 'pdf' },
                { name: 'Terms & Conditions.pdf', url: 'https://www.africau.edu/images/default/sample.pdf', type: 'pdf' },
              ]),
            ],
          });
          totalStalls++;
        }
      }
    }
  }

  // ---------------- Exhibitors directory ----------------
  for (const e of exhibitionDefs) {
    if (e.status === 'upcoming') continue;
    const exId = exhibitionIds[e.slug];
    const picks = [...allCompanyNames].sort(() => Math.random() - 0.5).slice(0, Math.min(10, allCompanyNames.length));
    for (let i = 0; i < picks.length; i++) {
      const name = picks[i];
      await db.execute({
        sql: `INSERT INTO exhibitors (exhibition_id,company_id,stall_code,hall_name) VALUES (?,?,?,?)`,
        args: [exId, companyIds[name], `${rowLetters[i % 4]}-${String(i + 3).padStart(2, '0')}`, `Hall ${String.fromCharCode(65 + (i % 3))}`],
      });
    }
  }

  // ---------------- Seminars ----------------
  const seminarTitles = [
    ['Future of Sustainable Manufacturing', 'Dr. A. Sharma', 'Day 1', '10:00 AM', 'Seminar Hall 1'],
    ['Industry 4.0 & Smart Factories', 'R. Iyer', 'Day 1', '02:00 PM', 'Seminar Hall 2'],
    ['Export Opportunities Workshop', 'M. Gupta', 'Day 2', '11:00 AM', 'Seminar Hall 1'],
    ['Product Launch Showcase', 'Panel', 'Day 2', '04:00 PM', 'Main Stage'],
  ];
  for (const e of exhibitionDefs) {
    if (e.status === 'past') continue;
    for (const s of seminarTitles) {
      await db.execute({
        sql: `INSERT INTO seminars (exhibition_id,title,speaker,day,time,hall) VALUES (?,?,?,?,?,?)`,
        args: [exhibitionIds[e.slug], ...s],
      });
    }
  }

  // ---------------- Bookings for demo visitor/exhibitor ----------------
  async function firstAvailableStall(exId) {
    const r = await db.execute({
      sql: `SELECT s.* FROM stalls s JOIN halls h ON s.hall_id=h.id
            WHERE h.exhibition_id=? AND s.status='available' LIMIT 1`,
      args: [exId],
    });
    return r.rows[0];
  }
  let bookingSeq = 1001;
  const demoBookings = [
    { user: 'exhibitor@expohub.com', company: 'ABC Machinery Pvt. Ltd.', slug: 'india-plast-2026', payStatus: 'paid', payMode: 'Bank Transfer' },
    { user: 'exhibitor@expohub.com', company: 'ABC Machinery Pvt. Ltd.', slug: 'automation-expo-2026', payStatus: 'pending', payMode: 'UPI' },
    { user: 'priya@abcmachinery.com', company: 'GreenLeaf Foods', slug: 'foodtech-india-2026', payStatus: 'paid', payMode: 'Credit Card' },
  ];
  for (const b of demoBookings) {
    const exId = exhibitionIds[b.slug];
    const stall = await firstAvailableStall(exId);
    if (!stall) continue;
    const compId = companyIds[b.company];
    const comp = companies.find((c) => c.name === b.company);
    await db.execute({
      sql: `INSERT INTO bookings (reference,user_id,exhibition_id,stall_id,company_id,company_name,contact_person,contact_email,contact_phone,amount,payment_status,payment_mode,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [`EXH-${bookingSeq++}`, userIds[b.user], exId, stall.id, compId, b.company, comp.contact, comp.email, comp.phone, stall.price, b.payStatus, b.payMode, 'confirmed'],
    });
    await db.execute({ sql: `UPDATE stalls SET status='booked', booked_by_company_id=? WHERE id=?`, args: [compId, stall.id] });
  }

  // ---------------- Notifications ----------------
  const notifs = [
    ['New exhibition announced', 'MedTech India 2026 registrations are now open.', 'info'],
    ['Stall becoming available', 'A corner stall in India Plast 2026 Hall A is now free.', 'success'],
    ['Early bird discount ending', 'Renewable Energy India 2026 early bird ends in 3 days.', 'warning'],
    ['Payment reminder', 'Your booking EXH-1002 has a pending payment.', 'warning'],
    ['Event starts tomorrow', 'Automation Expo 2026 opens tomorrow at 9 AM.', 'info'],
  ];
  for (const n of notifs) {
    await db.execute({
      sql: `INSERT INTO notifications (user_id,title,body,type) VALUES (?,?,?,?)`,
      args: [userIds['visitor@expohub.com'], ...n],
    });
  }

  // ---------------- Sample messages to companies ----------------
  const sampleMsgs = [
    { company: 'ABC Machinery Pvt. Ltd.', subject: 'Interested in injection moulding line', body: 'Hi, we are looking for a 250T injection moulding machine for our Pune plant. Can we schedule a meeting at India Plast?' },
    { company: 'GreenLeaf Foods', subject: 'Distributor partnership', body: 'We would like to discuss retail distribution for organic snacks in North India.' },
    { company: 'RoboTech Automation', subject: 'Demo request – collaborative robot', body: 'Please share available demo slots for your cobot line at Automation Expo.' },
    { company: 'SolarNova Energy', subject: 'Rooftop quote for factory', body: 'Need a 500 kW rooftop solar proposal for our Ahmedabad unit.' },
    { company: 'MediCare Devices', subject: 'Hospital tender support', body: 'Can you support a diagnostic equipment tender for a 200-bed hospital?' },
  ];
  for (const m of sampleMsgs) {
    await db.execute({
      sql: `INSERT INTO messages (company_id,exhibition_id,from_user_id,from_name,from_email,from_phone,subject,body,status)
            VALUES (?,?,?,?,?,?,?,?,?)`,
      args: [
        companyIds[m.company], exhibitionIds['india-plast-2026'], userIds['visitor@expohub.com'],
        'Rohit Sharma', 'visitor@expohub.com', '+91 98765 00003', m.subject, m.body, 'unread',
      ],
    });
  }

  console.log(`[seed] Done. Users: ${users.length}, Companies: ${companies.length}, Exhibitions: ${exhibitionDefs.length}, Stalls: ${totalStalls}`);
  console.log('[seed] Logins:');
  console.log('  admin@expohub.com / admin123   (Organizer/Admin)');
  console.log('  exhibitor@expohub.com / demo123 (Exhibitor / Company)');
  console.log('  visitor@expohub.com / demo123   (Visitor / Guest)');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
