'use client';

import { useState, type FormEvent } from 'react';

export function SignInForm() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to sign in.');
      window.location.assign('/');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in.'); setPending(false); }
  }
  return <form className="auth-form" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button></form>;
}
