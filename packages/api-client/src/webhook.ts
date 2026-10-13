import { createHmac, timingSafeEqual } from 'node:crypto';

// Returns the X-PolyApp-Signature value: 'sha256=' followed by the hex HMAC-SHA256 of the raw body.
export function signWebhook(rawBody: string | Uint8Array, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
}

// Checks a received X-PolyApp-Signature header against the raw body in constant time.
export function verifyWebhook(
  rawBody: string | Uint8Array,
  header: string | undefined,
  secret: string,
): boolean {
  if (typeof header !== 'string') return false;
  const expected = Buffer.from(signWebhook(rawBody, secret));
  const actual = Buffer.from(header);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
