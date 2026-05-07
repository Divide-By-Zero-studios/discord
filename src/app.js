import express from 'express';

import {
  exchangeOAuthCode,
  getCurrentDiscordUser,
  updateUserRoleConnection
} from './discordApi.js';
import { verifyDiscordSignature } from './discordSignature.js';
import {
  getBaseUrl,
  normalizeBaseUrl,
  renderHome,
  renderLinkedRole,
  renderPrivacyPolicy,
  renderStatusPage,
  renderTerms
} from './pages.js';

const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2
};

const INTERACTION_RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4
};

function getConfig(options = {}) {
  const appName = options.appName || process.env.APP_NAME || 'Hermes Bot';
  const publicBaseUrl = normalizeBaseUrl(options.publicBaseUrl || process.env.PUBLIC_BASE_URL);

  return {
    appName,
    publicBaseUrl,
    supportEmail: options.supportEmail || process.env.SUPPORT_EMAIL || 'support@example.com',
    effectiveDate: options.effectiveDate || process.env.LEGAL_EFFECTIVE_DATE || 'May 7, 2026',
    discordPublicKey: options.discordPublicKey || process.env.DISCORD_PUBLIC_KEY || '',
    discordClientId: options.discordClientId || process.env.DISCORD_CLIENT_ID || '',
    discordClientSecret: options.discordClientSecret || process.env.DISCORD_CLIENT_SECRET || '',
    discordRedirectUri: options.discordRedirectUri || process.env.DISCORD_REDIRECT_URI || '',
    discordApplicationId: options.discordApplicationId || process.env.DISCORD_APPLICATION_ID || '',
    fetchImpl: options.fetchImpl || fetch
  };
}

function createAuthorizeUrl({ baseUrl, config }) {
  if (!config.discordClientId) {
    return '';
  }

  const redirectUri = config.discordRedirectUri || `${baseUrl}/oauth/callback`;
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', config.discordClientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify role_connections.write');
  return url.toString();
}

function missingLinkedRoleConfig(config) {
  return !config.discordClientId || !config.discordClientSecret || !config.discordApplicationId;
}

export function createApp(options = {}) {
  const config = getConfig(options);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.get('/', (req, res) => {
    const baseUrl = getBaseUrl(req, config.publicBaseUrl);
    res.type('html').send(renderHome({ appName: config.appName, baseUrl }));
  });

  app.get('/privacy', (req, res) => {
    res.type('html').send(
      renderPrivacyPolicy({
        appName: config.appName,
        supportEmail: config.supportEmail,
        effectiveDate: config.effectiveDate
      })
    );
  });

  app.get('/terms', (req, res) => {
    res.type('html').send(
      renderTerms({
        appName: config.appName,
        supportEmail: config.supportEmail,
        effectiveDate: config.effectiveDate
      })
    );
  });

  app.get('/linked-role', (req, res) => {
    const baseUrl = getBaseUrl(req, config.publicBaseUrl);
    res.type('html').send(
      renderLinkedRole({
        appName: config.appName,
        authorizeUrl: createAuthorizeUrl({ baseUrl, config })
      })
    );
  });

  app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    const baseUrl = getBaseUrl(req, config.publicBaseUrl);
    const redirectUri = config.discordRedirectUri || `${baseUrl}/oauth/callback`;

    if (typeof code !== 'string' || !code) {
      res.status(400).type('html').send(
        renderStatusPage({
          appName: config.appName,
          title: 'Authorization Missing',
          message: 'Discord did not return an authorization code.'
        })
      );
      return;
    }

    if (missingLinkedRoleConfig(config)) {
      res.status(501).type('html').send(
        renderStatusPage({
          appName: config.appName,
          title: 'Linked Roles Not Configured',
          message: 'Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_APPLICATION_ID before completing linked role verification.'
        })
      );
      return;
    }

    try {
      const token = await exchangeOAuthCode({
        code,
        clientId: config.discordClientId,
        clientSecret: config.discordClientSecret,
        redirectUri,
        fetchImpl: config.fetchImpl
      });
      const user = await getCurrentDiscordUser({
        accessToken: token.access_token,
        fetchImpl: config.fetchImpl
      });

      await updateUserRoleConnection({
        accessToken: token.access_token,
        applicationId: config.discordApplicationId,
        platformName: config.appName,
        platformUsername: user.global_name || user.username || user.id,
        metadata: {
          verified: '1'
        },
        fetchImpl: config.fetchImpl
      });

      res.type('html').send(
        renderStatusPage({
          appName: config.appName,
          title: 'Verification Complete',
          message: 'Your Discord account has been verified. You can return to Discord.'
        })
      );
    } catch (error) {
      res.status(502).type('html').send(
        renderStatusPage({
          appName: config.appName,
          title: 'Verification Failed',
          message: error.message || 'Discord verification failed.'
        })
      );
    }
  });

  app.post('/interactions', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

    const valid = verifyDiscordSignature({
      body: rawBody,
      signature,
      timestamp,
      publicKey: config.discordPublicKey
    });

    if (!valid) {
      res.status(401).send('invalid request signature');
      return;
    }

    let interaction;
    try {
      interaction = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ error: 'invalid JSON body' });
      return;
    }

    if (interaction.type === INTERACTION_TYPE.PING) {
      res.json({ type: INTERACTION_RESPONSE_TYPE.PONG });
      return;
    }

    if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
      res.json({
        type: INTERACTION_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `${config.appName} is online.`
        }
      });
      return;
    }

    res.status(400).json({ error: 'unsupported interaction type' });
  });

  return app;
}
