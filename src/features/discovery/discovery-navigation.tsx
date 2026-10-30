import Link from 'next/link';

export function DiscoveryNavigation({ genres, moreGenres, activeGenre, activeFormat }: { genres: string[]; moreGenres: string[]; activeGenre: string; activeFormat: string }) {
  return <nav className="discover-tabs" aria-label="Explore stories">
    <Link className={`discover-tab ${activeGenre === 'all' && activeFormat === 'all' ? 'active' : ''}`} href="/">For you</Link>
    {genres.map((genre) => <Link key={genre} className={`discover-tab ${activeGenre === genre.toLocaleLowerCase() ? 'active' : ''}`} href={`/?genre=${encodeURIComponent(genre.toLocaleLowerCase())}`}>{genre}</Link>)}
    {moreGenres.length > 0 && <details className="genre-more"><summary className={`discover-tab ${moreGenres.some((genre) => genre.toLocaleLowerCase() === activeGenre) ? 'active' : ''}`}>More genres <span aria-hidden="true">⌄</span></summary><div className="genre-menu">{moreGenres.map((genre) => <Link key={genre} href={`/?genre=${encodeURIComponent(genre.toLocaleLowerCase())}`} aria-current={activeGenre === genre.toLocaleLowerCase() ? 'page' : undefined}>{genre}</Link>)}</div></details>}
    <Link className={`discover-tab ${activeFormat === 'comic' ? 'active' : ''}`} href="/?format=comic">Comics</Link>
  </nav>;
}
