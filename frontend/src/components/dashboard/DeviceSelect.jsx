import { ChevronDown } from 'lucide-react';

export default function DeviceSelect({ id, icon: Icon, label, value, options, disabled, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="section-label mb-2">
        <Icon size={16} />
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className="h-11 w-full short:h-10 appearance-none truncate rounded-xl border-[1.5px] border-hairline bg-surface pl-4 pr-10 text-sm text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {options?.map(d => (
            <option key={d.index} value={d.index}>{d.name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
          <ChevronDown size={18} />
        </div>
      </div>
    </div>
  );
}
