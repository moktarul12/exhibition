type Mode = '2d' | '3d';

export type FloorViewMode = Mode;

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
      className={`inline-flex rounded-full bg-ink-100/80 p-1 ${className}`}
      role="group"
      aria-label="Floor view"
    >
      {([
        { id: '2d' as const, label: '2D map' },
        { id: '3d' as const, label: '3D hall' },
      ]).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
            value === opt.id
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
