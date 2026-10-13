<?php

use Illuminate\Support\Facades\Route;
use PolyApp\WebhookAdapter\Http\ProjectRequestedController;

Route::post('/webhooks/polyapp/project-requested', ProjectRequestedController::class)
    ->name('polyapp.webhooks.project-requested');
