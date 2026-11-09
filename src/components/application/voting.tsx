"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useApplication, useResource, type Data } from './provider';
import { Empty, enc, list, LoadState } from './ui';

import {UpvoteIcon} from './event-vote';

type PendingVote = { event: Data; story: Data };

export function VotingPage() {
  const { api, session, requireLogin } = useApplication();
  const resource = useResource(() => api('/events/voting'), [session?.user?.id]);
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const events = list(resource.data);
  const genreResource = useResource(() => api('/genres'), []);
  const [genre, setGenre] = useState('all');
  const rows = events.flatMap(event => list(event.entries).map(story => ({event, story})));
  const genres = [...new Set([...list(genreResource.data).map(item => String(item.name || item.genre || item)), ...rows.map(({story}) => story.genre || 'Original')])].sort();
  const visible = rows.filter(({story}) => genre === 'all' || (story.genre || 'Original') === genre);

  async function castVote() {
    if (!pendingVote || saving) return;
    if (!requireLogin()) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api('/events/' + enc(pendingVote.event.id) + '/vote', {
        method: 'POST',
        body: { storyId: pendingVote.story.id },
      });
      setPendingVote(null);
      setMessage('Your vote is in! You have helped shape the ReadAgora competition.');
      resource.reload();
    } catch (voteError) {
      setError((voteError as Error).message || 'Your vote could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function voteLabel(event: Data, story: Data) {
    if (session?.user?.id && story.author_id === session.user.id) return 'Not eligible';
    if (event.myVoteValidity === 'invalid') return 'Under review';
    if (event.myVote === story.id) return 'Your vote';
    if (!event.votingOpen) return 'Voting closed';
    if (event.myVote && !event.allow_vote_changes) return 'Vote already cast';
    return session ? 'Vote' : 'Sign in to vote';
  }

  return <div className="voting-browser">
    <h1 className="voting-sr-title">Community voting stories</h1>
    <aside className="voting-genres" aria-label="Filter stories by genre">
      <h2>Genres</h2>
      <nav aria-label="Story genres">
        <button type="button" aria-pressed={genre === 'all'} onClick={() => setGenre('all')}>All stories<span>{rows.length}</span></button>
        {genres.map(name => <button key={name} type="button" aria-pressed={genre === name} onClick={() => setGenre(name)}>{name}<span>{rows.filter(({story}) => (story.genre || 'Original') === name).length}</span></button>)}
      </nav>
      {genreResource.error && <button className="text-link" onClick={genreResource.reload}>Retry genres</button>}
    </aside>
    <div className="voting-stories">
    <LoadState resource={resource}>
      {visible.length ? <div className="voting-story-list" role="list" aria-label="Competition stories">{visible.map(({event, story}) => {
        const isSelected = event.myVote === story.id;
        const disabled = saving || Boolean(session?.user?.id && story.author_id === session.user.id) || event.myVoteValidity === 'invalid' || !event.votingOpen || (Boolean(event.myVote) && !event.allow_vote_changes) || isSelected;
        const storyUrl = '/story/' + enc(story.id) + '?event=' + enc(event.slug || event.id);
        const coverUrl = typeof story.cover_url === 'string' && /^https?:\/\//i.test(story.cover_url) ? story.cover_url : '';
        return <article className="voting-book" role="listitem" key={event.id + ':' + story.id}>
          <Link className="voting-book-cover" href={storyUrl} aria-label={'View ' + story.title}>
            {coverUrl ? <img src={coverUrl} alt={story.title + ' cover'} loading="lazy" /> : <div className="cover-fallback"><b>{story.title}</b></div>}
            {event.show_rankings !== false && story.rank && <span className="voting-book-rank">#{story.rank}</span>}
          </Link>
          <div className="voting-book-copy">
            <h2><Link href={storyUrl}>{story.title}</Link></h2>
            <div className="voting-book-meta"><span>{story.genre || 'Original'}</span><span>{story.votes === null ? 'Hidden' : Number(story.votes || 0).toLocaleString() + ' votes'}</span></div>
            <div className="voting-book-actions"><Link href={storyUrl}>View story</Link><button type="button" aria-label={voteLabel(event, story) + ' for ' + story.title} aria-pressed={isSelected} disabled={disabled} onClick={() => {
              if (!session) { requireLogin(); return; }
              setPendingVote({event, story});
            }}><UpvoteIcon/>{isSelected ? 'Voted' : 'Vote'}</button></div>
            <Link className="voting-book-event" href={'/events/' + enc(event.slug || event.id)}>{event.title}</Link>
          </div>
        </article>;
      })}</div> : <Empty>{genre !== 'all' ? 'No competition stories in this genre yet.' : 'Event stories will appear here when a challenge is published.'}{genre !== 'all' && <button className="text-link" onClick={() => setGenre('all')}>Show all stories</button>}</Empty>}
      {events.filter(event => event.nextOffset != null).map(event => <button key={event.id} className="outline-button voting-load-more" disabled={saving} onClick={async () => {
        setSaving(true); setError('');
        try { const next = await api('/events/' + enc(event.id) + '?offset=' + event.nextOffset); resource.setData((current: Data[]) => list(current).map(item => item.id === event.id ? {...next, entries: [...list(item.entries), ...list(next.entries)]} : item)); }
        catch (error) { setError((error as Error).message); }
        finally { setSaving(false); }
      }}>More stories from {event.title}</button>)}
    </LoadState>
    {message && <p className="event-vote-message" role="status">{message}</p>}
    {error && <p className="event-vote-message" role="alert">{error}</p>}
    {pendingVote && <div className="react-modal-backdrop">
      <section role="dialog" aria-modal="true" aria-labelledby="voting-confirm-title" className="react-modal">
        <h2 id="voting-confirm-title">Confirm your vote</h2>
        <p>{pendingVote.story.title}</p>
        <p>{pendingVote.event.allow_vote_changes ? 'You can change your vote until voting closes.' : 'Your vote is final after confirmation.'}</p>
        <button type="button" className="outline-button" disabled={saving} onClick={() => setPendingVote(null)}>Cancel</button>
        <button type="button" className="competition-primary" disabled={saving} onClick={() => void castVote()}>{saving ? 'Saving vote…' : 'Confirm vote'}</button>
      </section>
    </div>}
    </div>
  </div>;
}
