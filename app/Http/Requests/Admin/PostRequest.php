<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Concerns\DecodesJsonFields;
use App\Rules\ValidBlocks;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class PostRequest extends FormRequest
{
    use DecodesJsonFields;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'slug' => [
                'required', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/',
                // The slug is the public URL, so uniqueness is what keeps two
                // posts from fighting over one address.
                Rule::unique('posts')->ignore($this->route('post')),
            ],
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['required', 'string', 'max:500'],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:40'],
            'reading_minutes' => ['required', 'integer', 'min:1', 'max:120'],
            'body' => ['required', 'string'],
            'blocks' => ['nullable', 'array', new ValidBlocks],
            'published' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => 'The slug may only use lowercase letters, numbers and hyphens.',
            'blocks.array' => 'The blocks field must be valid JSON.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            ...$this->decodeJsonFields(['blocks']),
            // Tags are typed as a comma-separated line, which is friendlier
            // than JSON for the one field that is always a flat list.
            'tags' => collect(explode(',', (string) $this->input('tags')))
                ->map(fn (string $tag): string => mb_trim($tag))
                ->filter()
                ->values()
                ->all(),
            'published' => $this->boolean('published'),
        ]);
    }
}
