<?php

declare(strict_types=1);

namespace App\Concerns;

/**
 * Lets a form request accept JSON-shaped fields as text from a textarea.
 *
 * The admin editor is a single author writing markdown and hand-editing block
 * payloads, so the structured fields arrive as JSON strings. Decoding them here
 * means the validation rules downstream see real arrays, and a malformed
 * document fails as a field error rather than a 500.
 */
trait DecodesJsonFields
{
    /**
     * @param  list<string>  $fields
     * @return array<string, mixed>
     */
    protected function decodeJsonFields(array $fields): array
    {
        $decoded = [];

        foreach ($fields as $field) {
            $value = $this->input($field);

            if (! is_string($value)) {
                continue;
            }

            if (mb_trim($value) === '') {
                $decoded[$field] = null;

                continue;
            }

            // Left as the original string when it will not parse. The rules
            // reject a string where an array is required, which puts the error
            // on the field the author was editing.
            $decoded[$field] = json_decode($value, true) ?? $value;
        }

        return $decoded;
    }
}
