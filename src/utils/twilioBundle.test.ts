// Run: npm test  (node:test, Node >= 22.6 : types retirés à la volée)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundleRequest, customerNameFrom, endUserTypeFrom, hasAddressFields } from './twilioBundle.ts';

test('bundleRequest : ni e-mail ni libellé (décidés par le serveur)', () => {
  const body = bundleRequest('RN123', 'FR', 'business');
  assert.deepEqual(body, { regulationSid: 'RN123', isoCountry: 'FR', endUserType: 'business' });
  assert.equal('email' in body, false);
  assert.equal('friendlyName' in body, false);
  assert.deepEqual(bundleRequest('RN1', 'GB'), { regulationSid: 'RN1', isoCountry: 'GB' });
});

test('endUserTypeFrom : business / individual', () => {
  assert.equal(endUserTypeFrom('Business End User'), 'business');
  assert.equal(endUserTypeFrom('Individual End User'), 'individual');
  assert.equal(endUserTypeFrom(undefined), 'individual');
});

test('customerNameFrom : nom saisi par l\'utilisateur, jamais « Business »', () => {
  assert.equal(customerNameFrom({ customer_name: '  Acme  SARL ', end_user: 'Autre' }), 'Acme SARL');
  assert.equal(customerNameFrom({ end_user: 'Acme Conseil' }), 'Acme Conseil');
  assert.equal(customerNameFrom({ customer_name: '   ', end_user: 'Acme' }), 'Acme');
  assert.equal(customerNameFrom({ end_user: new Blob(['x']) }), '');
  assert.equal(customerNameFrom({}), '');
});

test('hasAddressFields', () => {
  assert.equal(hasAddressFields({ city: 'Paris' }), true);
  assert.equal(hasAddressFields({ end_user: 'Acme' }), false);
});
