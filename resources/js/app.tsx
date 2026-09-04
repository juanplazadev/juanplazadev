import { createInertiaApp } from '@inertiajs/react';
import PaletteProvider from '@/components/site/palette-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import ArchitectureLayout from '@/layouts/architecture-layout';
import AuthLayout from '@/layouts/auth-layout';
import PageLayout from '@/layouts/page-layout';
import PostLayout from '@/layouts/post-layout';
import SettingsLayout from '@/layouts/settings/layout';
import SiteLayout from '@/layouts/site-layout';

const appName = import.meta.env.VITE_APP_NAME || 'Juan Plaza';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            // The portfolio. The landing page is the only one that earns the
            // full hero; everything else gets the compact header.
            case name === 'home':
                return SiteLayout;
            case name === 'blog/post':
                return [PageLayout, PostLayout];
            case name === 'architecture/item':
                return [PageLayout, ArchitectureLayout];
            case name.startsWith('blog'):
            case name.startsWith('architecture'):
            case name.startsWith('errors/'):
                return PageLayout;

            // The starter kit, kept working but unlinked from the public site.
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
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
