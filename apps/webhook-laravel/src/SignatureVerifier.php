<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter;

final class SignatureVerifier
{
    public function __construct(private readonly string $secret)
    {
    }

    /**
     * Returns true only when the header is "sha256=<64 lowercase hex>" and equals
     * the HMAC-SHA256 of the raw request body keyed by the shared secret.
     */
    public function verify(string $rawBody, ?string $header): bool
    {
        if ($this->secret === '' || $header === null) {
            return false;
        }

        if (preg_match('/\Asha256=[0-9a-f]{64}\z/', $header) !== 1) {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $rawBody, $this->secret);

        return hash_equals($expected, $header);
    }
}
