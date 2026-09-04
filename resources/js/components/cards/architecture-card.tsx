import { Link } from '@inertiajs/react';

import ArrowIcon from '@/components/site/arrow-icon';
import Badge from '@/components/site/badge';
import Card from '@/components/site/card';
import Icon from '@/components/site/icon';
import StatusDot from '@/components/site/status-dot';
import { show } from '@/routes/architecture';
import type { Architecture } from '@/types/content';

// One entry on the architecture index. Same shape as post-card.tsx: the whole
// card is the hit area, via the <a>'s before: pseudo-element stretched over the
// (relative) card.
export default function ArchitectureCard({ item }: { item: Architecture }) {
    return (
        <Card interactive className="group">
            <div className="text-muted-foreground group-hover:text-primary absolute top-5 right-5 transition group-hover:rotate-45">
                <ArrowIcon />
            </div>

            <div className="mb-2 space-y-2">
                <div>
                    <Badge
                        variant={item.active ? 'accent' : 'outline'}
                        className="px-2 py-0.5 text-[11px]"
                    >
                        {item.active && <StatusDot />}
                        {item.status}
                    </Badge>
                </div>
                <h3 className="text-foreground group-hover:text-primary pr-6 font-semibold transition-colors">
                    <Link
                        className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-lg outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                        href={show(item.slug)}
                        prefetch
                    >
                        {item.title}
                    </Link>
                </h3>
            </div>

            <p className="text-muted-foreground text-sm">{item.tagline}</p>

            <ul className="mt-3 flex flex-wrap gap-1.5">
                {item.stack.map((tech) => (
                    <li key={tech.label}>
                        <Badge
                            variant="outline"
                            className="px-2 py-0.5 text-[11px]"
                        >
                            {tech.icon && (
                                <Icon
                                    name={tech.icon}
                                    size={12}
                                    className="opacity-70"
                                />
                            )}
                            {tech.label}
                        </Badge>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
