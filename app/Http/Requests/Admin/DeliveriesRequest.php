<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\AnalyticsRange;
use App\Enums\DeliveryStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class DeliveriesRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'range' => ['nullable', Rule::enum(AnalyticsRange::class)],
            'status' => ['nullable', Rule::enum(DeliveryStatus::class)],
        ];
    }

    /**
     * The window the page should count over, defaulted when none was asked for.
     */
    public function range(): AnalyticsRange
    {
        return $this->enum('range', AnalyticsRange::class) ?? AnalyticsRange::default();
    }

    /**
     * The status the table should be narrowed to. Null is "all of them", which
     * is the honest default - the page opens on everything that happened.
     */
    public function status(): ?DeliveryStatus
    {
        return $this->enum('status', DeliveryStatus::class);
    }

    /**
     * Drop an unusable value rather than failing on it.
     *
     * Both parameters are links in the page rather than form fields, exactly as
     * on the traffic and errors pages: a stale bookmark or a hand-typed value
     * should render the default view, not a 422. The rules above then only ever
     * see a valid case or nothing at all.
     *
     * query() is typed array|string|null - a repeated ?range= arrives as an
     * array, and that is a miss rather than a crash.
     */
    protected function prepareForValidation(): void
    {
        $range = $this->query('range');
        $status = $this->query('status');

        // merge() writes to the query bag on a GET request.
        $this->merge([
            'range' => is_string($range) ? AnalyticsRange::tryFrom($range)?->value : null,
            'status' => is_string($status) ? DeliveryStatus::tryFrom($status)?->value : null,
        ]);
    }
}
