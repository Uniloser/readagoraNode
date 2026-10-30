import Link from 'next/link';
import Image from 'next/image';

export function SiteFooter() {
  return <footer className="site-footer"><Link href="/" className="brand"><Image className="brand-image" src="/assets/mark.png" alt="" width={28} height={28} /><span>readagora</span></Link><p>Stories stay with you.</p><span>Made for readers and the people who create their next world.</span></footer>;
}
