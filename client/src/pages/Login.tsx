import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { lastWorkspace, useAuth } from '../lib/auth';
import { Button, ErrorBox } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const [workspace, setWorkspace] = useState(lastWorkspace);
  const [email, setEmail] = useState('admin@erp.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const config = useQuery({ queryKey: ['tenant-config'], queryFn: () => api<{ signupEnabled: boolean }>('/tenants/config') });

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(workspace, email, password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-900 via-slate-900 to-slate-900 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 font-semibold text-white">E</span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">ERP Suite</h1>
            <p className="text-xs text-slate-500">Sign in to your workspace</p>
          </div>
        </div>
        <ErrorBox error={error} />
        <label className="label" htmlFor="workspace">
          Workspace
        </label>
        <input
          id="workspace"
          className="input"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="your-company"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
        />
        <p className="mb-4 mt-1 text-xs text-slate-400">The short name your company chose when it signed up.</p>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" className="input mb-4" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" className="input mb-6" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        {config.data?.signupEnabled && (
          <p className="mt-4 text-center text-sm text-slate-500">
            New here?{' '}
            <Link to="/signup" className="text-brand-600 hover:underline">
              Create a workspace
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
