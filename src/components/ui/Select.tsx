import { memo } from 'react';
import { Tooltip } from './Tooltip';

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  tooltip?: string;
}

function SelectImpl({ label, value, onChange, options, tooltip }: Props) {
  return (
    <div>
      <label className="field-label">
        <span className="flex items-center gap-1.5">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
      </label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const Select = memo(SelectImpl);
