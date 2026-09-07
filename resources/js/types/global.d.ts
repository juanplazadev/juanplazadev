import type { Auth } from '@/types/auth';
import type { Palette } from '@/types/content';
import type { Console } from '@/types/navigation';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            palette: string;
            palettes: Palette[];
            /** Empty for a guest, and for any service this environment has no credentials for. */
            consoles: Console[];
            /** Availability signalling on the landing page - see config/site.php. */
            hiring: boolean;
            /** Null when Turnstile is unconfigured, which switches the challenge off. */
            turnstileSiteKey: string | null;
            [key: string]: unknown;
        };
    }
}
