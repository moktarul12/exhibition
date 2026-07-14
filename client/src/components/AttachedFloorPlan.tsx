import { useMemo, useState } from 'react';
import { Download } from './icons';

function isPdf(url: string) {
  return /\.pdf($|\?)/i.test(url) || url.startsWith('data:application/pdf');
}

export default function AttachedFloorPlan({
  url,
  title = 'Official floor plan',
}: {
  url: string;
  title?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const pdf = useMemo(() => isPdf(url), [url]);

  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <div className="font-display text-base font-bold text-ink-900">{title}</div>
          <p className="text-xs text-ink-400">Attached map from the organizer (PNG / JPG / PDF)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!pdf && (
            <>
              <button type="button" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} className="btn-outline rounded-full px-3 py-1.5 text-xs">−</button>
              <span className="text-xs font-semibold text-ink-500">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} className="btn-outline rounded-full px-3 py-1.5 text-xs">+</button>
            </>
          )}
          <a href={url} target="_blank" rel="noreferrer" download className="btn-outline rounded-full px-3 py-1.5 text-xs">
            <Download width={14} /> Download
          </a>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto bg-ink-50/60 p-4">
        {pdf ? (
          <iframe title={title} src={url} className="h-[70vh] w-full rounded-2xl border border-ink-100 bg-white" />
        ) : (
          <div className="flex justify-center">
            <img
              src={url}
              alt={title}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              className="max-w-full rounded-xl shadow-card transition-transform"
            />
          </div>
        )}
      </div>
    </div>
  );
}
