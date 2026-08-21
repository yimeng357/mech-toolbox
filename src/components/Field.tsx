// 通用表单控件:数字输入 / 下拉选择 / 分段选择

interface NumFieldProps {
  label: string;
  symbol?: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  opt?: string;
}

export function NumField({ label, symbol, value, onChange, unit, error, hint, placeholder, opt }: NumFieldProps) {
  return (
    <div className="field">
      <div className="lbl">
        <span>{label} {symbol && <span className="sym">{symbol}</span>}</span>
        {opt && <span className="opt">{opt}</span>}
      </div>
      <div className={`input-wrap pad-r ${error ? 'err' : ''}`}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={error ? 'err' : ''}
        />
        {unit && <span className={`unit ${error ? 'err' : ''}`}>{unit}</span>}
      </div>
      {error ? <div className="err">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}

export function SelectField({ label, value, onChange, options, hint }: SelectFieldProps) {
  return (
    <div className="field">
      <div className="lbl"><span>{label}</span></div>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

interface SegFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}

export function SegField<T extends string>({ label, value, onChange, options }: SegFieldProps<T>) {
  return (
    <div className="field">
      <div className="lbl"><span>{label}</span></div>
      <div className="seg">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? 'active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
