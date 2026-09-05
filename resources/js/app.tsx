import { createInertiaApp } from '@inertiajs/react';
import PaletteProvider from '@/components/site/palette-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Juan Plaza';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // Layouts are declared per page via `Page.layout`, not mapped here. That
    // keeps each layout inside the page's own async chunk, so a public visitor
    // never downloads the authenticated app shell.
    strictMode: true,
    // withApp sits outside Inertia's page context, so the palette is handed in
    // from the page object rather than read with usePage().
    withApp(app, { page }) {
        return (
            <PaletteProvider
                initialPalette={page.props.palette}
                palettes={page.props.palettes}
            >
                <TooltipProvider delayDuration={0}>
                    {app}
                    <Toaster />
                </TooltipProvider>
            </PaletteProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
