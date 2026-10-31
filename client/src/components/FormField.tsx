import { LookupDef, Option, useLookup } from '../lib/lookups';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  /** true = always required; 'create' = required only when creating */
  required?: boolean | 'create';
  options?: Option[];
  lookup?: LookupDef;
  step?: string;
  min?: number;
  help?: string;
  defaultValue?: unknown;
  /** Full-width in the two-column form grid. */
  wide?: boolean;
}

interface Props {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  creating?: boolean;
}

export function FormField({ field, value, onChange, creating }: Props) {
  const lookup = useLookup(field.lookup);
  const required = field.required === true || (field.required === 'create' && !!creating);
  const type = field.type ?? 'text';
  const id = `f-${field.name}`;
  const str = value == null ? '' : String(value);

  let control;
  if (type === 'checkbox') {
    control = (
      <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
        <input id={id} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.help ?? 'Enabled'}
      </label>
    );
  } else if (type === 'select') {
    const options = field.lookup ? lookup.data ?? [] : field.options ?? [];
    control = (
      <select id={id} className="input" required={required} value={str} onChange={(e) => onChange(e.target.value)}>
        {(!required || !str) && <option value="">{field.lookup && lookup.isLoading ? 'Loading…' : required ? 'Select…' : '— None —'}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (type === 'textarea') {
    control = <textarea id={id} className="input min-h-[80px]" required={required} value={str} onChange={(e) => onChange(e.target.value)} />;
  } else {
    control = (
      <input
        id={id}
        className="input"
        type={type}
        required={required}
        step={type === 'number' ? field.step ?? 'any' : undefined}
        min={type === 'number' ? field.min : undefined}
        autoComplete={type === 'password' ? 'new-password' : undefined}
        value={str}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className={field.wide || type === 'textarea' ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="label">
        {field.label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {control}
      {field.help && type !== 'checkbox' && <p className="mt-1 text-xs text-slate-400">{field.help}</p>}
    </div>
  );
}

/** Initial form state for create (defaults) or edit (existing row). */
export function initialValues(fields: FieldDef[], row?: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (row) {
      const v = row[f.name];
      out[f.name] = f.type === 'date' && typeof v === 'string' ? v.slice(0, 10) : f.type === 'password' ? '' : v ?? (f.type === 'checkbox' ? false : '');
    } else {
      out[f.name] = f.defaultValue ?? (f.type === 'checkbox' ? true : f.type === 'select' && !f.lookup && f.required && f.options?.length ? f.options[0].value : '');
    }
  }
  return out;
}

/** Turns form state into an API payload: blanks become null (optional) or are omitted (numbers/password). */
export function toPayload(fields: FieldDef[], values: Record<string, unknown>, creating: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    const type = f.type ?? 'text';
    const required = f.required === true || (f.required === 'create' && creating);
    if (type === 'checkbox') out[f.name] = !!v;
    else if (type === 'number') {
      if (v !== '' && v != null) out[f.name] = Number(v);
    } else if (type === 'password') {
      if (v) out[f.name] = v;
    } else if (v === '' || v == null) {
      if (!required) out[f.name] = f.type === 'select' && !f.lookup ? undefined : null;
    } else out[f.name] = v;
  }
  return out;
}
