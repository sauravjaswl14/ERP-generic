import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ResourcePage from '../components/ResourcePage';
import { FormField } from '../components/FormField';
import { Badge, Button, ErrorBox, Modal, Table } from '../components/ui';
import { api, Page } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWrite, Role } from '../lib/access';
import { enumOptions, fmtDate, fmtMoney, today } from '../lib/format';
import { L } from '../lib/lookups';

interface Product {
  id: string;
  sku: string;
  name: string;
  unitPrice: string;
  costPrice: string;
}

function useProducts() {
  return useQuery({
    queryKey: ['products-full'],
    staleTime: 30_000,
    queryFn: async () => (await api<Page<Product>>('/products?pageSize=200')).data,
  });
}

interface Line {
  productId: string;
  quantity: string;
  price: string;
  discount: string;
}
const blankLine = (): Line => ({ productId: '', quantity: '1', price: '', discount: '0' });

/** Editable order lines. The price defaults to the product's list price (sales) or cost (purchase) but can be overridden. */
function LinesEditor({ kind, lines, onChange }: { kind: 'sales' | 'purchase'; lines: Line[]; onChange: (l: Line[]) => void }) {
  const products = useProducts();
  const byId = new Map((products.data ?? []).map((p) => [p.id, p]));
  const defaultPrice = (p?: Product) => (p ? (kind === 'sales' ? p.unitPrice : p.costPrice) : '');
  const set = (i: number, patch: Partial<Line>) => onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const lineTotal = (l: Line) => {
    const price = l.price === '' ? Number(defaultPrice(byId.get(l.productId)) || 0) : Number(l.price);
    return Number(l.quantity || 0) * price * (kind === 'sales' ? 1 - Number(l.discount || 0) / 100 : 1);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Lines</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...lines, blankLine()])}>
          + Add line
        </Button>
      </div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 items-center gap-2">
            <select
              className="input col-span-12 sm:col-span-5"
              required
              aria-label="Product"
              value={l.productId}
              onChange={(e) => set(i, { productId: e.target.value, price: '' })}
            >
              <option value="">Select product…</option>
              {(products.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <input className="input col-span-3 sm:col-span-2" type="number" min={1} step={1} required aria-label="Quantity" placeholder="Qty" value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value })} />
            <input
              className="input col-span-4 sm:col-span-2"
              type="number"
              min={0}
              step="any"
              aria-label={kind === 'sales' ? 'Unit price' : 'Unit cost'}
              placeholder={defaultPrice(byId.get(l.productId)) || (kind === 'sales' ? 'Price' : 'Cost')}
              value={l.price}
              onChange={(e) => set(i, { price: e.target.value })}
            />
            {kind === 'sales' ? (
              <input className="input col-span-3 sm:col-span-1" type="number" min={0} max={100} step="any" aria-label="Discount %" placeholder="Disc %" value={l.discount} onChange={(e) => set(i, { discount: e.target.value })} />
            ) : (
              <div className="hidden sm:col-span-1 sm:block" />
            )}
            <div className="col-span-2 flex items-center justify-end gap-1 text-sm tabular-nums text-slate-600">
              {fmtMoney(lineTotal(l))}
              {lines.length > 1 && (
                <button type="button" className="ml-1 text-slate-400 hover:text-red-600" aria-label="Remove line" onClick={() => onChange(lines.filter((_, idx) => idx !== i))}>
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewOrderForm({ kind, onClose, onSaved }: { kind: 'sales' | 'purchase'; onClose: () => void; onSaved: () => void }) {
  const sales = kind === 'sales';
  const [partyId, setPartyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [expected, setExpected] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([blankLine()]);

  const save = useMutation({
    mutationFn: () =>
      api(sales ? '/sales-orders' : '/purchase-orders', {
        method: 'POST',
        body: {
          [sales ? 'customerId' : 'supplierId']: partyId,
          warehouseId,
          taxRate: Number(taxRate || 0),
          notes: notes || null,
          ...(sales ? {} : { expectedDate: expected || null }),
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            ...(l.price !== '' ? (sales ? { unitPrice: Number(l.price) } : { unitCost: Number(l.price) }) : {}),
            ...(sales ? { discount: Number(l.discount || 0) } : {}),
          })),
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={sales ? 'New sales order' : 'New purchase order'} onClose={onClose} wide>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <ErrorBox error={save.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            field={{ name: 'party', label: sales ? 'Customer' : 'Supplier', type: 'select', required: true, lookup: sales ? L.customers : L.suppliers }}
            value={partyId}
            onChange={(v) => setPartyId(String(v))}
          />
          <FormField
            field={{ name: 'warehouse', label: sales ? 'Ship from warehouse' : 'Receive into warehouse', type: 'select', required: true, lookup: L.warehouses }}
            value={warehouseId}
            onChange={(v) => setWarehouseId(String(v))}
          />
          <FormField field={{ name: 'taxRate', label: 'Tax rate (%)', type: 'number', min: 0 }} value={taxRate} onChange={(v) => setTaxRate(String(v))} />
          {!sales && <FormField field={{ name: 'expected', label: 'Expected date', type: 'date' }} value={expected} onChange={(v) => setExpected(String(v))} />}
          <FormField field={{ name: 'notes', label: 'Notes', type: 'textarea' }} value={notes} onChange={(v) => setNotes(String(v))} />
        </div>
        <LinesEditor kind={kind} lines={lines} onChange={setLines} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Create draft'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function OrderDetail({ kind, order, onClose }: { kind: 'sales' | 'purchase'; order: Row; onClose: () => void }) {
  const sales = kind === 'sales';
  return (
    <Modal title={`${sales ? 'Sales order' : 'Purchase order'} ${order.number}`} onClose={onClose} wide>
      <div className="mb-4 grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="label">{sales ? 'Customer' : 'Supplier'}</div>
          {(sales ? order.customer : order.supplier).name}
        </div>
        <div>
          <div className="label">Warehouse</div>
          {order.warehouse.name}
        </div>
        <div>
          <div className="label">Date</div>
          {fmtDate(order.orderDate)}
        </div>
        <div>
          <div className="label">Status</div>
          <Badge value={order.status} />
        </div>
        {sales && order.invoice && (
          <div>
            <div className="label">Invoice</div>
            {order.invoice.number}
          </div>
        )}
        {!sales && order.paidAt && (
          <div>
            <div className="label">Paid on</div>
            {fmtDate(order.paidAt)}
          </div>
        )}
      </div>
      <Table head={['Product', 'Qty', sales ? 'Unit price' : 'Unit cost', ...(sales ? ['Disc %'] : []), 'Line total']}>
        {order.lines.map((l: Row) => (
          <tr key={l.id}>
            <td className="td">
              {l.product.name} <span className="text-xs text-slate-400">{l.product.sku}</span>
            </td>
            <td className="td tabular-nums">{l.quantity}</td>
            <td className="td tabular-nums">{fmtMoney(sales ? l.unitPrice : l.unitCost)}</td>
            {sales && <td className="td tabular-nums">{Number(l.discount)}</td>}
            <td className="td tabular-nums">{fmtMoney(l.lineTotal)}</td>
          </tr>
        ))}
      </Table>
      <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Subtotal</dt>
          <dd className="tabular-nums">{fmtMoney(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Tax ({Number(order.taxRate)}%)</dt>
          <dd className="tabular-nums">{fmtMoney(order.tax)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{fmtMoney(order.total)}</dd>
        </div>
      </dl>
      {order.notes && <p className="mt-4 text-sm text-slate-500">Notes: {order.notes}</p>}
    </Modal>
  );
}

/** One small POST action button with confirm + error alert. */
function ActionButton({ label, path, confirm, variant = 'secondary', onDone }: { label: string; path: string; confirm?: string; variant?: 'primary' | 'secondary'; onDone: () => void }) {
  const run = useMutation({
    mutationFn: () => api(path, { method: 'POST' }),
    onSuccess: onDone,
    onError: (e) => window.alert(e instanceof Error ? e.message : 'Action failed'),
  });
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={run.isPending}
      onClick={() => {
        if (!confirm || window.confirm(confirm)) run.mutate();
      }}
    >
      {label}
    </Button>
  );
}

const can = (role: Role | undefined, ...roles: Role[]) => !!role && (role === 'ADMIN' || roles.includes(role));

export function SalesOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const write = canWrite(user?.role, 'sales');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Row | null>(null);
  const reload = () => {
    qc.invalidateQueries({ queryKey: ['resource', '/sales-orders'] });
    qc.invalidateQueries({ queryKey: ['resource', '/invoices'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['inventory-stock'] });
  };
  return (
    <>
      <ResourcePage
        title="Sales orders"
        subtitle="Confirming an order issues stock, raises the invoice and posts revenue and cost of goods sold."
        singular="sales order"
        endpoint="/sales-orders"
        searchable
        filters={[{ name: 'status', label: 'Status', options: enumOptions(['DRAFT', 'CONFIRMED', 'CANCELLED']) }]}
        headerActions={write && <Button onClick={() => setCreating(true)}>+ New sales order</Button>}
        columns={[
          { header: 'Number', cell: (r) => <span className="font-mono text-xs font-medium">{r.number}</span> },
          { header: 'Customer', cell: (r) => r.customer.name },
          { header: 'Date', cell: (r) => fmtDate(r.orderDate) },
          { header: 'Total', cell: (r) => <span className="tabular-nums">{fmtMoney(r.total)}</span> },
          { header: 'Invoice', cell: (r) => r.invoice?.number ?? '—' },
          { header: 'Status', cell: (r) => <Badge value={r.status} /> },
        ]}
        rowActions={(r, refresh) => (
          <>
            <Button size="sm" variant="secondary" onClick={() => setViewing(r)}>
              View
            </Button>
            {write && r.status === 'DRAFT' && (
              <>
                <ActionButton label="Confirm" variant="primary" path={`/sales-orders/${r.id}/confirm`} confirm={`Confirm ${r.number}? Stock will be issued and an invoice raised.`} onDone={() => { refresh(); reload(); }} />
                <ActionButton label="Cancel" path={`/sales-orders/${r.id}/cancel`} confirm={`Cancel ${r.number}?`} onDone={() => { refresh(); reload(); }} />
              </>
            )}
          </>
        )}
      />
      {creating && (
        <NewOrderForm
          kind="sales"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {viewing && <OrderDetail kind="sales" order={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

export function PurchaseOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const role = user?.role;
  const write = canWrite(role, 'purchasing');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Row | null>(null);
  const reload = () => {
    qc.invalidateQueries({ queryKey: ['resource', '/purchase-orders'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['inventory-stock'] });
  };
  return (
    <>
      <ResourcePage
        title="Purchase orders"
        subtitle="Receiving goods adds stock, updates the average cost and records the payable; pay the supplier once received."
        singular="purchase order"
        endpoint="/purchase-orders"
        searchable
        filters={[{ name: 'status', label: 'Status', options: enumOptions(['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED']) }]}
        headerActions={write && <Button onClick={() => setCreating(true)}>+ New purchase order</Button>}
        columns={[
          { header: 'Number', cell: (r) => <span className="font-mono text-xs font-medium">{r.number}</span> },
          { header: 'Supplier', cell: (r) => r.supplier.name },
          { header: 'Date', cell: (r) => fmtDate(r.orderDate) },
          { header: 'Total', cell: (r) => <span className="tabular-nums">{fmtMoney(r.total)}</span> },
          { header: 'Status', cell: (r) => <Badge value={r.status} /> },
          { header: 'Payment', cell: (r) => (r.status === 'RECEIVED' ? <Badge value={r.paidAt ? 'PAID' : 'UNPAID'} /> : '—') },
        ]}
        rowActions={(r, refresh) => {
          const done = () => {
            refresh();
            reload();
          };
          return (
            <>
              <Button size="sm" variant="secondary" onClick={() => setViewing(r)}>
                View
              </Button>
              {can(role, 'PURCHASING') && r.status === 'DRAFT' && <ActionButton label="Place order" variant="primary" path={`/purchase-orders/${r.id}/order`} onDone={done} />}
              {can(role, 'PURCHASING', 'INVENTORY') && r.status === 'ORDERED' && (
                <ActionButton label="Receive goods" variant="primary" path={`/purchase-orders/${r.id}/receive`} confirm={`Receive all lines of ${r.number} into ${r.warehouse.name}?`} onDone={done} />
              )}
              {can(role, 'PURCHASING') && (r.status === 'DRAFT' || r.status === 'ORDERED') && (
                <ActionButton label="Cancel" path={`/purchase-orders/${r.id}/cancel`} confirm={`Cancel ${r.number}?`} onDone={done} />
              )}
              {can(role, 'PURCHASING', 'ACCOUNTANT') && r.status === 'RECEIVED' && !r.paidAt && (
                <ActionButton label="Pay supplier" variant="primary" path={`/purchase-orders/${r.id}/pay`} confirm={`Pay ${fmtMoney(r.total)} to ${r.supplier.name}?`} onDone={done} />
              )}
            </>
          );
        }}
      />
      {creating && (
        <NewOrderForm
          kind="purchase"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {viewing && <OrderDetail kind="purchase" order={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

// ───────────── Invoices ─────────────
export function Invoices() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canPay = can(user?.role, 'ACCOUNTANT', 'SALES');
  const [paying, setPaying] = useState<Row | null>(null);
  return (
    <>
      <ResourcePage
        title="Invoices"
        subtitle="Invoices are raised automatically when a sales order is confirmed (net 30)."
        singular="invoice"
        endpoint="/invoices"
        searchable
        filters={[{ name: 'status', label: 'Status', options: enumOptions(['UNPAID', 'PARTIAL', 'PAID', 'VOID']) }]}
        columns={[
          { header: 'Number', cell: (r) => <span className="font-mono text-xs font-medium">{r.number}</span> },
          { header: 'Customer', cell: (r) => r.customer.name },
          { header: 'Issued', cell: (r) => fmtDate(r.issueDate) },
          {
            header: 'Due',
            cell: (r) => {
              const overdue = (r.status === 'UNPAID' || r.status === 'PARTIAL') && new Date(r.dueDate) < new Date();
              return <span className={overdue ? 'font-medium text-red-600' : ''}>{fmtDate(r.dueDate)}</span>;
            },
          },
          { header: 'Total', cell: (r) => <span className="tabular-nums">{fmtMoney(r.total)}</span> },
          { header: 'Balance', cell: (r) => <span className="tabular-nums">{fmtMoney(Number(r.total) - Number(r.paid))}</span> },
          { header: 'Status', cell: (r) => <Badge value={r.status} /> },
        ]}
        rowActions={(r) =>
          canPay && (r.status === 'UNPAID' || r.status === 'PARTIAL') ? (
            <Button size="sm" onClick={() => setPaying(r)}>
              Record payment
            </Button>
          ) : null
        }
      />
      {paying && (
        <PaymentForm
          invoice={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            qc.invalidateQueries({ queryKey: ['resource', '/invoices'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
          }}
        />
      )}
    </>
  );
}

function PaymentForm({ invoice, onClose, onSaved }: { invoice: Row; onClose: () => void; onSaved: () => void }) {
  const balance = Math.round((Number(invoice.total) - Number(invoice.paid)) * 100) / 100;
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState('BANK');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(today());
  const save = useMutation({
    mutationFn: () => api(`/invoices/${invoice.id}/payments`, { method: 'POST', body: { amount: Number(amount), method, reference: reference || null, date } }),
    onSuccess: onSaved,
  });
  return (
    <Modal title={`Record payment · ${invoice.number}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <ErrorBox error={save.error} />
        <p className="text-sm text-slate-500">
          Outstanding balance: <span className="font-semibold text-slate-900">{fmtMoney(balance)}</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" required min={0.01} max={balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {['BANK', 'CASH', 'CARD', 'CHEQUE'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Record payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
