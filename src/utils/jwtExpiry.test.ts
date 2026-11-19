// Run: npm test  (node:test, Node >= 22.6 : types retirés à la volée)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isJwtExpired, jwtExpiryMs } from './jwtExpiry.ts';

const b64url = (o: unknown) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: unknown) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.sig`;

test('jwtExpiryMs : lit exp en millisecondes', () => {
  assert.equal(jwtExpiryMs(jwt({ exp: 1700000000 })), 1700000000000);
  assert.equal(jwtExpiryMs(jwt({ userId: 'u' })), null);
  assert.equal(jwtExpiryMs('pas-un-jwt'), null);
  assert.equal(jwtExpiryMs(''), null);
  assert.equal(jwtExpiryMs(null), null);
});

test('isJwtExpired : seulement si exp est passée', () => {
  const now = 1700000000000;
  assert.equal(isJwtExpired(jwt({ exp: 1699999999 }), now), true);
  assert.equal(isJwtExpired(jwt({ exp: 1700000100 }), now), false);
  assert.equal(isJwtExpired(jwt({ userId: 'u' }), now), false);
  assert.equal(isJwtExpired('xx.%%%.yy', now), false);
  assert.equal(isJwtExpired(undefined, now), false);
});
