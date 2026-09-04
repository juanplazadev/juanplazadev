<?php

declare(strict_types=1);

use App\Support\Content\BodyRenderer;

beforeEach(function (): void {
    $this->renderer = new BodyRenderer;
});

test('prose becomes html and a directive becomes a block, in document order', function (): void {
    $rendered = $this->renderer->render(
        "Before.\n\n::block{key=\"stack\"}\n\nAfter.",
        ['stack' => ['type' => 'specs', 'items' => []]],
    );

    expect($rendered)->toHaveCount(3)
        ->and($rendered[0]['type'])->toBe('html')
        ->and($rendered[0]['html'])->toContain('<p>Before.</p>')
        ->and($rendered[1])->toMatchArray(['type' => 'block', 'key' => 'stack'])
        ->and($rendered[2]['html'])->toContain('<p>After.</p>');
});

test('a directive with no matching block is dropped rather than fataled', function (): void {
    // A typo in the editor should leave a gap, not white-screen a live page.
    $rendered = $this->renderer->render("Before.\n\n::block{key=\"typo\"}\n\nAfter.", []);

    expect($rendered)->toHaveCount(2)
        ->and(collect($rendered)->pluck('type')->all())->toBe(['html', 'html']);
});

test('a directive is only a directive on a line of its own', function (): void {
    $rendered = $this->renderer->render('Write ::block{key="stack"} to embed one.', [
        'stack' => ['type' => 'specs', 'items' => []],
    ]);

    expect($rendered)->toHaveCount(1)
        ->and($rendered[0]['type'])->toBe('html')
        ->and($rendered[0]['html'])->toContain('::block');
});

test('raw html never survives the parser', function (): void {
    // The output is handed to dangerouslySetInnerHTML, so this is the boundary
    // that keeps a body from being an XSS sink.
    $rendered = $this->renderer->render('<script>alert(1)</script>

<img src=x onerror=alert(1)>

Text.', []);

    $html = collect($rendered)->pluck('html')->implode('');

    expect($html)->not->toContain('<script')
        ->and($html)->not->toContain('onerror')
        ->and($html)->toContain('Text.');
});

test('markdown covers everything the write-ups need', function (): void {
    $rendered = $this->renderer->render(
        "## Heading\n\nSome *emphasis*, **strong** and `code`.\n\n- one\n- two\n\n```\nfenced\n```",
        [],
    );

    $html = collect($rendered)->pluck('html')->implode('');

    expect($html)->toContain('<h2>Heading</h2>')
        ->and($html)->toContain('<em>emphasis</em>')
        ->and($html)->toContain('<strong>strong</strong>')
        ->and($html)->toContain('<code>code</code>')
        ->and($html)->toContain('<li>one</li>')
        ->and($html)->toContain('<pre>');
});

test('an empty body renders nothing', function (): void {
    expect($this->renderer->render(null, []))->toBe([])
        ->and($this->renderer->render('   ', []))->toBe([]);
});

test('referencedKeys reports every key the body uses, in order', function (): void {
    $keys = $this->renderer->referencedKeys(
        "::block{key=\"one\"}\n\ntext\n\n::block{key=\"two\"}"
    );

    expect($keys)->toBe(['one', 'two']);
});
