type Mode = '2d' | '3d';

export type FloorViewMode = Mode;

/** Pill toggle — 2D top-down vs immersive 3D hall */
export default function FloorViewToggle({
  value,
  onChange,
  className = '',
}: {
  value: Mode;
  onChange: (m: Mode) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full border border-ink-200/80 bg-white/90 p-1 shadow-sm backdrop-blur ${className}`}
      role="group"
      aria-label="Floor plan view"
    >
      {([
        { id: '2d' as const, label: '2D', hint: 'Top-down grid' },
        { id: '3d' as const, label: '3D', hint: 'Immersive hall' },
      ]).map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            title={opt.hint}
            onClick={() => onChange(opt.id)}
            className={`relative rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide transition-all duration-200 ${
              active
                ? opt.id === '3d'
                  ? 'bg-grape-600 text-white shadow-md shadow-grape/30'
                  : 'bg-ink-900 text-white shadow-md'
                : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {opt.id === '3d' && active && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-brand ring-2 ring-white" />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
