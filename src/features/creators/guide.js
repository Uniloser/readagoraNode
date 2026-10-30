const guides = {
  'Start creating': {
    eyebrow: '01 / YOUR FIRST CHAPTER', title: 'Turn an idea into a world.',
    intro: 'Start with a story you want to tell. Build it at your pace, then invite readers in.',
    cards: [
      ['Set up your creator identity', 'Sign in, choose a recognisable display name, and add a short bio.', 'Edit your profile', '/profile/settings'],
      ['Create your first draft', 'Choose text fiction or a comic, add a title and genre, and introduce the central conflict.', 'Create a story', '/create/story'],
      ['Build the reading experience', 'Add chapters for written stories or arrange vertical panels for comics. Use a clear cover and check images on a phone.'],
      ['Publish when you are ready', 'Review your story and chapters, then publish when they are ready for readers.', 'Open the Workroom', '/workroom'],
    ],
  },
  'Platform & rewards': {
    eyebrow: '02 / LIFE ON READAGORA', title: 'Create. Connect. Keep growing.',
    intro: 'ReadAgora brings stories, comics, and readers together. Here is how to participate and understand your progress.',
    cards: [
      ['How readers find your work', 'Readers browse discovery shelves, search by title or genre, and follow authors. A clear cover and description help them decide what to open.'],
      ['Understand your audience', 'Author tools bring together your stories, reads, followers, and story activity.', 'Explore Author Center', '/profile/author-center'],
      ['How rewards work today', 'Gems are in-app rewards. Cash payments and withdrawals are not available.', 'View your Gems', '/profile/gems'],
      ['Rewards and initiatives', 'Check available achievements, challenges, requirements, and Gem prizes.', 'See current rewards', '/profile/rewards'],
    ],
  },
  'Get discovered': {
    eyebrow: '03 / BUILD YOUR AUDIENCE', title: 'Give readers a reason to return.',
    intro: 'Build an audience through memorable work and steady connection. Learn what brings readers back.',
    cards: [
      ['Make the first impression count', 'Use a cover that reads well at thumbnail size, a specific title, and a concise description.'],
      ['Build momentum', 'Publish consistently, invite readers to follow you, and respond thoughtfully to comments.', 'Open Analytics', '/profile/author-analytics'],
      ['Review promotion options', 'ReadAgora promotions use Gems and are subject to current campaign availability.', 'View promotions', '/profile/promotions'],
      ['Share where readers gather', 'Post excerpts and chapter announcements in relevant reading communities, following their sharing rules.'],
    ],
  },
};

export function renderCreatorGuide(state, esc) {
  const active = guides[state.creatorGuideTab] ? state.creatorGuideTab : 'Start creating';
  const guide = guides[active];
  return `<main class="workspace creator-guide"><a class="back-link" href="/" data-link>← Back to discovery</a><nav class="segmented creator-guide-tabs" aria-label="Creator guide sections">${Object.keys(guides).map(tab => `<button type="button" data-creator-tab="${esc(tab)}" class="${tab === active ? 'selected' : ''}" aria-pressed="${tab === active}">${esc(tab)}</button>`).join('')}</nav><section class="creator-guide-hero"><span class="eyebrow">${guide.eyebrow}</span><h1>${guide.title}</h1><p>${guide.intro}</p></section><div class="creator-guide-cards">${guide.cards.map(([title, body, action, route]) => `<article class="panel"><h2>${title}</h2><p>${body}</p>${route ? `<a class="text-link" href="${route}" data-link>${action} →</a>` : ''}</article>`).join('')}</div><a class="primary-button" href="/create/story" data-link>Start your first story →</a></main>`;
}
