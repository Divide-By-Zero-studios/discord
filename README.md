# Hermes Bot Policy and Endpoint URLs

This project gives the Hermes Bot Discord application the URLs commonly requested in the Developer Portal.

| Discord field | URL |
| --- | --- |
| Privacy Policy URL | `https://your-domain.example/privacy` |
| Terms of Service URL | `https://your-domain.example/terms` |
| Interactions Endpoint URL | `https://your-runtime-host.example/interactions` |
| Linked Roles Verification URL | `https://your-domain.example/linked-role` |

GitHub Actions can deploy the static policy site to GitHub Pages. GitHub Pages cannot host the Discord interactions endpoint because Discord sends signed `POST` requests and Pages only serves static files. Keep the `/interactions` Node route on a real server runtime such as a VPS, Render, Railway, Fly.io, or a serverless/edge worker.

## GitHub Actions + Pages

The workflow at `.github/workflows/pages.yml` builds and deploys the static Hermes Bot site to GitHub Pages whenever you push to `main`.

Before pushing:

1. Commit this repo to GitHub.
2. In the repo, go to Settings > Pages.
3. Set Build and deployment > Source to GitHub Actions.
4. Optional: in Settings > Secrets and variables > Actions > Variables, add:
   - `SUPPORT_EMAIL`
   - `PUBLIC_BASE_URL`, for example `https://your-user.github.io/your-repo` or your custom domain
   - `INTERACTIONS_BASE_URL`, the runtime host for the Node service
   - `DISCORD_CLIENT_ID`
   - `DISCORD_REDIRECT_URI`, for example `https://your-runtime-host.example/oauth/callback`

After the workflow runs, use these Pages URLs:

| Discord field | Pages URL |
| --- | --- |
| Privacy Policy URL | `https://<owner>.github.io/<repo>/privacy` |
| Terms of Service URL | `https://<owner>.github.io/<repo>/terms` |
| Linked Roles Verification URL | `https://<owner>.github.io/<repo>/linked-role` |

Do not use a GitHub Pages URL for Interactions Endpoint URL. Use your runtime URL: `https://your-runtime-host.example/interactions`.

## Run Locally

```bash
npm install
cp .env.example .env
npm start
```

On Windows PowerShell, copy the example env file with:

```powershell
Copy-Item .env.example .env
```

Then open `http://localhost:3000` to see the generated URL list.

## Static Build

```bash
npm run build:static
```

This writes the GitHub Pages artifact to `dist/`.

## Start on Windows Login

The local Discord interaction server and HTTPS tunnel can be started at Windows login with:

```powershell
$scriptPath = Join-Path (Get-Location).Path 'scripts\start-hermes-endpoint.ps1'
$action = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'HermesBotEndpoint' -Action $action -Trigger $trigger -Settings $settings -Description 'Starts Hermes Bot local Discord endpoint and HTTPS tunnel at logon.' -Force
```

The startup script uses the fixed localtunnel subdomain `https://hermes-discord-divide-by-zero.loca.lt`. Keep in mind this is still a local machine tunnel: it only works while this Windows user session, the Node server, and the tunnel are running.

## Discord Setup

Set these values in `.env` before deploying:

- `APP_NAME`: Your bot or app name.
- `SUPPORT_EMAIL`: Contact email shown in the policy pages.
- `PUBLIC_BASE_URL`: Your deployed public HTTPS origin, without a trailing slash.
- `INTERACTIONS_BASE_URL`: Your deployed runtime origin for Discord interaction POST requests.
- `DISCORD_PUBLIC_KEY`: Required for Discord interaction signature checks.
- `DISCORD_CLIENT_ID`: Required for the linked role OAuth start URL.
- `DISCORD_CLIENT_SECRET`: Required to finish linked role verification.
- `DISCORD_APPLICATION_ID`: Required to update the user's app role connection.
- `DISCORD_REDIRECT_URI`: Usually `https://your-runtime-host.example/oauth/callback`; add this same URL in Discord Developer Portal > OAuth2.

The interaction endpoint verifies `X-Signature-Ed25519` and `X-Signature-Timestamp`, returns PONG for Discord PING requests, and rejects invalid signatures with `401`.

## Linked Roles

The linked role page starts a Discord OAuth2 flow with `identify` and `role_connections.write`. After authorization, the callback updates the user's application role connection with:

```json
{
  "verified": "1"
}
```

For this to appear as a server role requirement, register matching application role connection metadata in Discord. The metadata key should be `verified`, and the type should be Boolean Equal.

## Test

```bash
npm test
```
