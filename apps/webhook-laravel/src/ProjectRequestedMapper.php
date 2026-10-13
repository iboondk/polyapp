<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter;

use InvalidArgumentException;

final class ProjectRequestedMapper
{
    private const UUID_PATTERN = '/\A[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\z/';

    /**
     * @param  array<string, mixed>  $event
     * @return array{tenantId: string, name: string}
     *
     * @throws InvalidArgumentException
     */
    public function map(array $event): array
    {
        if (($event['type'] ?? null) !== 'project.requested') {
            throw new InvalidArgumentException('Unsupported event type.');
        }

        $tenantId = $event['tenant_id'] ?? null;
        if (! is_string($tenantId) || preg_match(self::UUID_PATTERN, $tenantId) !== 1) {
            throw new InvalidArgumentException('tenant_id must be a UUID.');
        }

        $data = $event['data'] ?? null;
        $name = is_array($data) ? ($data['name'] ?? null) : null;
        if (! is_string($name)) {
            throw new InvalidArgumentException('data.name must be a string.');
        }

        $length = mb_strlen($name);
        if ($length < 1 || $length > 200) {
            throw new InvalidArgumentException('data.name must be 1 to 200 characters.');
        }

        return ['tenantId' => $tenantId, 'name' => $name];
    }
}
