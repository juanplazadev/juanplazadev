<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Architecture;

final class DeleteArchitectureAction
{
    public function handle(Architecture $architecture): void
    {
        $architecture->delete();
    }
}
