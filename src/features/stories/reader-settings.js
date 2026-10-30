export function bindReaderSettings({ state, app, speechPlayer, applyReaderSettings, saveReaderSettings }) {
  app.querySelectorAll('[data-font]').forEach(button => button.addEventListener('click', () => {
    state.readerSettings.size = Math.max(16, Math.min(24, state.readerSettings.size + Number(button.dataset.font) * 2));
    const sizeInput = app.querySelector('[data-reader-setting="size"]');
    if (sizeInput) sizeInput.value = String(state.readerSettings.size);
    const output = app.querySelector('[data-reader-value="size"]');
    if (output) output.textContent = `${state.readerSettings.size}px`;
    applyReaderSettings(); saveReaderSettings();
  }));
  app.querySelectorAll('[data-reader-setting]').forEach(control => control.addEventListener(control.type === 'range' ? 'input' : 'change', () => {
    const { readerSetting: setting } = control.dataset;
    if (setting === 'autoPlayNext') state.readerSettings.autoPlayNext = control.checked;
    else if (setting === 'size' || setting === 'lineHeight' || setting === 'width') state.readerSettings[setting] = Number(control.value);
    else if (setting === 'font' && ['sans', 'serif'].includes(control.value)) state.readerSettings.font = control.value;
    else if (setting === 'theme' && ['night', 'warm', 'paper'].includes(control.value)) state.readerSettings.theme = control.value;
    const output = app.querySelector(`[data-reader-value="${setting}"]`);
    if (output) output.textContent = setting === 'size' ? `${state.readerSettings.size}px` : state.readerSettings.lineHeight.toFixed(2);
    applyReaderSettings(); saveReaderSettings();
  }));
  app.querySelectorAll('[data-reader-settings-close]').forEach(button => button.addEventListener('click', () => {
    const disclosure = button.closest('details');
    if (!disclosure) return;
    disclosure.open = false;
    disclosure.querySelector('summary')?.focus();
  }));
  app.querySelectorAll('.reader-settings').forEach(disclosure => disclosure.addEventListener('toggle', () => {
    if (!disclosure.open) return;
    app.querySelectorAll('.reader-settings').forEach(other => {
      if (other !== disclosure) other.open = false;
    });
  }));
  app.querySelectorAll('.story-more-actions, .reader-settings').forEach(disclosure => disclosure.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !disclosure.open) return;
    event.preventDefault();
    event.stopPropagation();
    disclosure.open = false;
    disclosure.querySelector('summary')?.focus();
  }));
  app.querySelector('[data-speech-rate]')?.addEventListener('change', event => speechPlayer.setRate(Number(event.currentTarget.value)));
  app.querySelector('[data-speech-voice]')?.addEventListener('change', event => speechPlayer.setVoice(event.currentTarget.value));
  app.querySelector('.theme-toggle')?.addEventListener('click', () => {
    state.readerSettings.theme = state.readerSettings.theme === 'paper' ? 'night' : state.readerSettings.theme === 'night' ? 'warm' : 'paper';
    const themeSelect = app.querySelector('[data-reader-setting="theme"]');
    if (themeSelect) themeSelect.value = state.readerSettings.theme;
    applyReaderSettings(); saveReaderSettings();
  });
  app.querySelectorAll('[data-reader-sidebar]').forEach(button => button.addEventListener('click', () => {
    state.readerSidebarCollapsed = !state.readerSidebarCollapsed;
    app.querySelector('.reader-layout')?.classList.toggle('sidebar-collapsed', state.readerSidebarCollapsed);
    app.querySelectorAll('[data-reader-sidebar]').forEach(toggle => {
      toggle.setAttribute('aria-expanded', String(!state.readerSidebarCollapsed));
      toggle.setAttribute('aria-label', `${state.readerSidebarCollapsed ? 'Show' : 'Hide'} chapter list`);
      toggle.title = `${state.readerSidebarCollapsed ? 'Show' : 'Hide'} chapter list`;
    });
    const reopen = app.querySelector('.reader-sidebar-reopen');
    if (reopen) reopen.hidden = !state.readerSidebarCollapsed;
  }));
}
