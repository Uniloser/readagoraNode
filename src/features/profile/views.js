// Profile views are split by task so each area can evolve independently.
import { createProfileDashboardViews } from './dashboard.js';
import { createProfileRewardsViews } from './rewards-wallet.js';
import { createProfileSupportViews } from './support.js';
import { createProfileAnalyticsViews } from './analytics.js';

export function createProfileViews(deps) {
  return {
    ...createProfileDashboardViews(deps),
    ...createProfileRewardsViews(deps),
    ...createProfileSupportViews(deps),
    ...createProfileAnalyticsViews(deps),
  };
}
