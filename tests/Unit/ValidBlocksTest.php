<?php

declare(strict_types=1);

use App\Rules\ValidBlocks;

/**
 * Run the rule directly rather than through Validator.
 *
 * The rule touches nothing outside itself, so driving it with its own $fail
 * closure keeps this a unit test that needs no booted application.
 *
 * @param  array<string, mixed>|null  $blocks
 * @return list<string>
 */
function blockErrors(?array $blocks): array
{
    $errors = [];

    (new ValidBlocks)->validate(
        'blocks',
        $blocks,
        function (string $message) use (&$errors): void {
            $errors[] = $message;
        },
    );

    return $errors;
}

function validDiagram(): array
{
    return [
        'type' => 'diagram',
        'title' => 'Request path',
        'description' => 'A browser reaches Caddy over HTTPS.',
        'width' => 560,
        'height' => 340,
        'nodes' => [
            ['key' => 'browser', 'x' => 30, 'y' => 12, 'w' => 180, 'h' => 52, 'label' => 'Browser'],
            ['key' => 'caddy', 'x' => 30, 'y' => 136, 'w' => 180, 'h' => 60, 'label' => 'Caddy'],
        ],
        'edges' => [
            ['from' => 'browser.bottom', 'to' => 'caddy.top', 'label' => 'HTTPS'],
        ],
    ];
}

test('a well-formed diagram passes', function (): void {
    expect(blockErrors(['request-path' => validDiagram()]))->toBeEmpty();
});

test('null blocks pass', function (): void {
    expect(blockErrors(null))->toBeEmpty();
});

test('an edge pointing at an undeclared node fails', function (): void {
    // The frontend drops what it cannot resolve, silently. Without this the
    // mistake ships as a missing arrow on a live page.
    $diagram = validDiagram();
    $diagram['edges'][0]['to'] = 'redis.top';

    expect(blockErrors(['request-path' => $diagram]))
        ->toContain('Diagram [request-path] edge #0 `to` points at node [redis], which the diagram does not declare.');
});

test('an edge with an unknown anchor fails', function (): void {
    $diagram = validDiagram();
    $diagram['edges'][0]['to'] = 'caddy.middle';

    expect(blockErrors(['request-path' => $diagram]))
        ->toContain('Diagram [request-path] edge #0 `to` anchor [middle] must be one of top, right, bottom, left.');
});

test('a literal point endpoint is allowed', function (): void {
    // check-in spreads three arrivals along Redis's top edge so the arrowheads
    // do not stack, which needs a point rather than an anchor.
    $diagram = validDiagram();
    $diagram['edges'][0]['to'] = [360, 316];

    expect(blockErrors(['request-path' => $diagram]))->toBeEmpty();
});

test('a malformed literal point fails', function (): void {
    $diagram = validDiagram();
    $diagram['edges'][0]['to'] = [360];

    expect(blockErrors(['request-path' => $diagram]))
        ->toContain('Diagram [request-path] edge #0 `to` must be a two-number point.');
});

test('a diagram without a title or description fails', function (): void {
    $diagram = validDiagram();
    unset($diagram['description']);

    expect(blockErrors(['request-path' => $diagram]))
        ->toContain('Diagram [request-path] needs a description.');
});

test('a node missing a coordinate fails', function (): void {
    $diagram = validDiagram();
    unset($diagram['nodes'][1]['y']);

    expect(blockErrors(['request-path' => $diagram]))
        ->toContain('Diagram [request-path] node [caddy] needs an integer y.');
});

test('an unknown block type fails', function (): void {
    expect(blockErrors(['thing' => ['type' => 'carousel']]))
        ->toContain('Block [thing] needs a type of diagram or specs.');
});

test('a block key that a directive could never reference fails', function (): void {
    expect(blockErrors(['Request Path' => validDiagram()]))
        ->toContain('Block key [Request Path] must be lowercase letters, numbers and hyphens.');
});

test('a spec list needs items with a label and a value', function (): void {
    expect(blockErrors(['stack' => ['type' => 'specs', 'items' => []]]))
        ->toContain('Spec list [stack] needs at least one item.');

    expect(blockErrors(['stack' => ['type' => 'specs', 'items' => [['label' => 'Backend']]]]))
        ->toContain('Spec list [stack] item #0 needs a label and a value.');
});
