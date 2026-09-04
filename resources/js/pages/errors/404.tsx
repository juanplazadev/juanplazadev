import { Head, Link } from '@inertiajs/react';

import { home } from '@/routes';

export default function NotFound() {
    return (
        <>
            <Head title="Page not found" />

            <section className="py-12 text-center">
                <h2 className="font-inter-tight text-foreground mb-2 text-lg font-semibold">
                    Page not found
                </h2>
                <p className="text-muted-foreground mb-6 text-sm">
                    That page doesn't exist - it may have moved or never been
                    here at all.
                </p>
                <Link
                    className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                    href={home()}
                >
                    Back home
                </Link>
            </section>
        </>
    );
}
