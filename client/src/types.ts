export type Role = 'visitor' | 'exhibitor' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
}

export interface Exhibition {
  id: number;
  slug: string;
  name: string;
  tagline?: string;
  industry: string;
  about?: string;
  banner: string;
  venue: string;
  city: string;
  lat?: number;
  lng?: number;
  organizer_id: number;
  start_date: string;
  end_date: string;
  status: 'live' | 'upcoming' | 'past' | 'disabled';
  price_from: number;
  visitors_today: number;
  total_visitors: number;
  entry_free: number;
  international: number;
  government: number;
  b2b: number;
  early_bird: number;
  tags: string[];
  gallery: string[];
  documents?: MediaDoc[];
  youtube_url?: string;
  reel_url?: string;
  address?: string;
  floor_plan_url?: string;
  floor_plan_mode?: 'attached' | 'interactive' | 'both';
  total_stalls?: number;
  available_stalls?: number;
  booked_stalls?: number;
  companies?: number;
  distance_km?: number | null;
}

export interface Organizer {
  id: number;
  name: string;
  logo: string;
  about: string;
  website: string;
  email: string;
  phone: string;
}

export interface Hall {
  id: number;
  exhibition_id: number;
  name: string;
  grid_rows: number;
  grid_cols: number;
  /** Per-row stall counts, e.g. [10, 5, 8] — one row can have 10 stalls, next only 5 */
  row_layout?: number[];
  markers?: FloorMarkers;
}

export type FloorMarkerKind = 'enter' | 'exit' | 'lounge' | 'food' | 'restroom' | 'info' | 'stage' | 'clinic' | 'custom';

export interface FloorMarker {
  id: string;
  kind: FloorMarkerKind;
  label: string;
  grid_row: number;
  grid_col: number;
  span_cols?: number;
  span_rows?: number;
}

export interface FloorMarkers {
  entrance_label: string;
  exit_label: string;
  items: FloorMarker[];
}

export type StallStatus = 'available' | 'reserved' | 'booked' | 'sponsor' | 'blocked';
export type StallDisplaySize = 'small' | 'medium' | 'large' | 'xlarge';

export interface MediaDoc {
  name: string;
  url: string;
  type: string;
}

export interface Stall {
  id: number;
  hall_id: number;
  code: string;
  zone: string;
  type: string;
  status: StallStatus;
  width: number;
  depth: number;
  area: number;
  price: number;
  grid_row: number;
  grid_col: number;
  span_cols?: number;
  span_rows?: number;
  display_size?: StallDisplaySize;
  company_name?: string;
  company_logo?: string;
  company_id?: number;
  company_industry?: string;
  company_about?: string;
  company_website?: string;
  company_email?: string;
  company_phone?: string;
  company_city?: string;
  company_contact?: string;
  company_youtube?: string;
  company_reel?: string;
  hall_name?: string;
  description?: string;
  facilities?: string[];
  youtube_url?: string;
  reel_url?: string;
  brochure_url?: string;
  documents?: MediaDoc[];
  nearby?: { code: string; status: StallStatus }[];
}

export interface Company {
  id: number;
  name: string;
  logo: string;
  industry: string;
  about: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  contact_person: string;
  established: string;
  employees: string;
  youtube_url?: string;
  reel_url?: string;
  brochure_url?: string;
  documents?: MediaDoc[];
  history?: { name: string; start_date: string; end_date: string; hall_name: string; stall_code: string; slug: string }[];
}

export interface Booking {
  id: number;
  reference: string;
  exhibition_id: number;
  exhibition_name: string;
  exhibition_banner: string;
  slug: string;
  venue: string;
  city: string;
  start_date: string;
  end_date: string;
  stall_code: string;
  hall_name: string;
  company_name: string;
  amount: number;
  payment_status: 'pending' | 'paid';
  payment_mode: string;
  status: string;
  created_at: string;
}

export interface Seminar {
  id: number;
  title: string;
  speaker: string;
  day: string;
  time: string;
  hall: string;
}

export interface ExhibitionComment {
  id: number;
  exhibition_id: number;
  user_id?: number | null;
  author_name: string;
  author_city?: string | null;
  body: string;
  rating: number;
  created_at: string;
}

export interface ExhibitionMedia {
  id: number;
  exhibition_id: number;
  user_id?: number | null;
  author_name: string;
  kind: 'photo' | 'video' | 'reel';
  url: string;
  caption?: string | null;
  created_at: string;
}

export interface Stats {
  live: number;
  upcoming: number;
  companies: number;
  organizers: number;
  visitors: number;
  bookings: number;
}
