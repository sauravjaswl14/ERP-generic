import { ReactNode, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Page, qs } from '../lib/api';
import { Button, Card, Empty, ErrorBox, Modal, PageHeader, Pagination, Spinner, Table } from './ui';
import { FieldDef, FormField, initialValues, toPayload } from './FormField';
import { Option } from '../lib/lookups';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

export interface ColumnDef {
  header: string;
  cell: (row: Row) => ReactNode;
}

export interface FilterDef {
  name: string;
  label: string;
  options: Option[];
}

interface Props {
  title: string;
  subtitle?: string;
  /** Noun for buttons, e.g. "customer". */
  singular: string;
  endpoint: string;
  columns: ColumnDef[];
  fields?: FieldDef[];
  canWrite?: boolean;
  canDelete?: boolean;
  searchable?: boolean;
  filters?: FilterDef[];
  /** Extra buttons per row (approve/reject etc). */
  rowActions?: (row: Row, refresh: () => void) => ReactNode;
  /** Extra buttons in the page header. */
  headerActions?: ReactNode;
  deleteLabel?: string;
}

const PAGE_SIZE = 15;

export default function ResourcePage(p: Props) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const key = ['resource', p.endpoint, page, q, filterValues];
  const list = useQuery({
    queryKey: key,
    queryFn: () => api<Page<Row>>(`${p.endpoint}${qs({ page, pageSize: PAGE_SIZE, q, ...filterValues })}`),
    placeholderData: (prev) => prev,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['resource', p.endpoint] });
    qc.invalidateQueries({ queryKey: ['lookup'] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => api(`${p.endpoint}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setActionError(null);
      refresh();
    },
    onError: setActionError,
  });

  const hasActions = !!p.rowActions || (p.canWrite && !!p.fields?.length) || (p.canDelete && p.canWrite);
  const rows = list.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <>
            {p.headerActions}
            {p.canWrite && p.fields?.length ? <Button onClick={() => setEditing('new')}>+ New {p.singular}</Button> : null}
          </>
        }
      />

      <Card>
        {(p.searchable || p.filters?.length) && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            {p.searchable && (
              <input
                className="input max-w-xs"
                placeholder="Search…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            )}
            {p.filters?.map((f) => (
              <select
                key={f.name}
                className="input w-auto"
                aria-label={f.label}
                value={filterValues[f.name] ?? ''}
                onChange={(e) => {
                  setFilterValues((s) => ({ ...s, [f.name]: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">{f.label}: all</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}

        <div className="px-4 pt-4 empty:hidden">
          <ErrorBox error={actionError ?? (list.isError ? list.error : null)} />
        </div>

        {list.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty>No {p.title.toLowerCase()} found.</Empty>
        ) : (
          <Table head={[...p.columns.map((c) => c.header), ...(hasActions ? [''] : [])]}>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                {p.columns.map((c, i) => (
                  <td key={i} className="td">
                    {c.cell(row)}
                  </td>
                ))}
                {hasActions && (
                  <td className="td whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1.5">
                      {p.rowActions?.(row, refresh)}
                      {p.canWrite && p.fields?.length ? (
                        <Button variant="secondary" size="sm" onClick={() => setEditing(row)}>
                          Edit
                        </Button>
                      ) : null}
                      {p.canWrite && p.canDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          disabled={remove.isPending}
                          onClick={() => {
                            if (window.confirm(`${p.deleteLabel ?? 'Delete'} this ${p.singular}?`)) remove.mutate(row.id);
                          }}
                        >
                          {p.deleteLabel ?? 'Delete'}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={list.data?.total ?? 0} onPage={setPage} />
      </Card>

      {editing && p.fields && (
        <RecordForm
          title={`${editing === 'new' ? 'New' : 'Edit'} ${p.singular}`}
          endpoint={p.endpoint}
          fields={p.fields}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setActionError(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function RecordForm({
  title,
  endpoint,
  fields,
  row,
  onClose,
  onSaved,
}: {
  title: string;
  endpoint: string;
  fields: FieldDef[];
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState(() => initialValues(fields, row));
  const creating = !row;
  const save = useMutation({
    mutationFn: () =>
      api(creating ? endpoint : `${endpoint}/${row.id}`, {
        method: creating ? 'POST' : 'PUT',
        body: toPayload(fields, values, creating),
      }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <ErrorBox error={save.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <FormField key={f.name} field={f} creating={creating} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
