import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { signWebhook, verifyWebhook } from '../src/webhook.js';

const fixtureBytes = readFileSync(new URL('../../../contracts/fixtures/webhook-project-requested.json', import.meta.url));
const expectedSignature = readFileSync(
  new URL('../../../contracts/fixtures/webhook-project-requested.sig.txt', import.meta.url),
  'utf8',
).trim();
const SECRET = 'test-secret';

describe('webhook signature fixture', () => {
  it('signWebhook reproduces the shared fixture signature', () => {
    expect(signWebhook(fixtureBytes, SECRET)).toBe(expectedSignature);
  });

  it('verifyWebhook accepts the fixture signature', () => {
    expect(verifyWebhook(fixtureBytes, expectedSignature, SECRET)).toBe(true);
  });

  it('verifyWebhook rejects a tampered body', () => {
    const tampered = Buffer.from(fixtureBytes.toString('utf8').replace('Fixture Project', 'Evil Project'));
    expect(verifyWebhook(tampered, expectedSignature, SECRET)).toBe(false);
  });
});
