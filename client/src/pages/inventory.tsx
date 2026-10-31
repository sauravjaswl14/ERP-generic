import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ResourcePage from '../components/ResourcePage';
import { FormField } from '../components/FormField';
import { Badge, Button, Card, Empty, ErrorBox, Modal, PageHeader, Spinner, Table } from '../components/ui';
import { api, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWrite } from '../lib/access';
import { enumOptions, fmtDateTime, fmtMoney, fmtNum } from '../lib/format';
import { L, useLookup } from '../lib/lookups';

export function Products() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Products"
      singular="product"
      endpoint="/products"
      searchable
      canWrite={canWrite(user?.role, 'inventory')}
      canDelete
      columns={[
        { header: 'SKU', cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
        {
          header: 'Name',
          cell: (r) => (
            <div>
              <div className="font-medium text-slate-900">{r.name}</div>
              <div className="text-xs text-slate-500">{r.category ?? ''}</div>
            </div>
          ),
        },
        { header: 'Unit', cell: (r) => r.unit },
        { header: 'Price', cell: (r) => <span className="tabular-nums">{fmtMoney(r.unitPrice)}</span> },
        { header: 'Avg. cost', cell: (r) => <span className="tabular-nums">{fmtMoney(r.costPrice)}</span> },
        { header: 'Reorder at', cell: (r) => r.reorderLevel },
        { header: 'Active', cell: (r) => <Badge value={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
      ]}
      fields={[
        { name: 'sku', label: 'SKU', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'category', label: 'Category' },
        { name: 'unit', label: 'Unit of measure', defaultValue: 'pcs', required: true },
        { name: 'unitPrice', label: 'Selling price', type: 'number', min: 0, defaultValue: 0 },
        { name: 'costPrice', label: 'Cost price', type: 'number', min: 0, defaultValue: 0 },
        { name: 'reorderLevel', label: 'Reorder level', type: 'number', min: 0, step: '1', defaultValue: 0 },
        { name: 'isActive', label: 'Active', type: 'checkbox', help: 'Product can be sold and purchased' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

export function Warehouses() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Warehouses"
      singular="warehouse"
      endpoint="/warehouses"
      searchable
      canWrite={canWrite(user?.role, 'inventory')}
      canDelete
      columns={[
        { header: 'Code', cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { header: 'Name', cell: (r) => r.name },
        { header: 'Location', cell: (r) => r.location ?? '—' },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'location', label: 'Location' },
      ]}
    />
  );
}

export function Movements() {
  return (
    <ResourcePage
      title="Stock movements"
      subtitle="An immutable history of every change to stock."
      singular="movement"
      endpoint="/inventory/movements"
      filters={[{ name: 'type', label: 'Type', options: enumOptions(['IN', 'OUT', 'ADJUST', 'TRANSFER_IN', 'TRANSFER_OUT']) }]}
      columns={[
        { header: 'When', cell: (r) => fmtDateTime(r.createdAt) },
        { header: 'Product', cell: (r) => `${r.product.name} (${r.product.sku})` },
        { header: 'Warehouse', cell: (r) => r.warehouse.name },
        { header: 'Type', cell: (r) => <Badge value={r.type} /> },
        { header: 'Qty', cell: (r) => <span className="tabular-nums">{fmtNum(r.quantity)}</span> },
        { header: 'Reference', cell: (r) => r.reference ?? r.note ?? '—' },
      ]}
    />
  );
}

// ───────────── Stock levels with adjust / transfer ─────────────
interface StockRow {
  id: string;
  quantity: number;
  totalOnHand: number;
  low: boolean;
  product: { id: string; sku: string; name: string; reorderLevel: number; unit: string };
  warehouse: { id: string; name: string };
}

export function Stock() {
  const { user } = useAuth();
  const write = canWrite(user?.role, 'inventory');
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [dialog, setDialog] = useState<null | 'adjust' | 'transfer'>(null);
  const warehouses = useLookup(L.warehouses);

  const stock = useQuery({
    queryKey: ['inventory-stock', q, warehouseId],
    queryFn: () => api<{ data: StockRow[] }>(`/inventory/stock${qs({ q, warehouseId })}`),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['inventory-stock'] });
    qc.invalidateQueries({ queryKey: ['resource', '/inventory/movements'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const rows = stock.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Stock levels"
        subtitle="On-hand quantity per product and warehouse. Rows are flagged when the product's total falls to its reorder level."
        actions={
          write && (
            <>
              <Button variant="secondary" onClick={() => setDialog('transfer')}>
                Transfer
              </Button>
              <Button onClick={() => setDialog('adjust')}>Adjust stock</Button>
            </>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <input className="input max-w-xs" placeholder="Search product or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input w-auto" aria-label="Warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {(warehouses.data ?? []).map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        {stock.isLoading ? (
          <Spinner />
        ) : stock.error ? (
          <div className="p-4">
            <ErrorBox error={stock.error} />
          </div>
        ) : rows.length === 0 ? (
          <Empty>No stock recorded yet. Receive a purchase order or adjust stock to add some.</Empty>
        ) : (
          <Table head={['Product', 'Warehouse', 'On hand', 'Total (all sites)', 'Reorder at', '']}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td">
                  <span className="font-medium text-slate-900">{r.product.name}</span> <span className="text-xs text-slate-400">{r.product.sku}</span>
                </td>
                <td className="td">{r.warehouse.name}</td>
                <td className="td tabular-nums">
                  {fmtNum(r.quantity)} {r.product.unit}
                </td>
                <td className="td tabular-nums">{fmtNum(r.totalOnHand)}</td>
                <td className="td tabular-nums">{r.product.reorderLevel}</td>
                <td className="td">{r.low && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">Low stock</span>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {dialog && (
        <StockDialog
          mode={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function StockDialog({ mode, onClose, onSaved }: { mode: 'adjust' | 'transfer'; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, string>>({ productId: '', warehouseId: '', fromWarehouseId: '', toWarehouseId: '', delta: '', quantity: '', note: '' });
  const set = (k: string) => (val: unknown) => setV((s) => ({ ...s, [k]: String(val) }));
  const save = useMutation({
    mutationFn: () =>
      mode === 'adjust'
        ? api('/inventory/adjust', { method: 'POST', body: { productId: v.productId, warehouseId: v.warehouseId, delta: Number(v.delta), note: v.note } })
        : api('/inventory/transfer', {
            method: 'POST',
            body: { productId: v.productId, fromWarehouseId: v.fromWarehouseId, toWarehouseId: v.toWarehouseId, quantity: Number(v.quantity), note: v.note || null },
          }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={mode === 'adjust' ? 'Adjust stock' : 'Transfer stock'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <ErrorBox error={save.error} />
        <FormField field={{ name: 'productId', label: 'Product', type: 'select', required: true, lookup: L.products }} value={v.productId} onChange={set('productId')} />
        {mode === 'adjust' ? (
          <>
            <FormField field={{ name: 'warehouseId', label: 'Warehouse', type: 'select', required: true, lookup: L.warehouses }} value={v.warehouseId} onChange={set('warehouseId')} />
            <FormField field={{ name: 'delta', label: 'Quantity change', type: 'number', required: true, step: '1', help: 'Positive to add stock, negative to remove it' }} value={v.delta} onChange={set('delta')} />
            <FormField field={{ name: 'note', label: 'Reason', type: 'textarea', required: true }} value={v.note} onChange={set('note')} />
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField field={{ name: 'fromWarehouseId', label: 'From', type: 'select', required: true, lookup: L.warehouses }} value={v.fromWarehouseId} onChange={set('fromWarehouseId')} />
              <FormField field={{ name: 'toWarehouseId', label: 'To', type: 'select', required: true, lookup: L.warehouses }} value={v.toWarehouseId} onChange={set('toWarehouseId')} />
            </div>
            <FormField field={{ name: 'quantity', label: 'Quantity', type: 'number', required: true, step: '1', min: 1 }} value={v.quantity} onChange={set('quantity')} />
            <FormField field={{ name: 'note', label: 'Note', type: 'textarea' }} value={v.note} onChange={set('note')} />
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : mode === 'adjust' ? 'Apply adjustment' : 'Transfer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
