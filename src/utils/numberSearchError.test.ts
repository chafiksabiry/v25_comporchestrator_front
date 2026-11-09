// Run: npm test  (node:test, Node >= 22.6 : types retirés à la volée)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numberSearchFailure, NUMBER_SEARCH_FAILURE_KEY } from './numberSearchError.ts';

test('403 COUNTRY_NOT_ALLOWED : refus de pays', () => {
  assert.equal(numberSearchFailure(403, { error: 'Country not allowed', code: 'COUNTRY_NOT_ALLOWED', allowedCountry: 'FR' }), 'COUNTRY_NOT_ALLOWED');
});

test('503 « country lookup » : pays illisible côté serveur', () => {
  assert.equal(numberSearchFailure(503, { error: 'Company country lookup failed' }), 'COUNTRY_CHECK_UNAVAILABLE');
  assert.equal(numberSearchFailure(503, { error: 'Company country lookup is not configured' }), 'COUNTRY_CHECK_UNAVAILABLE');
});

test('les autres réponses ne sont pas des refus de pays', () => {
  assert.equal(numberSearchFailure(403, { error: 'Not allowed for this company' }), null);
  assert.equal(numberSearchFailure(403, { code: 'ACTIVE_LOCAL_NUMBER_LIMIT' }), null);
  assert.equal(numberSearchFailure(503, { error: 'Company lookup failed' }), null);
  assert.equal(numberSearchFailure(500, { code: 'COUNTRY_NOT_ALLOWED' }), null);
  assert.equal(numberSearchFailure(200, {}), null);
  assert.equal(numberSearchFailure(undefined, undefined), null);
  assert.equal(numberSearchFailure(403, 'texte'), null);
});

test('chaque refus a une clé de traduction', () => {
  assert.equal(NUMBER_SEARCH_FAILURE_KEY.COUNTRY_NOT_ALLOWED, 'phoneNumberPanel.toasts.countryNotAllowed');
  assert.equal(NUMBER_SEARCH_FAILURE_KEY.COUNTRY_CHECK_UNAVAILABLE, 'phoneNumberPanel.toasts.countryCheckUnavailable');
});
