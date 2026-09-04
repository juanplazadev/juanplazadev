<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @mixin FormRequest
 */
trait ResolvesAuthenticatedUser
{
    /**
     * Get the authenticated user making the request.
     *
     * @param  string|null  $guard
     *
     * @throws AuthenticationException
     */
    public function user($guard = null): User
    {
        $user = parent::user($guard);

        throw_unless($user instanceof User, AuthenticationException::class);

        return $user;
    }
}
