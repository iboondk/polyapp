<?php

return [

    /*
    |--------------------------------------------------------------------------
    | PolyApp API base URL
    |--------------------------------------------------------------------------
    */
    'api_url' => env('POLYAPP_API_URL', 'http://127.0.0.1:4010'),

    /*
    | Service token used as a bearer token for calls to the PolyApp API.
    */
    'service_token' => env('POLYAPP_SERVICE_TOKEN', ''),

    /*
    | Shared secret used to verify X-PolyApp-Signature (HMAC-SHA256 of the raw body).
    */
    'webhook_secret' => env('POLYAPP_WEBHOOK_SECRET', ''),

    /*
    | How long (in seconds) an accepted event id is remembered for de-duplication.
    */
    'dedupe_ttl' => 86400,

];
