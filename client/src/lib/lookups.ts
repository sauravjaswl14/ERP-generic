import { useQuery } from '@tanstack/react-query';
import { api, Page } from './api';

export interface Option {
  value: string;
  label: string;
}

export interface LookupDef {
  /** List endpoint, e.g. "/customers". Fetched with a large page size. */
  endpoint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  label: (row: any) => string;
}

export const L = {
  departments: { endpoint: '/departments', label: (r) => `${r.name} (${r.code})` },
  employees: { endpoint: '/employees', label: (r) => `${r.firstName} ${r.lastName} (${r.code})` },
  customers: { endpoint: '/customers', label: (r) => r.name },
  suppliers: { endpoint: '/suppliers', label: (r) => r.name },
  products: { endpoint: '/products', label: (r) => `${r.name} (${r.sku})` },
  warehouses: { endpoint: '/warehouses', label: (r) => `${r.name} (${r.code})` },
  accounts: { endpoint: '/accounts', label: (r) => `${r.code} · ${r.name}` },
  projects: { endpoint: '/projects', label: (r) => `${r.name} (${r.code})` },
  users: { endpoint: '/users/options', label: (r) => r.name },
} satisfies Record<string, LookupDef>;

export function useLookup(def: LookupDef | undefined) {
  return useQuery({
    queryKey: ['lookup', def?.endpoint],
    enabled: !!def,
    staleTime: 30_000,
    queryFn: async (): Promise<Option[]> => {
      const sep = def!.endpoint.includes('?') ? '&' : '?';
      const r = await api<Page<unknown>>(`${def!.endpoint}${sep}pageSize=200`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return r.data.map((row: any) => ({ value: row.id as string, label: def!.label(row) }));
    },
  });
}
