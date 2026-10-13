<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter\Http;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;
use PolyApp\WebhookAdapter\PolyAppApi;
use PolyApp\WebhookAdapter\ProjectRequestedMapper;
use PolyApp\WebhookAdapter\SignatureVerifier;

final class ProjectRequestedController
{
    public function __construct(
        private readonly PolyAppApi $api,
        private readonly ProjectRequestedMapper $mapper,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $raw = $request->getContent();

        $verifier = new SignatureVerifier((string) config('polyapp.webhook_secret'));
        if (! $verifier->verify($raw, $request->header('X-PolyApp-Signature'))) {
            return response()->json(['error' => 'invalid_signature'], 401);
        }

        $event = json_decode($raw, true);
        if (! is_array($event)) {
            return response()->json(['error' => 'invalid_event'], 422);
        }

        $eventId = $event['id'] ?? null;
        if (! is_string($eventId) || $eventId === '') {
            return response()->json(['error' => 'invalid_event'], 422);
        }

        try {
            $mapped = $this->mapper->map($event);
        } catch (InvalidArgumentException) {
            return response()->json(['error' => 'invalid_event'], 422);
        }

        $key = 'polyapp:evt:'.$eventId;
        if (! Cache::add($key, true, (int) config('polyapp.dedupe_ttl', 86400))) {
            return response()->json(['status' => 'duplicate'], 202);
        }

        try {
            $project = $this->api->createProject($mapped['tenantId'], $mapped['name']);
        } catch (RequestException $e) {
            if ($e->response->status() === 409) {
                return response()->json(['status' => 'exists'], 202);
            }

            Cache::forget($key);

            return response()->json(['error' => 'upstream_error'], 502);
        } catch (ConnectionException) {
            Cache::forget($key);

            return response()->json(['error' => 'upstream_error'], 502);
        }

        return response()->json([
            'status' => 'accepted',
            'project_id' => $project['id'] ?? null,
        ], 202);
    }
}
