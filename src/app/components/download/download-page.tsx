import { DownloadFooter, DownloadHeader } from './download-site';

type DownloadPageProps = { apkUrl: string; playStoreUrl: string; uptodownUrl: string };

const benefits = [
  ['01', 'Discover', 'Explore original stories, new voices, and hidden gems.'],
  ['02', 'Write', 'Share your ideas, publish your stories, and find your readers.'],
  ['03', 'Connect', 'Meet a community of readers and writers who love stories.'],
];
function LineIcon({ kind }: { kind: 'book' | 'write' | 'people' | 'download' | 'android' | 'play' | 'check' }) {
  const paths = {
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Zm0 0v13.2A2.5 2.5 0 0 1 6.5 16H20',
    write: 'm15 5 4 4M4 20l4.2-.9L20 7.3 16.7 4 4.9 15.8 4 20Z',
    people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m16-11a4 4 0 0 1 0 8m3 3v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
    android: 'M5 8h14v10H5zM8 4 6 2m10 2 2-2M8 12h.01M16 12h.01M3 9v7m18-7v7M8 18v3m8-3v3',
    play: 'm8 5 11 7-11 7V5Z',
    check: 'm5 12 4 4L19 6',
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>;
}

export function DownloadPage({ apkUrl, playStoreUrl, uptodownUrl }: DownloadPageProps) {
  const questions = [
    ['Is ReadAgora free?', 'The ReadAgora website is free to use. Android download availability appears in the release information below.'],
    ['Is this an official ReadAgora APK?', apkUrl ? 'Yes. This page links to the configured official HTTPS release.' : 'No official APK URL is configured for this site build yet.'],
    ...(apkUrl ? [
      ['Why does Android ask permission to install an APK?', 'Android asks you to approve app installations from outside an app store. You can allow your browser for this installation and keep your other security settings enabled.'],
      ['Will I receive updates?', 'Update behavior depends on how ReadAgora was installed. Check this page for future releases; automatic updates are not guaranteed for direct APK installations.'],
    ] : []),
  ];
  return <div className="download-site">
    <DownloadHeader />
    <main id="download-main" className="download-main">
      <section className="download-hero" aria-labelledby="download-title">
        <span className="download-eyebrow">A home for readers and writers</span>
        <h1 id="download-title">Read. Write.<br />Discover.</h1>
        <p className="download-subhead">Stories worth finding. A community worth joining.</p>
        <p className="download-description">ReadAgora is a space for readers and writers to discover stories, publish their work, and connect with people who love good writing.</p>
        <div className="download-visual" aria-label="Illustration of the ReadAgora app on a phone">
          <div className="download-orbit download-orbit-one" aria-hidden="true" /><div className="download-orbit download-orbit-two" aria-hidden="true" />
          <div className="phone-frame"><div className="phone-speaker" aria-hidden="true" /><div className="phone-screen"><div className="phone-status"><span>9:41</span><span>● ● ▰</span></div><div className="phone-brand"><span>ReadAgora</span><span>⌕</span></div><p className="phone-kicker">YOUR NEXT CHAPTER</p><div className="phone-cover"><span>STORIES<br />TO STAY<br />WITH YOU</span><small>READAGORA ORIGINAL</small></div><div className="phone-story-title">Find a story<br />that feels like yours.</div><div className="phone-lines"><i /><i /><i /></div><div className="phone-bottom"><span>⌂</span><span>⌕</span><span>▤</span><span>♡</span><span>◉</span></div></div></div>
          <span className="visual-caption">A quieter place to find your next story.</span>
        </div>
        <div className="download-hero-actions">
          {apkUrl ? <a className="download-button primary-download" href={apkUrl} download><LineIcon kind="android" />Download for Android <span aria-hidden="true">↓</span></a> : <span className="download-button primary-download unavailable-button" aria-disabled="true"><LineIcon kind="android" />Android release not available yet</span>}
          <div className="store-shortcuts">{playStoreUrl ? <a className="download-button secondary-download" href={playStoreUrl} target="_blank" rel="noopener noreferrer"><LineIcon kind="play" />Google Play<span className="external-note">Opens in a new tab</span></a> : <span className="download-button secondary-download store-disabled">Google Play <small>Not listed</small></span>}{uptodownUrl ? <a className="download-button secondary-download" href={uptodownUrl} target="_blank" rel="noopener noreferrer">Uptodown<span className="external-note">Opens in a new tab</span></a> : <span className="download-button secondary-download store-disabled">Uptodown <small>Not listed</small></span>}</div>
          <p className="download-version">Android app <span>·</span> {apkUrl || playStoreUrl || uptodownUrl ? 'Free to download' : 'Release pending'}</p>
        </div>
      </section>
      <section className="download-benefits" aria-labelledby="benefits-title"><div className="download-section-heading"><span className="download-eyebrow">A little more than a library</span><h2 id="benefits-title">Made for the love of stories.</h2></div><div className="benefit-grid">{benefits.map(([number,title,description],index)=><article className="benefit-card" key={title}><span className="benefit-icon"><LineIcon kind={index===0?'book':index===1?'write':'people'}/></span><span className="benefit-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section id="official-apk" className="official-apk" aria-labelledby="apk-title"><div className="apk-heading"><span className="apk-emblem"><LineIcon kind="android"/></span><div><span className="download-eyebrow">Direct from ReadAgora</span><h2 id="apk-title">Official APK</h2><p>{apkUrl ? 'Download the signed Android release directly from ReadAgora.' : 'A direct download will appear here when a signed Android release is ready.'}</p></div></div>{apkUrl && <div className="apk-details"><span><LineIcon kind="check"/> Official ReadAgora release</span><span><LineIcon kind="check"/> HTTPS download</span><span><LineIcon kind="check"/> Signed Android app</span></div>}<div className="apk-release">{apkUrl ? <><p>The official Android release is available.</p><a className="download-button primary-download apk-download-button" href={apkUrl} download><LineIcon kind="download"/>Download APK</a></> : <div className="apk-coming-soon"><strong>No official APK release is configured yet</strong><span>We’ll publish a download here when a signed release is ready.</span></div>}</div>{!apkUrl&&<p className="apk-note">This site build does not contain a signed release. We don’t distribute debug builds.</p>}</section>
      {apkUrl && <section className="install-guide" aria-labelledby="install-title"><div className="download-section-heading"><span className="download-eyebrow">From download to your home screen</span><h2 id="install-title">How to install ReadAgora</h2></div><ol className="install-steps">{[['Download','Tap Download APK to save ReadAgora to your device.'],['Open','Open the downloaded APK from your browser or Downloads folder.'],['Allow installation','If Android asks for permission, allow your browser to install apps from this source.'],['Install','Tap Install and open ReadAgora when installation is complete.']].map(([title,description],index)=><li key={title}><span className="step-number">{index+1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol><p className="safety-notice">Only install ReadAgora from readagora.com or an official app store. You do not need to turn off device security protections.</p></section>}
      <section className="store-section" aria-labelledby="store-title"><div className="download-section-heading"><span className="download-eyebrow">Your choice</span><h2 id="store-title">Prefer an app store?</h2></div><div className="store-grid"><article className="store-card"><span className="store-mark"><LineIcon kind="play"/></span><div><h3>Google Play</h3><p>{playStoreUrl?'Install ReadAgora from Google Play.':'The ReadAgora listing is not configured yet.'}</p></div>{playStoreUrl?<a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="text-arrow">Get it on Google Play <span aria-hidden="true">↗</span></a>:<span className="coming-label">Not listed</span>}</article><article className="store-card"><span className="uptodown-mark" aria-hidden="true">U</span><div><h3>Uptodown</h3><p>{uptodownUrl?'View the ReadAgora release on Uptodown.':'No ReadAgora listing is configured yet.'}</p></div>{uptodownUrl?<a href={uptodownUrl} target="_blank" rel="noopener noreferrer" className="text-arrow">View on Uptodown <span aria-hidden="true">↗</span></a>:<span className="coming-label">Not listed</span>}</article></div></section>
      <section className="release-section" aria-labelledby="release-title"><div><span className="download-eyebrow">Release information</span><h2 id="release-title">Android release</h2></div><dl className="release-information"><div><dt>Availability</dt><dd>{apkUrl||playStoreUrl||uptodownUrl?'Available from configured source':'Release pending'}</dd></div><div><dt>Format</dt><dd>Android app</dd></div><div><dt>Price</dt><dd>Free to download</dd></div></dl></section>
      <section className="download-faq" aria-labelledby="faq-title"><div className="download-section-heading"><span className="download-eyebrow">Good to know</span><h2 id="faq-title">A few quick answers.</h2></div><div className="faq-list">{questions.map(([question,answer],index)=><details className="faq-item" key={question} open={index===0}><summary>{question}<span aria-hidden="true">+</span></summary><p className="faq-answer">{answer}</p></details>)}</div></section>
    </main>
    <DownloadFooter />
  </div>;
}
