import Image from 'next/image';

export function DownloadHeader({ about = false }: { about?: boolean }) {
  return <>
    <a className="download-skip" href="#download-main">Skip to content</a>
    <header className="download-header"><div className="download-header-inner">
      <a className="download-brand" href="/download" aria-label="ReadAgora downloads home"><span>ReadAgora</span><span className="brand-badge">BETA</span></a>
      <nav className="download-nav" aria-label="Download site navigation"><a href="/download" aria-current={!about ? 'page' : undefined}>Home</a><a href="/download/about" aria-current={about ? 'page' : undefined}>About</a><a href="/">Read on the web</a></nav>
    </div></header>
  </>;
}

export function DownloadFooter() {
  return <footer className="download-footer"><a className="download-brand" href="/">ReadAgora<span className="brand-dot">.</span></a><span className="footer-tagline">Stories stay with you.</span><nav aria-label="Footer navigation"><a href="/terms">Community terms</a><a href="/privacy">Privacy policy</a><a href="/account-deletion">Account deletion</a><a href="mailto:readagora.com@gmail.com">Contact</a></nav></footer>;
}

export function DownloadMascot({ className = '' }: { className?: string }) {
  return <Image className={className} src="/assets/mascot.png" alt="ReadAgora bird mascot reading a book" width={280} height={280} />;
}
