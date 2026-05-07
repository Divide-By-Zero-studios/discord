export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

export function getBaseUrl(req, configuredBaseUrl) {
  const normalized = normalizeBaseUrl(configuredBaseUrl);
  if (normalized) {
    return normalized;
  }

  return `${req.protocol}://${req.get('host')}`;
}

export function renderPage({ title, appName, content }) {
  const safeTitle = escapeHtml(title);
  const safeAppName = escapeHtml(appName);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} | ${safeAppName}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --text: #15191f;
      --muted: #596475;
      --panel: #ffffff;
      --line: #d9dee7;
      --accent: #176b64;
      --accent-strong: #0f4c48;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
    }
    main {
      width: min(920px, calc(100% - 32px));
      margin: 0 auto;
      padding: 56px 0;
    }
    header {
      border-bottom: 1px solid var(--line);
      margin-bottom: 28px;
      padding-bottom: 20px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 5vw, 3.5rem);
      line-height: 1.05;
      letter-spacing: 0;
    }
    h2 {
      margin: 32px 0 10px;
      font-size: 1.2rem;
      letter-spacing: 0;
    }
    p, li, dd {
      color: var(--muted);
      font-size: 1rem;
    }
    a { color: var(--accent); font-weight: 700; }
    dl {
      display: grid;
      gap: 14px;
      margin: 24px 0 0;
    }
    dt {
      color: var(--text);
      font-weight: 800;
    }
    dd {
      margin: 4px 0 0;
      overflow-wrap: anywhere;
    }
    code {
      background: #eef2f5;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: #28313f;
      display: inline-block;
      max-width: 100%;
      padding: 2px 7px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 22px;
    }
    .button {
      align-items: center;
      background: var(--accent);
      border-radius: 6px;
      color: #fff;
      display: inline-flex;
      font-weight: 800;
      justify-content: center;
      min-height: 44px;
      padding: 0 16px;
      text-decoration: none;
    }
    .button:hover { background: var(--accent-strong); }
    footer {
      border-top: 1px solid var(--line);
      color: var(--muted);
      margin-top: 36px;
      padding-top: 18px;
    }
  </style>
</head>
<body>
  <main>
    ${content}
  </main>
</body>
</html>`;
}

export function renderHome({
  appName,
  baseUrl,
  interactionsBaseUrl = baseUrl,
  staticHosting = false
}) {
  const safeAppName = escapeHtml(appName);
  const safeBaseUrl = escapeHtml(baseUrl);
  const safeInteractionsBaseUrl = escapeHtml(normalizeBaseUrl(interactionsBaseUrl));
  const urls = {
    'Privacy Policy URL': `${safeBaseUrl}/privacy`,
    'Terms of Service URL': `${safeBaseUrl}/terms`,
    'Interactions Endpoint URL': `${safeInteractionsBaseUrl}/interactions`,
    'Linked Roles Verification URL': `${safeBaseUrl}/linked-role`
  };

  const rows = Object.entries(urls)
    .map(([label, url]) => `<dt>${escapeHtml(label)}</dt><dd><code>${url}</code></dd>`)
    .join('');

  return renderPage({
    title: 'Discord App URLs',
    appName,
    content: `<header>
  <h1>${safeAppName}</h1>
  <p>Use these URLs in the Discord Developer Portal after this service is deployed to a public HTTPS domain.</p>
</header>
<section class="panel">
  <dl>${rows}</dl>
  ${staticHosting ? '<p><strong>GitHub Pages note:</strong> Privacy, Terms, and the linked-role landing page can be hosted here. The Interactions Endpoint URL requires a server runtime that can receive Discord POST requests and verify request signatures.</p>' : ''}
</section>`
  });
}

export function renderPrivacyPolicy({ appName, supportEmail, effectiveDate }) {
  const safeAppName = escapeHtml(appName);
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeEffectiveDate = escapeHtml(effectiveDate);

  return renderPage({
    title: 'Privacy Policy',
    appName,
    content: `<header>
  <h1>Privacy Policy</h1>
  <p>Effective date: ${safeEffectiveDate}</p>
</header>
<p>This Privacy Policy explains how ${safeAppName} handles information when you use the Discord application, commands, interactions, and linked role verification flow.</p>

<h2>Information We Collect</h2>
<p>We collect the minimum information needed to operate the app. This may include Discord user IDs, usernames, server IDs, channel IDs, command inputs, interaction metadata, and linked role verification status. If you connect through linked roles, we may process OAuth2 tokens long enough to update your Discord application role connection.</p>

