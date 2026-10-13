<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter;

use Illuminate\Support\Facades\Http;

final class PolyAppApi
{
    /**
     * Creates a project through POST /v1/tenants/{tenantId}/projects using the service token.
     *
     * @return array<string, mixed>
     *
     * @throws \Illuminate\Http\Client\RequestException on a 4xx/5xx response
     * @throws \Illuminate\Http\Client\ConnectionException when the API cannot be reached
     */
    public function createProject(string $tenantId, string $name): array
    {
        $url = rtrim((string) config('polyapp.api_url'), '/').'/v1/tenants/'.$tenantId.'/projects';

        $body = Http::withToken((string) config('polyapp.service_token'))
            ->acceptJson()
            ->post($url, ['name' => $name])
            ->throw()
            ->json();

        return is_array($body) ? $body : [];
    }
}
