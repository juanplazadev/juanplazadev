import {
    ButtonWithTooltip,
    insertDirective$,
    usePublisher,
    type DirectiveDescriptor,
    type DirectiveEditorProps,
} from '@mdxeditor/editor';
import { SquareStack, X } from 'lucide-react';
import { createContext, use } from 'react';

/**
 * The block keys the Blocks JSON currently defines.
 *
 * A context rather than a plugin parameter because `directivesPlugin` is
 * configured once when the editor mounts, while the keys change every time the
 * Blocks textarea is edited. Lexical renders a decorator through a portal from
 * inside the editor's own React tree, so a provider around <MDXEditor> reaches
 * every chip.
 */
export const BlockKeysContext = createContext<string[]>([]);

/**
 * The name the directive goes by in the markdown: `::block{key="request-path"}`.
 *
 * BodyRenderer::DIRECTIVE is anchored to a whole line and only accepts a
 * double-quoted, lowercase-hyphenated key, which is exactly what
 * mdast-util-directive emits: it defaults to `preferUnquoted: false` and a
 * double quote, so a chip round-trips through the editor byte for byte.
 */
const NAME = 'block';

function keyOf(
    attributes: Record<string, string | null | undefined> | null | undefined,
): string {
    return attributes?.key ?? '';
}

/**
 * The chip a `::block` directive shows in the rich text surface.
 *
 * A key with nothing behind it is called out rather than rejected, mirroring
 * BodyRenderer::render(), which drops an unresolved key so a typo leaves a gap
 * in the page instead of white-screening a published post.
 */
function BlockDirectiveEditor({
    mdastNode,
    lexicalNode,
    parentEditor,
}: DirectiveEditorProps) {
    const blockKeys = use(BlockKeysContext);
    const current = keyOf(mdastNode.attributes);
    const missing = current === '' || !blockKeys.includes(current);

    function setKey(key: string): void {
        parentEditor.update(() => {
            lexicalNode.setMdastNode({
                ...mdastNode,
                attributes: { ...mdastNode.attributes, key },
            });
        });
    }

    function remove(): void {
        parentEditor.update(() => {
            lexicalNode.selectNext();
            lexicalNode.remove();
        });
    }

    return (
        <div
            data-test="block-directive"
            className="border-border bg-muted/40 my-4 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2"
        >
            <SquareStack
                aria-hidden
                className="text-muted-foreground size-3.5 shrink-0"
            />
            <span className="text-muted-foreground font-mono text-xs">
                ::block
            </span>

            <select
                aria-label="Block key"
                value={current}
                onChange={(event) => setKey(event.target.value)}
                className="border-border bg-background text-foreground rounded-md border px-2 py-1 font-mono text-xs"
            >
                <option value="">Pick a block…</option>
                {/* A key the body references but the JSON no longer defines still
                    has to be selectable, or opening the post would silently
                    rewrite it to the empty string. */}
                {(current !== '' && !blockKeys.includes(current)
                    ? [current, ...blockKeys]
                    : blockKeys
                ).map((key) => (
                    <option key={key} value={key}>
                        {key}
                    </option>
                ))}
            </select>

            {missing && (
                <span className="text-destructive text-xs">
                    Not in the blocks JSON - this renders as nothing.
                </span>
            )}

            <button
                type="button"
                onClick={remove}
                aria-label="Remove block"
                className="text-muted-foreground hover:text-foreground ml-auto"
            >
                <X aria-hidden className="size-3.5" />
            </button>
        </div>
    );
}

export const blockDirectiveDescriptor: DirectiveDescriptor = {
    name: NAME,
    type: 'leafDirective',
    attributes: ['key'],
    hasChildren: false,
    testNode: (node) => node.name === NAME,
    Editor: BlockDirectiveEditor,
};

/**
 * Inserts a `::block` directive at the caret.
 *
 * Deliberately inserts an empty key: the chip's own select is where a key is
 * chosen, so there is one place that answers the question rather than two.
 */
export function InsertBlockDirective() {
    const insertDirective = usePublisher(insertDirective$);

    return (
        <ButtonWithTooltip
            title="Insert a stored block"
            onClick={() => {
                insertDirective({
                    type: 'leafDirective',
                    name: NAME,
                    attributes: { key: '' },
                });
            }}
        >
            <SquareStack aria-hidden className="size-4" />
        </ButtonWithTooltip>
    );
}
