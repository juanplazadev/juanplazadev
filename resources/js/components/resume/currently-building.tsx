import type { InertiaLinkProps } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import ArrowIcon from '@/components/site/arrow-icon';
import Badge from '@/components/site/badge';
import Card from '@/components/site/card';
import Section from '@/components/site/section';
import StatusDot from '@/components/site/status-dot';
import {
    index as architectureIndex,
    show as architectureShow,
} from '@/routes/architecture';

type Item = {
    title: string;
    icon: ReactNode;
    status: string;
    active: boolean;
    description: string;
    /** Named separately from the description so the prose can describe the problem
     *  and the badges answer "what is it written in" without repeating it. */
    stack: string;
    /** Set when there is an architecture write-up to link to. Makes the whole
     *  card the hit area, the same way OpenSource's cards work. */
    /** Internal destination, as a Wayfinder route. External links go in `links`. */
    href?: NonNullable<InertiaLinkProps['href']>;
    /** Off-site proof - the running app and the source. These sit above the card's
     *  full-bleed ::before hit area, so they need their own stacking context or the
     *  overlay swallows the clicks. */
    links?: { label: string; href: string }[];
};

const CalendarIcon = () => (
    <svg
        className="stroke-primary"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="2.5" y="4" width="15" height="13.5" rx="2.5" />
        <path d="M2.5 8.25h15M6.5 2.5V5.5M13.5 2.5V5.5M6.75 12.25l1.75 1.75 3.75-3.75" />
    </svg>
);

const DumbbellIcon = () => (
    <svg
        className="stroke-primary"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="1.75" y="6.75" width="3.5" height="6.5" rx="1.25" />
        <rect x="14.75" y="6.75" width="3.5" height="6.5" rx="1.25" />
        <path d="M5.25 10h9.5" />
    </svg>
);

export default function CurrentlyBuilding() {
    const items: Item[] = [
        {
            title: 'Check-in',
            icon: <CalendarIcon />,
            status: 'In progress',
            active: true,
            description:
                'An appointment scheduling and check-in platform for operations that run on arrivals - drivers book a slot, arrive, and check in against it across sites. 66 tests run on every push.',
            stack: 'Laravel · Inertia + React · PostgreSQL · Redis',
            href: architectureShow('check-in'),
            links: [
                { label: 'Live demo', href: 'https://ci.thatdevjp.com' },
                {
                    label: 'Source',
                    href: 'https://github.com/juanplazadev/check-in-v2',
                },
            ],
        },
        {
            title: 'Gym management system',
            icon: <DumbbellIcon />,
            status: 'Next up',
            active: false,
            description:
                'Member registration, payments, and building access in one system, with an app that shows members their own attendance history.',
            stack: 'Spring Boot · React · TypeScript',
        },
    ];

    return (
        <Section title="Currently Building">
            <div className="grid gap-4 min-[580px]:grid-cols-2">
                {items.map((item, index) => (
                    <Card
                        key={index}
                        interactive={Boolean(item.href)}
                        className={item.href ? 'group' : undefined}
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="border-border bg-muted flex h-11 w-11 items-center justify-center rounded-full border">
                                {item.icon}
                            </div>
                            <Badge
                                variant={item.active ? 'accent' : 'outline'}
                                className="px-2 py-0.5 text-[11px]"
                            >
                                {item.active && <StatusDot />}
                                {item.status}
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-foreground font-semibold">
                                {item.href ? (
                                    <Link
                                        className="group-hover:text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-lg transition-colors outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                                        href={item.href}
                                        prefetch
                                    >
                                        {item.title}
                                        <span
                                            className="text-muted-foreground group-hover:text-primary transition group-hover:rotate-45"
                                            aria-hidden="true"
                                        >
                                            <ArrowIcon />
                                        </span>
                                    </Link>
                                ) : (
                                    item.title
                                )}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                {item.description}
                            </p>
                            <p className="text-muted-foreground/70 pt-1 text-[12px]">
                                {item.stack}
                            </p>
                            {item.links && (
                                // relative + z-10 to clear the title link's ::before overlay,
                                // which covers the whole card and would otherwise take the click.
                                <ul className="relative z-10 flex flex-wrap gap-x-4 gap-y-1 pt-2">
                                    {item.links.map((link) => (
                                        <li key={link.href}>
                                            <a
                                                className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1 rounded-sm text-[13px] font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                                                href={link.href}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {link.label}
                                                <span aria-hidden="true">
                                                    &#8599;
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            <div className="mt-4">
                <Link
                    className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
                    href={architectureIndex()}
                    prefetch
                >
                    How these are built
                    <span aria-hidden="true">&rarr;</span>
                </Link>
            </div>
        </Section>
    );
}
