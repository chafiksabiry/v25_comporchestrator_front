// Run: npm test  (node:test, Node >= 22.6 : types retirés à la volée)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorStatus, requireSid, twilioComplianceErrorKey, TWILIO_COMPLIANCE_ERROR_KEY } from './twilioComplianceError.ts';

test('403 (agent / sans entreprise) : message « non autorisé »', () => {
  assert.equal(twilioComplianceErrorKey({ status: 403, message: 'Operation not allowed' }), TWILIO_COMPLIANCE_ERROR_KEY.forbidden);
  assert.equal(twilioComplianceErrorKey({ response: { status: 403 } }), TWILIO_COMPLIANCE_ERROR_KEY.forbidden);
});

test('404 (dossier d\'une autre entreprise) : message « introuvable »', () => {
  assert.equal(twilioComplianceErrorKey({ status: 404, message: 'Resource not found' }), TWILIO_COMPLIANCE_ERROR_KEY.notFound);
});

test('400 contact_email_required : message « complétez le contact de l\'entreprise »', () => {
  assert.equal(twilioComplianceErrorKey({ status: 400, code: 'contact_email_required', message: 'x' }), TWILIO_COMPLIANCE_ERROR_KEY.contactEmailRequired);
  assert.equal(twilioComplianceErrorKey({ response: { status: 400, data: { code: 'contact_email_required' } } }), TWILIO_COMPLIANCE_ERROR_KEY.contactEmailRequired);
  assert.equal(twilioComplianceErrorKey({ code: 'TWILIO_CUSTOMER_NAME_REQUIRED' }), TWILIO_COMPLIANCE_ERROR_KEY.customerNameRequired);
});

test('les autres erreurs gardent leur propre message', () => {
  assert.equal(twilioComplianceErrorKey({ status: 500 }), null);
  assert.equal(twilioComplianceErrorKey(new Error('boom')), null);
  assert.equal(twilioComplianceErrorKey(null), null);
  assert.equal(errorStatus('x'), undefined);
});

test('requireSid : refuse une ressource sans sid au lieu de continuer sur undefined', () => {
  assert.equal(requireSid({ sid: 'BU123' }), 'BU123');
  assert.throws(() => requireSid(undefined), /without a SID/);
  assert.throws(() => requireSid({ error: 'Not Found', message: 'Resource not found' }), /without a SID/);
  assert.throws(() => requireSid({ sid: '' }), /without a SID/);
});
