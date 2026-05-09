import { memo } from 'react';
import { Tooltip } from './Tooltip';
import { useDebouncedSetter } from '@/hooks/useDebouncedSetter';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  tooltip?: string;
  unit?: string;
}

function SliderImpl({ label, value, onChange, min, max, step = 1, format, tooltip, unit }: Props) {
  const [localValue, setLocalValue] = useDebouncedSetter<number>(value, onChange, 120);
  const display = format ? format(localValue) : `${localValue}${unit ? ` ${unit}` : ''}`;
  return (
    <div>
      <label className="field-label">
        <span className="flex items-center gap-1.5">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
        <span className="field-value text-accent">{display}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={(e) => setLocalValue(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export const Slider = memo(SliderImpl);
