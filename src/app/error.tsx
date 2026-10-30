'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="not-found"><span className="eyebrow">A SMALL PAUSE</span><h1>That page didn’t<br />load this time.</h1><p>Try again in a moment.</p><button className="button button-dark" onClick={reset}>Try again ↻</button></main>; }
