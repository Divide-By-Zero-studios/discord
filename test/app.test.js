import assert from 'node:assert/strict';
import { test } from 'node:test';
import nacl from 'tweetnacl';
import request from 'supertest';

import { createApp } from '../src/app.js';

function createSignedInteraction(body, keyPair, timestamp = '1700000000') {
  const rawBody = JSON.stringify(body);
  const signature = nacl.sign.detached(
    Buffer.from(timestamp + rawBody),
    keyPair.secretKey
  );

  return {
    rawBody,
    signature: Buffer.from(signature).toString('hex'),
    timestamp
  };
}

test('lists the Discord portal URLs from the configured public base URL', async () => {
  const app = createApp({
    appName: 'Example Bot',
    publicBaseUrl: 'https://example.com'
  });

  const response = await request(app)
    .get('/')
    .expect(200)
    .expect('Content-Type', /html/);

  assert.match(response.text, /Privacy Policy URL/);
  assert.match(response.text, /https:\/\/example\.com\/privacy/);
  assert.match(response.text, /https:\/\/example\.com\/terms/);
  assert.match(response.text, /https:\/\/example\.com\/interactions/);
  assert.match(response.text, /https:\/\/example\.com\/linked-role/);
});

test('serves branded privacy policy and terms pages', async () => {
  const app = createApp({
    appName: 'Example Bot',
    publicBaseUrl: 'https://example.com',
    supportEmail: 'support@example.com'
  });

  const privacy = await request(app).get('/privacy').expect(200);
  const terms = await request(app).get('/terms').expect(200);

  assert.match(privacy.text, /Privacy Policy/);
  assert.match(privacy.text, /Example Bot/);
  assert.match(privacy.text, /support@example\.com/);
  assert.match(terms.text, /Terms of Service/);
  assert.match(terms.text, /Example Bot/);
});

test('linked role verification page starts Discord OAuth with role connection scope', async () => {
  const app = createApp({
    appName: 'Example Bot',
    publicBaseUrl: 'https://example.com',
    discordClientId: '1234567890',
    discordRedirectUri: 'https://example.com/oauth/callback'
  });

  const response = await request(app).get('/linked-role').expect(200);

  assert.match(response.text, /Connect with Discord/);
  assert.match(response.text, /client_id=1234567890/);
  assert.match(response.text, /scope=identify\+role_connections\.write/);
  assert.match(response.text, /redirect_uri=https%3A%2F%2Fexample\.com%2Foauth%2Fcallback/);
});

test('Discord interactions endpoint returns PONG for a signed PING', async () => {
  const keyPair = nacl.sign.keyPair();
  const publicKey = Buffer.from(keyPair.publicKey).toString('hex');
  const app = createApp({ discordPublicKey: publicKey });
  const signed = createSignedInteraction({ type: 1 }, keyPair);

  const response = await request(app)
    .post('/interactions')
    .set('Content-Type', 'application/json')
    .set('X-Signature-Ed25519', signed.signature)
    .set('X-Signature-Timestamp', signed.timestamp)
    .send(signed.rawBody)
    .expect(200)
    .expect('Content-Type', /json/);

  assert.deepEqual(response.body, { type: 1 });
});

test('Discord interactions endpoint rejects invalid signatures', async () => {
  const keyPair = nacl.sign.keyPair();
  const publicKey = Buffer.from(keyPair.publicKey).toString('hex');
  const app = createApp({ discordPublicKey: publicKey });
  const signed = createSignedInteraction({ type: 1 }, keyPair);

  await request(app)
    .post('/interactions')
    .set('Content-Type', 'application/json')
    .set('X-Signature-Ed25519', '00'.repeat(64))
    .set('X-Signature-Timestamp', signed.timestamp)
    .send(signed.rawBody)
    .expect(401);
});
