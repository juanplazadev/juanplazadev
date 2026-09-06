<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\AnalyticsRange;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AnalyticsRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'range' => ['nullable', Rule::enum(AnalyticsRange::class)],
        ];
    }

    /**
     * The range the traffic page should render, defaulted when none was asked for.
     */
    public function range(): AnalyticsRange
    {
        return $this->enum('range', AnalyticsRange::class) ?? AnalyticsRange::default();
    }

    /**
     * Drop an unusable range rather than failing on it.
     *
     * `?range=` is a link in the page, not a form field: a stale bookmark or a
     * hand-typed value should render the default range, not an error. The
     * rule below then only ever sees a valid case or nothing at all.
     *
     * query() is typed array|string|null - a repeated ?range= arrives as an
     * array, and that is a miss rather than a crash.
     */
    protected function prepareForValidation(): void
    {
        $range = $this->query('range');

        // merge() writes to the query bag on a GET request.
        $this->merge([
            'range' => is_string($range) ? AnalyticsRange::tryFrom($range)?->value : null,
        ]);
    }
}
