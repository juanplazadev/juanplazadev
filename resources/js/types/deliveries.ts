/**
 * Mirrors App\Mail\ResumeDeliverySnapshot::summary() and ::overview().
 *
 * The panel's second non-vendor source. Cloudflare says how many people came
 * and Sentry says what broke; this says who asked for the résumé and what
 * Mailgun did about it. There is no `error` field on purpose - the numbers come
 * from two local tables, so there is no request here that can fail.
 */

/** Mirrors App\Enums\DeliveryStatus. Derived from the row, never stored. */
export type DeliveryStatus =
    | 'blocked'
    | 'failed'
    | 'delivered'
    | 'sent'
    | 'pending';

export type DeliveryStatusOption = {
    value: DeliveryStatus;
    label: string;
};

/** One thing the provider reported. Every event type, not just the acted-on two. */
export type DeliveryEvent = {
    event: string;
    occurredAt: string;
    /** 'permanent' on a bounce Mailgun will not retry. */
    severity: string | null;
    reason: string | null;
};

export type DeliveryTotals = {
    requested: number;
    sent: number;
    delivered: number;
    failed: number;
    blocked: number;
    pending: number;
};

export type Delivery = {
    uuid: string;
    email: string;
    status: DeliveryStatus;
    statusLabel: string;
    /** 'passed' | 'blocked' | 'skipped' - skipped is "never asked", not a pass. */
    turnstile: string;
    requestedAt: string;
    /** The provider accepted it. Not the same as delivered. */
    sentAt: string | null;
    deliveredAt: string | null;
    failureReason: string | null;
    messageId: string | null;
    events: DeliveryEvent[];
};

export type DeliverySummary = {
    label: string;
    /** How many rows the table will ever list, however many were requested. */
    limit: number;
    /** Always the whole window, never narrowed by the status filter. */
    totals: DeliveryTotals;
    deliveries: Delivery[];
};

export type DeliveryOverview = {
    totals: DeliveryTotals;
    /** Across all time, so "none this week" can still say when the last one was. */
    lastRequestedAt: string | null;
};
