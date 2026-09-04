import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import Badge from '@/components/site/badge';
import Icon from '@/components/site/icon';
import StatusDot from '@/components/site/status-dot';
import { index } from '@/routes/architecture';
import type { Architecture } from '@/types/content';

// The chrome around a write-up. Same arrangement as post-layout.tsx.
export default function ArchitectureLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { architecture } = usePage<{ architecture: Architecture }>().props;

    return (
        <>
            <Head title={`${architecture.title} - Architecture`}>
                <meta
                    name="description"
                    content={architecture.tagline}
                    head-key="description"
                />
            </Head>

            <article>
                <header className="border-border mb-8 border-b pb-8">
                    <div className="mb-3">
                        <Badge
                            variant={architecture.active ? 'accent' : 'outline'}
                            className="px-2 py-0.5 text-[11px]"
                        >
                            {architecture.active && <StatusDot />}
                            {architecture.status}
                        </Badge>
                    </div>

                    <h1 className="font-inter-tight text-foreground mb-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                        {architecture.title}
                    </h1>

                    <p className="text-muted-foreground mb-4 text-[15px] text-balance">
                        {architecture.tagline}
                    </p>

                    <ul className="flex flex-wrap gap-1.5">
                        {architecture.stack.map((tech) => (
                            <li key={tech.label}>
                                <Badge variant="outline">
                                    {tech.icon && (
                                        <Icon
                                            name={tech.icon}
                                            size={13}
                                            className="opacity-70"
                                        />
                                    )}
                                    {tech.label}
                                </Badge>
                            </li>
                        ))}
                    </ul>

                    {/* Above the prose on purpose. A reader who only wants to see the thing
              run should not have to scroll a write-up to find out they can. */}
                    {architecture.links && (
                        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
                            {architecture.links.map((link) => (
                                <li key={link.href}>
                                    <a
                                        className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                                        href={link.href}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {link.label}
                                        <span aria-hidden="true">&#8599;</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </header>

                <div className="prose">{children}</div>

                <footer className="border-border mt-10 border-t pt-6">
                    <Link
                        className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                        href={index()}
                        prefetch
                    >
                        <span aria-hidden="true">&larr;</span>
                        All architecture write-ups
                    </Link>
                </footer>
            </article>
        </>
    );
}
