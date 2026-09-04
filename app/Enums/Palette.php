<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The accent palettes offered by the palette picker.
 *
 * Each case must have a matching `[data-palette="..."]` block in
 * resources/css/additional-styles/palettes.css and a `--swatch-*` variable for
 * the picker dot. This enum is the single source of truth: the middleware
 * validates against it, the Blade pre-paint script is seeded from it, and the
 * React picker reads it from shared Inertia props.
 */
enum Palette: string
{
    case Ember = 'ember';
    case Moss = 'moss';
    case Lagoon = 'lagoon';
    case Cobalt = 'cobalt';
    case Orchid = 'orchid';
    case Crimson = 'crimson';

    public const COOKIE = 'palette';

    public static function default(): self
    {
        return self::Ember;
    }

    /**
     * Resolve a raw cookie value, falling back to the default when it is
     * missing or no longer a valid palette.
     *
     * Accepts mixed because Request::cookie() is typed array|string|null - a
     * malformed cookie can arrive as an array, and that is a miss, not a crash.
     */
    public static function fromRequest(mixed $value): self
    {
        return is_string($value)
            ? self::tryFrom($value) ?? self::default()
            : self::default();
    }

    /**
     * @return list<array{id: string, label: string, swatch: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $palette): array => [
            'id' => $palette->value,
            'label' => $palette->label(),
            'swatch' => "var(--swatch-{$palette->value})",
        ], self::cases());
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * The label shown beside the swatch in the picker.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }
}
