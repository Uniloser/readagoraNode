'use client';

import { useState } from 'react';

export function StoryCover({ src, title, featured = false }: { src?: string | null; title: string; featured?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="cover-fallback"><span>READAGORA</span><b>{title}</b></div>;
  return <img className={featured ? undefined : 'cover-image'} src={src} alt={`Cover of ${title}`} loading={featured ? 'eager' : 'lazy'} onError={() => setFailed(true)} />;
}
