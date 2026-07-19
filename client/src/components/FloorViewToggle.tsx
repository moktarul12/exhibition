type Mode = '2d' | '3d' | 'compact';

export type FloorViewMode = Mode;

const LABELS: Record<Mode, string> = {
  compact: 'Compact',
  '2d': '2D',
  '3d': '3D',
};

export default function FloorViewToggle({
  value,
  onChange,
  modes = ['compact', '2d', '3d'],
  className = '',
}: {
  value: Mode;
  onChange: (m: Mode) => void;
  modes?: Mode[];
  className?: string;
}) {
  return (
    <div
      className={`inline-flex rounded-full bg-ink-100/80 p-1 ${className}`}
      role="group"
      aria-label="Floor view"
    >
      {modes.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
            value === id
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {LABELS[id]}
        </button>
      ))}
    </div>
  );
}
