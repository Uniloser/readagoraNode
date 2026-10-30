import { createProfileHomeViews } from './profile-home.js';
import { createProfileSettingsView } from './profile-settings.js';

export function createProfileDashboardViews(deps) {
  return {
    ...createProfileHomeViews(deps),
    ...createProfileSettingsView(deps),
  };
}
