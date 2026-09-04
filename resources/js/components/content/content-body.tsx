import DiagramBlock from '@/components/content/diagram-block';
import SpecList from '@/components/site/spec-list';
import type { RenderedBlock } from '@/types/content';

/*
  Renders a compiled body: markdown the server turned into HTML, interleaved
  with the blocks the prose referenced by key.

  The HTML is injected rather than parsed. It comes from BodyRenderer, which
  runs CommonMark with html_input: strip, so what arrives here has already had
  every tag the author did not write through markdown removed.
*/
export default function ContentBody({ blocks }: { blocks?: RenderedBlock[] }) {
    return (
        <>
            {blocks?.map((entry, index) => {
                if (entry.type === 'html') {
                    return (
                        <div
                            key={index}
                            // Spacing between the elements inside this wrapper
                            // comes from the matching rule in prose.css.
                            data-prose=""
                            dangerouslySetInnerHTML={{ __html: entry.html }}
                        />
                    );
                }

                switch (entry.block.type) {
                    case 'diagram':
                        return (
                            <DiagramBlock key={entry.key} spec={entry.block} />
                        );
                    case 'specs':
                        return (
                            <SpecList
                                key={entry.key}
                                items={entry.block.items}
                            />
                        );
                    default:
                        // A block type this build does not know about. Newer
                        // content on an older bundle should leave a gap, not
                        // white-screen the page.
                        return null;
                }
            })}
        </>
    );
}
