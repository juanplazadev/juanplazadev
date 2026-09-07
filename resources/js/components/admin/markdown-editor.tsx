import '@mdxeditor/editor/style.css';
/* Must stay after the vendor sheet: the two carry the same specificity, so
   source order is what decides. markdown-editor.css opens with why. */
import './markdown-editor.css';

import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    ChangeCodeMirrorLanguage,
    CodeToggle,
    ConditionalContents,
    CreateLink,
    DiffSourceToggleWrapper,
    InsertCodeBlock,
    InsertTable,
    InsertThematicBreak,
    ListsToggle,
    MDXEditor,
    Separator,
    UndoRedo,
    codeBlockPlugin,
    codeMirrorPlugin,
    diffSourcePlugin,
    directivesPlugin,
    headingsPlugin,
    linkDialogPlugin,
    linkPlugin,
    listsPlugin,
    markdownShortcutPlugin,
    quotePlugin,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
} from '@mdxeditor/editor';

import {
    BlockKeysContext,
    InsertBlockDirective,
    blockDirectiveDescriptor,
} from '@/components/admin/block-directive';

/*
  The rich text surface for a post or write-up body.

  Only ever reached through the lazy() in markdown-field.tsx. Nothing may import
  this module statically: it pulls in Lexical and CodeMirror (~1MB before
  compression, against the ~343KB recharts chunk the overview goes to such
  lengths to keep off its critical path), and none of it can run under SSR.

  What comes out is markdown, not MDX. Every plugin here is chosen against what
  App\Content\BodyRenderer will actually do with the result, which is CommonMark
  with `html_input: strip`. That rules several of them out - see below.
*/

/**
 * The fences the language dropdown offers.
 *
 * `caddyfile` has no CodeMirror grammar and is deliberately in the list anyway:
 * the site's own write-ups use it, and an unmatched language falls back to a
 * plain text editor while the fence keeps its language on the way out. Losing
 * the label would be the actual regression.
 */
const CODE_BLOCK_LANGUAGES: Record<string, string> = {
    '': 'Plain text',
    bash: 'Shell',
    caddyfile: 'Caddyfile',
    css: 'CSS',
    diff: 'Diff',
    dockerfile: 'Dockerfile',
    ini: 'INI',
    js: 'JavaScript',
    json: 'JSON',
    nginx: 'nginx',
    php: 'PHP',
    sql: 'SQL',
    ts: 'TypeScript',
    tsx: 'TSX',
    yaml: 'YAML',
};

/**
 * Serialisation markers, pinned to what the existing bodies already use.
 *
 * mdast re-serialises the whole document on every change, so an unpinned marker
 * rewrites every body the first time it is opened - `-` bullets to `*`,
 * `_emphasis_` to `*emphasis*`. Pinning them leaves line wrapping as the only
 * difference, and CommonMark treats a soft break as a space, so the rendered
 * page is unchanged.
 */
const TO_MARKDOWN_OPTIONS = {
    bullet: '-',
    emphasis: '_',
    strong: '*',
    fence: '`',
    rule: '-',
} as const;

export default function MarkdownEditor({
    markdown,
    blockKeys,
    onChange,
    onError,
}: {
    /** Read once, when the editor mounts. */
    markdown: string;
    /** The keys the Blocks JSON defines, for the ::block chips. */
    blockKeys: string[];
    onChange: (markdown: string) => void;
    onError: (message: string | null) => void;
}) {
    return (
        <BlockKeysContext value={blockKeys}>
            <MDXEditor
                className="mdx-editor"
                // The published article's own typography, so the editing
                // surface and the page agree without a second stylesheet.
                contentEditableClassName="prose"
                markdown={markdown}
                onChange={onChange}
                onError={({ error }) => onError(error)}
                toMarkdownOptions={TO_MARKDOWN_OPTIONS}
                // BodyRenderer strips raw HTML, so a stray tag must not be
                // allowed to fail the parse over markup that could never have
                // reached the page anyway.
                suppressHtmlProcessing
                plugins={[
                    headingsPlugin(),
                    listsPlugin(),
                    quotePlugin(),
                    thematicBreakPlugin(),
                    linkPlugin(),
                    linkDialogPlugin(),
                    tablePlugin(),
                    markdownShortcutPlugin(),
                    codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
                    codeMirrorPlugin({
                        codeBlockLanguages: CODE_BLOCK_LANGUAGES,
                        autoLoadLanguageSupport: true,
                    }),
                    /*
                      Only the ::block leaf directive is described. An admonition
                      descriptor would let the toolbar write ::: containers that
                      BodyRenderer has no case for, so the editor would offer a
                      construct the page silently drops.

                      escapeUnknownTextDirectives keeps a colon in prose - a
                      ratio, a time - from being read as a text directive.
                    */
                    directivesPlugin({
                        directiveDescriptors: [blockDirectiveDescriptor],
                        escapeUnknownTextDirectives: true,
                    }),
                    diffSourcePlugin({ viewMode: 'rich-text' }),
                    toolbarPlugin({
                        toolbarContents: () => (
                            <DiffSourceToggleWrapper
                                options={['rich-text', 'source']}
                            >
                                <ConditionalContents
                                    options={[
                                        {
                                            when: (editor) =>
                                                editor?.editorType ===
                                                'codeblock',
                                            contents: () => (
                                                <ChangeCodeMirrorLanguage />
                                            ),
                                        },
                                        {
                                            fallback: () => (
                                                <>
                                                    <UndoRedo />
                                                    <Separator />
                                                    <BlockTypeSelect />
                                                    <Separator />
                                                    {/* No underline: it
                                                        serialises to <u>, which
                                                        html_input: strip deletes
                                                        on the way to the page. */}
                                                    <BoldItalicUnderlineToggles
                                                        options={[
                                                            'Bold',
                                                            'Italic',
                                                        ]}
                                                    />
                                                    <CodeToggle />
                                                    <Separator />
                                                    <ListsToggle
                                                        options={[
                                                            'bullet',
                                                            'number',
                                                        ]}
                                                    />
                                                    <Separator />
                                                    <CreateLink />
                                                    <InsertTable />
                                                    <InsertThematicBreak />
                                                    <InsertCodeBlock />
                                                    <Separator />
                                                    <InsertBlockDirective />
                                                </>
                                            ),
                                        },
                                    ]}
                                />
                            </DiffSourceToggleWrapper>
                        ),
                    }),
                ]}
            />
        </BlockKeysContext>
    );
}
