<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Content\BodyRenderer;

/**
 * Keeps the compiled `rendered` column in step with `body` and `blocks`.
 *
 * Compiling on write rather than on read means the public path never parses
 * markdown and there is no cache to invalidate - the column cannot go stale
 * because nothing but this writes it.
 *
 * `compileBody()` is public and idempotent on purpose. The model event covers
 * the admin UI, but seeders run under WithoutModelEvents, so anything that
 * writes outside a normal request can call it directly and get the same result.
 */
trait RendersMarkdownBody
{
    public static function bootRendersMarkdownBody(): void
    {
        static::saving(function (self $model): void {
            if ($model->isDirty(['body', 'blocks'])) {
                $model->compileBody();
            }
        });
    }

    public function compileBody(): static
    {
        $this->rendered = resolve(BodyRenderer::class)->render($this->body, $this->blocks);

        return $this;
    }
}
