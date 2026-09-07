<?php

declare(strict_types=1);

namespace App\Services\Cloudflare;

/**
 * The outcome of one Turnstile challenge, in the three states the column needs.
 *
 * `attempted` is the distinction that matters: a null `turnstile_success` in
 * the database means the challenge never ran (the secret is unset, so the
 * feature is off), which is a different fact from Cloudflare having refused.
 */
final readonly class TurnstileVerification
{
    /**
     * @param  list<string>  $errorCodes
     */
    private function __construct(
        public bool $attempted,
        public bool $passed,
        public array $errorCodes = [],
    ) {}

    /** The feature is switched off, so nothing was asked of the visitor. */
    public static function skipped(): self
    {
        return new self(attempted: false, passed: false);
    }

    public static function passed(): self
    {
        return new self(attempted: true, passed: true);
    }

    /**
     * @param  list<string>  $errorCodes
     */
    public static function failed(array $errorCodes = []): self
    {
        return new self(attempted: true, passed: false, errorCodes: $errorCodes);
    }

    /** Whether the request may proceed. An unattempted challenge blocks nothing. */
    public function allows(): bool
    {
        return ! $this->attempted || $this->passed;
    }

    /** Null when the challenge never ran - see the class docblock. */
    public function success(): ?bool
    {
        return $this->attempted ? $this->passed : null;
    }

    /**
     * @return list<string>|null
     */
    public function errors(): ?array
    {
        return $this->errorCodes === [] ? null : $this->errorCodes;
    }
}
