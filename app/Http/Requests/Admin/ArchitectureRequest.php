<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Concerns\DecodesJsonFields;
use App\Rules\ValidBlocks;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ArchitectureRequest extends FormRequest
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
                Rule::unique('architectures')->ignore($this->route('architecture')),
            ],
            'title' => ['required', 'string', 'max:255'],
            'tagline' => ['required', 'string', 'max:500'],
            'status' => ['required', 'string', 'max:40'],
            'active' => ['boolean'],
            'position' => ['required', 'integer', 'min:0'],
            'stack' => ['required', 'array', 'min:1'],
            'stack.*.label' => ['required', 'string', 'max:40'],
            'stack.*.icon' => ['nullable', 'string', 'max:40'],
            'links' => ['nullable', 'array'],
            'links.*.label' => ['required', 'string', 'max:40'],
            'links.*.href' => ['required', 'url'],
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
            'stack.array' => 'The stack field must be valid JSON.',
            'links.array' => 'The links field must be valid JSON.',
            'blocks.array' => 'The blocks field must be valid JSON.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            ...$this->decodeJsonFields(['stack', 'links', 'blocks']),
            'active' => $this->boolean('active'),
            'published' => $this->boolean('published'),
        ]);
    }
}
