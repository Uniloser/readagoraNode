const validPreferences = new Set(['system', 'light', 'dark']);

export function readThemePreference() {
  const activePreference = typeof document === 'undefined' ? '' : document.documentElement.dataset.themePreference;
  if (validPreferences.has(activePreference)) return activePreference;
  try {
    const preference = window.localStorage.getItem('readagora-theme');
    return validPreferences.has(preference) ? preference : 'system';
  } catch {
    return 'system';
  }
}

export function storeThemePreference(preference) {
  try { window.localStorage.setItem('readagora-theme', preference); } catch { /* Keep the current preference in memory. */ }
}
