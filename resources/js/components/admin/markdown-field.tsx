import { Suspense, lazy, useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

const MarkdownEditor = lazy(() => import('@/components/admin/markdown-editor'));

/*
  The boundary the rich text editor sits behind, and the only part of it any
  other module may import.

  Two problems, one answer. MDXEditor is Lexical plus CodeMirror - around 1MB of
  JavaScript that cannot run without a DOM - and this application server-renders
  every Inertia page (config/inertia.php, INERTIA_SSR_ENABLED defaults true). A
  static import would put that on the admin critical path AND hand renderToString
  a component it cannot render.

  So: lazy() for the chunk, and a mount gate for SSR. The gate is load-bearing,
  not defensive - React calls a lazy factory during renderToString and then
  suspends with nothing able to resolve it. The overview's recharts boundary gets
  the same protection for free from <Deferred>, whose prop is simply absent from
  the server response; there is no deferred prop here, so the gate supplies it.

  What the form submits is the hidden input, so `body` is still raw markdown in a
  plain form field and nothing on the server side had to learn about any of this.
*/
export default function MarkdownField({
    name,
    markdown,
    blockKeys,
    onChange,
}: {
    name: string;
    markdown: string;
    blockKeys: string[];
    onChange: (markdown: string) => void;
}) {
    const [mounted, setMounted] = useState(false);
    const [initial] = useState(markdown);
    const [parseError, setParseError] = useState<string | null>(null);

    useEffect(() => setMounted(true), []);

    // Sized to the textarea it replaced, so the page does not jump when the
    // chunk lands.
    const placeholder = <Skeleton className="h-96 w-full rounded-lg" />;

    return (
        <div className="space-y-2">
            <input type="hidden" name={name} value={markdown} />

            {mounted ? (
                <Suspense fallback={placeholder}>
                    <MarkdownEditor
                        // Read once on mount; `markdown` is the live value and
                        // passing it here would fight the editor's own state.
                        markdown={initial}
                        blockKeys={blockKeys}
                        onChange={onChange}
                        onError={setParseError}
                    />
                </Suspense>
            ) : (
                placeholder
            )}

            {parseError && (
                <p className="text-destructive text-sm">
                    The markdown could not be parsed: {parseError}
                </p>
            )}
        </div>
    );
}
