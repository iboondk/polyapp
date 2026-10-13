<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter\Tests;

use PHPUnit\Framework\Attributes\Test;
use PolyApp\WebhookAdapter\SignatureVerifier;

final class SignatureVerifierTest extends TestCase
{
    private const FIXTURE_DIR = __DIR__.'/../../../contracts/fixtures/';

    private function fixtureBody(): string
    {
        return (string) file_get_contents(self::FIXTURE_DIR.'webhook-project-requested.json');
    }

    private function fixtureSignature(): string
    {
        return trim((string) file_get_contents(self::FIXTURE_DIR.'webhook-project-requested.sig.txt'));
    }

    #[Test]
    public function it_accepts_the_shared_fixture_signature(): void
    {
        $verifier = new SignatureVerifier('test-secret');

        $this->assertTrue($verifier->verify($this->fixtureBody(), $this->fixtureSignature()));
    }

    #[Test]
    public function it_rejects_a_tampered_body(): void
    {
        $verifier = new SignatureVerifier('test-secret');

        $this->assertFalse($verifier->verify($this->fixtureBody().' ', $this->fixtureSignature()));
    }

    #[Test]
    public function it_rejects_a_malformed_header(): void
    {
        $verifier = new SignatureVerifier('test-secret');
        $body = $this->fixtureBody();
        $hex = substr($this->fixtureSignature(), strlen('sha256='));

        $this->assertFalse($verifier->verify($body, null));
        $this->assertFalse($verifier->verify($body, ''));
        $this->assertFalse($verifier->verify($body, 'sha256=xyz'));
        $this->assertFalse($verifier->verify($body, $hex));
        $this->assertFalse($verifier->verify($body, 'sha1='.$hex));
        $this->assertFalse($verifier->verify($body, strtoupper($this->fixtureSignature())));
    }

    #[Test]
    public function it_rejects_every_signature_when_the_secret_is_empty(): void
    {
        $verifier = new SignatureVerifier('');

        $this->assertFalse($verifier->verify($this->fixtureBody(), $this->fixtureSignature()));
    }

    #[Test]
    public function it_rejects_a_signature_made_with_another_secret(): void
    {
        $verifier = new SignatureVerifier('other-secret');

        $this->assertFalse($verifier->verify($this->fixtureBody(), $this->fixtureSignature()));
    }
}
