import { createProfileHomeViews } from './profile-home.js';
import { createProfileSettingsView } from './profile-settings.js';
import { createPayoutRequestView } from './payout-request.js';

export function createProfileDashboardViews(deps) {
  return {
    ...createProfileHomeViews(deps),
    ...createProfileSettingsView(deps),
    payoutRequestView: createPayoutRequestView(deps),
  };
}
