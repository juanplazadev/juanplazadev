import { Head } from '@inertiajs/react';

import ArchitectureController from '@/actions/App/Http/Controllers/Admin/ArchitectureController';
import type { ContentRow } from '@/components/admin/content-index';
import ContentIndex from '@/components/admin/content-index';
import { dashboard } from '@/routes';

type Row = ContentRow & { position: number };

export default function AdminArchitecturesIndex({
    architectures,
}: {
    architectures: Row[];
}) {
    return (
        <>
            <Head title="Architecture write-ups" />

            <ContentIndex
                title="Architecture"
                description="Living documents. Position decides the order they list in."
                createHref={ArchitectureController.create.url()}
                editHref={(slug) => ArchitectureController.edit.url(slug)}
                destroyAction={(slug) =>
                    ArchitectureController.destroy.form(slug)
                }
                rows={architectures}
                extraColumn={{
                    heading: 'Position',
                    render: (row) => (row as Row).position,
                }}
            />
        </>
    );
}

AdminArchitecturesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Architecture', href: ArchitectureController.index() },
    ],
};
