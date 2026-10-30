import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
export default function NotFound() { return <><SiteHeader /><main className="not-found"><span className="eyebrow">PAGE NOT FOUND</span><h1>This page wandered<br />into another story.</h1><Link className="button button-dark" href="/">Back to discovery ↗</Link></main></>; }
