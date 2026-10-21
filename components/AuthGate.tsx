import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { EndoCanvasLogo } from './EndoCanvasLogo';
import { SalsaLogo } from './SalsaLogo';

// Sign-in gate for the employee database.
//
// Until this existed the app had no authentication at all, and the Supabase
// policy shipped in supabase_schema.sql is `for all using (true)` -- so the
// anon key, which is necessarily public in a browser bundle, let anyone with
// the URL read, edit and delete every employee record.
//
// Enabling the gate alone does not fix that: the policy has to be tightened
// at the same time, or the data stays reachable by anyone who talks to the
// API directly instead of through this page. Both steps are in
// supabase_schema.sql.
//
// Off unless VITE_REQUIRE_AUTH is "true", deliberately. Turning a login
// screen on before the accounts exist locks everyone out of a tool people
// use for real work, and that is not a call to make on their behalf.
export const AUTH_REQUIRED = import.meta.env.VITE_REQUIRE_AUTH === 'true';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!AUTH_REQUIRED) { setChecking(false); return; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!AUTH_REQUIRED) return <>{children}</>;

  if (checking) {
    return <div className="fixed inset-0 bg-[#101010]" aria-busy="true" aria-label="Verificando sessão" />;
  }

  if (session) return <>{children}</>;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    // Supabase returns the same message for a wrong password and an unknown
    // address, which is the right behaviour -- it does not let the form be
    // used to find out who has an account.
    if (signInError) setError('E-mail ou senha incorretos.');
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-[#101010] p-6">
      <form onSubmit={signIn} className="w-full max-w-xs">
        <EndoCanvasLogo className="mx-auto h-10 w-auto fill-white" />
        <p className="mt-3 text-center text-xs text-white/50">Entre para acessar os cartões</p>

        <label className="mt-7 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50" htmlFor="auth-email">
          E-mail
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/30"
        />

        <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50" htmlFor="auth-password">
          Senha
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/30"
        />

        {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-full bg-white py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="mt-8 flex items-center justify-center gap-2 opacity-60">
          <span className="text-[9px] uppercase tracking-[0.15em] text-white/70">Powered by</span>
          <SalsaLogo variant="light" className="h-4 w-14" />
        </div>
      </form>
    </div>
  );
};
