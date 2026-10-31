import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, ErrorBox, Spinner } from '../components/ui';

/** "Acme Trading Pvt. Ltd." -> "acme-trading-pvt-ltd" */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

export default function Signup() {
  const { user, register } = useAuth();
  const config = useQuery({ queryKey: ['tenant-config'], queryFn: () => api<{ signupEnabled: boolean }>('/tenants/config') });
  const [companyName, setCompanyName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [workspaceEdited, setWorkspaceEdited] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  if (config.isLoading) return <Spinner />;

  if (!config.data?.signupEnabled) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-slate-900">Sign-up is closed</h1>
        <p className="mt-2 text-sm text-slate-500">New workspaces are created by an administrator. Ask them to set one up for you, then sign in.</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </Shell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ companyName, workspace, adminName, email, password });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={submit}>
        <h1 className="text-lg font-semibold text-slate-900">Create your workspace</h1>
        <p className="mb-5 mt-1 text-xs text-slate-500">You will be its administrator and can invite your team afterwards.</p>
        <ErrorBox error={error} />
        <label className="label" htmlFor="company">
          Company name
        </label>
        <input
          id="company"
          className="input mb-4"
          required
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            if (!workspaceEdited) setWorkspace(slugify(e.target.value));
          }}
        />
        <label className="label" htmlFor="workspace">
          Workspace name
        </label>
        <input
          id="workspace"
          className="input"
          required
          autoCapitalize="none"
          spellCheck={false}
          pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
          title="3-40 lowercase letters, numbers or hyphens"
          value={workspace}
          onChange={(e) => {
            setWorkspace(e.target.value.toLowerCase());
            setWorkspaceEdited(true);
          }}
        />
        <p className="mb-4 mt-1 text-xs text-slate-400">Everyone in your company enters this when signing in.</p>
        <label className="label" htmlFor="adminName">
          Your name
        </label>
        <input id="adminName" className="input mb-4" required value={adminName} onChange={(e) => setAdminName(e.target.value)} />
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" className="input mb-4" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" className="input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="mb-6 mt-1 text-xs text-slate-400">At least 8 characters.</p>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create workspace'}
        </Button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have one?{' '}
          <Link to="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-900 via-slate-900 to-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">{children}</div>
    </div>
  );
}
