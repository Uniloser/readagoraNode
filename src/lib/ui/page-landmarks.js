// Legacy feature views share one accessible page entry point. Keep visible
// headings supplied by each feature, and provide a semantic title when a
// compact dashboard intentionally starts with cards or tabs.
export function enhancePageLandmarks(app, title) {
  const main = app.querySelector('main');
  if (!main) return;
  if (!main.id) main.id = 'readagora-main';
  main.tabIndex = -1;

  let heading = main.querySelector('h1');
  if (!heading) {
    heading = document.createElement('h1');
    heading.className = 'sr-only';
    heading.textContent = title || 'ReadAgora';
    main.prepend(heading);
  }
  if (!heading.id) heading.id = 'readagora-page-heading';
  main.setAttribute('aria-labelledby', heading.id);

  const skip = document.createElement('a');
  skip.className = 'skip-to-content';
  skip.href = `#${main.id}`;
  skip.textContent = 'Skip to content';
  app.prepend(skip);
}
