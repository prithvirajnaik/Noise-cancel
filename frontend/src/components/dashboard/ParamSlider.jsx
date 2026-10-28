export default function ParamSlider({ id, icon: Icon, label, value, min, max, step, format, onChange }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between short:mb-1.5">
        <label htmlFor={id} className="section-label">
          <Icon size={16} />
          {label}
        </label>
        <span className="rounded-md bg-primary-soft px-2 py-1 font-mono text-xs font-semibold text-primary">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="range"
        style={{ '--fill': `${fill}%` }}
      />
    </div>
  );
}
