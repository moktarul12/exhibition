import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-px grid min-h-[60vh] place-items-center text-center">
      <div>
        <div className="text-7xl font-extrabold text-brand-600">404</div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-1 text-slate-500">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6">Back to Home</Link>
      </div>
    </div>
  );
}
