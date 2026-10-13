<?php

declare(strict_types=1);

namespace PolyApp\WebhookAdapter;

use Illuminate\Support\ServiceProvider;

final class WebhookAdapterServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/polyapp.php', 'polyapp');
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/webhooks.php');

        $this->publishes([
            __DIR__.'/../config/polyapp.php' => config_path('polyapp.php'),
        ], 'polyapp-config');
    }
}
