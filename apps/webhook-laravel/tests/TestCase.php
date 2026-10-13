<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter\Tests;

use Orchestra\Testbench\TestCase as Orchestra;
use PolyApp\WebhookAdapter\WebhookAdapterServiceProvider;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [WebhookAdapterServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('polyapp.webhook_secret', 'test-secret');
        $app['config']->set('polyapp.api_url', 'http://api.test');
        $app['config']->set('polyapp.service_token', 'svc');
        $app['config']->set('cache.default', 'array');
    }
}
