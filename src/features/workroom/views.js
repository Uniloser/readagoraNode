import { createWorkroomDashboardViews } from './dashboard-views.js';
import { createStorySettingsView } from './story-settings-view.js';
import { createChapterEditorView } from './chapter-editor-view.js';
import { createManuscriptImportView } from './manuscript-import-view.js';

export function createWorkroomViews(deps) {
  return {
    ...createWorkroomDashboardViews(deps),
    ...createStorySettingsView(deps),
    ...createChapterEditorView(deps),
    ...createManuscriptImportView(deps),
  };
}
