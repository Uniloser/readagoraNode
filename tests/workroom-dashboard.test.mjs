import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkroomDashboardViews } from '../src/features/workroom/dashboard-views.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function dashboard(state = {}) {
  const views = createWorkroomDashboardViews({
    state: {
      pageLoading: false,
      pageData: {
        stories: [{ id: 'one', title: 'A story', status: 'draft', genre: 'Fantasy', view_count: 7 }],
        analytics: { totals: { reads: 12, likes: 3 } },
      },
      workroomQuery: '',
      workroomStatus: 'all',
      ...state,
    },
    esc: escape,
    icon: name => `<svg data-icon="${name}"></svg>`,
    image: (url, title) => `<img alt="${escape(title)}"/>`,
    termsField: () => '',
    safeText: value => value,
  });
  return views.workroomView();
}

test('workroom dashboard has creator navigation and keeps stories management available', () => {
  const html = dashboard();

  assert.match(html, /class="workroom-dashboard-heading"/);
  assert.match(html, /aria-label="Creator dashboard"/);
  assert.match(html, /href="\/workroom" data-link aria-current="page"/);
  assert.match(html, /href="\/profile\/author-analytics" data-link/);
  assert.match(html, /href="\/profile\/creator-center" data-link/);
  assert.match(html, /href="\/profile\/promotions" data-link/);
  assert.match(html, /href="\/profile\/author-center" data-link/);
  assert.match(html, /data-action="new-story"/);
  assert.match(html, /id="your-stories"/);
  assert.match(html, /A story/);
});

test('dashboard safely displays the creator name from their profile', () => {
  const html = dashboard({
    user: { display_name: '<Creator>' },
    session: { user: { user_metadata: { username: 'fallback' } } },
  });

  assert.match(html, /&lt;Creator&gt;/);
  assert.doesNotMatch(html, /<b><Creator><\/b>/);
});
