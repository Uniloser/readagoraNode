'use client';
export function SignOutButton() { return <button className="button button-dark" onClick={async () => { await fetch('/api/auth/signout', { method: 'POST' }); window.location.assign('/'); }}>Sign out</button>; }
