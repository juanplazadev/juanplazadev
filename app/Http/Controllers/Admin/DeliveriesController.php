<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\AnalyticsRange;
use App\Enums\DeliveryStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeliveriesRequest;
use App\Mail\ResumeDeliverySnapshot;
use Inertia\Inertia;
use Inertia\Response;

final class DeliveriesController extends Controller
{
    public function __construct(private readonly ResumeDeliverySnapshot $snapshot) {}

    /**
     * Who asked for the résumé, and what Mailgun did with it.
     *
     * The one section page whose data prop is EAGER, and the asymmetry with its
     * siblings is the point rather than an oversight. Traffic, errors and
     * deployments defer because each is a network hop to a vendor that
     * rate-limits, degrades and needs an error string rendered for it. This is
     * six counts and a fifty-row select against two local tables, so deferring
     * would buy a second round trip and a skeleton for data already in hand -
     * the same reasoning that keeps ContentSnapshot inline on the overview.
     *
     * Both filters are sanitised rather than validated; see DeliveriesRequest.
     */
    public function index(DeliveriesRequest $request): Response
    {
        $range = $request->range();
        $status = $request->status();

        return Inertia::render('admin/deliveries', [
            'range' => $range->value,
            'ranges' => array_map(
                static fn (AnalyticsRange $case): array => [
                    'value' => $case->value,
                    'label' => $case->label(),
                ],
                AnalyticsRange::cases(),
            ),

            'status' => $status?->value,
            'statuses' => array_map(
                static fn (DeliveryStatus $case): array => [
                    'value' => $case->value,
                    'label' => $case->label(),
                ],
                DeliveryStatus::cases(),
            ),

            'deliveries' => $this->snapshot->summary($range, $status),
        ]);
    }
}
