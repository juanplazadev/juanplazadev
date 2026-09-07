import { useEffect, useRef, useState, type FormEvent } from 'react';

import Button from './button';
import InputError from '@/components/input-error';
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
  Deliberately loose: one @, a dot in the domain, no spaces. The only job here
  is catching a typo before it becomes a silent failure - the address has to
  survive real validation server side anyway, and every clever local-part regex
  ends up rejecting somebody's perfectly valid mailbox.
*/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = 'idle' | 'submitting' | 'sent';

/*
  The hero's résumé call to action. It used to be a plain `<a download>` to the
  PDF, which handed the file over anonymously; asking for an address first is
  the whole point of the dialog, so there is no direct-download link inside it.

  There is no backend yet - see the timeout in onSubmit.
*/
export default function ResumeDialog() {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timer.current) {
                clearTimeout(timer.current);
            }
        },
        [],
    );

    // Reset on the way in rather than on the way out. Radix keeps the content
    // mounted through its 200ms exit animation, so clearing on close would flip
    // the success panel back to an empty form while the dialog is still fading.
    const onOpenChange = (next: boolean) => {
        if (next) {
            setEmail('');
            setError(null);
            setStatus('idle');
        }

        setOpen(next);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const address = email.trim();

        if (!EMAIL_PATTERN.test(address)) {
            setError('That does not look like an address I can send to.');

            return;
        }

        setEmail(address);
        setError(null);
        setStatus('submitting');

        // Stands in for the request that does not exist yet, so the button has a
        // real pending state to render. Replace it with the POST, not with an
        // instant flip to 'sent'.
        timer.current = setTimeout(() => setStatus('sent'), 700);
    };

    const isSent = status === 'sent';

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
                                        {email}
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
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                aria-invalid={error !== null}
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

                            <Button
                                type="submit"
                                variant="shimmer"
                                data-test="resume-submit"
                                disabled={status === 'submitting'}
                                className="mt-4 w-full py-2.5 disabled:opacity-70"
                            >
                                {status === 'submitting' ? (
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
