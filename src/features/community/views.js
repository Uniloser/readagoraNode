import { authIntentHref } from '../auth/redirects.js';

export function createCommunityViews(deps) {
  const { state, esc, icon, image, author, termsField } = deps;

  function communityView() {
    const posts = state.pageData?.items || [];
    const tabs = [['for-you', 'For you'], ['following', 'Following'], ['discussions', 'Discussions'], ['saved', 'Saved']];
    const sidebar = state.pageData?.sidebar || { discussions: [], writers: [] };
    const errors = state.pageData?.communityErrors || {};
    const composer = state.session
      ? `<button class="community-compose-prompt" data-action="open-community-composer"><span class="avatar-fallback">${esc((state.user?.display_name || state.user?.username || '?').slice(0, 1).toUpperCase())}</span><span>Share something with the community...</span><b aria-hidden="true">+</b></button>`
      : `<div class="community-compose-prompt"><span>Join the conversation around your next read.</span><a class="primary-button" href="${authIntentHref('/community')}" data-link>Sign in to post</a></div>`;
    const people = sidebar.writers || [];
    const discussionItems = sidebar.discussions || [];
    const emptyMessage = state.communityTab === 'following' && !state.session
      ? 'Sign in to see posts from writers you follow.'
      : state.communityTab === 'saved' && !state.session
        ? 'Sign in to see your saved community posts.'
        : 'Be the first to start a conversation.';
    const feed = errors.feed
      ? `<div class="empty-panel" role="alert"><h2>Community posts could not load</h2><p>${esc(errors.feed)}</p><button class="outline-button" data-action="community-retry">Try again</button></div>`
      : posts.length
      ? posts.map(communityPostCard).join('')
      : `<div class="empty-panel"><h2>No posts here yet</h2><p>${emptyMessage}</p>${state.session ? '<button class="outline-button" data-action="open-community-composer">Create a post</button>' : ''}</div>`;
    const retry = '<button type="button" class="subtle-button" data-action="community-retry">Try again</button>';
    const discussions = errors.sidebar
      ? `<p class="community-rail-empty">Popular discussions could not load. ${retry}</p>`
      : discussionItems.length
        ? discussionItems.slice(0, 4).map(item => `<a class="community-trending" href="/community/post/${encodeURIComponent(item.id)}" data-link><b>${esc(item.content || 'Community discussion').slice(0, 86)}</b><span>${Number(item.comment_count || 0).toLocaleString()} replies · @${esc(item.user?.username || 'reader')}</span></a>`).join('')
        : '<p class="community-rail-empty">New conversations are waiting to happen.</p>';
    const writers = errors.sidebar
      ? `<p class="community-rail-empty">Writer suggestions could not load. ${retry}</p>`
      : people.length
        ? people.slice(0, 5).map(person => `<div class="community-person"><a class="community-person-link" href="/creator/${encodeURIComponent(person.username)}" data-link>${person.avatar_url ? `<img src="${esc(person.avatar_url)}" alt=""/>` : `<span class="avatar-fallback">${esc((person.display_name || person.username || '?').slice(0, 1).toUpperCase())}</span>`}<span><b>${esc(person.display_name || person.username)}</b><small>@${esc(person.username || '')}</small></span></a>${state.session && person.id !== state.user?.id ? `<button class="community-follow" data-action="community-follow" data-id="${esc(person.id)}">Follow</button>` : ''}</div>`).join('')
        : '<p class="community-rail-empty">Creator suggestions will show up here.</p>';
    return `<div class="community-layout"><section class="community-main"><div class="community-tabs" role="group" aria-label="Community feed">${tabs.map(([id, label]) => `<button aria-pressed="${(state.communityTab || 'for-you') === id}" class="${(state.communityTab || 'for-you') === id ? 'selected' : ''}" data-action="community-tab" data-tab="${id}">${label}</button>`).join('')}</div>${composer}<div class="post-list">${feed}</div>${state.communityLoadError ? `<div class="notice error-notice" role="alert">${esc(state.communityLoadError)} <button class="subtle-button" data-action="community-load-more">Try again</button></div>` : ''}${state.pageData?.next_offset != null ? `<button class="community-load-more" data-action="community-load-more" ${state.communityLoadingMore ? 'disabled aria-busy="true"' : ''}>${state.communityLoadingMore ? 'Loading posts' : 'Load more posts'}</button>` : ''}</section><aside class="community-rail"><section class="community-rail-card"><div class="community-rail-heading"><span class="eyebrow">TRENDING NOW</span><h2>Popular discussions</h2></div>${discussions}</section><section class="community-rail-card"><div class="community-rail-heading"><span class="eyebrow">FIND YOUR PEOPLE</span><h2>Writers to follow</h2></div>${writers}</section><section class="community-guidelines"><b>Keep it welcoming.</b><p>Share your thoughts, respect creators, and report anything that doesn't belong.</p><a href="/terms" data-link>Community guidelines &#8594;</a></section></aside></div>`;
  }

  function communityPostCard(post) {
    const name = post.user?.display_name || post.user?.username || 'ReadAgora reader';
    const avatar = post.user?.avatar_url ? `<img src="${esc(post.user.avatar_url)}" alt=""/>` : `<span class="avatar-fallback">${esc(name.slice(0,1).toUpperCase())}</span>`;
    const date = post.created_at && !Number.isNaN(Date.parse(post.created_at)) ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(post.created_at)) : '';
    const pollOptions = post.poll_options || [];
    const pollCounts = post.poll_counts || [];
    const totalVotes = pollCounts.reduce((sum, count) => sum + Number(count || 0), 0);
    const hidden = post.contains_spoiler && !state.revealedPosts?.includes(post.id);
    const poll = pollOptions.length ? `<div class="community-poll">${pollOptions.map((option, index) => { const selected = Number(post.my_vote) === index; const percent = totalVotes ? Math.round(Number(pollCounts[index] || 0) / totalVotes * 100) : 0; return `<button class="community-poll-option ${selected ? 'is-selected' : ''}" data-action="community-vote" data-id="${esc(post.id)}" data-index="${index}" ${post.my_vote != null ? 'disabled' : ''}><i style="width:${post.my_vote != null ? percent : 0}%"></i><span>${esc(option)}</span>${post.my_vote != null ? `<b>${percent}%</b>` : ''}</button>`; }).join('')}<small>${post.my_vote != null ? `${totalVotes} votes` : 'Choose one'}</small></div>` : '';
    const story = post.story ? `<a class="post-story" href="/story/${encodeURIComponent(post.story.id)}" data-link>${image(post.story.cover_url, post.story.title)}<span><b>${esc(post.story.title)}</b><small>${esc(post.story.author?.display_name || post.story.author?.username || 'Story')}</small></span><span class="community-story-arrow">↗</span></a>` : '';
    const imageAttachment = post.image_url ? `<img class="community-post-image" src="${esc(post.image_url)}" alt="Post attachment" loading="lazy"/>` : '';
    const ownPost = state.session && post.user_id === state.user?.id;
    const likes = Number(post.like_count || 0);
    const comments = Number(post.comment_count || 0);
    const postActions = `<footer class="post-actions community-post-actions"><button type="button" data-action="post-like" data-id="${esc(post.id)}" data-enabled="${Boolean(post.liked)}" aria-pressed="${Boolean(post.liked)}" aria-label="${post.liked ? 'Unlike' : 'Like'} post; ${likes.toLocaleString()} ${likes === 1 ? 'like' : 'likes'}" title="${post.liked ? 'Unlike' : 'Like'} post">${icon('heart', 'post-action-icon')}<span class="post-action-count">${likes.toLocaleString()}</span><span class="post-action-label">${likes === 1 ? 'Like' : 'Likes'}</span></button><a href="/community/post/${encodeURIComponent(post.id)}" data-link aria-label="View ${comments.toLocaleString()} ${comments === 1 ? 'comment' : 'comments'}" title="View comments">${icon('community', 'post-action-icon')}<span class="post-action-count">${comments.toLocaleString()}</span><span class="post-action-label">${comments === 1 ? 'Comment' : 'Comments'}</span></a><button type="button" data-action="post-save" data-id="${esc(post.id)}" data-enabled="${Boolean(post.saved)}" aria-pressed="${Boolean(post.saved)}" aria-label="${post.saved ? 'Remove saved post' : 'Save post'}" title="${post.saved ? 'Remove saved post' : 'Save post'}">${icon('library', 'post-action-icon')}<span class="post-action-label">${post.saved ? 'Saved' : 'Save'}</span></button><button type="button" data-action="community-share" data-id="${esc(post.id)}" aria-label="Share post" title="Share post" aria-live="polite">${icon('share', 'post-action-icon')}<span class="post-action-label">Share</span></button></footer>`;
    const menu = state.session ? `<details class="community-post-menu"><summary aria-label="More post actions">⋯</summary>${ownPost ? `<button data-action="community-edit" data-id="${esc(post.id)}">Edit post</button><button data-action="community-delete" data-id="${esc(post.id)}">Delete post</button>` : `<button data-action="community-report" data-id="${esc(post.id)}" data-user="${esc(post.user_id || '')}">Report post</button><button data-action="community-block" data-id="${esc(post.id)}" data-user="${esc(post.user_id || '')}" data-username="${esc(post.user?.username || 'reader')}">Block writer</button>`}</details>` : '';
    return `<article class="post-card community-post-card" data-post-id="${esc(post.id)}"><header class="community-post-header"><a class="community-post-author" href="/creator/${encodeURIComponent(post.user?.username || '')}" data-link>${avatar}<span><b>${esc(name)}</b><small>@${esc(post.user?.username || 'reader')} <i>·</i> ${esc(date)}</small></span></a><span class="post-kind">${esc((post.post_type || 'post').replaceAll('_',' '))}</span>${menu}</header>${hidden ? `<button class="community-spoiler" data-action="community-reveal" data-id="${esc(post.id)}"><b>Spoiler hidden</b><span>Tap to reveal this post</span></button>` : `<div class="community-post-body">${post.content ? `<p class="post-content">${esc(post.content)}</p>` : ''}${imageAttachment}${story}${poll}</div>`}${postActions}</article>`;
  }
  
  function communityComposerModal() {
    const stories = (state.pageData?.myStories || []).filter(item => item.status === 'published');
    return `<div class="modal-backdrop community-modal-backdrop" data-community-modal><section class="modal-card community-composer-modal" role="dialog" aria-modal="true" aria-labelledby="community-composer-title"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><span class="eyebrow">COMMUNITY</span><h2 id="community-composer-title">Create a post</h2>${state.pageData?.communityErrors?.myStories ? `<div class="notice error-notice" role="alert">Your stories could not load: ${esc(state.pageData.communityErrors.myStories)} <button type="button" class="subtle-button" data-action="community-retry">Try again</button></div>` : ""}<form data-form="post"><label>Post type<select name="post_type"><option value="post">Post</option><option value="discussion">Discussion</option><option value="announcement">Announcement</option><option value="chapter">Chapter update</option><option value="poll">Poll</option></select></label><label>What’s on your mind?<textarea name="content" maxlength="4000" required placeholder="Share something with the community…"></textarea></label><label>Attach a story<select name="story_id"><option value="">No story attached</option>${stories.map(item => `<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('')}</select></label><label>Attach a chapter<select name="chapter_id" disabled><option value="">Choose a story first</option></select></label><label>Attach an image<input type="file" name="image" accept="image/*"/></label><label class="check-label"><input type="checkbox" name="contains_spoiler"/> Contains spoilers</label><div class="community-poll-fields" hidden><label>Poll options <small>Add 2–4 options, one per line.</small><textarea name="poll_options" placeholder="Option one&#10;Option two"></textarea></label></div>${termsField()}<div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Publish post</button></form></section></div>`;
  }
  
  function communityPostView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Loading community post...</div>';
    if (!state.pageData && state.pageError) return `<div class="empty-panel" role="alert"><h2>Community post could not load</h2><p>${esc(state.pageError)}</p><button class="outline-button" data-action="community-post-retry">Try again</button></div>`;
    const post = state.pageData?.post;
    const comments = state.pageData?.comments || [];
    if (!post) return '<div class="empty-panel">Post not found.</div>';
    const replyTarget = comments.find(comment => comment.id === state.communityCommentReply);
    const loginHref = authIntentHref(`${location.pathname}${location.search}`, { action: 'comment' });
    const commentItems = comments.map(comment => {
      const own = comment.user_id === state.session?.user?.id;
      return `<article class="comment ${comment.parent_comment_id ? 'comment-reply' : ''}"><b>${esc(comment.user?.display_name || comment.user?.username || 'Reader')}</b><small>${comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}</small><p>${esc(comment.content)}</p>${state.session ? `<div class="comment-actions"><button type="button" data-action="community-comment-reply" data-id="${esc(comment.id)}" data-author="${esc(comment.user?.username || 'reader')}">Reply</button>${own ? `<button type="button" data-action="community-comment-edit" data-id="${esc(comment.id)}">Edit</button><button type="button" data-action="community-comment-delete" data-id="${esc(comment.id)}">Delete</button>` : ''}</div>` : ''}</article>`;
    }).join('');
    return `<div class="community-detail-layout"><div>${communityPostCard(post)}<section class="panel community-comments"><div class="community-rail-heading"><span class="eyebrow">KEEP THE CONVERSATION GOING</span><h2>${Number(post.comment_count || comments.length).toLocaleString()} comments</h2></div>${state.session ? `<form data-form="post-comment"><input type="hidden" name="post_id" value="${esc(post.id)}"/><input type="hidden" name="parent_comment_id" value="${esc(replyTarget?.id || '')}"/>${replyTarget ? `<p class="comment-reply-context">Replying to @${esc(replyTarget.user?.username || 'reader')} <button type="button" data-action="community-comment-cancel">Cancel</button></p>` : ''}<textarea name="content" required maxlength="2000" placeholder="${replyTarget ? 'Write a reply?' : 'Write a thoughtful reply?'}"></textarea>${termsField()}<button class="primary-button" type="submit">${replyTarget ? 'Post reply' : 'Reply'}</button><div class="form-message"></div></form>` : `<p><a href="${loginHref}" data-link>Sign in</a> to join the conversation.</p>`}<div class="comment-list" aria-live="polite">${commentItems || '<p class="muted-copy">No comments yet. Start the conversation.</p>'}</div>${state.communityCommentsError ? `<div class="notice error-notice" role="alert">${esc(state.communityCommentsError)} <button type="button" class="subtle-button" data-action="community-comment-load-more">Try again</button></div>` : ''}${state.pageData?.commentsNextOffset != null ? `<button type="button" class="community-load-more" data-action="community-comment-load-more" ${state.communityCommentsLoading ? 'disabled aria-busy="true"' : ''}>${state.communityCommentsLoading ? 'Loading replies' : 'Load more replies'}</button>` : ''}</section></div></div>`;
  }

  return { communityView, communityPostCard, communityComposerModal, communityPostView };
}
