import { useHttp, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

import Button from './button';
import InputError from '@/components/input-error';
import { useAppearance } from '@/hooks/use-appearance';
import { useTurnstile } from '@/hooks/use-turnstile';
import { request as resumeRequest } from '@/routes/resume';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const DownloadIcon = () => (
    <svg
        className="stroke-current"
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M8 2v8m0 0L5 7m3 3 3-3M2.5 12.5v.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-.5" />
    </svg>
);

const MailIcon = () => (
    <svg
        className="stroke-current"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
        <path d="m3.5 6 5.4 4.2a1.8 1.8 0 0 0 2.2 0L16.5 6" />
    </svg>
);

const CheckIcon = () => (
    <svg
        className="stroke-current"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="m5 10.5 3.2 3.2L15 7" />
    </svg>
);

/*
  Deliberately loose: one @, a dot in the domain, no spaces. This is only here
  to catch a typo before it costs a round trip - ResumeDeliveryRequest is what
  actually validates, and every clever local-part regex ends up rejecting
  somebody's perfectly valid mailbox.
*/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/*
  The hero's résumé call to action. It used to be a plain `<a download>` to the
  PDF, which handed the file over anonymously; asking for an address first is
  the whole point of the dialog, so there is no direct-download link inside it.

  POSTs to resume.request and stays put. useHttp rather than useForm or
  router.post on purpose: those speak the Inertia protocol and would navigate
  the page out from under a modal that has its own success state to show.
*/
export default function ResumeDialog() {
    const { turnstileSiteKey } = usePage().props;
    const { appearance } = useAppearance();

    const [open, setOpen] = useState(false);
    const [sent, setSent] = useState(false);
    // The address the confirmation reports, frozen at submit time so editing
    // the field afterwards cannot rewrite what the panel claims was sent.
    const [sentTo, setSentTo] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const turnstile = useTurnstile({
        siteKey: turnstileSiteKey,
        // Rendered only while the dialog is open. A challenge minted on page
        // load would have expired by the time most people click Résumé.
        active: open,
        theme: appearance === 'system' ? 'auto' : appearance,
    });

    const form = useHttp({ email: '', turnstile_token: '' });
    const { data, setData, processing, errors, clearErrors, reset } = form;

    // Server-side messages win: the client regex is a courtesy, the form
    // request is the authority.
    const error = errors.email ?? errors.turnstile_token ?? localError;

    // Reset on the way in rather than on the way out. Radix keeps the content
    // mounted through its 200ms exit animation, so clearing on close would flip
    // the success panel back to an empty form while the dialog is still fading.
    const onOpenChange = (next: boolean) => {
        if (next) {
            reset();
            clearErrors();
            setLocalError(null);
            setSent(false);
        }

        setOpen(next);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const address = data.email.trim();

        if (!EMAIL_PATTERN.test(address)) {
            setLocalError('That does not look like an address I can send to.');

            return;
        }

        if (turnstile.failed) {
            setLocalError(
                'The challenge could not load. Check your connection and try again.',
            );

            return;
        }

        if (turnstile.pending) {
            setLocalError(
                turnstile.interactive
                    ? 'Tick the box below to confirm you are human, then send.'
                    : 'Still verifying you are human - one moment.',
            );

            return;
        }

        setLocalError(null);
        setData({ email: address, turnstile_token: turnstile.token ?? '' });

        // Voided deliberately: every outcome is handled in the callbacks
        // below, and the returned promise is only there for callers that want
        // to await it.
        void form.post(resumeRequest.url(), {
            // X-Requested-With alone already makes Laravel answer 422 with a
            // JSON error bag, but saying so explicitly means a change to that
            // heuristic cannot quietly turn a validation failure into a
            // redirect this dialog has no way to render.
            headers: { Accept: 'application/json' },
            onSuccess: () => {
                setSentTo(address);
                setSent(true);
            },
            onError: () => {
                // Tokens are single use, so a rejected submit needs a new one
                // before the visitor can try again.
                turnstile.reset();
            },
        });
    };

    const isSent = sent;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" data-test="resume-trigger">
                    <DownloadIcon />
                    Résumé
                </Button>
            </DialogTrigger>

            <DialogContent
                data-test="resume-dialog"
                // The shared scrim is bg-black/80, which flattens the page behind
                // it into a slab. Softer and blurred keeps the hero legible, so
                // the dialog reads as sitting on the site rather than replacing it.
                overlayClassName="bg-black/60 backdrop-blur-xs"
                className="bg-card border-border gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md"
            >
                {/*
          The hero's own backdrop, reused verbatim, so the dialog reads as a
          piece of the same page and picks up the palette picker's --primary for
          free. It sits first in the markup and the panel below is `relative`,
          which stacks the content above it without a z-index anywhere.
        */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-44"
                >
                    <div className="hero-grid absolute inset-0" />
                    <div className="hero-glow absolute inset-0" />
                </div>

                <div className="relative p-6">
                    <DialogHeader className="items-center text-center sm:text-center">
                        <span
                            className={`mb-1 flex size-11 items-center justify-center rounded-2xl border shadow-xs transition-colors ${
                                isSent
                                    ? 'border-primary/25 bg-primary/10 text-primary'
                                    : 'border-border bg-muted text-foreground'
                            }`}
                        >
                            {isSent ? <CheckIcon /> : <MailIcon />}
                        </span>

                        <DialogTitle className="font-inter-tight text-xl tracking-tight">
                            {isSent ? 'On its way' : 'Get the résumé'}
                        </DialogTitle>

                        <DialogDescription className="text-balance">
                            {isSent ? (
                                <>
                                    Sent to{' '}
                                    <span className="text-foreground font-medium">
                                        {sentTo}
                                    </span>
                                    . Give it a minute, then check spam.
                                </>
                            ) : (
                                <>
                                    Leave your email and I&rsquo;ll send the PDF
                                    over.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {isSent ? (
                        <div data-test="resume-sent" className="mt-6">
                            <DialogClose asChild>
                                <Button variant="outline" className="w-full">
                                    Done
                                </Button>
                            </DialogClose>
                        </div>
                    ) : (
                        // noValidate on purpose: type="email" is there for the mobile
                        // keyboard, but the browser's own constraint bubble would
                        // preempt the message below and say it worse.
                        <form onSubmit={onSubmit} noValidate className="mt-6">
                            <Label
                                htmlFor="resume-email"
                                className="text-muted-foreground mb-2 text-[13px]"
                            >
                                Email address
                            </Label>

                            <Input
                                id="resume-email"
                                name="email"
                                type="email"
                                data-test="resume-email"
                                autoComplete="email"
                                placeholder="you@company.com"
                                value={data.email}
                                onChange={(event) => {
                                    setLocalError(null);
                                    clearErrors('email');
                                    setData('email', event.target.value);
                                }}
                                aria-invalid={error != null}
                                aria-describedby={
                                    error ? 'resume-email-error' : undefined
                                }
                                className="bg-background h-10 rounded-lg"
                            />

                            {error && (
                                <InputError
                                    id="resume-email-error"
                                    role="alert"
                                    message={error}
                                    className="mt-2 text-[13px]"
                                />
                            )}

                            {/*
                              Turnstile mounts here. With appearance
                              interaction-only the container stays empty and
                              zero-height for almost everybody, and only grows
                              when Cloudflare actually wants a checkbox - so the
                              dialog does not reserve space for a widget that
                              usually never appears. Absent entirely when no
                              site key was shared.
                            */}
                            <div
                                ref={turnstile.containerRef}
                                className="mt-3 empty:hidden"
                            />

                            <Button
                                type="submit"
                                variant="shimmer"
                                data-test="resume-submit"
                                disabled={processing}
                                className="mt-4 w-full py-2.5 disabled:opacity-70"
                            >
                                {processing ? (
                                    <>
                                        <Spinner />
                                        Sending
                                    </>
                                ) : (
                                    'Send me the résumé'
                                )}
                            </Button>

                            <p className="text-muted-foreground/70 mt-3 text-center text-[12px]">
                                Used once, to send the PDF. No list, no
                                follow-up sequence.
                            </p>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
