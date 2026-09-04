import { Form, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import Heading from '@/components/heading';
import type { RouteFormDefinition } from '@/wayfinder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type ContentRow = {
    slug: string;
    title: string;
    isPublished: boolean;
    updatedAt: string | null;
};

/*
  The listing both content types share. They differ only in their routes and in
  the one extra column architecture has, so the table itself is written once.
*/
export default function ContentIndex({
    title,
    description,
    createHref,
    editHref,
    destroyAction,
    rows,
    extraColumn,
}: {
    title: string;
    description: string;
    createHref: string;
    editHref: (slug: string) => string;
    /** Wayfinder spoofs DELETE through a POST form, so this is a post form. */
    destroyAction: (slug: string) => RouteFormDefinition<'post'>;
    rows: ContentRow[];
    extraColumn?: { heading: string; render: (row: ContentRow) => ReactNode };
}) {
    return (
        <div className="space-y-6 p-4">
            <div className="flex items-end justify-between gap-4">
                <Heading title={title} description={description} />

                <Button asChild>
                    <Link href={createHref}>New</Link>
                </Button>
            </div>

            {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Nothing here yet.
                </p>
            ) : (
                <div className="border-border overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-border border-b text-left">
                            <tr>
                                <th className="px-4 py-2.5 font-medium">
                                    Title
                                </th>
                                <th className="px-4 py-2.5 font-medium">
                                    Status
                                </th>
                                {extraColumn && (
                                    <th className="px-4 py-2.5 font-medium">
                                        {extraColumn.heading}
                                    </th>
                                )}
                                <th className="px-4 py-2.5 font-medium">
                                    Updated
                                </th>
                                <th className="px-4 py-2.5">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {rows.map((row) => (
                                <tr key={row.slug}>
                                    <td className="px-4 py-2.5">
                                        <Link
                                            className="font-medium underline-offset-4 hover:underline"
                                            href={editHref(row.slug)}
                                        >
                                            {row.title}
                                        </Link>
                                        <span className="text-muted-foreground block text-xs">
                                            /{row.slug}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <Badge
                                            variant={
                                                row.isPublished
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {row.isPublished
                                                ? 'Published'
                                                : 'Draft'}
                                        </Badge>
                                    </td>
                                    {extraColumn && (
                                        <td className="text-muted-foreground px-4 py-2.5">
                                            {extraColumn.render(row)}
                                        </td>
                                    )}
                                    <td className="text-muted-foreground px-4 py-2.5">
                                        {row.updatedAt}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <Form
                                            {...destroyAction(row.slug)}
                                            options={{ preserveScroll: true }}
                                            onBefore={() =>
                                                confirm(
                                                    `Delete "${row.title}"? This cannot be undone.`,
                                                )
                                            }
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={processing}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </Form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
