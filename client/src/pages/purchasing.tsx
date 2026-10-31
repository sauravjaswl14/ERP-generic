import ResourcePage from '../components/ResourcePage';
import { useAuth } from '../lib/auth';
import { canWrite } from '../lib/access';

export function Suppliers() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Suppliers"
      singular="supplier"
      endpoint="/suppliers"
      searchable
      canWrite={canWrite(user?.role, 'purchasing')}
      canDelete
      columns={[
        { header: 'Name', cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: 'Email', cell: (r) => r.email ?? '—' },
        { header: 'Phone', cell: (r) => r.phone ?? '—' },
        { header: 'Tax ID', cell: (r) => r.taxId ?? '—' },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'taxId', label: 'Tax / VAT ID' },
        { name: 'address', label: 'Address', type: 'textarea' },
      ]}
    />
  );
}
