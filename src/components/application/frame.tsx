"use client";

import { Suspense, type ReactNode } from 'react';
import { ApplicationProvider } from './provider';
import { ApplicationShell } from './shell';

function LoadingPage() {
  return <main className="workspace route-loading" role="status"><span className="eyebrow">READAGORA</span><h1>Loading your page</h1><span className="route-loading-indicator" aria-hidden="true" /></main>;
}

export function ApplicationFrame({ children }: { children: ReactNode }) {
  return <ApplicationProvider><Suspense fallback={<LoadingPage />}><ApplicationShell>{children}</ApplicationShell></Suspense></ApplicationProvider>;
}
