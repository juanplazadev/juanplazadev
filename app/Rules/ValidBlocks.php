<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Structural validation for a body's `blocks` payload.
 *
 * The frontend drops what it cannot render, silently and by design, so a bad
 * edge reference would otherwise surface as a missing arrow on a published page
 * rather than as an error in the editor. This is where that gets caught.
 */
final class ValidBlocks implements ValidationRule
{
    private const array TYPES = ['diagram', 'specs'];

    private const array ANCHORS = ['top', 'right', 'bottom', 'left'];

    /**
     * @param  Closure(string, string|null=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null) {
            return;
        }

        if (! is_array($value)) {
            $fail('The :attribute must be an object keyed by block name.');

            return;
        }

        foreach ($value as $key => $block) {
            if (! is_string($key) || preg_match('/^[a-z0-9-]+$/', $key) !== 1) {
                $fail("Block key [{$key}] must be lowercase letters, numbers and hyphens.");

                continue;
            }

            if (! is_array($block) || ! in_array($block['type'] ?? null, self::TYPES, true)) {
                $fail("Block [{$key}] needs a type of ".implode(' or ', self::TYPES).'.');

                continue;
            }

            match ($block['type']) {
                'diagram' => $this->validateDiagram($key, $block, $fail),
                'specs' => $this->validateSpecs($key, $block, $fail),
            };
        }
    }

    /**
     * @param  array<string, mixed>  $block
     * @param  Closure(string, string|null=): PotentiallyTranslatedString  $fail
     */
    private function validateDiagram(string $key, array $block, Closure $fail): void
    {
        foreach (['title', 'description'] as $required) {
            // Both are read out in place of the drawing. A diagram without them
            // is unreadable to anyone not looking at it.
            if (! is_string($block[$required] ?? null) || mb_trim($block[$required]) === '') {
                $fail("Diagram [{$key}] needs a {$required}.");
            }
        }

        foreach (['width', 'height'] as $required) {
            if (! is_int($block[$required] ?? null)) {
                $fail("Diagram [{$key}] needs an integer {$required}.");
            }
        }

        $nodes = is_array($block['nodes'] ?? null) ? $block['nodes'] : [];
        $names = [];

        foreach ($nodes as $index => $node) {
            if (! is_array($node) || ! is_string($node['key'] ?? null)) {
                $fail("Diagram [{$key}] node #{$index} needs a key.");

                continue;
            }

            foreach (['x', 'y', 'w', 'h'] as $dimension) {
                if (! is_int($node[$dimension] ?? null)) {
                    $fail("Diagram [{$key}] node [{$node['key']}] needs an integer {$dimension}.");
                }
            }

            $names[] = $node['key'];
        }

        foreach (is_array($block['edges'] ?? null) ? $block['edges'] : [] as $index => $edge) {
            foreach (['from', 'to'] as $end) {
                $this->validateEndpoint($key, $index, $end, $edge[$end] ?? null, $names, $fail);
            }
        }
    }

    /**
     * An endpoint is either "nodeKey.anchor" or a literal [x, y] point.
     *
     * @param  list<string>  $names
     * @param  Closure(string, string|null=): PotentiallyTranslatedString  $fail
     */
    private function validateEndpoint(
        string $key,
        int|string $index,
        string $end,
        mixed $endpoint,
        array $names,
        Closure $fail,
    ): void {
        $where = "Diagram [{$key}] edge #{$index} `{$end}`";

        if (is_array($endpoint)) {
            if (count($endpoint) !== 2 || array_filter($endpoint, is_numeric(...)) !== $endpoint) {
                $fail("{$where} must be a two-number point.");
            }

            return;
        }

        if (! is_string($endpoint) || ! str_contains($endpoint, '.')) {
            $fail("{$where} must be \"node.anchor\" or a [x, y] point.");

            return;
        }

        [$node, $anchor] = explode('.', $endpoint, 2);

        if (! in_array($node, $names, true)) {
            $fail("{$where} points at node [{$node}], which the diagram does not declare.");
        }

        if (! in_array($anchor, self::ANCHORS, true)) {
            $fail("{$where} anchor [{$anchor}] must be one of ".implode(', ', self::ANCHORS).'.');
        }
    }

    /**
     * @param  array<string, mixed>  $block
     * @param  Closure(string, string|null=): PotentiallyTranslatedString  $fail
     */
    private function validateSpecs(string $key, array $block, Closure $fail): void
    {
        $items = is_array($block['items'] ?? null) ? $block['items'] : null;

        if ($items === null || $items === []) {
            $fail("Spec list [{$key}] needs at least one item.");

            return;
        }

        foreach ($items as $index => $item) {
            if (! is_array($item) || ! is_string($item['label'] ?? null) || ! is_string($item['value'] ?? null)) {
                $fail("Spec list [{$key}] item #{$index} needs a label and a value.");
            }
        }
    }
}
