import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  normalizeBaseUrl,
  renderHome,
  renderLinkedRole,
  renderPrivacyPolicy,
  renderTerms
} from './pages.js';

const outputDir = 'dist';

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function writeHtml(relativePath, html) {
  const targetDir = join(outputDir, relativePath);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, 'index.html'), html);
}

function createAuthorizeUrl({ clientId, redirectUri }) {
  if (!clientId || !redirectUri) {
    return '';
  }

  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify role_connections.write');
  return url.toString();
}

const appName = getEnv('APP_NAME', 'Hermes Bot');
const supportEmail = getEnv('SUPPORT_EMAIL', 'support@example.com');
const publicBaseUrl = normalizeBaseUrl(getEnv('PUBLIC_BASE_URL', 'https://your-username.github.io/hermes-bot'));
const interactionsBaseUrl = normalizeBaseUrl(getEnv('INTERACTIONS_BASE_URL', 'https://your-runtime-host.example'));
const effectiveDate = getEnv('LEGAL_EFFECTIVE_DATE', 'May 7, 2026');
const discordClientId = getEnv('DISCORD_CLIENT_ID');
const discordRedirectUri = getEnv('DISCORD_REDIRECT_URI');

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, '.nojekyll'), '');

writeFileSync(
  join(outputDir, 'index.html'),
  renderHome({
    appName,
    baseUrl: publicBaseUrl,
    interactionsBaseUrl,
    staticHosting: true
  })
);

writeHtml(
  'privacy',
  renderPrivacyPolicy({
    appName,
    supportEmail,
    effectiveDate
  })
);

writeHtml(
  'terms',
  renderTerms({
    appName,
    supportEmail,
    effectiveDate
  })
);

writeHtml(
  'linked-role',
  renderLinkedRole({
    appName,
    authorizeUrl: createAuthorizeUrl({
      clientId: discordClientId,
      redirectUri: discordRedirectUri
    })
  })
);

console.log(`Built static Hermes Bot pages in ${outputDir}`);
