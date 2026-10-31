import ResourcePage from '../components/ResourcePage';
import { Badge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { canWrite } from '../lib/access';
import { enumOptions, fmtMoney } from '../lib/format';
import { L } from '../lib/lookups';

const LEAD_STATUS = enumOptions(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']);

export function Leads() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Leads"
      subtitle="Track prospects through the sales pipeline."
      singular="lead"
      endpoint="/leads"
      searchable
      canWrite={canWrite(user?.role, 'crm')}
      canDelete
      filters={[{ name: 'status', label: 'Status', options: LEAD_STATUS }]}
      columns={[
        {
          header: 'Lead',
          cell: (r) => (
            <div>
              <div className="font-medium text-slate-900">{r.name}</div>
              <div className="text-xs text-slate-500">{r.company ?? r.email ?? ''}</div>
            </div>
          ),
        },
        { header: 'Source', cell: (r) => r.source ?? '—' },
        { header: 'Owner', cell: (r) => r.owner?.name ?? '—' },
        { header: 'Value', cell: (r) => <span className="tabular-nums">{fmtMoney(r.value)}</span> },
        { header: 'Status', cell: (r) => <Badge value={r.status} /> },
      ]}
      fields={[
        { name: 'name', label: 'Contact name', required: true },
        { name: 'company', label: 'Company' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'source', label: 'Source', help: 'Referral, website, event…' },
        { name: 'value', label: 'Estimated value', type: 'number', min: 0 },
        { name: 'status', label: 'Status', type: 'select', required: true, options: LEAD_STATUS },
        { name: 'ownerId', label: 'Owner', type: 'select', lookup: L.users },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
    />
  );
}

export function Customers() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Customers"
      singular="customer"
      endpoint="/customers"
      searchable
      canWrite={canWrite(user?.role, 'crm')}
      canDelete
      columns={[
        { header: 'Name', cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: 'Email', cell: (r) => r.email ?? '—' },
        { header: 'Phone', cell: (r) => r.phone ?? '—' },
        { header: 'Tax ID', cell: (r) => r.taxId ?? '—' },
        { header: 'Credit limit', cell: (r) => <span className="tabular-nums">{fmtMoney(r.creditLimit)}</span> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'taxId', label: 'Tax / VAT ID' },
        { name: 'creditLimit', label: 'Credit limit', type: 'number', min: 0 },
        { name: 'address', label: 'Address', type: 'textarea' },
      ]}
    />
  );
}
