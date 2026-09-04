<?php

declare(strict_types=1);

namespace App\Support\Content;

use Illuminate\Support\Str;

/**
 * Compiles a markdown body plus its named blocks into the flat list the
 * frontend renders.
 *
 * The body is the markdown a human writes. Anything that cannot be expressed in
 * markdown - the hand-laid-out SVG diagrams, the spec tables - sits in `blocks`
 * as JSON and is referenced from the prose by a directive on its own line:
 *
 *     ::block{key="request-path"}
 *
 * The output interleaves the two, so a write-up stays a single document with
 * its diagrams in the right places rather than prose and figures maintained
 * apart from each other.
 *
 * Stateless on purpose: it holds no request state, which is what makes it safe
 * to resolve under Octane's long-running workers.
 */
final class BodyRenderer
{
    /**
     * A directive alone on its line. Anchored at both ends so `::block{...}`
     * mentioned inside a sentence or a fenced code block is left as prose.
     */
    private const string DIRECTIVE = '/^::block\{key="([a-z0-9-]+)"\}[ \t]*$/m';

    /**
     * CommonMark options.
     *
     * `html_input: strip` is the important one. The rendered HTML is handed to
     * dangerouslySetInnerHTML, so raw HTML must not survive the parser - even
     * though the only author is the site owner, a body is not a place to keep
     * an XSS sink open for no benefit. Everything the write-ups actually use
     * (emphasis, code, fences, lists) is plain GFM.
     */
    private const array OPTIONS = [
        'html_input' => 'strip',
        'allow_unsafe_links' => false,
    ];

    /**
     * @param  array<string, mixed>  $blocks  Keyed by the name the directive references.
     * @return list<array{type: 'html', html: string}|array{type: 'block', key: string, block: array<string, mixed>}>
     */
    public function render(?string $markdown, ?array $blocks = null): array
    {
        $blocks ??= [];
        $rendered = [];

        $segments = preg_split(
            self::DIRECTIVE,
            (string) $markdown,
            flags: PREG_SPLIT_DELIM_CAPTURE
        ) ?: [];

        // preg_split with DELIM_CAPTURE alternates prose, key, prose, key, ...
        // so the even indices are always markdown and the odd ones are keys.
        foreach ($segments as $index => $segment) {
            if ($index % 2 === 1) {
                $block = $blocks[$segment] ?? null;

                // A key with nothing behind it is dropped rather than fataled.
                // A typo in the editor should leave a gap in the page, not
                // white-screen a published post.
                if (is_array($block)) {
                    $rendered[] = ['type' => 'block', 'key' => $segment, 'block' => $block];
                }

                continue;
            }

            if (mb_trim($segment) === '') {
                continue;
            }

            $rendered[] = ['type' => 'html', 'html' => Str::markdown($segment, self::OPTIONS)];
        }

        return $rendered;
    }

    /**
     * The block keys a body actually references, in the order it uses them.
     *
     * @return list<string>
     */
    public function referencedKeys(?string $markdown): array
    {
        preg_match_all(self::DIRECTIVE, (string) $markdown, $matches);

        return $matches[1];
    }
}
