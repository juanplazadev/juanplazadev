<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Services\Cloudflare\TurnstileVerifier;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The only thing a stranger can put into resume_deliveries.
 *
 * The endpoint is public and unauthenticated, so nothing here trusts the
 * payload: the address is normalised before it is validated, the token is
 * length-capped, and every other column on the row is derived server side from
 * the request rather than read out of the body.
 */
final class ResumeDeliveryRequest extends FormRequest
{
    /** Public form. Anyone may ask; Turnstile decides whether they are a person. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'max:255',
                /*
                 * strict: true, not the usual false. Non-strict follows RFC
                 * 5322's obsolete productions, which accept `hiring@example`
                 * with no TLD and even `hiring @example.com` with a space in
                 * it - both verified, both things a person typing into this
                 * box has got wrong rather than meant. Strict still takes
                 * plus-addressing and subdomains, so nothing real is lost.
                 *
                 * preventSpoofing() is the half that matters on a public form:
                 * it rejects homograph and unicode-confusable domains that read
                 * as somewhere they are not.
                 */
                Rule::email()
                    ->rfcCompliant(strict: true)
                    ->preventSpoofing(),
            ],
            'turnstile_token' => [
                // Required only while the challenge is switched on, so an
                // install without Cloudflare keys still has a working form.
                resolve(TurnstileVerifier::class)->isConfigured() ? 'required' : 'nullable',
                'string',
                'max:2048',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'An email address is required to send the résumé.',
            'turnstile_token.required' => 'Please complete the challenge and try again.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $email = $this->input('email');

        // Stored lowercase so the same person is one row however they typed it,
        // and so a webhook's `recipient` matches what we saved.
        $this->merge([
            'email' => is_string($email) ? mb_strtolower(mb_trim($email)) : $email,
        ]);
    }
}