<h2>How We Use Information</h2>
<p>We use information to respond to commands, provide app features, prevent abuse, maintain reliability, and verify linked role eligibility. We do not sell personal information.</p>

<h2>Sharing</h2>
<p>We share information only when required to operate the app, comply with law, protect users, or work with service providers that host or secure the app.</p>

<h2>Retention</h2>
<p>We keep information only for as long as needed for the purposes described above, unless a longer retention period is required for security, legal, or operational reasons.</p>

<h2>Security</h2>
<p>We use reasonable technical and organizational safeguards. No online service can be guaranteed to be completely secure.</p>

<h2>Your Choices</h2>
<p>You can stop using the app, remove it from your server, or disconnect the linked role connection through Discord. To request deletion or access to data associated with your Discord account, contact us.</p>

<h2>Children</h2>
<p>The app is intended for users who are old enough to use Discord under Discord's own terms and applicable law.</p>

<h2>Changes</h2>
<p>We may update this policy from time to time. The effective date above will change when the policy is updated.</p>

<h2>Contact</h2>
<p>Questions or requests can be sent to <a href="mailto:${safeSupportEmail}">${safeSupportEmail}</a>.</p>

<footer>${safeAppName}</footer>`
  });
}

export function renderTerms({ appName, supportEmail, effectiveDate }) {
  const safeAppName = escapeHtml(appName);
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeEffectiveDate = escapeHtml(effectiveDate);

  return renderPage({
    title: 'Terms of Service',
    appName,
    content: `<header>
  <h1>Terms of Service</h1>
  <p>Effective date: ${safeEffectiveDate}</p>
</header>
<p>These Terms of Service govern your use of ${safeAppName}, including its Discord commands, interactions, and linked role verification flow.</p>

<h2>Acceptance</h2>
<p>By using the app, installing it, or authorizing it through Discord, you agree to these terms. If you do not agree, do not use the app.</p>

<h2>Use of the App</h2>
<p>You may use the app only in compliance with these terms, Discord's policies, and applicable law. You are responsible for the activity that occurs through your server configuration and your Discord account.</p>

<h2>Acceptable Use</h2>
<p>You may not use the app to harass others, break Discord rules, disrupt the service, attempt unauthorized access, reverse engineer protected parts of the service, or submit unlawful content.</p>

<h2>Linked Roles</h2>
<p>Linked role verification depends on information provided through Discord OAuth2 and application role connections. Access to a role may change if requirements, server settings, or your connected account status changes.</p>

<h2>Availability</h2>
<p>The app is provided on an as-is and as-available basis. Features may change, pause, or stop at any time.</p>

<h2>Termination</h2>
<p>We may suspend or block access to the app if use appears abusive, unsafe, unlawful, or harmful to the app, Discord, or other users.</p>

<h2>Disclaimers</h2>
<p>To the maximum extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>

<h2>Limitation of Liability</h2>
<p>To the maximum extent permitted by law, we will not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the app.</p>

<h2>Changes</h2>
<p>We may update these terms from time to time. Continued use of the app after updates means you accept the updated terms.</p>

<h2>Contact</h2>
<p>Questions can be sent to <a href="mailto:${safeSupportEmail}">${safeSupportEmail}</a>.</p>

<footer>${safeAppName}</footer>`
  });
}

export function renderLinkedRole({ appName, authorizeUrl }) {
  const safeAppName = escapeHtml(appName);
  const body = authorizeUrl
    ? `<p>Connect your Discord account to verify eligibility for ${safeAppName} linked roles.</p>
<p><a class="button" href="${escapeHtml(authorizeUrl)}">Connect with Discord</a></p>`
    : `<p>Linked role verification is available after Discord OAuth2 is configured.</p>
<p>Set <code>DISCORD_CLIENT_ID</code> and <code>DISCORD_REDIRECT_URI</code>, then reload this page.</p>`;

  return renderPage({
    title: 'Linked Role Verification',
    appName,
    content: `<header>
  <h1>Linked Role Verification</h1>
</header>
<section class="panel">${body}</section>`
  });
}

export function renderStatusPage({ appName, title, message }) {
  return renderPage({
    title,
    appName,
    content: `<header>
  <h1>${escapeHtml(title)}</h1>
</header>
<section class="panel"><p>${escapeHtml(message)}</p></section>`
  });
}
