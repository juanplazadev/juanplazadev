<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
final class PostFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(4);

        return [
            'slug' => str($title)->slug()->value(),
            'title' => mb_rtrim($title, '.'),
            'summary' => fake()->sentence(12),
            'tags' => fake()->words(3),
            'reading_minutes' => fake()->numberBetween(2, 12),
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
