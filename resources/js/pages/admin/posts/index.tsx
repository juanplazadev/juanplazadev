import { Head } from '@inertiajs/react';

import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import type { ContentRow } from '@/components/admin/content-index';
import ContentIndex from '@/components/admin/content-index';
import { dashboard } from '@/routes';
import AppLayout from '@/layouts/app-layout';

export default function AdminPostsIndex({ posts }: { posts: ContentRow[] }) {
    return (
        <>
            <Head title="Posts" />

            <ContentIndex
                title="Posts"
                description="Everything on the writing page, drafts included."
                createHref={PostController.create.url()}
                editHref={(slug) => PostController.edit.url(slug)}
                destroyAction={(slug) => PostController.destroy.form(slug)}
                rows={posts}
            />
        </>
    );
}

AdminPostsIndex.layout = [
    AppLayout,
    {
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: PostController.index() },
        ],
    },
];
