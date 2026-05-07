import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('setup script installs prerequisites and registers startup task', () => {
  const script = readFileSync('scripts/setup-hermes-endpoint.ps1', 'utf8');

  assert.match(script, /Test-Command/);
  assert.match(script, /winget\.exe/);
  assert.match(script, /OpenJS\.NodeJS\.LTS/);
  assert.match(script, /npm\.cmd/);
  assert.match(script, /npm install -g localtunnel|install', '-g', 'localtunnel'/);
  assert.match(script, /npm ci|ci'/);
  assert.match(script, /\.env\.example/);
  assert.match(script, /Register-ScheduledTask/);
  assert.match(script, /HermesBotEndpoint/);
  assert.match(script, /start-hermes-endpoint\.ps1/);
});
