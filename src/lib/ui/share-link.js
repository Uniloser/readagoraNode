export async function shareLink({ title, text, url, promptLabel = 'Copy this link' }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text ? `${text}\n${url}` : url);
    return 'copied';
  }

  window.prompt(promptLabel, text ? `${text}\n${url}` : url);
  return 'prompted';
}
