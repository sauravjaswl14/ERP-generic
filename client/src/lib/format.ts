const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtMoney = (v: unknown) => money.format(Number(v ?? 0));
export const fmtNum = (v: unknown) => new Intl.NumberFormat('en-US').format(Number(v ?? 0));

export const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** ISO timestamp → value for <input type="date"> */
export const toInputDate = (v?: string | null) => (v ? v.slice(0, 10) : '');
export const today = () => new Date().toISOString().slice(0, 10);

export const titleCase = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w|\s\w/g, (c) => c.toUpperCase());

export const enumOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: titleCase(v) }));
