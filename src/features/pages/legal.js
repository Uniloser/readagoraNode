export function createLegalPages({ esc, header, footer, mobileTabs }) {
  function accountDeletionPage() {
    const deleted = new URLSearchParams(location.search).get('deleted') === '1';
    return `${header()}<main class="workspace policy-page"><a class="back-link" href="/profile/settings" data-link>Back to settings</a><span class="eyebrow">ACCOUNT &amp; PRIVACY</span><h1>Delete your ReadAgora account</h1>${deleted ? '<div class="notice" role="status"><strong>Account deleted.</strong><p>Your account and linked content have been removed.</p></div>' : ''}<p>You can permanently delete your signed-in account and its linked profile and content from Account Settings.</p><section><h2>Delete while signed in</h2><p>Open account settings and use the Delete account section. You will be asked to confirm before the request is submitted.</p><a class="primary-button" href="/profile/settings" data-link>Open account settings</a></section><section><h2>Request deletion without the app</h2><p>Email <a href="mailto:readagora.com@gmail.com?subject=Delete%20my%20ReadAgora%20account">readagora.com@gmail.com</a> from your registered email address. Include your username and the subject "Delete my ReadAgora account". We may verify account ownership before deleting it. Never send your password.</p></section><section><h2>Before you request deletion</h2><p>Save any work you want to keep. Account deletion removes access to your account and linked content as described in the <a href="/privacy" data-link>Privacy Policy</a>.</p></section></main>${footer()}${mobileTabs()}`;
  }

  function termsPage() {
    const sections = [
      ['Before you contribute', 'You must accept these terms before creating, uploading, or posting on ReadAgora. Keep your account secure and provide accurate profile information. You are responsible for the content you submit.'],
      ['Create responsibly', 'Only publish text, artwork, audio, or other material you own or have permission to use. Respect copyright and collaborators. Do not impersonate another person, plagiarise their work, or publish someone else\u2019s private information.'],
      ['Prohibited content and behaviour', 'Do not post sexual exploitation or abuse of children, pornography, threats, harassment, hateful attacks against protected groups, scams, spam, or content promoting violence or illegal activity. Do not encourage self-harm or expose another person\u2019s private information. These rules apply to stories, comics, covers, profiles, and comments.'],
      ['Reporting and moderation', 'Use Report on a story, user profile, or comment to identify content that breaks these rules. You can also report a problem from Settings. Block users to manage unwanted interactions. ReadAgora may remove content or restrict accounts after review. Contact readagora.com@gmail.com about urgent safety issues or to appeal a moderation decision. Never send your password.'],
      ['Rewards and payments', 'Gems are in-app rewards and are separate from creator cash earnings. Payout requests may be available to eligible creators only when payout processing is enabled and configured. Requests are reviewed, and transfers are handled manually; submitting a request does not guarantee approval or payment. ReadAgora Premium subscriptions are offered only where a supported store and configured subscription products are available. Prices, renewal terms, cancellation, and refunds are provided by the store before purchase.'],
      ['Leaving ReadAgora', 'You can request permanent account deletion through Settings. Save a copy of work you want to keep first. Account deletion ends access to your account and removes its linked content as described in the privacy policy.'],
    ];
    return `${header()}<main class="workspace policy-page"><a class="back-link" href="/community" data-link>← Back to community</a><span class="eyebrow">UPDATED OCTOBER 28, 2026</span><h1>Community terms</h1><p>These rules apply to stories, comics, covers, profiles, posts, and comments on ReadAgora.</p>${sections.map(([title,text]) => `<section><h2>${title}</h2><p>${text}</p></section>`).join('')}</main>${footer()}${mobileTabs()}`;
  }

  function policyPage(kind) {
    const sections = [
      ['Information you provide', 'We use your email and authentication information to secure your account. Your username, display name, bio, avatar, stories, comic panels, and comments power the profile and publishing features. Public profiles and published work are visible to other people.'],
      ['Activity and device information', 'We store reading progress, bookmarks, follows, likes, reading events, reward activity, and promotion interactions to operate ReadAgora and show creator statistics. If you enable notifications, we store a push token or browser subscription and its platform.'],
      ['How information is used', 'We use information to authenticate you, display stories, save progress, deliver notifications, measure reading activity, and handle safety reports. Supabase provides authentication, database, and file storage. Hosting providers process requests to run the service.'],
      ['Photos and notifications', 'Images you select for a cover, avatar, or comic are uploaded to ReadAgora. You can decline optional permissions. Uploaded image URLs may be publicly accessible, so do not upload confidential images.'],
      ['Storage and retention', 'Account information and content are retained while needed to provide the service. If you save a story for offline reading, its published free chapters and media are stored in this browser on this device until you remove the download or clear site data. Account deletion removes the login, profile, app-managed uploads, and linked content covered by the deletion process. Safety reports and de-identified records may remain where needed for safety and operations.'],
      ['Your choices', 'You can edit your profile, delete your content using creator tools, and block or report users. Manage browser notifications in ReadAgora Profile Settings and your browser or device settings. Manage mobile notifications in the ReadAgora mobile app or your device settings. Request access, correction, or deletion by contacting readagora.com@gmail.com.'],
      ['Contact', 'For privacy questions or requests, email readagora.com@gmail.com. We may ask you to verify account ownership before processing a request.'],
    ];
    return `${header()}<main class="workspace policy-page"><a class="back-link" href="/profile/settings" data-link>← Back to settings</a><span class="eyebrow">UPDATED OCTOBER 27, 2026</span><h1>Privacy policy</h1><p>How ReadAgora handles your account information and activity.</p>${sections.map(([title,text]) => `<section><h2>${title}</h2><p>${text}</p></section>`).join('')}</main>${footer()}${mobileTabs()}`;
  }


    return { accountDeletionPage, termsPage, policyPage };
  }


