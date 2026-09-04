<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Architecture;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Architecture>
 */
final class ArchitectureFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(2);

        return [
            'slug' => str($title)->slug()->value(),
            'title' => mb_rtrim($title, '.'),
            'tagline' => fake()->sentence(14),
            'status' => fake()->randomElement(['Live', 'In development', 'Archived']),
            'active' => fake()->boolean(),
            'position' => 0,
            // `icon` is optional and an unknown key renders nothing, so the
            // factory leaves it off rather than inventing one the icon set
            // does not have.
            'stack' => [['label' => 'Laravel'], ['label' => 'React']],
            'links' => null,
            'body' => '## '.fake()->sentence(3)."\n\n".fake()->paragraph(),
            'blocks' => null,
            'published_at' => fake()->dateTimeBetween('-1 year'),
        ];
    }

    public function draft(): static
    {
        return $this->state(['published_at' => null]);
    }
}
