export function createPayoutRequestView({ state, esc }) {
  return function payoutRequestView() {
    if (state.pageLoading) return '<div class="page-loading" role="status">Loading payout options...</div>';
    if (!state.pageData && state.pageError) {
      return `<section class="empty-panel" role="alert"><h2>Payout options could not load</h2><p>${esc(state.pageError)}</p><button class="outline-button" type="button" data-action="profile-payout-retry">Try again</button></section>`;
    }

    const quote = state.pageData?.cashoutQuote;
    const error = state.pageData?.cashoutQuoteError;
    const currency = quote?.currency || 'ZMW';
    const notice = state.payoutRequestNotice;
    state.payoutRequestNotice = '';

    if (error) {
      return `<section class="panel"><div class="notice error-notice" role="alert">Payout options could not load: ${esc(error)} <button class="subtle-button" type="button" data-action="profile-payout-retry">Try again</button></div><a class="back-link" href="/profile/creator-center" data-link>← Back to Creator Center</a></section>`;
    }

    const form = quote?.enabled
      ? `<form class="payout-form" data-form="payout"><label>Amount (${esc(currency)})<input name="amount" type="number" min="${(Number(quote.minimumMinorUnits || 0) / 100).toFixed(2)}" step="0.01" required/></label><label>Payment method<select name="payout_method" required>${(quote.supportedMethods || []).map(method => `<option value="${esc(method)}">${esc(String(method).replaceAll('_', ' '))}</option>`).join('')}</select></label><label>Mobile money number<input name="destination" autocomplete="tel" minlength="8" maxlength="60" required/></label><div class="form-message" aria-live="polite"></div><button class="primary-button" type="submit">Submit payout request</button></form>`
      : `<div class="notice">Payout requests are currently unavailable. ${esc(quote?.reason || 'Payout policy is not configured.')}</div>`;

    return `${notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}<section class="panel"><a class="back-link" href="/profile/creator-center" data-link>← Back to Creator Center</a><span class="eyebrow">CREATOR PAYOUTS</span><h2>Request a payout</h2><p class="muted-copy">Balances are shown in USD; payout requests are submitted in ${esc(currency)}.</p>${form}</section>`;
  };
}
