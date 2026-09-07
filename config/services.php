<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
     * Mailgun sends the résumé email in production and posts back what happened
     * to it. Two credentials, and they are not interchangeable: `secret` is the
     * sending API key, `webhook_signing_key` is the HMAC key Mailgun signs
     * webhooks with (Dashboard → Webhooks → HTTP webhook signing key). Signing
     * a payload with the API key produces a signature that never verifies.
     *
     * `endpoint` is normalised to a bare host because that is what Symfony's
     * Mailgun transport wants; a URL with a scheme is silently wrong.
     */
    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => parse_url((string) env('MAILGUN_ENDPOINT', 'api.mailgun.net'), PHP_URL_HOST)
            ?? env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
        'webhook_signing_key' => env('MAILGUN_WEBHOOK_SIGNING_KEY'),
    ],

    /*
     * Cloudflare Turnstile guards the résumé form. Both keys or neither: with
     * the secret unset the challenge is skipped end to end (no widget, no
     * verification, a null `turnstile_success`), which is what lets local and
     * the test suite run without Cloudflare credentials.
     *
     * Note there is no score to read - Turnstile answers pass/fail plus error
     * codes, unlike reCAPTCHA v3.
     */
    'turnstile' => [
        'site_key' => env('TURNSTILE_SITE_KEY'),
        'secret_key' => env('TURNSTILE_SECRET_KEY'),
    ],

    'cloudflare' => [
        'api_token' => env('CLOUDFLARE_API_TOKEN'),
        'account_id' => env('CLOUDFLARE_ACCOUNT_ID'),
        'site_tag' => env('CLOUDFLARE_WEB_ANALYTICS_SITE_TAG'),
        'zone_id' => env('CLOUDFLARE_ZONE_ID'),
    ],

    /*
     * Reading errors back out of Sentry, which is a different credential from
     * the DSN in config/sentry.php: that one submits events, this one queries
     * them. See .env.example for how to mint the token and find each slug.
     */
    'sentry' => [
        'api_token' => env('SENTRY_API_TOKEN'),
        'organization' => env('SENTRY_ORGANIZATION'),
        'project' => env('SENTRY_PROJECT'),
        'api_url' => env('SENTRY_API_URL', 'https://us.sentry.io/api/0'),
        'monthly_error_quota' => (int) env('SENTRY_MONTHLY_ERROR_QUOTA', 5000),
    ],

];
