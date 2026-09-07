<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\HandleResumeDeliveryAction;
use App\Http\Requests\ResumeDeliveryRequest;
use App\Services\Cloudflare\TurnstileVerifier;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

final class HomeController extends Controller
{
    /**
     * Show the landing page.
     */
    public function index(): Response
    {
        return Inertia::render('home');
    }

    /**
     * Take a résumé request from the hero dialog.
     *
     * Answers JSON rather than an Inertia redirect: the form lives inside a
     * modal that stays open to show its own success state, so a visit here
     * would navigate the page out from under it.
     *
     * A refused challenge still writes a row before the 422 - that record is
     * the point of storing `turnstile_success`, and dropping it would leave the
     * dashboard blind to exactly the traffic it most wants to see.
     */
    public function resume(
        ResumeDeliveryRequest $request,
        TurnstileVerifier $turnstile,
        HandleResumeDeliveryAction $handle,
    ): JsonResponse {
        $verification = $turnstile->verify(
            $request->string('turnstile_token')->value(),
            $request->ip(),
        );

        $delivery = $handle->handle(
            $request->string('email')->value(),
            $request->ip(),
            $request->userAgent(),
            $verification,
        );

        if (! $verification->allows()) {
            return response()->json([
                'message' => 'That challenge could not be verified. Please try again.',
                'errors' => ['turnstile_token' => ['That challenge could not be verified. Please try again.']],
            ], 422);
        }

        return response()->json(['uuid' => $delivery->uuid], 201);
    }
}
