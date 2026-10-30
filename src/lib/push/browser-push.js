export function supportsBrowserPush() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

export async function getBrowserPushState() {
  if (!supportsBrowserPush()) return { supported: false, enabled: false, permission: 'unsupported' };
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    return { supported: true, enabled: Boolean(subscription), permission: Notification.permission };
  } catch {
    return { supported: true, enabled: false, permission: Notification.permission };
  }
}

function decodeApplicationKey(value) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`;
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function subscribeBrowserPush(api, publicKey) {
  if (!supportsBrowserPush()) throw new Error('This browser does not support push notifications.');
  if (!publicKey) throw new Error('Browser notifications are not configured for this ReadAgora website yet.');
  if (!window.isSecureContext) throw new Error('Browser notifications require HTTPS.');

  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Allow notifications for ReadAgora in your browser settings to continue.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeApplicationKey(publicKey) });
  await api('/push-tokens', { method: 'POST', body: { token: JSON.stringify(subscription), platform: 'web' } });
  return true;
}

export async function unsubscribeBrowserPush(api) {
  if (!supportsBrowserPush()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (!subscription) return false;

  const token = JSON.stringify(subscription);
  try {
    await api('/push-tokens', { method: 'DELETE', body: { token } });
  } finally {
    await subscription.unsubscribe();
  }
  return false;
}
