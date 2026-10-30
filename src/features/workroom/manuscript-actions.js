export function createManuscriptActions({ state, app, api, render, navigate }) {
  async function handleAction(action, button) {
    if (!['import-remove', 'import-move', 'import-commit', 'import-cancel'].includes(action)) return false;
    const job = state.workroomImport;
    const storyId = state.pageData?.story?.id;
    if (!job?.preview || !job.importId || job.storyId !== storyId || job.busy) return true;
    const current = () => state.page === 'manuscript-import' && state.workroomImport === job && state.pageData?.story?.id === storyId;
    job.preview.chapters = job.preview.chapters.map((chapter, index) => ({
      ...chapter, title: app.querySelector(`[data-import-title="${index}"]`)?.value.trim() ?? chapter.title,
    }));
    if (action === 'import-remove' || action === 'import-move') {
      const index = Number(button.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= job.preview.chapters.length) return true;
      if (action === 'import-remove') job.preview.chapters.splice(index, 1);
      else {
        const direction = Number(button.dataset.direction);
        const target = index + direction;
        if (![1, -1].includes(direction) || target < 0 || target >= job.preview.chapters.length) return true;
        [job.preview.chapters[index], job.preview.chapters[target]] = [job.preview.chapters[target], job.preview.chapters[index]];
      }
      render();
      return true;
    }
    job.busy = true;
    state.pageError = '';
    render();
    try {
      if (action === 'import-cancel') await api(`/imports/${encodeURIComponent(job.importId)}`, { method: 'DELETE' });
      else {
        const chapters = job.preview.chapters.map((chapter, index) => ({ title: chapter.title.trim(), html: chapter.html || '', order: index + 1 }));
        if (!chapters.length || chapters.some(chapter => !chapter.title || chapter.title.length > 255)) {
          throw new Error('Give every chapter a title of 1–255 characters, and keep at least one chapter.');
        }
        await api(`/imports/${encodeURIComponent(job.importId)}/commit`, { method: 'POST', body: { chapters } });
      }
      const shouldNavigate = current();
      if (state.workroomImport === job) state.workroomImport = null;
      if (shouldNavigate) navigate(`/workroom/story/${encodeURIComponent(storyId)}`);
    } catch (error) {
      if (current()) { state.pageError = error.message || 'The import could not be updated. Try again.'; }
    } finally {
      job.busy = false;
      if (current()) render();
    }
    return true;
  }
  return { handleAction };
}
