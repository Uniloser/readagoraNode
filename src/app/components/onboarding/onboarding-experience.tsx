'use client';

import { type KeyboardEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './onboarding.module.css';

const slides = [
  { mark: '01', icon: '▤', kicker: 'FIND YOUR NEXT FAVORITE', title: 'Stories worth discovering', body: 'Discover original stories from emerging writers and find a new world to get lost in.' },
  { mark: '02', icon: '⌑', kicker: 'MAKE READING YOURS', title: 'Read your way', body: 'Follow stories, shape your reading experience, and pick up right where you stopped.' },
  { mark: '03', icon: '✧', kicker: 'FOR READERS AND WRITERS', title: 'Write. Share. Connect.', body: 'Publish your stories, build an audience, and meet readers and writers who get it.' },
];
const COMPLETED_KEY = 'readagora-onboarding-complete-v1';

export default function OnboardingExperience() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let complete = false;
    try { complete = localStorage.getItem(COMPLETED_KEY) === 'true'; } catch { /* Continue when storage is disabled. */ }
    if (complete) router.replace('/');
    else setReady(true);
  }, [router]);

  function finish() {
    try { localStorage.setItem(COMPLETED_KEY, 'true'); } catch { /* Discovery still opens without storage. */ }
    router.push('/');
  }
  function advance() { if (active === slides.length - 1) finish(); else setActive(value => value + 1); }
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowRight') setActive(value => Math.min(slides.length - 1, value + 1));
    if (event.key === 'ArrowLeft') setActive(value => Math.max(0, value - 1));
  }
  const slide = slides[active];
  if (!ready) return <main className={styles.loading} aria-label="Loading ReadAgora" />;
  return <main className={styles.page} onKeyDown={onKeyDown}>
    <div className={styles.frame}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="ReadAgora home"><span className={styles.brandMark}>R</span><span>readagora</span></a>
        <span className={styles.counter}>{String(active + 1).padStart(2, '0')} <i>/</i> 03</span>
      </header>
      <section className={styles.content} aria-live="polite" aria-atomic="true">
        <div className={styles.art} aria-hidden="true"><div className={styles.artRing} /><span className={styles.artIcon}>{slide.icon}</span><span className={styles.artIndex}>{slide.mark}</span><i className={styles.artDot} /></div>
        <div className={styles.copy}><span className={styles.kicker}>{slide.kicker}</span><h1>{slide.title}</h1><p>{slide.body}</p></div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.progress} role="group" aria-label="Onboarding steps">{slides.map((item, index) => <button key={item.mark} type="button" aria-label={'Go to step ' + (index + 1)} aria-current={active === index ? 'step' : undefined} className={active === index ? styles.progressActive : ''} onClick={() => setActive(index)} />)}</div>
        <div className={styles.actions}>{active > 0 && <button type="button" className={styles.back} onClick={() => setActive(value => value - 1)}>Back</button>}<button type="button" className={styles.continue} onClick={advance}>{active === slides.length - 1 ? 'Start exploring' : 'Continue'}<span aria-hidden="true">→</span></button></div>
        <a className={styles.signin} href="/login">Already have an account? <b>Sign in</b></a>
      </footer>
    </div>
  </main>;
}
