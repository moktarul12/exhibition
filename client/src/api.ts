import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('expohub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function dayOfEvent(start: string, end: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  const total = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  const current = Math.min(Math.max(Math.floor((now - s) / (1000 * 60 * 60 * 24)) + 1, 1), total);
  return { current, total };
}
