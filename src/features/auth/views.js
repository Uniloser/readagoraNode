import { authIntentHref, safeInternalPath } from './redirects.js';

export function createAuthViews({ state, esc, header, footer, mobileTabs }) {
  function returnContext() {
    const params = new URLSearchParams(location.search);
    const next = safeInternalPath(params.get('next') || params.get('returnTo') || '/');
    const requestedAction = params.get('action') || params.get('intent') || '';
    const action = ['default', 'bookmark', 'follow', 'comment'].includes(requestedAction) ? requestedAction : '';
    const entityId = params.get('entityId')?.slice(0, 128) || '';
    return { next, action, entityId };
  }

  function authHref(path, { next, action, entityId }) {
    const params = new URLSearchParams();
    if (next && next !== '/') params.set('next', next);
    if (action) params.set('action', action);
    if (entityId) params.set('entityId', entityId);
    const query = params.toString();
    return `${path}${query ? `?${query}` : ''}`;
  }

  function identity() {
    return '<a class="auth-identity" href="/" data-link><img src="/assets/mascot.png" alt=""/><span>readagora</span><small>Stories stay with you.</small></a>';
  }

  function authLandingPage() {
    const context = returnContext();
    const emailHref = authHref('/login', context);
    const signupHref = authHref('/signup', context);
    return `<main class="auth-page auth-page--landing">
      <section class="auth-landing-main">${identity()}
        <h1>Welcome to<br/>ReadAgora</h1>
        <p class="auth-intro">Stories, readers, and creators<br/>in one place.</p>
        <div class="auth-landing-actions">
          <a class="auth-choice auth-choice--outline" href="${emailHref}" data-link><span class="auth-choice-icon" aria-hidden="true">✉</span>Continue with Email</a>
          <button class="auth-choice auth-choice--light" type="button" data-action="google-signin" data-next="${esc(context.next)}" data-intent-action="${esc(context.action)}" data-entity-id="${esc(context.entityId)}"><span class="auth-choice-icon" aria-hidden="true">G</span>Continue with Google</button>
          ${state.authNotice ? `<p class="auth-notice" role="alert">${esc(state.authNotice)}</p>` : ''}
        </div>
        <div class="auth-or"><span>OR</span></div>
        <a class="auth-browse" href="/" data-link>Continue browsing</a>
        <a class="auth-choice auth-choice--outline auth-create-choice" href="${signupHref}" data-link>Create an account<span class="auth-choice-arrow" aria-hidden="true">→</span></a>
      </section>
      <div class="auth-decoration auth-decoration--left"><img src="/assets/mascot.png" alt=""/></div>
      <p class="auth-slogan auth-slogan--right">Good stories,<br/>brighter days.</p>
      <footer class="auth-legal-footer">By continuing, you agree to our<br/><a href="/terms" data-link>Terms</a><span>·</span><a href="/privacy" data-link>Privacy</a></footer>
    </main>`;
  }

  function authPage(mode = 'login') {
    const isLogin = mode === 'login';
    const isSignup = mode === 'signup';
    const isForgot = mode === 'forgot-password';
    const isReset = mode === 'reset-password';
    const confirmationRequired = isSignup && Boolean(state.authConfirmationEmail);
    const context = returnContext();
    const signupHref = authHref('/signup', context);
    const loginHref = authHref('/login', context);
    const title = confirmationRequired ? 'Check your inbox' : isSignup ? 'Create your account' : isForgot ? 'Reset your password' : isReset ? 'Choose a new password' : 'Welcome back, reader.';
    const intro = confirmationRequired
      ? `We sent a confirmation link to ${esc(state.authConfirmationEmail)}. Open it to activate your account.`
      : isSignup ? 'Join readers and creators building worlds worth returning to.'
        : isForgot ? 'Enter the email address on your account. We will send you a secure reset link.'
          : isReset ? 'Choose a new password to get back to your ReadAgora account.' : 'Return to your next chapter.';
    const formType = isSignup ? 'signup' : isForgot ? 'forgot' : isReset ? 'reset' : 'login';
    const submitLabel = isSignup ? 'Create account' : isForgot ? 'Send reset link' : isReset ? 'Save new password' : 'Sign in';
    const activeFormType = confirmationRequired ? 'resend-confirmation' : formType;
    const activeSubmitLabel = confirmationRequired ? state.authConfirmationSent ? 'Email sent' : 'Resend confirmation email' : submitLabel;
    const fields = [
      isSignup ? '<label>Username<input name="username" autocomplete="username" autocapitalize="none" minlength="3" maxlength="30" pattern="[A-Za-z0-9_]{3,30}" title="Use 3-30 letters, numbers, or underscores" placeholder="your_username" required/><small>3–30 characters: letters, numbers, underscores</small></label>' : '',
      !isReset ? '<label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required/></label>' : '',
      !isForgot ? `<label>${isReset ? 'New password' : 'Password'}<span class="auth-password-field"><input name="password" type="password" autocomplete="${isSignup || isReset ? 'new-password' : 'current-password'}" minlength="8" placeholder="${isReset || isSignup ? 'Create a password' : 'Your password'}" required/><button type="button" data-action="toggle-password" aria-pressed="false">Show</button></span>${isSignup || isReset ? '<small>At least 8 characters</small>' : ''}</label>` : '',
      isSignup ? '<label>Confirm password<span class="auth-password-field"><input name="confirm_password" type="password" autocomplete="new-password" minlength="8" placeholder="Repeat your password" required/><button type="button" data-action="toggle-password" aria-pressed="false">Show</button></span></label>' : '',
    ].join('');
    const activeFields = confirmationRequired ? `<input type="hidden" name="email" value="${esc(state.authConfirmationEmail)}"/>` : fields;
    const switchLink = isSignup ? `Already have an account? <a href="${loginHref}" data-link>Sign in →</a>`
      : !isReset && !isForgot ? `New here? <a href="${signupHref}" data-link>Create an account →</a>`
        : '<a href="/login" data-link>Back to sign in</a>';
    const forgotLink = !confirmationRequired && !isSignup && !isForgot && !isReset ? '<a class="auth-forgot" href="/forgot-password" data-link>Forgot password?</a>' : '';
    const confirmationMessage = state.authConfirmationSent && confirmationRequired ? 'Confirmation email sent.' : '';
    const authNotice = state.authNotice ? `<p class="form-message is-error" role="alert">${esc(state.authNotice)}</p>` : '';
    const slogan = isSignup ? 'hurry up<br/>already' : isLogin ? 'More<br/>stories<br/>ahead.' : 'Stories stay<br/>with you.';
    return `<main class="auth-page auth-page--${mode}">
      <section class="auth-form-shell">${identity()}
        <h1>${title}</h1><p class="auth-intro">${intro}</p>
        <form data-form="${activeFormType}">${activeFields}${forgotLink}<div class="form-message" aria-live="polite">${confirmationMessage}</div><button class="primary-button auth-submit" type="submit" ${state.authConfirmationSent && confirmationRequired ? 'disabled' : ''}>${activeSubmitLabel}</button></form>
        ${authNotice}
        <nav class="auth-policy-links" aria-label="Policies"><a href="/privacy" data-link>Privacy policy</a><a href="/terms" data-link>Community terms</a></nav>
        <p class="auth-account-switch">${switchLink}</p>
      </section>
      <p class="auth-slogan auth-slogan--left">${slogan}</p><div class="auth-decoration auth-decoration--right"><img src="/assets/mascot.png" alt=""/></div>
    </main>`;
  }

  function signedOutPage(destination) {
    const safePath = safeInternalPath(destination);
    const safeDestination = encodeURIComponent(safePath);
    return `${header()}<main class="workspace sign-in-prompt"><div class="empty-panel"><img src="/assets/mark.png" alt=""/><h1>Sign in to continue</h1><p>Use your ReadAgora account to access your library, community, and workroom.</p><a class="primary-button" href="${authIntentHref(safePath)}" data-link>Sign in <span>→</span></a><a class="text-link" href="/signup?next=${safeDestination}" data-link>Create an account</a></div></main>${footer()}${mobileTabs()}`;
  }

  return { authPage, authLandingPage, signedOutPage };
}
