<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Architecture;
use Illuminate\Support\Arr;

final class CreateArchitectureAction
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(array $attributes): Architecture
    {
        $architecture = Architecture::query()->make(Arr::except($attributes, 'published'));

        $architecture->published_at = $architecture->publishedAtFor((bool) ($attributes['published'] ?? false));

        $architecture->save();

        return $architecture;
    }
}
