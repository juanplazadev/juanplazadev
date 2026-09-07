import { useMemo, useState } from 'react';

import ContentBody from '@/components/content/content-body';
import Field from '@/components/admin/field';
import MarkdownField from '@/components/admin/markdown-field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { preview } from '@/routes/admin/content';
import type { RenderedBlock } from '@/types/content';

/**
 * The block names the Blocks JSON currently defines.
 *
 * Parsed leniently: the textarea is mid-edit for most of its life, so invalid
 * JSON means "no keys yet", not an error. The save path and the preview both
 * still run it through the ValidBlocks rule.
 */
function parseBlockKeys(blocks: string): string[] {
    if (blocks.trim() === '') {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(blocks);

        return parsed !== null && typeof parsed === 'object'
            ? Object.keys(parsed)
            : [];
    } catch {
        return [];
    }
}

/*
  The markdown body, its block payloads, and a preview of the two compiled
  together.

  The preview is rendered by the server through the same BodyRenderer the models
  use on save, and displayed through the same ContentBody the public page uses.
  Nothing here re-implements either, so the preview cannot quietly disagree with
  what publishing will produce.
*/
export default function BodyEditor({
    body,
    blocks,
    errors,
}: {
    body: string;
    blocks: string;
    errors: Partial<Record<'body' | 'blocks', string>>;
}) {
    const [draft, setDraft] = useState(body);
    const [draftBlocks, setDraftBlocks] = useState(blocks);
    const [rendered, setRendered] = useState<RenderedBlock[] | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const blockKeys = useMemo(() => parseBlockKeys(draftBlocks), [draftBlocks]);

    async function refresh() {
        setPending(true);
        setProblem(null);

        let parsed: unknown = null;

        if (draftBlocks.trim() !== '') {
            try {
                parsed = JSON.parse(draftBlocks);
            } catch (error) {
                setProblem(
                    `Blocks are not valid JSON: ${(error as Error).message}`,
                );
                setPending(false);
                return;
            }
        }

        try {
            const response = await window.fetch(preview.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ body: draft, blocks: parsed }),
            });

            const payload = await response.json();

            if (!response.ok) {
                // The same ValidBlocks rule that guards a save, so a bad edge
                // reference surfaces here rather than on the published page.
                setProblem(
                    Object.values(payload.errors ?? {})
                        .flat()
                        .join(' ') || 'Preview failed.',
                );
                return;
            }

            setRendered(payload.rendered);
        } catch {
            setProblem('Could not reach the preview endpoint.');
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="space-y-6">
            <Field
                id="body"
                label="Body"
                hint={
                    <>
                        Rich text over markdown. A stored block is embedded as{' '}
                        <code>{'::block{key="request-path"}'}</code> - insert
                        one from the toolbar, or switch to source and write it.
                    </>
                }
                error={errors.body}
            >
                <MarkdownField
                    name="body"
                    markdown={draft}
                    blockKeys={blockKeys}
                    onChange={setDraft}
                />
            </Field>

            <Field
                id="blocks"
                label="Blocks"
                hint="JSON keyed by block name. Diagrams and spec lists - anything the markdown cannot express. Leave empty if the body is all prose."
                error={errors.blocks}
            >
                <Textarea
                    id="blocks"
                    name="blocks"
                    className="min-h-40 font-mono text-[13px]"
                    value={draftBlocks}
                    onChange={(event) => setDraftBlocks(event.target.value)}
                    spellCheck={false}
                />
            </Field>

            <div className="space-y-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={refresh}
                    disabled={pending}
                >
                    {pending ? 'Rendering…' : 'Preview'}
                </Button>

                {problem && (
                    <p className="text-destructive text-sm">{problem}</p>
                )}

                {rendered && (
                    <div className="border-border rounded-lg border p-6">
                        <div className="prose">
                            <ContentBody blocks={rendered} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
