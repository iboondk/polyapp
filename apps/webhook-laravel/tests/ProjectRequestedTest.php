<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter\Tests;

use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\Test;

final class ProjectRequestedTest extends TestCase
{
    private const ENDPOINT = '/webhooks/polyapp/project-requested';
    private const TENANT_ID = '11111111-1111-4111-8111-111111111111';
    private const SECRET = 'test-secret';

    private function fixtureBody(): string
    {
        return (string) file_get_contents(__DIR__.'/../../../contracts/fixtures/webhook-project-requested.json');
    }

    private function signed(string $body, ?string $secret = null): string
    {
        return 'sha256='.hash_hmac('sha256', $body, $secret ?? self::SECRET);
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function post(string $body, array $headers = []): \Illuminate\Testing\TestResponse
    {
        $server = array_merge(['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], $this->serverHeaders($headers));

        return $this->call('POST', self::ENDPOINT, [], [], [], $server, $body);
    }

    /**
     * @param  array<string, string>  $headers
     * @return array<string, string>
     */
    private function serverHeaders(array $headers): array
    {
        $server = [];
        foreach ($headers as $name => $value) {
            $server['HTTP_'.strtoupper(str_replace('-', '_', $name))] = $value;
        }

        return $server;
    }

    #[Test]
    public function a_valid_event_creates_a_project_and_returns_accepted(): void
    {
        Http::fake(['api.test/*' => Http::response([
            'id' => '22222222-2222-4222-8222-222222222222',
            'tenant_id' => self::TENANT_ID,
            'name' => 'Fixture Project',
            'created_at' => '2026-01-01T00:00:00Z',
        ], 201)]);

        $body = $this->fixtureBody();

        $response = $this->post($body, ['X-PolyApp-Signature' => $this->signed($body)]);

        $response->assertStatus(202);
        $response->assertJson([
            'status' => 'accepted',
            'project_id' => '22222222-2222-4222-8222-222222222222',
        ]);

        Http::assertSent(function (HttpRequest $request): bool {
            return $request->url() === 'http://api.test/v1/tenants/'.self::TENANT_ID.'/projects'
                && $request->method() === 'POST'
                && $request->hasHeader('Authorization', 'Bearer svc')
                && $request['name'] === 'Fixture Project';
        });
    }

    #[Test]
    public function a_repeated_event_id_is_reported_as_duplicate_and_not_sent_twice(): void
    {
        Http::fake(['api.test/*' => Http::response(['id' => 'p-1', 'name' => 'Fixture Project'], 201)]);

        $body = $this->fixtureBody();
        $headers = ['X-PolyApp-Signature' => $this->signed($body)];

        $this->post($body, $headers)->assertStatus(202)->assertJson(['status' => 'accepted']);
        $this->post($body, $headers)->assertStatus(202)->assertJson(['status' => 'duplicate']);

        Http::assertSentCount(1);
    }

    #[Test]
    public function a_bad_signature_is_rejected_without_calling_the_api(): void
    {
        Http::fake();

        $body = $this->fixtureBody();

        $this->post($body, ['X-PolyApp-Signature' => $this->signed($body, 'wrong-secret')])
            ->assertStatus(401)
            ->assertJson(['error' => 'invalid_signature']);

        $this->post($body)
            ->assertStatus(401)
            ->assertJson(['error' => 'invalid_signature']);

        Http::assertNothingSent();
    }

    #[Test]
    public function a_wrong_event_type_is_rejected_with_422(): void
    {
        Http::fake();

        $event = json_decode($this->fixtureBody(), true);
        $event['type'] = 'project.deleted';
        $body = json_encode($event);

        $this->post((string) $body, ['X-PolyApp-Signature' => $this->signed((string) $body)])
            ->assertStatus(422)
            ->assertJson(['error' => 'invalid_event']);

        Http::assertNothingSent();
    }

    #[Test]
    public function an_api_conflict_is_reported_as_exists(): void
    {
        Http::fake(['api.test/*' => Http::response(['error' => 'conflict', 'message' => 'duplicate name'], 409)]);

        $body = $this->fixtureBody();

        $this->post($body, ['X-PolyApp-Signature' => $this->signed($body)])
            ->assertStatus(202)
            ->assertJson(['status' => 'exists']);
    }

    #[Test]
    public function an_api_server_error_is_reported_as_upstream_error(): void
    {
        Http::fake(['api.test/*' => Http::response(['error' => 'internal', 'message' => 'boom'], 500)]);

        $body = $this->fixtureBody();

        $this->post($body, ['X-PolyApp-Signature' => $this->signed($body)])
            ->assertStatus(502)
            ->assertJson(['error' => 'upstream_error']);
    }
}
