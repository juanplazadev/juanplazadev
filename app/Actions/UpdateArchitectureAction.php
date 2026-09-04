<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Architecture;
use Illuminate\Support\Arr;

final class UpdateArchitectureAction
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(Architecture $architecture, array $attributes): Architecture
    {
        $architecture->update([
            ...Arr::except($attributes, 'published'),
            'published_at' => $architecture->publishedAtFor((bool) ($attributes['published'] ?? false)),
        ]);

        return $architecture;
    }
}
