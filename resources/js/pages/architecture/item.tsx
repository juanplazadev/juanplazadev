import ContentBody from '@/components/content/content-body';
import type { Architecture } from '@/types/content';

// Same arrangement as blog/post.tsx.
export default function ArchitectureItem({
    architecture,
}: {
    architecture: Architecture;
}) {
    return <ContentBody blocks={architecture.rendered} />;
}
