export function createComicEditorActions({ state, api, app, loadPage, render }) {
  const uploadsInProgress = new WeakSet();
  const editorContext = () => {
    const data = state.pageData;
    return { data, chapterId: data?.chapter?.id, storyId: data?.story?.id };
  };
  const isCurrent = view => state.page === 'chapter-editor' && state.pageData === view.data;
  async function updateEditor(view, operation, apply) {
    try {
      const result = await operation();
      if (isCurrent(view)) await apply(result);
    } catch (error) {
      if (isCurrent(view)) throw error;
    }
  }
  const reloadEditor = view => loadPage('chapter-editor', { storyId: view.storyId, chapterId: view.chapterId });
  async function handleAction(action, button) {
    if (action === 'comic-import-url') {
      state.comicImportUrlOpen = true;
      render();
      app.querySelector('[data-form="comic-url"] input')?.focus();
      return true;
    }
    if (action === 'comic-import-cancel') {
      state.comicImportUrlOpen = false;
      render();
      return true;
    }
    if (action === 'comic-preview') {
      state.comicPreviewOpen = true;
      render();
      app.querySelector('[data-comic-preview] [data-action="comic-preview-close"]')?.focus();
      return true;
    }
    if (action === 'comic-preview-close') {
      state.comicPreviewOpen = false;
      render();
      app.querySelector('[data-action="comic-preview"]')?.focus();
      return true;
    }
    if (action === 'comic-move-panel') {
      const view = editorContext();
      const panels = [...(state.pageData?.panels || [])];
      const index = panels.findIndex(panel => panel.id === button.dataset.id);
      const target = index + Number(button.dataset.direction);
      if (index < 0 || target < 0 || target >= panels.length) return true;
      [panels[index], panels[target]] = [panels[target], panels[index]];
      await updateEditor(view, () => api(`/chapters/${encodeURIComponent(view.chapterId)}/panels/reorder`, {
        method: 'PATCH',
        body: { panels: panels.map((panel, order) => ({ id: panel.id, panel_order: order + 1 })) },
      }), panels => { view.data.panels = panels; render(); });
      return true;
    }
    if (action === 'comic-duplicate-panel') {
      const view = editorContext();
      const chapter = state.pageData?.chapter;
      const panel = state.pageData?.panels?.find(item => item.id === button.dataset.id);
      if (!chapter || !panel) return true;
      await updateEditor(view, () => api(`/chapters/${encodeURIComponent(chapter.id)}/panels`, {
        method: 'POST',
        body: { image_url: panel.image_url, width: panel.width ?? null, height: panel.height ?? null },
      }), () => reloadEditor(view));
      return true;
    }
    if (action === 'delete-panel') {
      const view = editorContext();
      const chapter = state.pageData?.chapter;
      if (!chapter) return true;
      await updateEditor(view, () => api(`/panels/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' }), () => reloadEditor(view));
      return true;
    }
    return false;
  }

  async function handleForm(type, form, values) {
    if (type !== 'comic-url') return false;
    const url = new URL(String(values.image_url).trim());
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Image URLs must use HTTP or HTTPS.');
    const chapter = state.pageData?.chapter;
    const view = editorContext();
    if (!chapter) throw new Error('Open a comic chapter before adding a page.');
    await updateEditor(view, () => api(`/chapters/${encodeURIComponent(chapter.id)}/panels`, {
      method: 'POST',
      body: { image_url: url.toString(), width: null, height: null },
    }), async () => {
      state.comicImportUrlOpen = false;
      await reloadEditor(view);
    });
    return true;
  }

  function bindUploads() {
    app.querySelectorAll('[data-comic-upload]').forEach(input => input.addEventListener('change', async event => {
      const target = event.currentTarget;
      if (uploadsInProgress.has(target)) return;
      const files = [...target.files || []];
      const chapterId = state.pageData?.chapter?.id;
      const storyId = state.pageData?.story?.id;
      if (!files.length || !chapterId || !storyId) return;
      uploadsInProgress.add(target);
      target.disabled = true;
      target.setAttribute('aria-busy', 'true');
      try {
        for (const file of files) {
          const data = new FormData();
          data.append('file', file);
          const uploaded = await api('/uploads/panel', { method: 'POST', body: data });
          const panelId = target.dataset.panelId;
          if (panelId) {
            await api(`/panels/${encodeURIComponent(panelId)}`, {
              method: 'PATCH',
              body: { image_url: uploaded.url, width: uploaded.width ?? null, height: uploaded.height ?? null },
            });
            break;
          }
          await api(`/chapters/${encodeURIComponent(chapterId)}/panels`, {
            method: 'POST',
            body: { image_url: uploaded.url, width: uploaded.width ?? null, height: uploaded.height ?? null },
          });
        }
        if (location.pathname === `/workroom/story/${encodeURIComponent(storyId)}/chapter/${encodeURIComponent(chapterId)}`) {
          await loadPage('chapter-editor', { storyId, chapterId });
        }
      } catch (error) {
        if (location.pathname === `/workroom/story/${encodeURIComponent(storyId)}/chapter/${encodeURIComponent(chapterId)}`) {
          state.pageError = error.message || 'Could not upload the comic page.';
          render();
        }
      } finally {
        uploadsInProgress.delete(target);
        if (target.isConnected) {
          target.disabled = false;
          target.removeAttribute('aria-busy');
        }
      }
    }));
  }

  return { handleAction, handleForm, bindUploads };
}
