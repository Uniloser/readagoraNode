import type { Metadata, Viewport } from 'next';
import './download/download.css';
import './legacy/styles.css';
import './legacy/discover.css';
import './legacy/app-match.css';
import './legacy/workspace.css';
import './legacy/events.css';
import './legacy/promo.css';
import './legacy/placement-ads.css';
import './legacy/theme.css';
import './legacy/ux-improvements.css';
import './route-shell.css';
import './legacy/auth.css';
import './legacy/design-system.css';
import './legacy/reader-palette.css';
import './legacy/profile-navigation.css';
import './legacy/community-controls.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaRegister } from '@/components/pwa-register';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://readagora.com'),
  title: { default: 'ReadAgora.com — Find your next world', template: '%s · ReadAgora.com' },
  description: 'ReadAgora is a home for stories, comics, and independent creators. Discover your next world at ReadAgora.com.',
  applicationName: 'ReadAgora.com',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'ReadAgora.com',
    title: 'ReadAgora.com — Find your next world',
    description: 'Read stories and comics from independent creators. Find your next world on ReadAgora.',
    url: 'https://readagora.com/',
  },
  alternates: { canonical: '/' },
  icons: { icon: '/assets/mark.png', apple: '/assets/mark.png' },
};

export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'light dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <Script id="readagora-theme-init" strategy="beforeInteractive">
        {"try{var p=localStorage.getItem('readagora-theme')||'light';var m=matchMedia('(prefers-color-scheme: dark)');var apply=()=>{var d=p==='system'?m.matches:p==='dark';document.documentElement.dataset.themePreference=p;document.documentElement.dataset.theme=d?'dark':'light';var c=document.querySelector('meta[name=theme-color]');if(c)c.content=d?'#000000':'#f5f5f6'};apply();m.addEventListener('change',apply)}catch{document.documentElement.dataset.themePreference='light';document.documentElement.dataset.theme='light'}"}
      </Script>
    </head>
    <body><ThemeProvider><PwaRegister />{children}</ThemeProvider></body>
  </html>;
}
