import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';

test('build:static writes Hermes Bot pages for GitHub Pages', () => {
  rmSync('dist', { force: true, recursive: true });

  execFileSync(process.execPath, ['src/buildStatic.js'], {
    env: {
      ...process.env,
      APP_NAME: 'Hermes Bot',
      SUPPORT_EMAIL: 'support@example.com',
      PUBLIC_BASE_URL: 'https://owner.github.io/hermes-bot',
      INTERACTIONS_BASE_URL: 'https://runtime.example.com',
      DISCORD_CLIENT_ID: '1234567890',
      DISCORD_REDIRECT_URI: 'https://example.com/oauth/callback'
    },
    stdio: 'pipe'
  });

  assert.equal(existsSync('dist/index.html'), true);
  assert.equal(existsSync('dist/privacy/index.html'), true);
  assert.equal(existsSync('dist/terms/index.html'), true);
  assert.equal(existsSync('dist/linked-role/index.html'), true);
  assert.equal(existsSync('dist/.nojekyll'), true);

  const home = readFileSync('dist/index.html', 'utf8');
  const privacy = readFileSync('dist/privacy/index.html', 'utf8');
  const linkedRole = readFileSync('dist/linked-role/index.html', 'utf8');

  assert.match(home, /Hermes Bot/);
  assert.match(home, /https:\/\/owner\.github\.io\/hermes-bot\/privacy/);
  assert.match(home, /https:\/\/runtime\.example\.com\/interactions/);
  assert.match(home, /requires a server runtime/);
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /Hermes Bot/);
  assert.match(linkedRole, /scope=identify\+role_connections\.write/);
});
