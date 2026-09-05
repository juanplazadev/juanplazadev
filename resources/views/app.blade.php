<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    @class(['dark' => ($appearance ?? 'system') == 'dark'])
    data-palette="{{ $palette ?? 'ember' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Resolve appearance and palette before first paint.

             The server already stamped both onto <html> above from their
             cookies, so this only has to cover the two cases the cookie cannot:
             an appearance of "system", and a visitor whose choice is in
             localStorage but whose cookie was dropped. --}}
        <script>
            (function() {
                const root = document.documentElement;
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        root.classList.add('dark');
                    }
                }

                try {
                    // Whitelisted rather than applied verbatim: an unrecognised
                    // value would leave the page with no palette bound at all.
                    // The list comes from App\Enums\Palette, so it cannot drift.
                    const palettes = @json($palettes ?? ['ember']);
                    const stored = localStorage.getItem('palette');

                    if (palettes.includes(stored)) {
                        root.dataset.palette = stored;
                    }
                } catch (e) {
                    // Blocked storage: the server-rendered attribute stands.
                }
            })();
        </script>

        {{-- Paints the page ground before app.css arrives, so a reload does not
             flash white. These are ember's --neutral-50 / --neutral-950; a
             non-ember palette corrects itself once the stylesheet lands. --}}
        <style>
            html {
                background-color: oklch(98.4% 0.005 75);
            }

            html.dark {
                background-color: oklch(14.8% 0.012 55);
            }
        </style>

        <link rel="icon" type="image/png" sizes="96x96" href="/favicon/favicon-96x96.png">
        <link rel="shortcut icon" href="/favicon.ico">
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
        <link rel="manifest" href="/favicon/site.webmanifest">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Juan Plaza') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-inter bg-background text-foreground tracking-tight antialiased">
        <x-inertia::app />
    </body>
</html>
