import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

const DEFAULT_CITY = 'Bengaluru';
const STORAGE_KEY = 'expohub_city';

// Curated metro order; the live list is merged with cities returned by the API.
const KNOWN_CITIES = ['Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune'];

// Map geocoded city/region names onto the cities we actually host events in.
const ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru', bengaluru: 'Bengaluru',
  mumbai: 'Mumbai', 'navi mumbai': 'Mumbai', thane: 'Mumbai',
  delhi: 'New Delhi', 'new delhi': 'New Delhi', gurgaon: 'New Delhi', gurugram: 'New Delhi', noida: 'New Delhi', ghaziabad: 'New Delhi', faridabad: 'New Delhi',
  hyderabad: 'Hyderabad', secunderabad: 'Hyderabad',
  chennai: 'Chennai',
  pune: 'Pune', 'pimpri-chinchwad': 'Pune', pimpri: 'Pune',
};

function normalizeCity(raw?: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  const hit = KNOWN_CITIES.find((c) => c.toLowerCase() === key);
  return hit || null;
}

interface CityState {
  city: string;
  cities: string[];
  setCity: (c: string) => void;
  detecting: boolean;
  detect: () => void;
}

const CityContext = createContext<CityState>(null!);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY);
  const [cities, setCities] = useState<string[]>(KNOWN_CITIES);
  const [detecting, setDetecting] = useState(false);

  const setCity = (c: string) => { setCityState(c); localStorage.setItem(STORAGE_KEY, c); };

  // Keep the selectable list fresh from the DB (cities that actually have events).
  useEffect(() => {
    api.get('/exhibitions/meta/filters')
      .then((r) => {
        const merged = Array.from(new Set([...KNOWN_CITIES, ...(r.data.cities || [])]));
        setCities(merged);
      })
      .catch(() => {});
  }, []);

  const detect = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const d = await r.json();
          const detected = normalizeCity(d.city) || normalizeCity(d.locality) || normalizeCity(d.principalSubdivision);
          setCity(detected || DEFAULT_CITY);
        } catch {
          setCity(DEFAULT_CITY);
        } finally {
          setDetecting(false);
        }
      },
      () => { setCity(DEFAULT_CITY); setDetecting(false); },
      { timeout: 8000 }
    );
  };

  // First visit with no saved city → try to detect current city, fallback Bengaluru.
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CityContext.Provider value={{ city, cities, setCity, detecting, detect }}>
      {children}
    </CityContext.Provider>
  );
}

export const useCity = () => useContext(CityContext);
