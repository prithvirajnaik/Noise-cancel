import IconBadge from './IconBadge';
import { TONES } from './tones';

export default function StatTile({ icon, tone, label, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-4 short:py-3">
      <IconBadge icon={icon} tone={tone} size="round" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">{label}</p>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

// Segmented bar for a 0..1 level
export function LevelMeter({ level, tone, label, segments = 10 }) {
  const lit = Math.round(Math.min(Math.max(level, 0), 1) * segments);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((lit / segments) * 100)}
      className="flex h-6 items-end gap-[3px]"
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-full w-[5px] rounded-full transition-colors duration-100 ${i < lit ? TONES[tone].fill : 'bg-hairline'}`}
        />
      ))}
    </div>
  );
}
