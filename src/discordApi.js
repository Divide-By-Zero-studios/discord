const DISCORD_API_BASE = 'https://discord.com/api/v10';

async function readDiscordResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = payload.message || response.statusText || 'Discord API request failed';
    throw new Error(message);
  }

  return payload;
}

export async function exchangeOAuthCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  fetchImpl = fetch
}) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const response = await fetchImpl(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  return readDiscordResponse(response);
}

export async function getCurrentDiscordUser({ accessToken, fetchImpl = fetch }) {
  const response = await fetchImpl(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return readDiscordResponse(response);
}

export async function updateUserRoleConnection({
  accessToken,
  applicationId,
  platformName,
  platformUsername,
  metadata,
  fetchImpl = fetch
}) {
  const response = await fetchImpl(
    `${DISCORD_API_BASE}/users/@me/applications/${applicationId}/role-connection`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform_name: platformName,
        platform_username: platformUsername,
        metadata
      })
    }
  );

  return readDiscordResponse(response);
}
