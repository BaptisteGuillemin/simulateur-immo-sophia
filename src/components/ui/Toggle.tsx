import { memo } from 'react';
import { Tooltip } from './Tooltip';

interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
}

function ToggleImpl({ label, value, onChange, tooltip }: Props) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <span className="text-sm text-text-muted flex items-center gap-1.5">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          ${value ? 'bg-accent' : 'bg-bg-subtle border border-border-subtle'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
            ${value ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );
}

export const Toggle = memo(ToggleImpl);
